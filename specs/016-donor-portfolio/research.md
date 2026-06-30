# Research & Clarify — Feature 016 Spender-Portfolio & Giving-Streaks (E16)

## Entscheidung 1 — Keine neue Persistenz, alles on read aus Donations ableiten

**Entscheidung:** E16 fügt **kein** Prisma-Modell hinzu. Portfolio, Streaks, Badges,
Stats und Peer-Vergleich werden bei jedem Aufruf aus den bestehenden `Donation`-Zeilen
(plus `Campaign`/`StudentProfile`) berechnet.

**Begründung:** Die Roadmap erlaubt es explizit ("streaks computed on read"). Eine
gespendete Spende mit `createdAt` trägt bereits alle Informationen für eine Streak.
Ein Award-Log/`BadgeAward`-Tisch wäre redundanter, mutierbarer State, der mit dem
Quell-Ledger driften kann. Badges sind motivierend, nicht abrechnungsrelevant — also
kein Grund für Persistenz. Spart eine Migration und hält den geprüften Geldpfad unberührt.

**Konsequenz:** `migrate diff --exit-code` muss "No difference detected" bleiben.

## Entscheidung 2 — Gamification als generische, donation-freie Primitive

**Entscheidung:** Eigenes Modul `apps/api/src/gamification/` mit fünf reinen Bausteinen,
die **kein** Domänenmodell importieren:

- `streak.util.ts` — `computeMonthlyStreak(timestamps, referenceDate)` → aktuelle/längste
  Streak in Monaten, ob laufender Monat erfüllt. Arbeitet auf `Date|string`-Liste.
- `badge.util.ts` — `resolveTier(value, thresholds)` / `monthlyGivingBadge(streakMonths)`
  → Bronze/Silber/Gold (Schwellen 3/6/12), nächster Tier, Abstand. Schwellen als Parameter.
- `leaderboard.util.ts` — `rankLeaderboard(entries)` → nach Score desc, stabiler
  Tie-Break (id asc), mit Rang. Generische `{ id, label, score }`-Einträge.
- `cumulative.util.ts` — `aggregateContributions(items)` → Summe, Count, distinct Targets,
  Impact pro Target, erstes/letztes Datum. Generische `{ targetId, valueCents, at }`-Items.
- `peer-comparison.util.ts` — `comparePeers(yourValue, populationValues)` → Durchschnitt,
  dein Wert, Verhältnis, motivierendes (nie beschämendes) Label.

**Begründung:** E15 zählt Referrals, E18 summiert Gruppen-Beiträge — beide brauchen
dieselbe Streak/Badge/Leaderboard-Mechanik. Indem die Primitive nur Zeitstempel/Zähl-
werte/Scores kennen, kann jeder spätere Consumer sie ohne Umbau füttern. Das Portfolio
ist der erste Consumer; es mappt Donations auf diese generischen Inputs.

## Entscheidung 3 — Streak deterministisch, Referenzdatum injiziert

**Entscheidung:** Die Streak rechnet in **Kalendermonats-Buckets** (`YYYY-MM`).
`computeMonthlyStreak` bekommt ein `referenceDate` übergeben; nie `Date.now()` in der
reinen Logik. Der Service reicht `new Date()` herein, Tests reichen fixe Daten herein.

**Begründung:** Constitution/TDD verlangt deterministische, nicht-flackernde Tests.
Monats-Buckets statt 30-Tage-Fenster passen zur Produktsprache ("seit 7 Monaten") und
zur Recurring-Logik (monatliche Pledges). Eine Streak ist "laufend", wenn der aktuelle
oder der Vormonat erfüllt ist (Kulanz, damit die Serie nicht am 1. des Monats reißt).

## Entscheidung 4 — Exporte über die E5-Utils

**Entscheidung:** PDF über `corporate/pdf.util.ts` `buildSimplePdf(title, lines)`. CSV
über eine lokale, RFC-4180-ähnliche `cell()`-Escaping-Linie wie in `corporate/esg.util.ts`
(eigene kleine `portfolio-export.util.ts`, damit das Corporate-Modul nicht importiert wird).

**Begründung:** Keine zweite PDF-Engine, keine neue Dependency (Linie des E5-Writers).
Das CSV-Escaping ist klein genug, um es als reine, getestete Portfolio-Util zu spiegeln,
statt eine Cross-Modul-Kopplung Portfolio→Corporate einzuführen.

## Entscheidung 5 — Peer-Vergleich als simple Aggregation

**Entscheidung:** Plattform-Durchschnitt = (Summe distinct unterstützter Kampagnen über
alle aktiven Spender) / (Anzahl aktiver Spender). "Aktiver Spender" = hat mindestens eine
gezählte Spende. Vergleich rein numerisch + Label; keine fremden Identitäten.

**Begründung:** Roadmap will "leicht" und "motivierend, nicht beschämend". Ein simpler
Durchschnitt reicht; ein perzentil-/echtzeit-basiertes Ranking wäre Over-Engineering und
ein Privacy-Risiko. Das Label hebt den Spender immer positiv hervor ("du liegst vorn"
bzw. "schon dabei — der nächste Schritt …").

## Entscheidung 6 — Modul-Schnitt: eigenes `portfolio`-Modul, nicht `donors` erweitern

**Entscheidung:** Backend bekommt ein eigenes `apps/api/src/portfolio/`-Modul
(Controller `donors/me/portfolio*`), das den `PrismaService` direkt nutzt und die
Gamification-Primitive konsumiert. `DonorsModule` bleibt unverändert.

**Begründung:** Hohe Kohäsion, niedrige Kopplung (Constitution IV). Das Portfolio ist
ein eigener, abgegrenzter Anwendungsfall (Aggregation + Export), den E15/E18 später
nicht erben, während die Primitive sehr wohl geteilt werden. Frontend integriert die
Anzeige hingegen in die bestehende E4-`donor.page.ts` (eine Donor-Account-Fläche).
