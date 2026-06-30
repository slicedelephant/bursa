# Plan 017 — Referral- & Advocate-Engine (E15)

## Wiederverwendung (kein Neubau)

- **E16 Gamification-Primitive** (`apps/api/src/gamification/`): `rankLeaderboard`
  (Leaderboard.util) für Advocate- **und** Referral-Leaderboard; `resolveTier`
  (badge.util) für die Reward-Tiers. Referral-/Advocate-Counts werden auf die generischen
  `{ id, label, score }`- bzw. `value/thresholds`-Inputs gemappt. **Keine** zweite
  Ranking-/Badge-Engine.
- **E8 Einmal-Token-Muster** (`schools/onboarding-token.ts`): gespiegelt in einer eigenen
  `referral-code.util.ts` (256-bit-Zufall, nur SHA-256-Hash gespeichert, timing-safe).
- **E4 Donor-Account** (`apps/api/src/donors/`, `apps/web/.../features/donor/`): der
  Referral-Link + das Tracking-Dashboard hängen in den bestehenden Donor-Account; kein
  zweiter Account-Bereich.
- **E3 Share-Toolkit** (`apps/web/.../features/campaign/share-links.ts` +
  `share-toolkit.component.ts`): die Referral-/Advocate-Share-Buttons reusen die
  WhatsApp/Telegram/Facebook-Deeplink-Helfer; backseitig spiegelt `share-template.util.ts`
  die pre-filled Texte (Email/WhatsApp/LinkedIn).
- **E2/E4 Donations** (`apps/api/src/donations/`): `Donation`-Zeilen sind die einzige
  Conversion-Quelle; Status-Filter `PLEDGED|CAPTURED|SUCCEEDED` wie im E4-`DonorsService`.
- **Common**: `DomainException`, `CurrentUser`, `Roles`/`RolesGuard`,
  `{success,data}`-Interceptor — unverändert.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

`apps/api/src/referral/` — donation-frei wo möglich, rein, immutable, kein `Date.now()`
in reinen Funktionen (Referenzdatum injiziert):

1. `referral-code.util.ts` — `createReferralCode(opts)` (raw + hash + nichts gespeichert
   außer Hash), `hashReferralCode(raw)`, `validateReferralCode(record, raw)`
   (`malformed`/`mismatch`/`revoked`). Spiegelt E8-Token.
2. `referral-attribution.util.ts` — `resolveAttribution(input)`: entscheidet rein, ob
   eine Spende zugeschrieben wird (gültiger Code, gezählter Status, nicht self-referral,
   noch nicht zugeschrieben → Dedupe-Signal). Gibt `{ attribute, kind, reason }` zurück.
3. `reward-tier.util.ts` — dünner Wrapper über E16 `resolveTier` mit den Referral-
   Schwellen 3/5/10; `referralReward(count)` → `{ tier, nextTier, toNext, perk }`
   (perk = Shout-out / Recap / Recognition). **Keine Cash.**
4. `referral-leaderboard.util.ts` — `buildAdvocateLeaderboard(rows)` /
   `buildReferralLeaderboard(rows)`: mappt Counts auf `LeaderboardInput` und ruft E16
   `rankLeaderboard`; anonymisiert Labels für das opt-in-Referral-Board.
5. `share-template.util.ts` — `buildShareTemplates(input)`: multi-channel pre-filled
   Texte (Email/WhatsApp/LinkedIn) für Advocate + Referral, EN.
6. `referral-stats.util.ts` — `computeReferralStats({ invited, donated, active })`:
   Conversion-Rate, einfacher Viral-Coefficient, "invited/donated/active"-Label.

Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe, ruft kein I/O.

## Service / Controller / Modul

`apps/api/src/referral/`:

- `referral.service.ts` — Prisma-I/O hinter den Primitiven:
  - `donorReferral(userId)` — holt/erzeugt den Referral-Link, baut Tracking-Stats +
    Reward + Templates.
  - `setLeaderboardOptIn(userId, optIn)`.
  - `referralLeaderboard()` — anonymes opt-in-Board.
  - `inviteAdvocate(userId, campaignId, dto)` — Limit 15, erzeugt Invite + Link +
    Templates (Owner-skopiert: nur die eigene Kampagne).
  - `advocates(userId, campaignId)` — Fundraiser-Dashboard.
  - `advocateLeaderboard(campaignId)` — öffentliches Board.
  - `attributeDonation({ donationId, code, kind, donorUserId })` — wird vom Donations-
    Pfad nach Erfolg aufgerufen; nutzt `resolveAttribution` + persistiert dedupliziert.
    Money-frei, schluckt Fehler nie in den Geld-Pfad.
- `referral.controller.ts` — zwei Controller-Flächen:
  - `@Controller('donors/me/referral')`, `@Roles(DONOR)`: `GET /`,
    `POST /leaderboard-opt-in`.
  - `@Controller('referral')`: `GET /leaderboard` (anonym, auth-gated DONOR).
  - `@Controller('campaigns/:id')`, `@Roles(STUDENT)` für Management +
    public-readable Leaderboard: `POST /advocates`, `GET /advocates`,
    `GET /advocate-leaderboard`.
- `referral.module.ts` — Provider/Controller; exportiert `ReferralService` für den
  Donations-Pfad; in `app.module.ts` registriert.

`referral.service.ts` selbst ist kein reiner Kern (Prisma-I/O) und steht nicht unter dem
80%-Gate; sein Verhalten wird über die gegateten Primitive + ein Service-Spec (gemocktes
Prisma) abgedeckt.

## Datenfluss

1. Spender öffnet Account → `GET /donors/me/referral` → Service holt/erzeugt
   `ReferralLink`, zählt invited/donated/active aus `ReferralAttribution`+`Donation`,
   ruft `computeReferralStats` + `referralReward` + `buildShareTemplates`.
2. Studierende lädt Advocate ein → `POST /campaigns/:id/advocates` → Limit-Check (15),
   `createReferralCode`, persistiert `AdvocateInvite` (nur Hash), gibt raw-Link +
   Templates 1× zurück.
3. Besucher spendet über `?ref=<code>` → Donations-Pfad ruft nach Erfolg
   `ReferralService.attributeDonation` → `resolveAttribution` prüft rein → persistiert
   `ReferralAttribution` (Dedupe via `donationId` unique). **Geld unverändert an Schule.**
4. Leaderboard-Aufruf → Service aggregiert Counts → `rankLeaderboard` → Ränge.

## Constitution-Checks

- **Geld an die Schule:** Attribution ist money-frei; berührt weder Betrag noch
  Donation-Status noch Payout. Geld fließt unverändert an die Schule.
- **Immutability:** alle Primitive geben neue Objekte zurück; kein In-Place-Mutate.
- **Validate at the boundary:** DTOs (`class-validator`) auf allen Write-Routen; Codes
  timing-safe validiert; Limit-Verstoß → `DomainException`.
- **Kleine Module:** je Datei < 400 Zeilen, je Funktion < 50 Zeilen.
- **Envelope:** `{ success, data?, error? }` auf JSON-Routen (Interceptor).

## Frontend (Angular)

`apps/web/src/app/features/referral/`:
- `referral-link.ts` (rein, gegated) — Link-Anzeige (URL aus Code), Copy-Text.
- `referral-stats-format.ts` (rein, gegated) — "invited/donated/active"-Label,
  Conversion-%, Reward-Tier-Label, perk-Text.
- `share-templates.ts` (rein, gegated) — pre-filled Channel-Texte (reuse E3 `buildShareLinks`).
- `referral-panel.component.ts` — Donor-Account-Panel: Link + Stats + Reward + Share +
  opt-in-Toggle + Leaderboard.
- `referral-cta.component.ts` — CTA nach erfolgreicher Spende / im Portfolio.
- `advocate-manager.component.ts` — Studierenden-Panel: Advocate einladen + Liste + Templates.
- `advocate-leaderboard.component.ts` — öffentliches Board auf der Kampagnen-Seite.

`models.ts`: neue Referral-/Advocate-Typen (E15-Block). `api.service.ts`: `donorReferral`,
`setReferralOptIn`, `referralLeaderboard`, `inviteAdvocate`, `campaignAdvocates`,
`advocateLeaderboard`. Einhängen in `donor.page.ts` (Panel + CTA), `student`-Seite
(Manager), Kampagnen-Detail (Leaderboard).

## Prisma

Neue Modelle `ReferralLink`, `AdvocateInvite`, `ReferralAttribution` + Enums
`ReferralKind`, `AdvocateInviteStatus` + Relationen zu `User`/`Campaign`/`Donation`.
Migration `referral_engine`. Seed: ein Fundraiser mit Advocates + geworbenen Spenden,
ein Spender mit Referral-Stats + Both-Win-Badge — idempotent.

## Verifikation

`test:cov` (api+web) grün · beide `build` grün · `seed` clean · `migrate status`
up-to-date · `migrate diff --exit-code` → "No difference detected" · `prettier --check`
clean.
