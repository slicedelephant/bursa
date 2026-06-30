# Plan 016 — Spender-Portfolio & Giving-Streaks (E16)

## Wiederverwendung (kein Neubau)

- **E4 Donor-Account** (`apps/api/src/donors/`, `apps/web/.../features/donor/`): Das
  Portfolio liest dieselben Donor-Donations und wird in die bestehende `donor.page.ts`
  eingehängt. Kein zweiter Account-Bereich.
- **E2/E4 Donations** (`apps/api/src/donations/`): `Donation`-Zeilen sind die einzige
  Datenquelle für Streaks/Stats/Portfolio. Status-Filter `PLEDGED|CAPTURED|SUCCEEDED`
  wie im E4-`DonorsService` (`COUNTED`).
- **E1 Trust-Badges + E3 Campaign-Progress** (`apps/web/.../shared/trust-badges.component`,
  `campaign-progress.component`): Portfolio-Karten zeigen Verified-State und Progress.
- **E5 Export-Utils** (`corporate/pdf.util.ts` `buildSimplePdf`): PDF-Export. CSV via
  gespiegelter `cell()`-Linie in einer eigenen `portfolio-export.util.ts`.
- **Common**: `DomainException`, `CurrentUser`, `Roles`/`RolesGuard`, `{success,data}`-
  Interceptor — unverändert.

## Reusable Gamification-Primitive (TDD, je `.spec.ts` + Per-Path-80%-Gate)

`apps/api/src/gamification/` — donation-frei, rein, immutable:

1. `streak.util.ts` — `computeMonthlyStreak(timestamps: ReadonlyArray<Date|string>, referenceDate: Date|string): StreakState`
   (`{ currentMonths, longestMonths, currentMonthCovered, lastActiveMonth }`).
2. `badge.util.ts` — `resolveTier(value, thresholds): TierResult`,
   `monthlyGivingBadge(streakMonths): BadgeProgress` (Schwellen Bronze=3/Silber=6/Gold=12).
3. `leaderboard.util.ts` — `rankLeaderboard(entries: ReadonlyArray<LeaderboardInput>): LeaderboardEntry[]`.
4. `cumulative.util.ts` — `aggregateContributions(items: ReadonlyArray<ContributionInput>): CumulativeStats`.
5. `peer-comparison.util.ts` — `comparePeers(yourValue, populationValues): PeerComparison`.

Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe, ruft kein I/O und
kein `Date.now()`.

## Service / Controller / Modul

`apps/api/src/portfolio/`:

- `portfolio-export.util.ts` (rein, gegated) — `toPortfolioCsv(items)` und
  `portfolioPdfLines(view)`; nutzt lokale `cell()`-Escaping-Linie.
- `portfolio.service.ts` — `portfolio(userId)` (View aus Donations + Primitiven),
  `portfolioCsv(userId)`, `portfolioPdf(userId)`. Liest Donations + aktive-Spender-
  Aggregat für den Peer-Vergleich. Reicht `new Date()` als Referenzdatum in die Primitive.
- `portfolio.controller.ts` — `@Controller('donors/me')`, `@Roles(DONOR)`:
  `GET portfolio`, `GET portfolio/export.csv` (`@Res`), `GET portfolio/export.pdf` (`@Res`).
- `portfolio.module.ts` — Provider/Controller; in `app.module.ts` registriert.

`portfolio.service.ts` selbst ist kein reiner Kern (Prisma-I/O) und steht nicht unter
dem 80%-Gate; seine Logik wird über die gegateten Primitive + `portfolio-export.util.ts`
abgedeckt und mit einem Service-Spec (gemocktes Prisma) auf Verhalten geprüft.

## Datenfluss

1. `GET /donors/me/portfolio` → `PortfolioService.portfolio(userId)`.
2. Service lädt die gezählten Donations des Spenders (inkl. `campaign` →
   `studentProfile{fullName,photoUrl,country}`, `school{name}`, Progress-Felder,
   Verification-Status) und ein leichtes Aggregat "Studierende pro aktivem Spender".
3. Service mappt Donations auf generische Inputs und ruft die Primitive:
   - Zeitstempel → `computeMonthlyStreak` → `monthlyGivingBadge`.
   - `{targetId:campaignId, valueCents, at}` → `aggregateContributions`.
   - eigener distinct-Count vs. Population → `comparePeers`.
4. Service baut die `PortfolioView` (items + streak + badge + stats + peer) und gibt sie
   im Envelope zurück.
5. Export-Routen rufen `portfolio()`-Daten, serialisieren über `portfolio-export.util.ts`
   (CSV) bzw. `buildSimplePdf` (PDF) und streamen via `@Res()`.

## Constitution-Checks

- **Geld immer an die Schule:** Portfolio ist read-only; "Donate again" führt in den
  geprüften Kampagnen-Spendenpfad. Keine neue Geldbewegung in E16.
- **Immutability:** Alle Primitive + Export-Utils geben neue Werte zurück, mutieren nichts.
- **Validate at boundary:** Routen sind rollen-gegatet; `userId` kommt aus dem JWT;
  keine ungeprüften Inputs. Export-Routen liefern Bytes ohne Envelope (dokumentiert).
- **Kleine Module:** je Datei < 400 Zeilen, ein Zweck.

## Frontend (Angular)

`apps/web/src/app/features/donor/`:

- Reine Helfer (gegated): `streak-format.ts` (Streak-Text + Badge-Label/Farbe + nächster
  Meilenstein), `portfolio-stats.ts` (Stats-Formatierung, Impact pro Studierendem,
  Peer-Label).
- Präsentationskomponenten (gegated): `streak-banner.component.ts` (Streak + Badge +
  nächster Meilenstein), `portfolio-grid.component.ts` (Karten mit Foto/Name/Progress/
  Trust-Badge/Donate-again), `portfolio-stats.component.ts` (Stats + Peer-Vergleich).
- `donor.page.ts` erweitert: lädt `donorPortfolio()` und rendert Banner + Stats + Grid
  oben im Account; Export-Buttons (CSV/PDF, neues Tab/Blob).
- `api.service.ts`: `donorPortfolio()`, `donorPortfolioExportUrl(format)` /
  `donorPortfolioExport(format): Blob`. Neue Modelle in `models.ts`.

## Prisma

**Keine Migration.** Es werden keine Felder/Modelle hinzugefügt. `seed.ts` wird so
erweitert, dass `donor@bursa.test` eine mehrmonatige Spendenhistorie über mehrere
Kampagnen hat (sichtbare Streak + Badge + Multi-Student-Portfolio), idempotent.

## Verifikation

`npm --prefix apps/api run test:cov` · `npm --prefix apps/web run test:cov` · beide
`run build` · `npm --prefix apps/api run seed` · `prisma migrate status` up to date ·
`prisma migrate diff --exit-code` → "No difference detected" · `prettier --check`.
