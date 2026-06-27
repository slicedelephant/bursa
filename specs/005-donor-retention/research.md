# Research — 005 Donor Retention Loop

Offene Fragen wurden ohne User-Input selbst entschieden (Constitution: erst
recherchieren, dann entscheiden, Kette nicht blockieren).

## 1. Wie wird ein Spender-Account technisch verankert?

Kartenspenden waren bislang anonym (Endpoint ohne Guard). Die `Donation`-Tabelle
hatte aber bereits `donorUserId` + Relation `DonorDonations` — ungenutzt.

**Entscheidung:** Den Karten-Endpoint mit einer **optionalen JWT-Auth** versehen
(`OptionalJwtAuthGuard`): liegt ein gültiges Token vor, wird der Spender
zugeordnet; ohne Token bleibt die Spende anonym. So entsteht eine Historie für
eingeloggte DONOR-Konten, ohne den niedrigschwelligen anonymen Fluss zu brechen.
Der Account liest über `donorUserId` aus.

Begründung: minimal-invasiv (kein neuer Pflicht-Login vor dem Spenden, was
Conversion senken würde), nutzt vorhandene Spalte, kein Schema-Bruch.

## 2. Recurring — echtes Billing oder Simulation?

Direktive + Constitution: **simuliert über die Payment-Engine**, kein echtes
Mandat/Subscription. Echtes Stripe-Recurring (SetupIntent-Mandat, off_session
monatlich) ist dokumentiert (payments-design.md §2), aber out of scope.

**Entscheidung:** `RecurringPledge` als eigenes Aggregat. Eine Simulation
(`POST /donors/me/recurring/run`) bucht fällige Pledges über
`PaymentProvider.createCardCharge` ab (Mock erzeugt deterministische Refs; die
`.13`-Sentinel-Logik liefert auch hier den Fehlerpfad). Jeder erfolgreiche Lauf
erzeugt eine reguläre SUCCEEDED-Spende (`recurringPledgeId` gesetzt), die — wie
der bestehende SEPA-Sofortpfad — die Kampagne hochzählt und ggf. auf FUNDED
setzt. Kein Background-Cron (demoable per Endpoint).

Abgrenzung zur All-or-Nothing-Mechanik: Recurring-Charges sind **sofort
erfolgreiche** Spenden (analog zum bestehenden Corporate-SEPA-Pfad
`recordSuccess`), NICHT die SetupIntent-Pledges aus E2. Damit bleibt der
geprüfte Pledge/Capture-Pfad (E2) unberührt — Recurring koppelt nicht an die
Capture-Logik.

## 3. Recurring-Terminlogik

**Entscheidung:** `nextRunAt` startet bei Anlage = jetzt (erster Lauf sofort
fällig, gute Demo). `addMonth(date)` rechnet kalendarisch +1 Monat (mit
Monatsende-Klammerung, rein, getestet). `runDue(now)` verarbeitet alle ACTIVE
Pledges mit `nextRunAt <= now`. Ist die Kampagne nicht mehr spendbar
(funded/closed/unverifiziert), wird der Pledge **CANCELLED** (Studi ist
finanziert — Sponsoring dieser Kampagne endet) und der Spender benachrichtigt.

## 4. Impact-Updates + E-Mail ohne SMTP

**Entscheidung:** "Geloggte E-Mail" = eine persistierte `Notification`-Zeile mit
`channel = EMAIL` und `emailLogged = true` (über einen kleinen
`EmailLogger`-Provider, der in-memory zählt und persistiert). KEIN `console.log`
(Coding-Rule), KEIN echter Versand. So ist die E-Mail prüfbar (DB-Zeile +
in-memory-Log fürs Testing), aber ohne externe Infra. Der In-App-Feed sind die
`channel = IN_APP`-Zeilen.

Subscriber-Modell: Beim Spenden wird der eingeloggte Spender automatisch
**Abonnent** (`UpdateSubscription`, idempotent via upsert). Postet ein
Studierender ein Update, erhalten alle Abonnenten je eine IN_APP- und eine
EMAIL-Notification.

## 5. Automatischer Dank + Meilensteine

**Entscheidung:** Dank wird **sofort** nach erfolgreicher Spende erzeugt
(THANK_YOU, In-App + E-Mail), nur für eingeloggte Spender (anonyme haben kein
Konto/keine Adresse). Die "binnen 48h"-Garantie wird als Text dokumentiert, im
Prototyp nicht zeitverzögert (kein Scheduler). Meilensteine: reine Funktion
`crossedMilestones(prev, neu, goal)` liefert die in diesem Schritt
überschrittenen Schwellen aus {80, 90, 100}; je Schwelle eine MILESTONE- bzw.
GOAL_REACHED-Notification an alle aktuellen Abonnenten.

## 6. Tribute / Widmung

**Entscheidung:** Felder `tributeType` (HONOR|MEMORY) + `tributeName`. Boundary-
Validierung (Constitution V): Typ und Name müssen gemeinsam gesetzt sein
(`@ValidateIf` + custom-Logik in einer puren `tribute.util.ts`). Anzeige:
"In honour of <Name>" / "In memory of <Name>". Anonymität bleibt orthogonal
erhalten.

## 7. Coverage-Strategie

Schwergewicht der getesteten Logik liegt in **puren Modulen**
(`contribution.util`, `tribute.util`, `milestone.util`, `recurring-engine`,
`notification-templates`) und in Services, die mit gemocktem Prisma getestet
werden (Muster: bestehendes `donations.service.spec.ts`). Frontend: pure Helfer
(`donor-summary`, `notification-format`, `tribute-display`) + schlanke
TestBed-Komponententests (Muster: `payout-proof.component.spec.ts`). Pages
(`donor.page.ts`) bleiben — wie die übrigen `*.page.ts` — ungegated.

Bewusste Entkopplung des gegateten, geldkritischen `donations.service.ts`: die
Retention-Seiteneffekte (Abo, Dank, Meilensteine) laufen über einen injizierten
`NotificationsService`-Kollaborator; `donations.service` gewinnt nur wenige,
voll getestete Zeilen.
