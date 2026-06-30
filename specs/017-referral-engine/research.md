# Research & Clarify — Feature 017 Referral- & Advocate-Engine (E15)

## Entscheidung 1 — Eine Engine, zwei Gesichter (Referral + Advocate)

**Entscheidung:** Ein `referral`-Modul deckt beide Seiten ab. Spender-Referrals und
Studierenden-Advocates teilen Link-Generierung, Validierung, Attribution, Leaderboard
und Reward-Tiers; nur Eintrittspunkt (Donor-Account vs. Kampagne) und Sichtbarkeit
(privat vs. öffentlich) unterscheiden sich.

**Begründung:** Die Roadmap nennt es explizit "dieselbe Mechanik". Ein zweites Modul
wäre Duplikat. Ein gemeinsamer `ReferralAttribution`-Tisch mit `kind` (REFERRAL/ADVOCATE)
hält die Dedupe-Logik (eine Donation zählt einmal) an einer Stelle.

**Konsequenz:** Pure Logik kennt nur Codes, Counts und Scores — donation-/PII-frei,
genau wie die E16-Primitive.

## Entscheidung 2 — Gamification über die E16-Primitive, kein Neubau

**Entscheidung:** Leaderboards entstehen ausschließlich über
`gamification/leaderboard.util.ts` `rankLeaderboard(entries)`. Reward-Tiers entstehen
ausschließlich über `gamification/badge.util.ts` `resolveTier(value, thresholds)`.

- Advocate-/Referral-Counts werden auf generische `{ id, label, score }`-Einträge
  gemappt und an `rankLeaderboard` gegeben → Rang, Tie-Break, deterministisch.
- Der Referral-Count wird mit den Schwellen `[{tier:BRONZE,min:3},{tier:SILVER,min:5},
  {tier:GOLD,min:10}]` an `resolveTier` gegeben → Tier + nächster Tier + Abstand.

**Begründung:** E16 hat die Primitive bewusst donation-frei gebaut ("E15/E18 füttern
Referral-/Gruppen-Counts dieselbe Logik"). Eine zweite Leaderboard-/Badge-Engine würde
die Constitution (kein Neubau, kein Duplikat) verletzen.

**Konsequenz:** Bursa hat genau eine Ranking- und eine Tier-Implementierung. E15 liefert
nur dünne, getestete Wrapper (`reward-tier.util.ts`, `referral-leaderboard.util.ts`),
die die Tiers/Labels semantisch benennen und die Primitive aufrufen.

## Entscheidung 3 — Eindeutige Links über das E8-Einmal-Token-Muster

**Entscheidung:** Link-Codes werden wie die E8-Onboarding-Tokens behandelt: 256-bit-
Zufall, raw 1× gezeigt, nur SHA-256-Hash gespeichert, timing-safe verglichen. Eine eigene
`referral-code.util.ts` spiegelt das Muster (kein Cross-Modul-Import aus `schools`).

**Begründung:** Referral-/Advocate-Links sind öffentlich teilbare Identifikatoren; ein
gespeicherter Klartext-Code wäre ein unnötiges Leak-Risiko. Das E8-Muster ist im Repo
bewährt (`onboarding-token.ts`, `auditor`-Grants in E14). Eigene Util statt Import hält
das Referral-Modul entkoppelt (gleiche Linie wie `portfolio-export.util.ts` ↔ corporate).

**Nuance Donor-Link vs. Advocate-Link:** Ein **Advocate-Invite-Link** ist streng
hash-only (Raw 1× bei Anlage gezeigt). Der **eigene Referral-Link eines Spenders** ist
dagegen sein wiederkehrendes Share-Asset (kein Berechtigungs-Token), das er bei jedem
Account-Besuch sehen muss; deshalb persistiert `ReferralLink` zusätzlich den anzeigbaren
`code` neben dem `codeHash`. Der `codeHash` bleibt für die timing-safe Lookup-Validierung
beim Attributieren der Quelle der Wahrheit.

**Konsequenz:** `referral-code.util.ts` ist rein, deterministisch (injizierbare
`bytes()`-Quelle), unter dem 80%-Gate.

## Entscheidung 4 — Attribution last-touch, dedupliziert über DB-Unique

**Entscheidung:** Gibt der Donate-Flow einen `referralCode`/`advocateCode` mit, wird die
Spende nach Erfolg (Status PLEDGED/CAPTURED/SUCCEEDED) **last-touch** dem Code
zugeschrieben. Dedupe-Garantie: `ReferralAttribution.donationId` ist `@unique` — eine
Spende kann höchstens einmal zugeschrieben werden. Die pure `referral-attribution.util.ts`
entscheidet, **ob** zugeschrieben wird (gültiger Code, nicht self-referral, gezählter
Status); das Persistieren bleibt im Service.

**Begründung:** Multi-Touch-Attribution braucht Touch-Historie + Gewichtung — Overkill
für den Prototyp und nicht von der Roadmap gefordert. Last-touch ist der Branchen-Default
für Referral-Programme. Die DB-Unique ist die einfachste, instanz-übergreifend korrekte
Dedupe (kein Lock nötig auf Single-Instance).

**Konsequenz:** Out-of-Scope nennt last-touch + Single-Instance explizit.

## Entscheidung 5 — Kein echtes Email-Versenden, nur Links + Templates

**Entscheidung:** Ein Advocate-Invite mit Email versendet **keine** Mail. Es erzeugt den
Share-Link plus vorformulierte Templates (Email/WhatsApp/LinkedIn), die die Studierende
bzw. der Spender selbst verschickt (1-Click-Share).

**Begründung:** Konsistent mit der projektweiten Infra-Default-Entscheidung
("E-Mail/Notifications = In-App + gemockt/geloggt, kein SMTP"). Hält das Epic ohne externe
Infra runnable.

**Konsequenz:** Die `share-template.util.ts` (rein) baut die multi-channel pre-filled
Texte; sie ist der Backend-Spiegel zum E3-Frontend-Share-Toolkit.

## Entscheidung 6 — Both-Win-Badge & Stats read-only abgeleitet

**Entscheidung:** Der Both-Win-Badge wird **nicht** als eigener Award-Tisch persistiert.
Er wird bei jedem Aufruf aus dem Vorhandensein ≥1 erfolgreicher Attribution abgeleitet
(`resolveTier`/Schwellen-Logik). Tracking-Stats ("invited/donated/active") werden aus
`AdvocateInvite`/`ReferralAttribution`/`Donation` on read berechnet.

**Begründung:** Wie in E16 (Entscheidung 1): abgeleiteter State driftet nicht vom
Quell-Ledger. Badges sind motivierend, nicht abrechnungsrelevant. Spart Mutations-State.

**Konsequenz:** Nur drei schlanke neue Modelle (`ReferralLink`, `AdvocateInvite`,
`ReferralAttribution`) — kein `BadgeAward`-Tisch.

## Entscheidung 7 — Viral-Coefficient/Stats als reiner Rechner

**Entscheidung:** Eine `referral-stats.util.ts` (rein) rechnet aus `{ invited, donated,
active }` die Conversion-Rate und einen einfachen Viral-Coefficient
(`donated / invited` als Näherung), plus das "invited/donated/active"-Label.

**Begründung:** Die Roadmap fordert das Tracking-Dashboard ("14 eingeladen, 5 gespendet,
2 aktiv") und nennt Viral-Coefficient als Erfolgsmetrik. Als reiner Rechner ist es
getestet und ohne I/O wiederverwendbar (Donor + Fundraiser).

**Konsequenz:** Eigene pure Util unter dem 80%-Gate; injizierbar/deterministisch.
