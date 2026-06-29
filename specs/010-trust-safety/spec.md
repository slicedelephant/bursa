# Feature 010 — Trust-and-Safety Operations Console (E9)

## WHY

Bursa lebt vollständig von Vertrauen: ein einziger Scam-Fall — eine gefälschte
Kampagne, eine Welle Card-Testing, eine Reihe Chargebacks — kostet die USP
("Geld geht direkt an die Schule, nie an den Studierenden"). Heute gibt es dafür
keine zentrale Kontrolle: Kampagnen werden nicht systematisch moderiert, es gibt
keine Fraud-Detection pro Transaktion, Chargebacks werden manuell im
Stripe-Dashboard verwaltet und Moderations-Entscheidungen hinterlassen keinen
durchsuchbaren Audit-Trail. Bei den angepeilten >100k EUR/Monat wird fehlendes
Safety-Ops vom Komfort-Thema zum Reputations- und Rechtsrisiko.

Dieses Epic gibt dem Bursa-Operator eine **Operations-Console**, die genau das
zentralisiert, was GoFundMe (Combined Human+AI Moderation) und Stripe Radar
(Risk-Scoring, automatische Entscheidungsregeln) vormachen — aber ehrlich als
**deterministische Heuristik** statt als echtes ML-Modell. Es kommt keine neue
externe Infrastruktur dazu (Linie von E6/E7): Chargebacks treffen als
(gemockte) Stripe-Webhook-Events ein und werden über den **E6-Webhook-Signatur-
Guard** signaturgeprüft; jede Moderations-Aktion landet im bestehenden
**E6-AuditLog**; die Fraud-/Chargeback-Signale werden in den **E7-Observability-
Stream** eingespeist statt ein zweites Metriken-System zu bauen. Der geprüfte
Geld-Pfad bleibt unangetastet — ein Freeze stoppt nur eine Kampagne/ein Konto,
ein Auto-Refund-Angebot ist eine Entscheidung, kein echter Geld-Rückfluss.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Campaign Moderation Queue:** verdächtige Kampagnen werden automatisch
  geflaggt — verdächtige Keywords, OFAC-/sanktionierte Länder (kleine statische
  Liste), Duplikat-Kampagnen (Titel-/Story-Ähnlichkeit) — über pure Regeln
  (`moderation-rules.ts` + `ofac-keyword-matcher.ts`). Ein Operator reviewt
  manuell: **approve / reject / escalate**, jede Aktion mit Grund.
- **Fraud-Scoring pro Transaktion:** deterministische Heuristik-Regelfunktionen
  (kein ML). Card-Testing-Pattern (schnelle Versuche, fehlgeschlagene
  Transaktionen) in `card-testing.ts`; der Gesamt-Score aggregiert die
  Teilsignale in `fraud-score.ts` → `{ score, level, reasons[] }`.
- **Donor Risk Scoring:** Geografie-Risiko, Transaktions-Velocity
  (>5 Spenden in 1h), Karten-Typ-Risiko, Auto-Flag für Beträge >5.000 EUR
  (`donor-risk.ts` + `velocity-tracker.ts`). Der Score wird auf dem `User`
  persistiert und als `FraudSignal` protokolliert.
- **Dispute- & Chargeback-Management:** eine Queue, gespeist von (gemockten)
  Stripe-Chargeback-Webhook-Events (E6-Signatur-Guard, idempotent über
  `providerEventId`). Evidence-Collection-Stub (`evidenceNote`) und ein
  Auto-Refund-Angebot für niedrigwertige Disputes (`chargeback-rules.ts`).
- **Automatische Freezes:** reine Entscheidungslogik (`auto-freeze.ts`) —
  Kampagne ab **3+ Chargebacks** einfrieren; Donor-Konto ab **2+ fehlgeschlagenen
  Transaktionen + Chargeback-Pattern** einfrieren. Der Freeze setzt nur
  Status-Flags, er fasst den Geld-Pfad nicht an.
- **Community Flagging:** Reporter-Button auf der Kampagnen-Seite (End-Nutzer
  melden verdächtige Kampagnen, optional ohne Login, rate-limited über den
  E6-Guard) + Flagging-Analytics im Dashboard.
- **Audit-Log:** jede Moderations-Aktion wird über den **E6-AuditService**
  geloggt (wer, wann, Aktion, Grund, Resultat) und ist als CSV exportierbar.
- **Dashboard & Reports:** Fraud-Trends, Chargeback-Rate, Moderations-Backlog
  und eine Risk-Heat-Map nach Geografie (`dashboard-aggregation.ts` +
  `risk-heat-map.ts`), als Operator-View im Muster der E7-Observability-Console.

## User Stories

- **US1 (Bursa-Operator):** Als Operator will ich auf einen Dashboard-Blick
  sehen, welche Kampagnen/Spender heute fraud-verdächtig sind, damit ich schnell
  handeln kann. (P1)
- **US2 (Trust-and-Safety-Analyst):** Als Analyst will ich eine Moderations-Queue
  sortiert nach Risk-Score, damit ich mich auf die riskantesten Fälle
  konzentriere. (P1)
- **US3 (Bursa-Operator):** Als Operator will ich eine geflaggte Kampagne mit
  einem Klick approve/reject/escalate, mit Pflicht-Grund, damit nur geprüfte
  Kampagnen live bleiben. (P1)
- **US4 (Bursa-Operator):** Als Operator will ich eingehende Chargebacks in einer
  Queue sehen, Evidence hinterlegen und für niedrige Disputes ein Refund-Angebot
  auslösen, statt im Stripe-Dashboard zu arbeiten. (P1)
- **US5 (End-Nutzer/Spender):** Als Besucher will ich eine verdächtige Kampagne
  mit einem Button melden, damit das Trust-Team sie prüft. (P2)
- **US6 (Bursa-Legal):** Als Legal will ich den Audit-Trail aller
  Moderations-Entscheidungen als CSV exportieren, damit ich bei
  Regulatory-Anfragen 100% Transparenz habe. (P2)

## Key Entities

- **ModerationCase** (neu) — ein Moderationsfall pro Kampagne (`@unique`
  campaignId, idempotenter Re-Scan): `status` (OPEN/APPROVED/REJECTED/ESCALATED),
  `riskScore`, `riskLevel`, `reasons` (Json), `autoFlagged`, `decisionNote`,
  `reviewedById/-At`.
- **FraudSignal** (neu) — ein protokolliertes Signal pro Transaktion/Spender
  (`kind` CARD_TESTING/DONOR_RISK/VELOCITY/HIGH_VALUE, `score`, `riskLevel`,
  `reasons`), weiche Referenzen auf Donation/User/Campaign.
- **Chargeback** (neu) — ein Dispute aus einem (gemockten) Webhook-Event
  (`providerEventId` unique, `amountCents`, `reason`, `status`
  OPEN/EVIDENCE_SUBMITTED/REFUND_OFFERED/WON/LOST, `evidenceNote`,
  `refundOffered`).
- **CampaignFlag** (neu) — ein Community-Report (`reason` Enum, `note`,
  `reporterUserId?` (null = anonym), `visitorId?`, `status`
  OPEN/REVIEWED/DISMISSED).
- **Campaign** (erweitert) — `frozen`, `frozenAt`, `freezeReason` (Freeze-Gate
  für Live-/Payout-Pfad).
- **User** (erweitert) — `frozen`, `frozenAt`, `freezeReason`, `riskScore`,
  `riskLevel` (Donor-Risk).
- **AuditLog** (bestehend, E6) — wiederverwendet: jede Moderations-/Freeze-/
  Chargeback-Aktion wird hier geloggt (keine neue Audit-Tabelle).

## Success Criteria

- Eine Kampagne mit verdächtigen Keywords, sanktioniertem Land oder Duplikat
  wird automatisch geflaggt (`autoFlagged`, `riskScore`, `reasons`) und erscheint
  in der Queue, nach Risk-Score sortiert.
- Approve/Reject/Escalate ändert den Fall-Status, schreibt den Pflicht-Grund und
  legt einen **AuditLog-Eintrag** an (Aktor, Aktion, Target, Grund, Resultat);
  Reject friert die Kampagne ein.
- Fraud-Scoring ist deterministisch und pur: dieselbe Eingabe liefert denselben
  `{ score, level, reasons }`; Card-Testing- und Velocity-Muster werden erkannt,
  Beträge >5k EUR werden auto-geflaggt.
- Chargeback-Webhook akzeptiert nur **E6-signaturgeprüfte** Payloads
  (`400 INVALID_SIGNATURE` sonst), ist idempotent über `providerEventId`,
  speist den Fall in die Queue und das E7-Analytics ein; der dritte Chargeback
  einer Kampagne friert sie automatisch ein.
- Donor-Freeze greift ab 2+ fehlgeschlagenen Transaktionen + Chargeback-Pattern;
  die Freeze-Entscheidung ist pur und voll testbar.
- Auto-Refund-Angebot wird nur für Disputes unterhalb der Schwelle vorgeschlagen
  (reine Regel); kein echter Geld-Rückfluss.
- Community-Flag von der Kampagnen-Seite (optional ohne Login, rate-limited)
  persistiert einen `CampaignFlag`; Flagging-Analytics erscheinen im Dashboard.
- Audit-CSV-Export liefert alle Moderations-Aktionen strukturiert.
- Dashboard liefert Fraud-Trends, Chargeback-Rate, Moderations-Backlog und
  Risk-Heat-Map nach Geografie — immutabel und korrekt aggregiert.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. Trust-Safety-Demodaten).
- `PaymentProvider`-Abstraktion, Immutabilität und `{success,data}`-Envelope
  bleiben gewahrt; E6-AuditLog und E7-Observability werden wiederverwendet, nicht
  dupliziert. Geld weiterhin nur an die Schule.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** echtes ML-Modell und **kein** echtes Stripe Radar. Das Fraud-/
  Risk-Scoring sind bewusst **deterministische Heuristik-Regelfunktionen** (pure,
  testbar). GoFundMe/Stripe Radar sind die Inspiration, nicht eine literale
  ML-Implementierung — ein trainiertes Modell ist ein eigenes Epic.
- **Keine** echte OFAC-/Sanktions-API und **kein** Live-Sanctions-Feed — nur
  eine kleine **statische** Länderliste im Code. Ein angebundener
  Sanctions-Provider (Sumsub/OFAC SDN) ist ein dokumentierter Folge-Schritt
  (Synergie mit E11 KYC).
- **Keine** echte Stripe-Dispute-Integration — Chargebacks kommen als
  **gemockte** Stripe-Webhook-Events (E6-Signatur-Guard ist real wirksam). Kein
  echter Stripe-Dispute-API-Call, keine echte Evidence-Submission an Stripe.
- **Kein** echter Refund-Vollzug — das Auto-Refund-Angebot ist eine
  Entscheidung/ein Status. Der geprüfte Geld-Pfad (`PaymentProvider`) wird nicht
  angefasst; Geld fließt weiterhin nur an die Schule.
- **Kein** verteiltes/Echtzeit-Streaming-Fraud-System und kein eigenes
  Metriken-Backend — in-memory/heuristisch, single-instance, gleiche pragmatische
  Linie wie die E6/E7-Stores. Fraud-/Chargeback-Signale werden in das
  **bestehende** E7-Analytics eingespeist.
- **Kein** CAPTCHA/Bot-Challenge auf dem Community-Flag-Endpunkt — das
  E6-Velocity-Rate-Limit ist der Schutz; ein CAPTCHA ist ein dokumentierter
  Folge-Schritt.
