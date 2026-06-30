# Feature 016 — Spender-Portfolio & Giving-Streaks (E16)

**Epic:** E16 · **Größe:** M · **Primär:** Einzelspender · **Hängt ab von:** E4

## Warum (Problem)

Spender sehen ihre kumulierte Wirkung nicht. Nach der Spende endet die Beziehung —
es fehlt die Motivationsschleife für Wiederholung. Diaspora-Spender sind emotional
verbunden und wollen sichtbaren Fortschritt: Welche Studierenden unterstütze ich?
Wie lange schon? Wie viel habe ich bewegt? Wie stehe ich im Vergleich?

E16 schließt diese Lücke mit einem Portfolio ("Meine Studierenden"), einer
Streak-Mechanik (Monate in Folge gespendet) plus Bronze/Silber/Gold-Badges,
kumulierten Stats und einem leichten, motivierenden Peer-Vergleich.

Strategisch wichtig: Die **Gamification-Primitive** (Streak-Rechner, Tier/Badge-Resolver,
Leaderboard-Ranker, Kumulativ-Aggregator, Peer-Vergleich) werden **einmal** als reine,
wiederverwendbare Bausteine gebaut. E15 (Referral/Advocate-Engine) und E18 (Gruppen)
nutzen dieselben Bausteine — Referral-Counts bzw. Gruppen-Summen speisen dieselbe
Badge/Streak/Leaderboard-Logik. Deshalb sind die Primitive bewusst von "Donations"
entkoppelt: sie arbeiten auf generischen Zeitstempeln und Zählwerten.

## User Stories

1. **Als Diaspora-Spender** möchte ich alle Studierenden sehen, die ich unterstütze
   (Name, Foto, Fortschritt), damit ich meinen Impact überblicke und stolz bin.
2. **Als Einzelspender** möchte ich meine Giving-Streak verfolgen ("seit 7 Monaten in
   Folge") plus den nächsten Badge-Meilenstein, damit ich motiviert bleibe, die Serie
   nicht zu unterbrechen.
3. **Als wiederholender Spender** möchte ich wissen, wie viel ich insgesamt beigetragen
   habe, wie viele Studierende ich erreiche und wie groß mein Impact pro Studierendem ist.
4. **Als Spender** möchte ich einen leichten Peer-Vergleich ("Durchschnitt unterstützt
   2.4 Studierende, du 5"), der motiviert statt beschämt.
5. **Als Spender unterwegs** möchte ich auf dem Handy mit einem Tap "Weiter spenden"
   können, direkt aus der Portfolio-Karte einer Kampagne.
6. **Als Spender** möchte ich mein Portfolio als CSV/PDF exportieren, damit ich einen
   Beleg meiner Förderhistorie habe.

## Scope (was wird gebaut)

- **Portfolio "Meine Studierenden":** Pro unterstützter, gezählter Kampagne eine Karte
  mit Studierenden-Name, Foto, Schule, Fortschritt (raised/goal in %), eigenem
  Beitrag des Spenders, Trust-State (Verified-Badge, E1) und 1-Tap-"Donate again".
- **Streak-Mechanik:** Monate in Folge mit mindestens einer gezählten Spende, relativ
  zu einem injizierten Referenzdatum berechnet (kein `Date.now()` in reiner Logik).
  Aktuelle Streak, längste Streak, ob der laufende Monat schon erfüllt ist.
- **Streak-Badges:** Tier-Resolver mit Schwellen Bronze=3, Silber=6, Gold=12 Monate.
  Liefert aktuellen Tier, nächsten Tier und Monate bis dahin (motivierender Nudge).
- **Kumulative Stats:** Gesamt EUR gespendet, Anzahl unterstützter Studierender,
  Anzahl Spenden, Impact-Größe (EUR pro Studierendem), erster/letzter Spendenmonat.
- **Peer-Vergleich:** Plattform-Durchschnitt unterstützter Studierender pro aktivem
  Spender vs. eigener Wert, plus motivierendes Label. Einfache Aggregation, kein
  Echtzeit-Ranking.
- **Leaderboard-Ranker (Primitive):** Generischer, deterministischer Ranker (Score
  desc, stabiler Tie-Break) — im Portfolio nicht als Live-Board exponiert, aber als
  wiederverwendbarer Baustein für E15/E18 gebaut und getestet.
- **Exports:** CSV + PDF der Portfolio-Übersicht über die E5-Utils (`buildSimplePdf`,
  `cell()`-Escaping). Keine neue Library.
- **Mobile-First UI:** Clean Cards, Stats oben, Streak-Banner, Portfolio-Grid, Export-
  Buttons. In den bestehenden E4-Donor-Account integriert (`/donor`).

## Functional Requirements

- **FR-1** Das Portfolio listet nur Kampagnen mit mindestens einer **gezählten** Spende
  (`PLEDGED`, `CAPTURED`, `SUCCEEDED`) des eingeloggten Spenders. `FAILED`/`EXPIRED`/
  `PENDING` zählen nie.
- **FR-2** Geld fließt nie an Studierende. Das Portfolio ist read-only Anzeige; der
  "Donate again"-CTA führt in den bestehenden, geprüften E2-Spendenpfad der Kampagne.
- **FR-3** Streaks/Badges/Stats werden **on read** aus den Spenden abgeleitet. Es wird
  nichts Persistiertes mutiert. Reine Logik ist deterministisch (Referenzdatum injiziert).
- **FR-4** Der Peer-Vergleich nutzt nur aggregierte Zählwerte (z.B. Studierende pro
  aktivem Spender), nie personenbezogene Fremddaten.
- **FR-5** Alle JSON-Routen nutzen den `{ success, data?, error? }`-Envelope. Die
  Export-Routen streamen `text/csv` bzw. `application/pdf` direkt via `@Res()`.
- **FR-6** Portfolio-Routen sind `DONOR`-gegatet (`JwtAuthGuard` + `RolesGuard` +
  `@Roles(DONOR)`), analog zum E4-`DonorsController`.
- **FR-7** Die Gamification-Primitive kennen **kein** Donation-Modell. Sie nehmen
  generische Inputs (Zeitstempel-Listen, Score-Einträge, Werte-Listen) und geben neue
  Werte zurück; keine Mutation der Eingaben.

## Key Entities

Keine neuen Persistenz-Entitäten. E16 leitet alles aus bestehenden Modellen ab:

- **Donation (E2/E4)** — `donorUserId`, `campaignId`, `amountCents`, `status`,
  `createdAt` sind die Datenquelle für Streaks, Stats und Portfolio-Beiträge.
- **Campaign (E1/E3)** — `title`, `raisedCents`, `goalCents`, `status` sowie die
  Verified-Projektion (E1) für den Trust-State der Portfolio-Karte.
- **StudentProfile** — `fullName`, `photoUrl`, `country` für Name/Foto der Karte.

Reine View-Typen (keine DB): `PortfolioItem`, `StreakState`, `BadgeProgress`,
`CumulativeStats`, `PeerComparison`, `LeaderboardEntry`.

## Success Criteria

- Spender mit 5 unterstützten Kampagnen über mehrere Monate sieht 5 Portfolio-Karten,
  eine korrekte aktuelle Streak, den erreichten Badge (Bronze/Silber/Gold), die
  korrekten Gesamtsummen und einen Peer-Vergleich.
- Streak-Berechnung ist deterministisch und zeitstabil (Tests mit fixem Referenzdatum,
  kein flackern über Monatsgrenzen).
- CSV/PDF-Export liefert eine vollständige, korrekt escapte Portfolio-Übersicht.
- Beide Builds grün; Per-Path-80%-Gates auf allen neuen reinen Dateien (API + Web).
- Keine Prisma-Migration nötig; `migrate diff --exit-code` → "No difference detected".

## Out of Scope (ehrlich)

- **Kein** Echtzeit-Leaderboard, keine WebSockets, keine Push-Infra. Der Leaderboard-
  Ranker ist eine reine Funktion; ein Live-Board ist E15/E18-Sache.
- **Keine** persistierten Badge-Awards / Award-Log. Badges sind motivierend, werden
  auf read berechnet — kein State, keine Migration.
- **Keine** Rewards, Cashbacks oder Payouts an Badges/Streaks gekoppelt (Compliance:
  Geld geht immer an die Schule). Badges sind rein motivierend/visuell.
- **Kein** Cron/Hintergrund-Job für Streak-Pflege. Streaks werden bei Aufruf berechnet.
- **Kein** Privacy-Bruch im Peer-Vergleich: nur Aggregat-Durchschnitte, keine fremden
  Spendernamen/-beträge.
- **Kein** Multi-Currency. EUR-Cents wie im restlichen System.
