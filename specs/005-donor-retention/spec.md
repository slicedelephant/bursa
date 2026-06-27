# Feature 005 — Donor Retention Loop (Account, Recurring, Impact-Updates, Tribute)

## WHY

Sponsor-Impact ist heute ein einmaliges Ergebnis, kein laufender Kanal.
Erstspender-Retention liegt bei nur rund 19% gegenüber rund 53% bei
Wiederholern; Recurring-Spender haben fast den doppelten Lifetime-Value, und
eine Danksagung binnen 48h macht Wiederholung um 39% wahrscheinlicher. Ein
Spender-Account ist zugleich die technische Voraussetzung dafür, dass
Impact-Updates, Belege und Recurring überhaupt beim richtigen Spender ankommen.
Bursa hatte bislang keinen Spender-Account: Kartenspenden waren anonym, es gab
keine Historie, keinen Beleg-Zugang und keinen Weg, aus einem Erstspender einen
Wiederkehrer zu machen.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Spender-Account** mit Spendenhistorie und Zugang zum (symbolischen)
  Zuwendungsbeleg je Spende. Eingeloggte DONOR-Konten bekommen ihre
  Kartenspenden zugeordnet (optionale Auth am Spenden-Endpoint), ohne den
  anonymen Spendenfluss zu brechen.
- **Recurring-Spende (SIMULIERT)**: "Monatlich beitragen / Sponsor a Student"
  über die bestehende Payment-Engine — KEIN echtes Billing. Eine
  RecurringPledge wird angelegt; ein `runDue`/`run`-Schritt simuliert die
  monatliche Abbuchung über `PaymentProvider.createCardCharge` und erzeugt je
  Lauf eine reguläre (sofort erfolgreiche) Spende.
- **Impact-Updates** als In-App-Feed plus **gemockte/geloggte E-Mail** (KEIN
  SMTP): postet ein Studierender ein Update, werden alle Abonnenten der
  Kampagne benachrichtigt (In-App-Notification + persistierte E-Mail-Zeile).
- **Automatischer Dank** binnen 48h (im Prototyp sofort) nach einer Spende.
- **Meilenstein-Benachrichtigungen** ("Du hast X% erreicht", "live geschaltet")
  an die Abonnenten, wenn eine Kampagne 80/90/100% überschreitet.
- **Tribute-/Widmungs-Spende** ("zu Ehren von" / "im Gedenken an") plus
  bestehende **Anonymitäts-Wahl**. Die Widmung wird am Boundary validiert,
  persistiert und öffentlich/an den Spender angezeigt.
- **Update-Abonnement**: ein Spender wird beim Spenden automatisch Abonnent der
  Kampagne; Abos sind im Account einsehbar.

## User Stories

- **US1 (Einzelspender):** Als eingeloggter Spender sehe ich meine
  Spendenhistorie und kann zu jeder Spende den Beleg abrufen. (P1)
- **US2 (Einzelspender):** Ich kann eine Spende "zu Ehren von" oder "im Gedenken
  an" jemanden widmen und weiterhin anonym geben. (P1)
- **US3 (Einzelspender):** Ich kann einen monatlichen Beitrag einrichten
  ("Sponsor a Student") und ihn pausieren/kündigen; die simulierte Abbuchung
  läuft über die Payment-Engine. (P1)
- **US4 (Einzelspender):** Ich bekomme nach meiner Spende einen sofortigen Dank
  und danach Impact-Updates der Studierenden in meinem Feed. (P2)
- **US5 (Studierende):** Ich poste ein Update ("Semester 1 begonnen"), und meine
  Förderer werden automatisch benachrichtigt. (P2)
- **US6 (Studierende/Spender):** Wenn meine Kampagne 80/90/100% erreicht, werden
  die Förderer informiert. (P3)

## Key Entities

- **RecurringPledge** — donorUserId, campaignId, amountCents, status
  (ACTIVE/PAUSED/CANCELLED), nextRunAt, chargesCount, totalChargedCents. Die
  simulierte monatliche Spende.
- **UpdateSubscription** — donorUserId + campaignId (unique). Wer ein Update-Abo
  einer Kampagne hat.
- **Notification** — userId, type (THANK_YOU/MILESTONE/IMPACT_UPDATE/
  GOAL_REACHED/RECURRING_CHARGE), channel (IN_APP/EMAIL), title, body,
  campaignId?, readAt?, emailLogged. In-App-Feed + geloggte E-Mail.
- **Donation** — neue Felder `donorUserId` (Account-Zuordnung — Spalte existierte
  bereits, wird jetzt genutzt), `recurringPledgeId`, `tributeType`,
  `tributeName`.

## Success Criteria

- Eingeloggte Kartenspenden landen in der Spendenhistorie des Spenders; Belege
  je Spende abrufbar; anonyme (nicht eingeloggte) Spende bleibt möglich.
- Tribute-Widmung wird am Boundary validiert (Typ + Name gehören zusammen),
  persistiert und angezeigt; Anonymität funktioniert weiterhin.
- Recurring lässt sich anlegen, pausieren, fortsetzen, kündigen; ein
  Simulationslauf bucht über die Payment-Engine ab und erzeugt Spende +
  Benachrichtigung; gescheiterte Charges (Mock-Sentinel) werden sauber
  behandelt.
- Update eines Studierenden benachrichtigt alle Abonnenten (In-App + geloggte
  E-Mail); automatischer Dank nach Spende; Meilenstein-Notifications bei
  80/90/100%.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. Recurring/Tribute/
  Notifications/Subscriptions).

## Out of Scope (ehrliche Abgrenzung)

- Echtes wiederkehrendes Billing (Stripe Subscriptions/SetupIntent-Mandate) —
  Recurring ist rein simuliert über die Mock/Provider-Engine.
- Echter E-Mail-Versand (SMTP/Provider) — E-Mails werden nur als
  Notification-Zeile persistiert ("geloggt").
- Background-Scheduler/Cron für automatische Monatsabbuchung — der Lauf wird
  manuell/per Endpoint ausgelöst (`POST /donors/me/recurring/run`), demoable.
- Echte 48h-Verzögerung — der Dank wird im Prototyp sofort erzeugt (die
  48h-Garantie ist dokumentiert, nicht zeitgesteuert).
