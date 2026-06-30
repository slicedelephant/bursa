# Feature 014 — Employer Matching Auto-Detection (E13)

**Epic:** E13 · **Größe:** M · **Primäre Gruppe:** Einzelspender ·
**Hängt ab von:** E2 (Checkout/Spende), E4 (Donor-Account)

## WHY

20-30% der Spender arbeiten bei Firmen mit Matching-Programmen, wissen es aber
nicht oder scheuen die Bürokratie. Diaspora-Spender sitzen oft in Tech/Finance/
Pharma mit hohen Match-Limits (SAP, Google, Siemens, Novartis …). Das ist der
größte Geld-Multiplikator bei kleinem Aufwand: jeder geclaimte Match verdoppelt
(oder verdreifacht) eine Spende — die Match-Euro fließen wie jede andere Zuwendung
**direkt an die Business School, nie an den Studierenden**. Erwarteter Effekt:
+8-12% Kampagnen-Erfolg über Match-Euro.

Der bestehende Spenderpfad (E2) und der Donor-Account (E4) werden **nicht
umgebaut**, sondern erweitert: im Checkout erscheint ein prominentes Match-Angebot,
sobald die Arbeits-E-Mail-Domain des Spenders zu einem bekannten Arbeitgeber-
Programm passt; im Donor-Account erscheinen Match-Balance + Claim-History.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Matching-Detection:** der Spender gibt eine Arbeits-E-Mail ein (oder die Domain
  wird aus seiner Login-E-Mail abgeleitet); der pure `email-domain.ts`-Extractor
  normalisiert die Domain, der pure `employer-match-lookup.ts` prüft sie gegen eine
  (Mock-)Double-the-Donation-artige Arbeitgeber-DB (statischer Seed von ~30 bekannten
  Firmen mit Ratio + Jahres-Cap + Integration-Level).
- **Match-Offer im Checkout:** ein prominenter Callout "Dein Arbeitgeber (SAP/Google/
  Siemens) verdoppelt bis 5.000 €/Jahr" mit Claim-CTA. Der pure `match-amount.ts`
  rechnet den Match-Betrag aus (Ratio × Spende, gedeckelt durch das **verbleibende**
  Jahres-Limit des Spenders). Ein geclaimter Match wird als **zusätzliche committete
  Mittel** auf dasselbe Kampagnen-Ziel modelliert (CORPORATE-Spende vom Arbeitgeber,
  weiterhin an die Schule disbursed).
- **1-Tap Claim-Flow:** je nach `integrationLevel` des Arbeitgebers entweder ein
  pre-filled Antragslink zur Firma (`AUTO_SUBMIT` / `PORTAL`) oder eine generierte
  PDF-Antrags-Bestätigung über die wiederverwendete E5-PDF-Util (`MANUAL`).
- **Post-Claim-Tracking + Match-Balance-Display:** ein Live-Counter im Donor-Account
  ("800 € Match noch verfügbar dieses Jahr") plus eine Claim-History-Liste mit Status.
  Der pure `claim-status.ts` ist die Status-State-Machine (DETECTED → OFFERED →
  CLAIMED → SUBMITTED → APPROVED / REJECTED / EXPIRED).
- **Multi-Language-Labels:** der pure `match-labels.ts` liefert die Angebots-/Claim-/
  Balance-Texte in EN, DE, FR, ES; Arbeitgeber-Namen werden korrekt gerendert (echte
  Sonderzeichen/Akzente, keine Verstümmelung).

## User Stories

- Als **arbeitender Spender** möchte ich beim Spenden sofort wissen, ob mein
  Arbeitgeber Matching anbietet, ohne selbst zu recherchieren, damit ich nicht auf
  freies Geld verzichte.
- Als **Tech-Diaspora-Spender mit hohem Limit** möchte ich mit 1 Tap mein Matching
  aktivieren (Link oder PDF), damit Bürokratie mich nicht abhält.
- Als **wiederkehrender Spender** möchte ich in meinem Account sehen, wie viel
  Match-Budget ich dieses Jahr noch habe und welche Claims in welchem Status sind,
  damit ich mein Limit ausschöpfe.

## Functional Requirements

- **FR1 — Detect:** `POST /matching/detect` nimmt eine `workEmail` entgegen,
  extrahiert die Domain (pur, am Boundary validiert) und liefert ein Match-Programm
  (oder `eligible:false`). Eingeloggte DONOR werden mit ihrer detektierten
  Arbeitgeber-Zuordnung persistiert (E4-Account); anonyme Detection bleibt möglich.
- **FR2 — Offer:** `POST /matching/offer` berechnet für einen `campaignId` +
  `donationCents` + (Domain oder eingeloggter Spender) den Match-Betrag, gedeckelt
  durch das verbleibende Jahres-Limit, und liefert ein lokalisiertes Angebot.
- **FR3 — Claim:** `POST /matching/claim` legt einen `MatchClaim` an (idempotent je
  Spende), erzeugt den pre-filled Antragslink **oder** die Claim-PDF (E5-Util),
  bucht die committeten Match-Mittel als CORPORATE-Spende auf die Kampagne und
  verbucht den Betrag gegen die Jahres-Balance des Spenders.
- **FR4 — Balance/History:** `GET /matching/me/balance` (verbleibendes Jahres-Limit
  + Claim-History) für den eingeloggten DONOR; im Donor-Account sichtbar.
- **FR5 — Provider-Abstraktion:** die Arbeitgeber-DB liegt hinter einem
  `EmployerMatchProvider`-Symbol-Token; Default = deterministischer Mock, echtes
  Double-the-Donation-Skeleton env-gated (`EMPLOYER_MATCH_PROVIDER=mock|dtd`).
- **FR6 — Money to school:** Match-Mittel sind eine CORPORATE-Spende auf dieselbe
  Kampagne; sie fließen exakt wie jede andere Zuwendung an die Schule. Es wird **kein**
  echtes Corporate-Settlement und **kein** Geld an den Studierenden bewegt.

## Key Entities

- **EmployerMatchProgram** (neu, statisch/Seed) — ein bekanntes Arbeitgeber-
  Matching-Programm. `domain` (unique, z. B. `sap.com`), `employerName`,
  `matchRatio` (×100, z. B. 100 = 1:1, 200 = 2:1), `annualCapCents`,
  `minDonationCents`, `integrationLevel` (AUTO_SUBMIT / PORTAL / MANUAL),
  `applyUrlTemplate?`, `active`.
- **MatchClaim** (neu) — ein Claim eines Spenders gegen ein Programm. `donationId`
  (unique, idempotent), `programId`, `donorUserId?`, `campaignId`, `employerName`,
  `matchCents`, `status` (`MatchClaimStatus`), `applyUrl?`, `pdfRef?`,
  `matchDonationId?` (die committete CORPORATE-Spende), `year`, Zeitstempel.
- **User** (bestehend, E4 — erweitert) — neue Felder für den detektierten
  Arbeitgeber + die Jahres-Match-Balance: `employerName?`, `employerDomain?`,
  `matchYear?`, `matchUsedCents` (default 0). Keine neuen Geld-Felder am Money-Pfad.
- **Donation** (bestehend, E2 — wiederverwendet) — die committete Match-Spende ist
  eine ganz normale `CORPORATE`-Donation (`status SUCCEEDED`, `method SEPA`,
  `donorName = employerName`); zählt aufs Kampagnen-Ziel.
- **Campaign** (bestehend, E2) — Empfänger-Kampagne; `raisedCents` wächst um den
  committeten Match (mit derselben Over-Funding-Kappung wie E2).

## Success Criteria

- Detect liefert für eine bekannte Domain (z. B. `someone@sap.com`) das passende
  Programm, für eine unbekannte Domain `eligible:false`.
- Der Match-Betrag ist Ratio × Spende, hart gedeckelt durch das verbleibende
  Jahres-Limit (nie negativ, nie über Cap).
- Ein Claim verbucht die Match-Mittel als CORPORATE-Spende auf die Kampagne, erhöht
  `raisedCents` und reduziert die verbleibende Jahres-Balance des Spenders.
- Ein zweiter Claim auf dieselbe Spende ist idempotent (kein Doppel-Match).
- Die Balance-Anzeige im Donor-Account zeigt das korrekte verbleibende Jahres-Limit.
- Angebots-/Claim-/Balance-Texte erscheinen in EN/DE/FR/ES; Arbeitgeber-Namen mit
  Akzenten werden korrekt gerendert.
- Default-Lauf + alle Tests laufen mit `EMPLOYER_MATCH_PROVIDER=mock` (kein Netz).
- API + Web `test:cov` grün (Per-Path-80% auf allen neuen reinen Dateien), beide
  Builds grün, Seed idempotent.

## Out of Scope (ehrliche Abgrenzung)

- **Keine** echte Double-the-Donation-API im Default-Lauf und in den Tests. Der
  Prototyp liefert einen **deterministischen Mock** (`MockEmployerMatchProvider`,
  ~30 Firmen); der echte `DoubleTheDonationProvider` ist ein einschaltbares Skeleton
  (env-gated, `fetch`), wird in den Tests **nicht** ausgeführt, muss aber kompilieren
  — exakt die Linie von `MockPaymentProvider` / `StripePaymentProvider`.
- **Keine** automatische Antrags-Einreichung beim Arbeitgeber. Der Claim erzeugt im
  Prototyp einen pre-filled Antragslink **oder** eine Bestätigungs-PDF — die
  tatsächliche Einreichung beim HR-/Matching-Portal macht der Spender selbst.
- **Kein** echtes Corporate-Settlement. Die committeten Match-Mittel sind eine
  Prototyp-Zusage (eine CORPORATE-Spende auf die Kampagne), kein realer Geldfluss
  vom Arbeitgeber. Geld an den Studierenden wird nie bewegt.
- **Keine** Verifikation der Arbeits-E-Mail (kein Bestätigungs-Mail-Flow). Die Domain
  wird vertrauensvoll aus der Eingabe abgeleitet; eine echte Employer-Verification
  (E21 Payroll/HRIS) ist nicht Teil dieses Epics.
- **Kein** echtes Jahres-Reset per Cron. Das "verbleibende Jahres-Limit" wird je
  Kalenderjahr (`matchYear`) berechnet; ein neues Jahr setzt die genutzte Balance
  beim ersten Claim implizit zurück, ohne Hintergrund-Job.
- **Keine** Kopplung an das tiefe Corporate-Matching (E21 ADP/Workday/Paychex). E13
  ist bewusst die leichte Donor-Auto-Detection-Vorstufe.
