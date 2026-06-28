# Feature 006 — Corporate Channel (B2B-Payment, ESG-Dashboard, Named Scholarship, Full-Tuition-CTA)

## WHY

Firmen können nicht per Privat-Kreditkarte spenden. Ohne Rechnung, SEPA,
USt-ID, Bestellnummer (PO) und Recognition kommt Procurement gar nicht erst
durch die Freigabe. CSR-/ESG-Teams brauchen exportierbare Impact-Daten für ihr
CSRD-/ESRS-Reporting, nicht eine Danke-Mail, und ohne Named Scholarship plus
Logo-Recognition fehlt der Business-Case fürs Marketing. Die Payment-Empfehlung
(siehe `docs/payments-design.md`, Abschnitt 5) enthält bereits den
Corporate-Full-Tuition-CTA: der 100%-Fall ist zahlungstechnisch der einfachste,
weil das Ziel sofort erreicht ist und sofort eingezogen wird (kein
All-or-Nothing-Wait). Der Channel hängt sich hinter die bestehende
`PaymentProvider`-Abstraktion, ohne den Gallery-/Spender-Kartenfluss zu berühren.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Full-Tuition-CTA** auf der Kampagnenseite (Rolle SPONSOR): dominanter
  "Studium komplett finanzieren / Lücke schließen"-Button mit dem exakten
  Restbetrag, plus Gift-Tiers (Ein Semester / Ein Studienjahr / Komplett). Der
  100%-Fall ist **sofortiger Capture**: bei Karte wird sofort eingezogen
  (`chargeImmediately`, automatic capture), die Kampagne sofort FUNDED — kein
  Warten auf eine Sammelphase. Schließt eine Corporate-Zusage die Lücke zu 100%,
  werden zusätzlich die offenen Spender-Pledges (E2 All-or-Nothing) eingezogen.
- **B2B-Payment-Strecke**: Karte (sofort) **oder** SEPA-Überweisung (Konzept,
  gemockt) mit USt-ID- und PO-Feld. SEPA-Sponsoring trägt zwei sichtbare
  Zustände: zuerst "zugesagt" (Rechnung PENDING), nach Settlement "eingegangen"
  (Rechnung PAID, per `settle`-Aktion demoable).
- **Einfache Rechnung / firmentauglicher Beleg**: pro Corporate-Sponsoring wird
  ein Beleg erzeugt — entweder **Zuwendungsbestätigung** (reine Spende ohne
  Gegenleistung, keine USt) oder **Sponsoring-Rechnung mit ausgewiesener USt
  (19%)**, sobald Logo-Recognition opt-in ist (steuerlich Sponsoring). Beleg mit
  Rechnungsnummer, Netto/USt/Brutto, USt-ID, PO, Direktauszahlungs-Hinweis.
- **Named Scholarship + Logo/Recognition**: optional benennt der Sponsor das
  Stipendium ("Das [Firma]-Stipendium") und/oder gibt sein Logo frei. Named
  Scholarship und Firmenlogos erscheinen sichtbar auf der Kampagnenseite
  (Recognition-Banner).
- **ESG-/CSR-Impact-Dashboard** im Sponsor-Account: geförderte Studierende,
  erreichte Länder, unterstützte Schulen, committet Summe, Anzahl
  Voll-/Named-Stipendien — plus **CSV- und PDF-Export** (beides echte Downloads,
  ohne neue externe Infrastruktur).

## User Stories

- **US1 (Corporate):** Als Sponsor schließe ich mit einem Klick die exakte
  Restlücke einer Kampagne (Full-Tuition) per Karte; die Kampagne ist sofort
  finanziert und ich bekomme eine Rechnung. (P1)
- **US2 (Corporate):** Ich zeichne per SEPA-Überweisung mit USt-ID und
  PO-Nummer; die Zusage ist erfasst, die Rechnung zunächst offen und nach
  Settlement bezahlt. (P1)
- **US3 (Corporate):** Ich benenne das Stipendium und gebe mein Logo frei;
  Name und Logo erscheinen auf der Kampagne (Recognition), und der Beleg kippt
  korrekt von Zuwendungsbestätigung auf Sponsoring-Rechnung mit USt. (P1)
- **US4 (Corporate):** Ich sehe ein ESG-Dashboard meiner Wirkung (Studierende,
  Länder, Schulen, Summe) und exportiere es als CSV und PDF für mein
  CSRD-Reporting. (P2)
- **US5 (Studierende/Spender):** Ein Corporate-Full-Tuition-Ticket bringt die
  Kampagne über die Ziellinie und löst auch die Auszahlung der offenen
  Spender-Pledges aus (binäre All-or-Nothing-Auszahlung gesichert). (P2)
- **US6 (Corporate):** Ich rufe zu jedem Sponsoring den Beleg/die Rechnung ab
  (Rechnungsnummer, Netto/USt/Brutto, USt-ID, PO). (P3)

## Key Entities

- **CorporateSponsorship** — verknüpft eine `Donation` (type CORPORATE) mit
  campaignId, corporateProfileId, `tier` (SEMESTER/YEAR/FULL/CUSTOM),
  `fullTuition` (bool), `scholarshipName?`, `logoRecognition` (bool),
  `recognitionKind` (ANONYMOUS/LOGO/NAMED), `impactReportOptIn` (bool),
  `poNumber?`, `vatId?`. Eine Sponsoring-Transaktion mit Recognition-/B2B-Meta.
- **Invoice** — pro Sponsoring genau ein Beleg: `invoiceNo`, `documentType`
  (SPONSORING | DONATION), `netCents`, `vatCents`, `grossCents`, `vatId?`,
  `poNumber?`, `status` (ISSUED/PENDING/PAID), `settledAt?`. SPONSORING trägt
  19% USt, DONATION (Zuwendungsbestätigung) keine.
- **Donation** (bestehend) — Corporate-Sponsorings sind Donations mit
  `type=CORPORATE`; `amountCents` ist der zielgebundene (Netto-)Tuition-Beitrag.

## Success Criteria

- Full-Tuition per Karte schließt die Lücke, zieht sofort ein
  (`chargeImmediately`), Kampagne FUNDED, offene Spender-Pledges werden
  mitgecaptured; SEPA erfasst die Zusage mit USt-ID/PO und offener Rechnung.
- Recognition: Named Scholarship + Logo opt-in werden persistiert und auf der
  Kampagne angezeigt; der Belegtyp kippt korrekt (Logo → Sponsoring-Rechnung mit
  19% USt, sonst Zuwendungsbestätigung ohne USt).
- ESG-Dashboard liefert korrekte Aggregate (Studierende, Länder, Schulen,
  Summe, Voll-/Named-Stipendien) und ist als CSV **und** PDF herunterladbar.
- Boundary-Validation auf allen Corporate-DTOs ({success,data}-Envelope, USt-ID/
  PO/Recognition); `PaymentProvider`-Abstraktion bleibt die einzige Geld-Naht
  (neu: `chargeImmediately`).
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. Corporate-Sponsorship +
  Invoice + Recognition Demodaten).

## Out of Scope (ehrliche Abgrenzung)

- Echte SEPA-Lastschrift/-Mandate und echtes Bank-Settlement — SEPA ist als
  Konzept gemockt (sofort erfasst), der Settlement-Zustand wird per
  `settle`-Aktion demoable umgeschaltet.
- Rechtsgültige Steuerbelege — Rechnung/Zuwendungsbestätigung sind symbolische
  Prototyp-Dokumente (klar als solche gekennzeichnet), kein amtliches Muster.
- Gift-Agreement-Signatur-Workflow, automatischer Arbeitgeber-Match und der
  opt-in Talent-Profil-Kanal (spätere Ausbaustufen).
- Stripe Connect / echte Auszahlung an die Schule (bleibt MVP-seitig
  manuell/gemockt wie in E2); `chargeImmediately` mappt auf automatic-capture
  PaymentIntent, ist hier aber über den Mock-Provider abgebildet.
