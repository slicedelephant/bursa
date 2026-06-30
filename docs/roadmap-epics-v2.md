# Bursa - Roadmap Welle 2 (E8-E21)

> Detaillierte Epic-Spezifikationen fuer die naechste Welle, abgeleitet aus 4 zielgruppen-spezifischen Research-Agents (Konkurrenzanalyse) plus Product-Owner-Synthese. Executive-Zusammenfassung: `09_Product_Ideas/0911_FundingApp/260629_Bursa_NextEpics_ExecutiveReport.md` (OneDrive). Vorgaenger: `roadmap-epics.md` (E1-E7, alle FERTIG).

## Freigabe-Status (Stand 29.06.2026)

- **Welle A (E8, E9, E10): UMGESETZT und gemerged** -> autonom ueber spec-kit gebaut, je Epic ein Agent + eigener PR.
  - E8 School-Self-Serve-Portal: branch `009-school-portal`, PR #8, gemerged (API 440 / Web 238 Tests).
  - E9 Trust-and-Safety Console: branch `010-trust-safety`, PR #9, gemerged (API 548 / Web 252 Tests).
  - E10 AI Fundraising Coach: branch `011-ai-coach`, PR #10, gemerged (API 620 / Web 270 Tests).
  - Finaler `main` (e8c8a16): beide Builds gruen, Seed laeuft, alle Migrationen sauber.
- **Welle B (E11-E17): UMGESETZT und gemerged** (Stand 01.07.2026) -> autonom ueber spec-kit gebaut, je Epic ein Agent + eigener PR, in Abhaengigkeits-Reihenfolge.
  - E11 KYC & Verification Pipeline: branch `012-kyc-verification`, PR #11, gemerged.
  - E12 Payout-Reconciliation + Append-only-Ledger: branch `013-payout-reconciliation`, PR #12, gemerged.
  - E13 Employer Matching Auto-Detection: branch `014-employer-matching`, PR #13, gemerged.
  - E14 ESG/CSRD-Reporting (auf E12-Ledger): branch `015-csrd-reporting`, PR #14, gemerged.
  - E16 Spender-Portfolio + Gamification-Primitive: branch `016-donor-portfolio`, PR #15, gemerged.
  - E15 Referral- + Advocate-Engine (auf E16): branch `017-referral-engine`, PR #16, gemerged.
  - E17 Multi-Channel Impact-Feed (WhatsApp/Telegram): branch `018-impact-feed`, PR #17, gemerged.
  - Finaler `main` (2632b5e): beide Builds gruen, Seed laeuft, 17 Migrationen sauber, prettier-clean. Testsumme: API 1179 / Web 494.
  - Alle externen Dienste (Persona/Onfido/Sumsub/Plaid, Double-the-Donation, WhatsApp/Telegram) gemockt hinter austauschbaren Providern (Default `mock`, keine echten Keys noetig).
- **Welle C (E18-E21): zurueckgestellt** -> XL-Brocken (E19 Scholarship-Manager, E20 Multi-Currency) erst nach Kapazitaetsklaerung.

## Kurzfazit

Welle 2 macht Bursa vom Trust-Prototyp zur skalierbaren Plattform. Reihenfolge nach Bursa-Logik: erst Vertrauen und Angebotsseite haerten (E8 Schul-Portal, E9 Trust-and-Safety, E11 KYC), dann Geld-Hebel zuenden (E13 Employer-Match, E12 Reconciliation/Transparenz, E14 CSRD-Reporting), dann Wachstum (E15 Referral, E16 Portfolio, E18 Gruppen). 19 Roh-Vorschlaege wurden zu 14 Epics konsolidiert und in 3 Wellen priorisiert.

## Wellen-Uebersicht

| # | Epic | Primaere Gruppe | Groesse | Welle | Haengt ab von |
|---|---|---|---|---|---|
| E8 | School-Self-Serve-Portal und Partner-Onboarding | Developer/Owner | L | A | E1, E5 |
| E9 | Trust-and-Safety Operations Console | Developer/Owner | L | A | E6, E7 |
| E10 | AI Fundraising Coach | Studierende | M | A | E3 |
| E11 | Automated KYC und Verification Pipeline | Developer/Owner | XL | B | E1, E6, E8 |
| E12 | Payout-Reconciliation und Transparenz-Layer | Developer/Owner | L | B | E2, E5 |
| E13 | Employer Matching Auto-Detection | Einzelspender | M | B | E2, E4 |
| E14 | ESG/CSR Audit-Trail und CSRD-Reporting | Corporate | L | B | E5, E7, E12 |
| E15 | Referral- und Advocate-Engine | Studierende | L | B | E4, E16 |
| E16 | Spender-Portfolio und Giving-Streaks | Einzelspender | M | B | E4 |
| E17 | Multi-Channel Impact-Feed (WhatsApp/Telegram) | Einzelspender | M | B | E4 |
| E18 | Gruppen-Engine: Cohort-Teams und Giving Circles | Studierende | L | C | E2, E4, E16 |
| E19 | Self-Serve Corporate Scholarship Program Manager | Corporate | XL | C | E1, E2, E5, E11 |
| E20 | Multi-Currency und lokale Zahlungsmethoden | Developer/Owner | XL | C | E2, E12 |
| E21 | Payroll-Match und HRIS-Kopplung | Corporate | L | C | E5, E13 |

---

# Welle A - Fundament

## E8 - School-Self-Serve-Portal und Partner-Onboarding

**Groesse:** L · **Primaer:** Developer/Owner · **Haengt ab von:** E1, E5

**Problem / Warum jetzt:** Schulen werden heute vom Bursa-Team manuell verifiziert, onboarded und in den Kampagnen-Workflow integriert (2-4h pro Schule). Bei Expansion auf 50+ Schulen unmoeglich zu skalieren. Stripe Connect zeigt die Loesung: Connected Accounts onboarden selbststaendig (hosted onboarding flow) mit inkrementeller KYC und self-service activation.

**Scope:**
- School-Admin-Portal (dedizierte URL pro Schule, brandbar mit Bursa-Logo plus Schulname)
- Studierende-Verifizierung: School-Admin laedt Zulassungsdaten hoch (CSV oder API-Import), markiert Studierende als verified/rejected
- Auszahlungsdaten Self-Service: Bank-Daten, Tax-ID, Kontaktperson, digitale Vereinbarung (DocuSign-Integration)
- Kampagnen-Genehmigung: School-Admin reviewt und genehmigt Kampagnen vor Publikation
- Echtzeit-Dashboard: Auszahlungsstatus pro Student, Gesamtbudget pro Schule, Spender-Statistiken nach Geografie
- Hosted Onboarding Flow (a la Stripe): One-Time-Link zum Abschluss der Registrierung
- Webhooks fuer School-Events: Studierende gemeldet, Kampagne genehmigt, Auszahlung gesendet

**Konkurrenz-Inspiration:** Stripe Connect (Connected Accounts mit hosted account onboarding, one-click networked onboarding, inkrementelle KYC).

**User Stories:**
- Als Schul-Admin moechte ich meine Studierenden-Liste hochladen und mit 2 Klicks verifizieren, damit ich nicht mit dem Bursa-Team koordinieren muss.
- Als Schul-CFO moechte ich mein Bankkonto einmal eingeben und dann automatisch Auszahlungen erhalten, damit ich meine Buchhaltung reconcilieren kann.
- Als Bursa-Operator moechte ich neue Schulen via Self-Service onboarden, damit ich meine Zeit auf Moderation und Growth verwende statt Daten-Entry.

**Erfolgsmetriken:** Onboarding-Zeit pro Schule von 2-4h auf 15min (>90% Completion); Schul-Retention >70% monatlich; von 5 auf 25+ Schulen in 6 Monaten ohne Mehrpersonal; Support-Tickets fuer School-Integration -80%.

---

## E9 - Trust-and-Safety Operations Console

**Groesse:** L · **Primaer:** Developer/Owner · **Haengt ab von:** E6, E7

**Problem / Warum jetzt:** Keine zentrale Moderation der Kampagnen, keine Fraud-Detection, Chargebacks werden manuell im Stripe-Dashboard verwaltet, keine Audit-Trails. Bursa lebt komplett von Vertrauen - ein einziger Scam-Fall kostet die USP. Bei >100k EUR/Monat wird fehlendes Safety-Ops zum Reputations-Risiko.

**Scope:**
- Campaign Moderation Queue: verdaechtige Kampagnen auto-geflaggt (Keywords, OFAC-Laender, Duplicate Campaigns), manueller Review
- AI-Fraud-Scoring pro Transaktion: Card-Testing-Pattern-Detection, Donor-Risk-Scoring (Laender, Transaction Size, Velocity)
- Donor Risk Scoring: Geography Risk, Transaction Velocity (>5 Spenden in 1h), Card-Type Risk, Auto-Flag fuer >5k EUR
- Dispute- und Chargeback-Management: Queue (Stripe Webhooks), Evidence-Collection, Auto-Refund-Angebot fuer niedrige Disputes
- Automatic Freezes: Kampagne bei 3+ Chargebacks, Donor-Account bei 2+ Failed Transactions plus Chargeback-Pattern
- Community Flagging: Reporter-Button auf Kampagnen-Seite, Flagging-Analytics
- Audit Log: jede Moderation-Aktion geloggt (wer, wann, Aktion, Grund, Resultat)
- Dashboard und Reports: Fraud-Trends, Chargeback-Rate, Moderation-Backlog, Risk-Heat-Map nach Geografie

**Konkurrenz-Inspiration:** GoFundMe (ML-Fraud-Detection, Combined Human+AI Moderation, 24/7 Trust-and-Safety, Enforcement Actions); Stripe Radar (ML fraud detection, risk scoring, automatic decision rules).

**User Stories:**
- Als Bursa-Operator moechte ich auf einen Dashboard-Blick sehen, welche Kampagnen/Spender heute fraud-verdaechtig sind, damit ich schnell handeln kann.
- Als Trust-and-Safety-Analyst moechte ich eine Queue sortiert nach Risk-Score, damit ich mich auf die riskantesten Faelle konzentriere.
- Als Bursa-Legal moechte ich einen Audit-Trail aller Moderation-Entscheidungen exportieren (CSV), damit ich bei Regulatory-Anfragen 100% Transparenz habe.

**Erfolgsmetriken:** Fraud-Detection-Rate >85% vor Payout; False-Positive-Rate <2%; Moderation-Backlog <10 Faelle/Tag; Chargeback-Rate -50%; Time-to-Action fuer Critical Fraud <30min.

---

## E10 - AI Fundraising Coach

**Groesse:** M · **Primaer:** Studierende · **Haengt ab von:** E3

**Problem / Warum jetzt:** Studierende kaempfen damit, ihre Story in Worte zu fassen. GoFundMe AI Coach zeigt: KI-generierte Titel/Beschreibungen heben die Conversion. 30% der NGOs nutzen bereits KI-Fundraising-Tools. Bursa-Fundraiser verlieren Zeit beim Schreiben statt beim Netzwerken; viele haben sprachliche Huerden.

**Scope:**
- AI Titel-Generator (kurz, emotional, wirkungsvoll) aus Kurzinput
- AI Story-Draft: 2-3 Absaetze Kampagnen-Beschreibung basierend auf Schule + Ziel + Motivation
- AI Social-Share-Texte: WhatsApp/Email/LinkedIn optimiert pro Netzwerk-Typ
- 1-Klick-Refresh: mehrere Varianten generieren, beste waehlen (A/B)
- Tone-Control: echte deutsche Umlaute, authentisch (keine AI-Floskeln), an Bursa-Brand angepasst
- Token-Tracking pro Nutzer (falls API-Token-begrenzt)

**Konkurrenz-Inspiration:** GoFundMe AI Fundraising Coach, spotfund AI, Fundwriter.ai.

**User Stories:**
- Als MBA-Studierender aus Pakistan moechte ich in 2 Minuten einen emotionalen Titel plus 3 Social-Varianten generieren, damit mein Diaspora-Netzwerk versteht, worum es geht - ohne selbst schreiben zu muessen.
- Als Fundraiser mit schwachem Deutsch moechte ich AI-Texte, die authentisch klingen und Bursas Brand reflektieren, damit Spender vertrauen.
- Als vielbeschaeftigte MBA-Studentin moechte ich A/B-Varianten meiner Story generieren und die beste waehlen, damit ich mehr Zeit fuers Networking habe.

**Erfolgsmetriken:** 75%+ der Fundraiser nutzen den Coach mind. einmal; Campaign-Writing-Time von 2h auf <15min; +15% CTR auf Social bei AI-Titeln; Authentizitaet 4-5/5 im Nutzer-Feedback.

**Hinweis:** Bursa-Stack hat bereits Claude-API-Naehe (gpt-image-1 im Seed). LLM-Integration hinter eigener Abstraktion, damit Provider austauschbar bleibt.

---

# Welle B - Geld-Hebel und Wachstum

## E11 - Automated KYC und Verification Pipeline

**Groesse:** XL · **Primaer:** Developer/Owner · **Haengt ab von:** E1, E6, E8

**Problem / Warum jetzt:** Studierende laden heute Diplom hoch, manueller Abgleich mit Schul-Datenbanken (dauert Tage, fehleranfaellig). Fuer Spender keine Fraud-Checks (Card-Testing, AML fuer Corporate mit hohem Volumen). Ohne automatisierte KYC kein Skalieren ueber ~100 Studierende/Monat und nicht FATF-AML-konform.

**Scope:**
- Liveness Check: Video-Selfie (Persona/Onfido API), Deepfake-Detection, Wiederverwendungs-Schutz
- Dokumenten-Verifizierung: Diplom-Upload mit OCR, ML-Matching gegen School-Database (Fuzzy Matching)
- AML-Screening fuer Spender: Corporate >5k EUR/Monat durchlaufen AML-Check (Sumsub), OFAC-Blocklist
- Risiko-Scoring fuer Studierende: Geographic Risk, optionale Income Verification, School-Accreditation-Check
- Webhook-Integration mit School-APIs: Verifizierung direkt gegen School-Registrar wenn verfuegbar (Synergie mit E8)
- Fallback: Manual Review Queue fuer Exceptions
- Audit Trail: jede Verifizierungs-Entscheidung geloggt fuer Regulatory Compliance

**Konkurrenz-Inspiration:** Persona (Document/Biometric/Liveness/Deepfake, 211+ Laender), Onfido, Plaid Identity (190 Laender), Sumsub (KYC+KYB+AML).

**User Stories:**
- Als Studierender moechte ich Diplom hochladen plus Liveness-Check machen und in 5min verifiziert sein (statt 1-2 Tage).
- Als Bursa-Operator moechte ich automatische AML-Checks fuer alle Corporate-Sponsoren >5k EUR, damit uns keine Sanctions-Hits ueberraschen.
- Als Compliance-Officer moechte ich einen Audit-Trail aller Verifizierungs-Entscheidungen, damit wir externe Audits bestehen.

**Erfolgsmetriken:** >80% Self-Service-Verifizierung; Turnaround <5min (median, auto-approved); False-Positive <3%; AML-Hit-Rate <0.5%; Manual-Review-Backlog <20 Faelle/Monat.

---

## E12 - Payout-Reconciliation und Transparenz-Layer

**Groesse:** L · **Primaer:** Developer/Owner · **Haengt ab von:** E2, E5

**Problem / Warum jetzt:** School-CFO erhaelt Auszahlung, aber keine automatische Abstimmung mit dem Bursa-System (manueller Abgleich = Fehlerquelle). Keine Export-Funktionalitaet fuer Buchhaltung, keine Tax-Reports. Macht die Trust-USP "Geld geht an die Schule" von einer Behauptung zu einem Beleg. Liefert das Append-only-Ledger-Primitive, das E14 mitnutzt.

**Scope:**
- Automated Payout Reconciliation: Plaid Bank Feed (School verlinkt Bankkonto, Auto-Match), Report zeigt matched/unmatched/pending
- School-Dashboard: Auszahlungs-History mit Status, Matched-Banktransaktionen, Discrepancy-Flagging
- CSV- und PDF-Export: Auszahlungs-Liste, Tax-Report (1099-Format US, SEPA-Doku EU)
- Double-Entry Accounting Export: QuickBooks/Wave/NetSuite (Debit/Credit, GL Codes)
- Public Transparency API: aggregierte Funding-Statistiken pro Schule (total raised, total paid out, Spender-Geografie) fuer Schul-Websites
- Tax Compliance Reports: 1099-Aequivalent, SEPA-Mandate-Doku, AML-verdaechtige-Transaktionen-Report
- Reconciliation Alerts: Auto-Alert, wenn Auszahlung im System aber nicht im Bank Feed (nach 48h)

**Konkurrenz-Inspiration:** Stripe (Payout Reconciliation Report plus API, NetSuite Connector), Open Collective (Transaction Transparency, Bulk Exports), Plaid (Bank Feed APIs).

**User Stories:**
- Als School-CFO moechte ich mein Bankkonto verlinken und taeglich einen Auto-Reconciliation-Report sehen, damit ich nicht manuell abstimme.
- Als School-Accountant moechte ich einen CSV-Export mit Auszahlungen plus Tax-Details, damit ich ihn in unsere ERP einfuege.
- Als School-Fundraising-Director moechte ich eine Public Transparency URL teilen, damit Spender sehen, dass alles direkt in die Studiengebuehren geht.

**Erfolgsmetriken:** >95% Auto-Match; Reconciliation-Turnaround <24h; >70% Schulen exportieren monatlich; <1 Reconciliation-Fehler/Schule/Monat; 2-4h/Schule/Monat gespart.

---

## E13 - Employer Matching Auto-Detection

**Groesse:** M · **Primaer:** Einzelspender · **Haengt ab von:** E2, E4

**Problem / Warum jetzt:** 20-30% der Spender arbeiten bei Firmen mit Matching-Programmen, wissen es aber nicht oder scheuen die Buerokratie. Diaspora-Spender sitzen oft in Tech/Finance/Pharma mit hohen Match-Limits. Groesster Geld-Multiplikator bei kleinem Aufwand.

**Scope:**
- Matching-Detection: Work-Email eingeben oder Email-Domain auto-detect, Pruefung gegen Double-the-Donation-API (20.000+ Firmen)
- Match-Offer im Checkout: prominenter Callout "Dein Employer verdoppelt bis 5000 EUR/Jahr" mit Claim-CTA
- 1-Tap Claim-Flow: pre-filled Antragslink zur Firma (oder PDF), je nach Employer-Integration-Level
- Post-Claim Tracking und Match-Balance-Display: Live-Counter "800 EUR Match noch verfuegbar dieses Jahr"
- Multi-Language: EN, DE, FR, ES, Employer-Namen lokal korrekt

**Konkurrenz-Inspiration:** Double the Donation (Email-Domain-Check, Auto-Submission-Beta), Daffy (Employer Matching mit Public/Private Stock).

**User Stories:**
- Als arbeitender Spender moechte ich wissen, ob mein Employer Matching anbietet, ohne selbst zu recherchieren, damit ich nicht auf freies Geld verzichte.
- Als Tech-Diaspora-Spender mit hohem Limit moechte ich mit 1 Tap mein Matching aktivieren, damit Buerokratie mich nicht abhaelt.
- Als Arbeitgeber-Sponsor moechte ich mein Match-Budget genutzt und angerechnet sehen, damit ESG-Reporting stimmt.

**Erfolgsmetriken:** 20% der aktiven Spender triggern Check; Eligibility 35%; Claim-Rate 40%; Avg. Match 1200 EUR/Jahr/Spender; Re-Aktivierung im Folgejahr 75%. Effekt: +8-12% Kampagnen-Erfolg.

---

## E14 - ESG/CSR Audit-Trail und CSRD-Compliance-Reporting

**Groesse:** L · **Primaer:** Corporate · **Haengt ab von:** E5, E7, E12

**Problem / Warum jetzt:** CSRD zwingt grosse Firmen zur externen Assurance ihrer ESG-Claims. Ohne CSRD-faehiges Reporting kein CFO-Buy-in, also kein ernstes Corporate-Geld. Teilt sich das Append-only-Ledger mit E12.

**Scope:**
- Immutable Transaction Log: jede Donation/Award/Disbursement/Volunteering als Append-only-Log-Entry (Timestamp, Actor, Amount, Recipient, Reason), kryptographische Hashes optional
- Compliance-Tagging: ESG-Kategorie pro Transaktion (z.B. Quality Education, Gender Equality, Geographic Reach)
- Diversity-Data-Capture: optionale Felder beim Scholar-Onboarding (Gender, Age, Country, First-Gen), Aggregate-Reports
- Report-Builder: Standard waehlen (GRI 2024, CSRD, SASB, UN SDG), Auto-Mapping der Transaktionsdaten
- PDF/CSV-Export mit Audit-Annotations: Fussnoten auf Quell-Transaktionen
- Export-Access-Control: Auditor erhaelt zeitlich begrenzten Read-Only-Zugriff (URL oder Audit-Portal)
- Data-Quality-Dashboard: Completeness Score der ESG-Daten
- Trend-Viz: Year-over-year fuer Board-Presentations

**Konkurrenz-Inspiration:** Goodera (audit trail, GRI/CSRD, diversity, external assurance), Submittable (compliance, impact measurement), Kaleidoscope (outcome tracking, demographics).

**User Stories:**
- Als CFO moechte ich einen CSRD-konformen ESG-Report exportieren, der dem Auditor alle Transaktions-Details zeigt.
- Als Compliance-Officer moechte ich, dass jede Donation einen immutable Audit-Trail hat, unmoeglich zu manipulieren.
- Als HR-Manager moechte ich einen Diversity-Report mit hoher Datenqualitaet, aber optionalem Fielding (kein Privacy-Shock).
- Als externer Auditor moechte ich temporaeren Read-Only-Zugang (z.B. 48h), um Transaktionen stichprobenartig zu verifizieren.

**Erfolgsmetriken:** 10+ Firmen generieren CSRD-Reports im Q1; Audit-Readiness 100%; Diversity-Datenqualitaet 85%; Report-Generierung <30s; Auditor-NPS 8.0+.

---

## E15 - Referral- und Advocate-Engine

**Groesse:** L · **Primaer:** Studierende · **Haengt ab von:** E4, E16 · **Merge aus 2 Vorschlaegen**

**Problem / Warum jetzt:** Donor ist 60% wahrscheinlicher zu spenden, wenn von Peer referred. Studierende koennen ein Mini-Advocate-Team aufbauen (Alumni werben fuer eine Kampagne), Spender koennen Freunde einladen. Beides ist dieselbe Mechanik. CAC nahe null, echter viraler Loop. Nutzt die Gamification-Primitive aus E16.

**Scope (Advocate-Seite, Studierende):**
- Advocate Invite: bis zu 15 Advocates via Email/Link
- Advocate Profile: persoenlicher Badge, Unique Share-Link
- Referral Tracking: Spende via Advocate-Link zaehlt als Advocate-Referral
- Leaderboard: Top Advocates auf Kampagnen-Seite plus Fundraiser-Dashboard
- Reward Tiers: 3 Referrals -> Shout-out, 5 -> Name im Recap, 10+ -> Special Recognition (Feature-Rewards, keine Cash)
- Bulk-Share: vorformulierte 1-Click-Templates (Email, WhatsApp, LinkedIn)

**Scope (Referral-Seite, Spender):**
- Referral-Link Generation pro Spender, im Donor-Account angezeigt
- Tracking-Dashboard mit Revenue Attribution ("14 eingeladen, 5 gespendet, 2 aktiv")
- Both-Win Incentive: beide Seiten erhalten Badge/Feature-Unlock (keine Cash, Compliance)
- Leaderboard (opt-in anonym), Social Proof im Account
- Mobile-First Sharing: 1-Tap zu WhatsApp/Telegram/Email/SMS, pre-filled
- Referral-CTA nach jeder erfolgreichen Spende und im Portfolio

**Konkurrenz-Inspiration:** OneCause Ambassador Fundraising (60% Referral-Uplift), Pledge (P2P mit Referral-Incentives), JustGiving (Team Pages +36%, 15+ Share-Tools), Both-Win-Modelle (Uber/Airbnb).

**User Stories:**
- Als MBA-Studierende moechte ich 10 Alumni einladen, meine Kampagne zu bewerben, damit ich mein Netzwerk vergroessere, ohne sie direkt anzusprechen.
- Als Alumni-Advocate moechte ich meine Referral-Stats auf einem Leaderboard sehen, damit ich motiviert bleibe.
- Als Spender moechte ich Freunde einladen und dafuer Incentives (Badge) erhalten, damit ich viral helfen kann.

**Erfolgsmetriken:** 50%+ Fundraiser rekrutieren 5+ Advocates; Advocate-Conversion 25-30%; Referred-Donor First-Spende 35%+; Viral Coefficient 1.2+; 20%+ des Monats-Wachstums via Referral nach 6 Monaten.

---

## E16 - Spender-Portfolio und Giving-Streaks

**Groesse:** M · **Primaer:** Einzelspender · **Haengt ab von:** E4

**Problem / Warum jetzt:** Spender sehen ihre Gesamtwirkung nicht, es fehlt die Motivationsschleife fuer Wiederholung. Diaspora-Spender sind emotional verbunden, wollen aber sichtbaren Fortschritt. Baut die Gamification-Primitive (Badges/Streaks/Leaderboards) einmal - dreifach genutzt von E15 und E18.

**Scope:**
- Portfolio-Seite "Meine Studierenden": alle unterstuetzten Kampagnen (Name, Photo, Progress)
- Streak-Mechanic: "Du spendest seit 7 Monaten" plus Streak-Badges (Bronze/Silber/Gold bei 3/6/12 Monaten)
- Cumulative Stats: Gesamt EUR, Anzahl Studierende, Impact-Groesse
- Leichter Peer-Vergleich: "Durchschnitt unterstuetzt 2.4, du 5" (motivierend, nicht beschaemend)
- Mobile-First UI: Clean Cards, 1-Tap "Weiter spenden"
- Exports: CSV/PDF der Portfolio-Uebersicht

**Konkurrenz-Inspiration:** Kiva (Lender-Portfolios mit Relend-Tracking), Daffy (Custom Portfolios, Impact Dashboard), GlobalGiving (Donor Profiles mit Giving History).

**User Stories:**
- Als Diaspora-Spender moechte ich alle Studierenden sehen, die ich unterstuetze, damit ich den Impact ueberblicke und stolz bin.
- Als Einzelspender moechte ich meine Streak verfolgen, damit ich motiviert bleibe, die Serie nicht zu unterbrechen.
- Als wiederholender Spender moechte ich wissen, wie viel ich beigetragen habe und wie das zum Durchschnitt passt.

**Erfolgsmetriken:** Recurring-Activation +15%; +2 Monate avg. pro Recurring-Spender; Portfolio-Session 3+ min; Repeat-Spende innerhalb 30 Tagen nach Streak-Milestone +20%.

---

## E17 - Multi-Channel Impact-Feed (WhatsApp/Telegram)

**Groesse:** M · **Primaer:** Einzelspender · **Haengt ab von:** E4 (wird NICHT neu gebaut)

**Problem / Warum jetzt:** Klar gegen E4 abgegrenzt - der Email-Dank aus E4 bleibt unangetastet. Neu ist ausschliesslich der Kanal: Diaspora lebt auf WhatsApp/Telegram/Messenger statt in der Inbox (~95% Open-Rate vs Email), plus In-App-Feed und Student-Voice-Loop.

**Scope:**
- Personalized Impact Feed: chronologische Uebersicht der Studierenden-Meilensteine (Story-Cards mit Photo, Title, CTA)
- Smart Notification-Timing: intelligente Intervalle statt Spam, A/B-optimiertes Timing pro Spender
- Multi-Channel Delivery: In-App-Feed (primary), Email-Digest, Push, Messenger/WhatsApp/Telegram (Opt-In, Diaspora-preferred)
- Student Voice Loop: kurze Thank-You-Messages (Text, Video bis 30s, Sprachnachricht), moderiert (Slur-Filter)
- Recurring-Spenden-Trigger: Pattern-Erkennung bei Inaktivitaet, gentle Reminder plus 1-Tap-Spende
- Engagement-Gamification: Update-Read-Streak
- Mobile-First: swipeable Feed-Cards, Student anonymisiert mit Avatar/Initials

**Konkurrenz-Inspiration:** GoodUnited + Facebook Messenger (95% open rate, 3-4x Retention), Kiva (Lender Updates), Daffy (Impact Dashboard), Donorbox (Recurring-Boost im Receipt).

**User Stories:**
- Als Spender moechte ich regelmaessig wissen, wie es meinen Studierenden geht, damit ich verbunden bleibe.
- Als Diaspora-Spender moechte ich Impact-Updates per WhatsApp/Telegram erhalten, damit sie in meinen natuerlichen Kommunikations-Fluss kommen.
- Als wiederholender Spender moechte ich zur richtigen Zeit erinnert werden, damit ich meine Streak nicht breche.

**Erfolgsmetriken:** Feed-Engagement 35%+; Open-Rate Email 40%+, Messenger 65%+; Retention-Lift nach erstem Update +12%; 8% des Churn-Segments via Reminder reaktiviert.

---

# Welle C - Enterprise und Skalierung

## E18 - Gruppen-Engine: Cohort-Teams und Giving Circles

**Groesse:** L · **Primaer:** Studierende · **Haengt ab von:** E2, E4, E16 · **Merge aus 2 Vorschlaegen**

**Problem / Warum jetzt:** Einzelne Kampagnen isolieren. Team-P2P-Fundraising bringt belegt 1.8-2.5x mehr. MBA-Kohorten (10-40 pro Jahrgang) sind natuerliche Social Units; Diaspora-Communities (Alumni-Gruppen, Kultur-Vereine) sind gregaer. Studierenden-Kohorten und Spender-Giving-Circles laufen auf derselben Gruppen-/Leaderboard-/Shared-Goal-Infrastruktur.

**Scope (Cohort-Teams, Studierende):**
- Team-Creation (Cohort Fundraising Group, min. 2 Member)
- Team-Page mit gemeinsamer Progress-Bar, Sub-Kampagnen, Team-Leaderboard
- Team-Matching: Corporate Sponsor matched die ganze Kohorte (E5-Synergie)
- Team-Chat/Updates, anonymes woechentliches Ranking mit Badges
- Cohort-Stretch-Goal: bei 80% Gesamtziel unlock Special Reward

**Scope (Giving Circles, Spender):**
- Giving-Circle-Gruendung (Name, Private/Public, Logo)
- Member-Management mit Rollen (Admin/Contributor/Viewer), Invites via Email/Link/QR
- Shared Fundraising Goal mit Fortschritts-Bar
- Team-Leaderboard, gemeinsame Kampagnen-Auswahl via Voting
- Group-Chat (moderiert, GDPR-konform), Group Analytics, Group-Portfolio

**Konkurrenz-Inspiration:** Chuffed P2P Team Fundraising (2.5x), Kickstarter Stretch Goals, GlobalGiving/Grapevine Giving Circles, Philanthropy Together.

**User Stories:**
- Als Fundraiser einer MBA-Kohorte moechte ich mit 15 Klassenkollegen als Team starten, damit wir uns gegenseitig motivieren.
- Als Diaspora-Alumni-Gruppe moechte ich eine Giving Circle gruenden und gemeinsam Studierende unserer Uni unterstuetzen.
- Als Gruppen-Admin moechte ich Voting starten ("Welche Studierenden unterstuetzen wir naechstes Quartal?"), damit die Gruppe gemeinsam entscheidet.

**Erfolgsmetriken:** 20% der Kampagnen in einer Cohort Group; Cohort-Funding 2.2x vs. Solo; 10% der Spender gruenden/treten Gruppen bei; Group-Velocity 1.8x; Avg. Donation in Group +25%.

---

## E19 - Self-Serve Corporate Scholarship Program Manager

**Groesse:** XL · **Primaer:** Corporate · **Haengt ab von:** E1, E2, E5, E11

**Problem / Warum jetzt:** Grosse Firmen wollen eigene Stipendienprogramme fahren (Talent-Pipeline, ESG-Branding), heute nur via Kaleidoscope/SmarterSelect. Bursa hat nur "Kampagnen von Studierenden". Hebt Bursa vom Marktplatz zur Enterprise-Stipendien-Plattform und schafft Daten-Lock-in. Groesster Enterprise-Umsatzhebel.

**Scope:**
- Admin-UX: "My Scholarship Program" mit eigenem Logo, Branding, URL-Slug
- Application-Builder: Drag-Drop-Forms mit Custom-Fields und Conditional-Logic
- Review-Workflow: bis zu 10 Reviewer, Scoring-Rubric, Consensus-Voting, Comments
- Award-Management: Gewinner-Selektion, Award-Amount pro Scholar, Auto-Disbursement an die Schule (konsistent zur USP), Conditional-Auszahlungen (z.B. Semester 2 bei GPA-Threshold)
- Scholar-Relationship-Management (SRM): Post-Award-Dashboard (enrolled/graduated/working), SMS/Email, Milestone-Tracking, Alumni-Network
- Impact-Reporting: PDF/CSV mit Outcomes und Diversity-Metrics
- Multi-Cycle-Support: wiederkehrende Programme, Renewal-Prozess

**Konkurrenz-Inspiration:** Kaleidoscope (Self-Serve Application-Builder, SRM, Reporting), SmarterSelect (Award-Management, demographics), Virtual Scholarship Center, Blackbaud, Submittable.

**User Stories:**
- Als Head of CSR moechte ich eine gebrandete Stipendien-Webseite auf Bursa fahren, damit Kandidaten "Firma XYZ Scholarship 2026" sehen.
- Als HR-Manager moechte ich Custom-Application-Forms bauen, damit ich direkte Talent-Signals aus der Application bekomme.
- Als Scholarship-Program-Owner moechte ich Scholars ueber Jahre tracken (abgeschlossen? arbeitet bei uns? Diversity?), um das in meinen ESG-Report zu schreiben.

**Erfolgsmetriken:** 15+ Firmen mit eigenem Programm in Jahr 1; 150+ Applications pro Runde; Setup <4h; Outcome-Capture 80%; Renewal-Rate 90%.

---

## E20 - Multi-Currency und lokale Zahlungsmethoden

**Groesse:** XL · **Primaer:** Developer/Owner · **Haengt ab von:** E2, E12

**Problem / Warum jetzt:** Bursa kennt heute nur USD/EUR und Karte/Wallets/PayPal. Lokale Spender in Afrika/Asien wollen nicht mit Karte zahlen. Ohne lokale Methoden verlierst Du >60% der Spender-Base in diesen Maerkten. **Modell-Korrektur:** Auszahlung erfolgt in Landeswaehrung an die SCHULE, nie an Studierende (Trust-USP plus rechtlicher Schutzschild).

**Scope:**
- Multi-Currency Wallet Infrastructure: Auszahlung an die Schule in Landeswaehrung (KES, NGN, GHS, BDT, PHP, VND)
- 30+ lokale Payment-Methoden fuer die Spender-Einzahlung: M-Pesa, Bank Transfer, Mobile Money, E-Wallets (GCash, bKash)
- FX-Hedging und Auto-Conversion: USD-Corporate-Spende auto-konvertiert mit locked-in Rate (hedged zu Kampagnen-Start)
- Localized Landing Pages plus i18n: Swahili, Yoruba, Bengali, Tagalog; lokale Bank-Details (Virtual IBANs)
- Payout-Routing an die Schule: Direct to Local Bank, Fallback International (Wise, Mangopay)
- KYC-Variation pro Land (z.B. BVN statt Passport in Nigeria), lokal angepasste AML-Thresholds
- Webhook-Integrations fuer Local Payments (Status-Updates fuer M-Pesa, Bank Transfers)

**Konkurrenz-Inspiration:** Mangopay (30+ lokale Methoden, Multi-Currency Wallets, Virtual IBANs, FX-Matching), Stripe Global (135+ Methoden in 135+ Laendern).

**User Stories:**
- Als lokaler Spender in Nigeria moechte ich mit Mobile Money zahlen statt Kreditkarte, damit ich nicht an internationale Kartenlimits stosse.
- Als Schule in Kenya moechte ich Auszahlungen in KES direkt aufs Schulkonto erhalten, damit es keine FX-Verluste gibt.
- Als Bursa-Operator moechte ich neue Laender in einer Woche aktivieren (Add Currency plus 3-5 Local Payments), damit wir schnell expandieren.

**Erfolgsmetriken:** von 3 auf 15+ Laender in 12 Monaten; >50% der Spenden in lokalen Maerkten via lokale Methode; Spender-Completion +20%; FX-Slippage <1%; Payout-Turnaround <2 Tage.

---

## E21 - Payroll-Match und HRIS-Kopplung

**Groesse:** L · **Primaer:** Corporate · **Haengt ab von:** E5, E13

**Problem / Warum jetzt:** Die tiefe Stufe des Corporate-Matchings: direkte Lohn-Spende plus automatische Matching-Engine via ADP/Workday/Paychex. Setzt das leichte Donor-Auto-Detection (E13) als validierte Vorstufe voraus. Neuer Revenue-Stream (Setup-Fee), aber nur fuer reife Enterprise-Kunden relevant.

**Scope:**
- OAuth2/API-Connectors zu ADP Workforce Now, Workday, Paychex, Paylocity, UKG, BambooHR
- Backend-Abstraktion EmployeeDataProvider (Employee ID, Salary, Payroll Cycle, Tax-Brackets)
- Frontend: Corporate-Dashboard zeigt Payroll-aktivierte Mitarbeiter, Admin loest Payroll-Giving-Campaign aus
- Matching-Regel-Engine: Firma legt fest (z.B. 1:1, max 500 EUR/employee/year), System trackt Nutzung
- Security: OAuth2 Read-Only-Scopes, Sync-Logs, Compliance-Trail
- Payroll-Deduction-Umleitung: matched donation als Payroll-Line-Item zurueck an HRIS

**Konkurrenz-Inspiration:** Benevity (Payroll-Match plus ADP), Percent (Employee Giving Wallet), Bonterra/CyberGrants (SSO plus HRIS).

**User Stories:**
- Als HR-Manager einer 1000er-Firma moechte ich Payroll-Giving mit ADP koppeln, damit Mitarbeiter direkt vom Gehalt spenden koennen.
- Als CFO moechte ich Matching-Regeln zentral definieren und automatisch in den Payroll-Prozess integrieren.
- Als Employee moechte ich mit SSO (via ADP) zu Bursa kommen und sofort meine Spenden-Budgets sehen.

**Erfolgsmetriken:** 5+ HRIS-Plattformen supported im Launch; Adoption 20%+ im Q1; HRIS-Sync-Fehlerquote <0.5%; Time-to-Enable <2h.

---

# Cross-Group-Themen (Build-Once)

1. **Gamification/Recognition** (Badges/Streaks/Leaderboards): einmal in E16, wiederverwendet von E15 und E18.
2. **Gruppen-/Collective-Infrastruktur**: Studierenden-Kohorten, Spender-Circles, Corporate-Kohorten-Sponsoring auf einer Engine (E18).
3. **Corporate-Matching als Spektrum**: leicht (E13, Welle B) bis tief (E21, Welle C).
4. **Immutable Transaction-Ledger**: gemeinsame Basis fuer E12 (Schul-Reconciliation) und E14 (Corporate-CSRD).
5. **Diaspora-Mobile-First-Messaging**: gemeinsame Schicht fuer E17, E3 (Share-Toolkit), E15 (Referral).
6. **Trust-Infrastruktur**: E8 (Schul-Verifizierung), E11 (KYC), E9 (T-and-S) als Fundament fuer alle vier Gruppen.

# Bewusst geparkt und offene Luecken

- **Geparkt:** Livestream-Fundraising (Tiltify), Sponsor-Tiers/Patreon-Modell, Employee-Volunteering/Team-Matching - passen schlecht zum finiten Studiengebuehren-Modell oder liegen zu weit vom Kern.
- **Kapazitaets-Risiko:** E11, E19, E20 sind je XL. Welle C bei Solo-Owner nur mit zusaetzlicher Kapazitaet realistisch.
- **Keine native Mobile-App** im Scope, obwohl Zielgruppen mobil-first sind. Responsive Web muss tragen.
- **Laenderspezifische Steuer-/Spendenquittungs-Logik** fehlt; spaetestens mit E20 noetig (US-1099, EU-SEPA).

# Quellen (Konkurrenz-Recherche)

- GoFundMe AI Fundraising Coach: https://www.fastcompany.com/91507558/gofundme-launches-ai-fundraising-coach-to-help-people-raise-more-money
- Chuffed P2P Team Fundraising: https://chuffed.org/features/peer-to-peer-fundraising
- Tiltify Livestream Fundraising: https://tiltify.com/
- OneCause Ambassador Fundraising: https://www.onecause.com/solutions/peer-to-peer-fundraising-software/ambassador-fundraising/
- Patreon Tiers: https://support.patreon.com/hc/en-us/articles/203913559-How-to-set-up-paid-tiers-and-benefits
- GlobalGiving Giving Circles (Grapevine/Philanthropy Together): https://www.globalgiving.org
- Kiva Lender-Portfolios/Lending Teams: https://www.kiva.org
- Daffy Employer Matching: https://www.daffy.org
- Double the Donation (Matching-DB): https://doublethedonation.com/matching-gift-statistics/
- JustGiving Team Pages: https://www.justgiving.com
- Benevity Payroll-Match/HRIS: https://www.benevity.com
- Kaleidoscope Scholarship Management: https://www.mykaleidoscope.com
- SmarterSelect: https://www.smarterselect.com
- Goodera ESG/CSRD Reporting: https://www.goodera.com
- Stripe Connect (hosted onboarding): https://stripe.com/connect
- Stripe Radar (Fraud-Detection): https://stripe.com/radar
- Open Collective (Transparency/Fiscal Hosting): https://opencollective.com
- Mangopay (lokale Payment-Methoden): https://www.mangopay.com
- Persona (Identity/KYC): https://withpersona.com
- Onfido: https://onfido.com
- Sumsub (KYC/AML): https://sumsub.com
- Plaid (Identity, Bank Feeds): https://plaid.com
