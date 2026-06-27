# Research / Clarify — 006 Corporate Channel

Offene Fragen wurden ohne User-Input selbst entschieden (autonomer Build).
Grundlage: `docs/payments-design.md` (Abschnitt 5), `docs/roadmap-epics.md`
(E5), Constitution, Bestandscode (E1-E4).

## E1 — Full-Tuition: sofortiger Capture statt All-or-Nothing-Wait

**Entscheidung:** Corporate-Karte nutzt einen neuen
`PaymentProvider.chargeImmediately(input)` (automatic capture). Der
100%-/Full-Tuition-Fall ist laut payments-design der einfachste: Ziel sofort
erreicht ⇒ sofortiger Charge, kein Auth-Hold, kein Sammelfenster. Die Donation
wird `SUCCEEDED`, die Kampagne sofort `FUNDED`. Begründung: trennt die
Corporate-Sofortzahlung sauber vom delikaten, gegateten E2-Pledge/Capture-Pfad.

**Konsequenz für E2-Pledges:** Schließt das Corporate-Ticket die Lücke zu 100%,
ruft der Corporate-Service den bestehenden, getesteten
`DonationsService.captureCampaign(campaignId)` auf — damit werden die offenen
Spender-Pledges (PLEDGED → CAPTURED) ebenfalls eingezogen. So bleibt die binäre
All-or-Nothing-Auszahlung konsistent und der Full-Tuition-CTA ist der Auslöser.

## E2 — SEPA: ein Zustand oder zwei?

**Entscheidung:** SEPA-Sponsoring nutzt den bestehenden
`PaymentProvider.createSepaPledge` (gemockt, sofort erfolgreich), die Donation
ist wie beim bestehenden `donateSepa` sofort `SUCCEEDED` und zählt zum Ziel. Die
"zugesagt → eingegangen"-Nuance (payments-design 5) wird **auf der Rechnung**
abgebildet: SEPA-Rechnung startet `PENDING` (zugesagt), eine `settle`-Aktion
schaltet sie auf `PAID` (eingegangen). Begründung: Goal-/Capture-Mathematik
bleibt unangetastet (kein Risiko für E2), die SEPA-Asynchronität ist trotzdem
sichtbar und demoable. Bewusste Vereinfachung, ehrlich dokumentiert.

## E3 — Belegtyp: Spende vs. Sponsoring (USt)

**Entscheidung (payments-design 5, "Steuerbeleg-Verzweigung"):**
- **Ohne Logo-Recognition** ⇒ reine Spende ⇒ Beleg `DONATION`
  (Zuwendungsbestätigung), **keine USt**: `net == gross`, `vat = 0`.
- **Mit Logo-Recognition** (opt-in) ⇒ steuerlich Sponsoring ⇒ Beleg `SPONSORING`
  mit **19% USt**: `net = amountCents`, `vat = round(net*0.19)`,
  `gross = net + vat`.

Der **zielgebundene Tuition-Beitrag bleibt das Netto** (`amountCents`), damit
"100% der Spende gehen an die Schule" als prüfbare Eigenschaft erhalten bleibt;
die USt ist ein Aufschlag auf der Rechnung (was der Sponsor zahlt), kein Abzug
vom Schul-Beitrag. Named Scholarship allein (ohne Logo) kippt den Belegtyp
NICHT — nur die freigegebene Gegenleistung (Logo/Recognition) tut das.

## E4 — Recognition-Modell

`recognitionKind`: `ANONYMOUS` (Default, keine öffentliche Nennung), `LOGO`
(Logo, ohne Stipendien-Name), `NAMED` (Named Scholarship; Logo optional). Auf
der Kampagne werden alle nicht-anonymen Sponsorings als Recognition-Banner
gezeigt (Firmenname/Logo + ggf. Stipendien-Name). Abgeleitet rein über
`recognition.util.ts`.

## E5 — Gift-Tiers

Pur, deterministisch, immer ≤ Restlücke (außer CUSTOM):
- `SEMESTER` = min(gap, round(goal/4))
- `YEAR` = min(gap, round(goal/2))
- `FULL` = gap (exakte Restlücke, Badge "Highest impact")
- `CUSTOM` = validierter Eingabebetrag (Overfunding wird via `splitContribution`
  zu Tip gekappt — kein Bruch der bestehenden Regel).

Tiers mit `amountCents <= 0` (Lücke schon 0) werden ausgeblendet.

## E6 — CSV/PDF-Export ohne neue Infra

- **CSV**: pure `toCsv(rows)` → echtes `text/csv` über `@Res()` (umgeht den
  {success,data}-Interceptor bewusst, da Binär-/Text-Download).
- **PDF**: pure `buildSimplePdf(title, lines)` erzeugt ein **minimal gültiges,
  einseitiges PDF** (Helvetica, Text) als Byte-String — Offsets/xref werden aus
  der laufenden Byte-Länge berechnet, also korrekt. Kein neues npm-Paket. Über
  `@Res()` als `application/pdf` ausgeliefert. Constitution-konform (keine neue
  externe Infrastruktur).

## E7 — Modul-Schnitt & Kopplung

Neues `corporate`-Modul (analog zu `recurring` als eigenständiger Pfad). Es
importiert `PaymentProvider` (neu `chargeImmediately`), `DonationsModule`
(exportiert jetzt `DonationsService` für `captureCampaign`) und
`NotificationsModule` (Corporate-Dank + Impact-Report-Abo). Der gegatete
`donations.service.ts` wird NICHT verändert (nur als Kollaborator genutzt). Die
Recognition-Anzeige hängt an einer puren `campaigns/recognition.util.ts`, die
der Mapper aufruft; `campaigns.service.detail` lädt die Sponsorings dazu.

## Quellen
- `docs/payments-design.md` Abschnitt 4 (PaymentProvider-Methoden inkl.
  `chargeImmediately`) und 5 (Corporate Full Tuition UX, Steuerbeleg-Verzweigung).
- `docs/roadmap-epics.md` E5 (Scope, Stakeholder-Benefits, Erfolgsindikatoren).
- ESG-KPI-Frameworks (CSRD/ESRS) und Named-Scholarship-ROI — Quellen in
  `docs/roadmap-epics.md`.
