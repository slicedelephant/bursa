# Research 012 — Automated KYC & Verification Pipeline (E11)

## Ausgangslage

E1-E10 sind gebaut und gemerged. E11 setzt auf:

- **E1 Trust Layer** — Verifikation als Vertrauens-Grundlage.
- **E6 Security Hardening** — `AuditService` / `AuditLog` (append-only, PII-redigiert).
- **E8 School Portal** — `AdmissionRecord` (VERIFIED-Admission = Go-Live-Anker), `RegistrarProvider`
  (Mock-Seam zum SIS/Registrar).
- **E9 Trust-and-Safety** — `fraud-score.ts` (reine Score-Aggregation, 0-100 + Risk-Band),
  `ofac-keyword-matcher.ts` (statische Sanktions-Länderliste `SANCTIONED_COUNTRIES`).
- **E10 AI Coach** — `TextGenerationProvider`-Abstraktion mit Mock-Default + echtem
  Claude-Skeleton (Vorlage für KYC-/AML-Provider).

## Inspirationsquellen (Konkurrenz)

| Anbieter | Was wir übernehmen | Was wir bewusst NICHT bauen |
|---|---|---|
| Persona / Onfido | Liveness (Video-Selfie), Dokument-OCR, Decision-Engine | echtes Biometrie-Modell, echte OCR-Engine |
| Sumsub | AML-Screening, Sanktions-Listen, Länder-Risiko | Live-Watchlist-Feed, laufende Re-Screenings |
| Plaid | Income-Verification als Risk-Signal | echte Bank-Anbindung |

Gemeinsamer Nenner: alle sitzen hinter einer austauschbaren Provider-Schnittstelle und
liefern strukturierte Ergebnisse (pass/fail + confidence + reasons), die eine reine
Decision-Engine konsumiert.

## Entscheidung 1 — Provider-Abstraktion exakt wie PaymentProvider

`payment-provider.interface.ts` definiert ein Interface + ein `Symbol`-Token; die Factory
(`payment-provider.factory.ts`) wählt anhand eines Env-Flags zwischen Mock und echtem Provider
und fällt bei Fehlern auf Mock zurück. Das Modul (`payments.module.ts`) bindet das Token via
`useFactory`.

**Übernommen:** Zwei neue Seams.

- `IdentityVerificationProvider` (Liveness + Dokument-OCR) + `IDENTITY_VERIFICATION_PROVIDER`-Token.
  Mock: `MockIdentityVerificationProvider`. Skeleton: `PersonaIdentityProvider`.
  Factory: `KYC_PROVIDER=mock|persona` (Default `mock`), Key `PERSONA_API_KEY`.
- `AmlScreeningProvider` + `AML_SCREENING_PROVIDER`-Token. Mock: `MockAmlScreeningProvider`.
  Skeleton: `SumsubAmlProvider`. Factory: `AML_PROVIDER=mock|sumsub` (Default `mock`),
  Key `SUMSUB_API_KEY`.

Die Skeletons rufen ihre API über `fetch` (kein SDK-Dependency, wie der Claude-Provider und
das Seed-OpenAI), werfen im Konstruktor ohne Key, und werden in Tests nie ausgeführt.

## Entscheidung 2 — alle Geschäftslogik pur, Provider dünn

Wie E9 (`fraud-score.ts`) und E10 (`token-budget.ts`, `variant-ranking.ts`) bleibt jede
Entscheidung pur und ohne I/O, damit sie mit Per-Path-Gate auf 80% testbar ist:

- `liveness-result.ts` — bewertet ein Liveness-Ergebnis (Confidence-Schwelle → pass/fail).
- `name-match.ts` — Levenshtein-basierte Ähnlichkeit zweier Namen → 0-100 + matched-Flag.
- `sanctioned-country.ts` — pure OFAC/Country-Prüfung; baut auf der E9-`SANCTIONED_COUNTRIES`-
  Liste auf (Single Source, kein zweites Land-Set).
- `aml-decision.ts` — entscheidet CLEAR / HIT / BLOCKED aus Betrag-Schwelle + Land + Provider-
  Treffer.
- `risk-score.ts` — aggregiert geo-Risiko + Income-Signal + Schul-Akkreditierung → 0-100 +
  Band (Muster: `aggregateFraudScore`).
- `verification-state.ts` — reine State-Machine: erlaubte Übergänge + Ableitung des Review-
  Queue-Status.

## Entscheidung 3 — E6 AuditLog wiederverwenden

`AuditService.record({ action, actorUserId, targetType, targetId, metadata })` ist append-only
und redigiert PII. E11 protokolliert jede Entscheidung mit `action: 'kyc.<step>.<result>'`,
`targetType: 'VerificationCase'`, `targetId: <caseId>`. Kein neues Audit-System.

`SecurityModule` exportiert `AuditService`; die `KycModule` importiert `SecurityModule` (wie
`TrustSafetyModule` es tut).

## Entscheidung 4 — E8 Registrar/Admission wiederverwenden

Der Dokument-Schritt gleicht den extrahierten Namen gegen einen `AdmissionRecord` (E8) ab.
Wenn ein `admissionRecordId` gesetzt ist, kann zusätzlich der bestehende `RegistrarProvider`
(`lookupAdmission`) als zweite Quelle herangezogen werden — kein zweiter Registrar-Seam.
`SchoolsModule` exportiert `SchoolsService`; den Registrar-Seam binden wir analog (Mock) in der
KycModule, um die Abhängigkeit lokal zu halten.

## Entscheidung 5 — Schwellen als benannte Konstanten

- AML-Schwelle: `AML_THRESHOLD_CENTS = 500000` (5.000 EUR/Monat).
- Liveness-Confidence-Schwelle: `LIVENESS_MIN_CONFIDENCE = 70`.
- Namens-Match-Schwelle: `NAME_MATCH_MIN_SCORE = 80`.
- Risk-Band-Grenzen analog E9 (`>=75 CRITICAL`, `>=50 HIGH`, `>=25 MEDIUM`, sonst `LOW`).

Keine Hardcoded-Magic-Numbers im Service; alle Schwellen leben benannt in den puren Cores.

## Entscheidung 6 — deterministische Mock-Sentinels (demobar)

Analog zum `.13`-Sentinel von `MockPaymentProvider`:

- Liveness-Mock schlägt fehl, wenn der Eingabe-`livenessToken` mit `-FAIL` endet.
- OCR-Mock liefert einen abweichenden Namen, wenn der `documentToken` mit `-MISMATCH` endet.
- AML-Mock liefert `HIT`, wenn `country` auf einer kleinen "grey"-Liste steht, und `BLOCKED`
  für sanktionierte Länder; sonst `CLEAR`.

So sind Erfolg, Manual-Review und Block ohne echten Provider demobar.

## Risiken / offene Punkte

- **Kein echter Upload:** Wir nehmen strukturierte Mock-Payloads (Tokens + Felder). Ein echter
  Datei-Upload ist Out-of-Scope (Folge-Epic).
- **Statische Sanktionsliste:** illustrativ, kein Live-Feed (wie E9 dokumentiert).
- **Synchron / Single-Instance:** keine Worker-Queue. Für den Prototyp ausreichend.
