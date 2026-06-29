# Research & Clarify — Feature 009 School-Self-Serve-Portal (E8)

Autonom getroffene Entscheidungen (kein User-Input). Jede offene Frage wurde im
Sinne der Constitution (Trust-by-Design, Provider-Abstraktion, Immutabilität,
kleine Module, Boundary-Validation, {success,data}-Envelope) und der EPICS-
PROGRESS-Direktive (pragmatisch, keine neue externe Infra, robuster getesteter
Kern) entschieden.

## E1 — Schul-Admin-Bindung: Feld auf User vs. Join-Tabelle

**Entscheidung:** Eigene `SchoolAdmin`-Join-Tabelle (`userId` unique → genau
eine Schule pro Admin; eine Schule kann mehrere Admins haben).

**Begründung:** Ein nullable `schoolId` auf `User` würde das User-Modell mit
einer rollen-spezifischen Beziehung überladen und keine Mehr-Admin-Schulen
zulassen. Die Join-Tabelle ist sauberer (Constitution IV), erweiterbar und
hält die Rollen-Skopierung explizit. Der JWT trägt nur die Rolle; die Schule
wird pro Request über `SchoolPortalService.resolveSchoolId(userId)` aufgelöst.

## E2 — Kampagnen-Genehmigung: neuer Pfad vs. bestehende Transition

**Entscheidung:** Die schul-skopierte Genehmigung nutzt **dieselbe**
Verifizierungs-Transition wie der Admin-Pfad (`AdmissionVerification` VERIFIED →
Kampagne LIVE + System-`CampaignUpdate`), nur gegated auf `canApproveCampaigns`
(Schule ACTIVE + payout-verifiziert) und auf Kampagnen der eigenen Schule.

**Begründung:** Constitution II macht die verifizierte Zulassung zum einzigen
Trust-Anker für Live-Gang. Eine zweite, parallele Live-Logik würde diesen
Anker duplizieren und Drift riskieren. Der bestehende Admin-Pfad bleibt
unangetastet; das Portal ist ein zusätzlicher, skopierter Einstieg in dieselbe
Transition.

## E3 — e-Signatur: echter DocuSign-Call vs. Mock hinter Interface

**Entscheidung:** Kleines `EsignatureProvider`-Interface +
`MockEsignatureProvider` (deterministisch, injizierbare Clock) + Factory
(`createEsignatureProvider`), die DocuSign nur bei Flag **und** Key wählt und
sonst (auch bei nicht-implementiertem DocuSign) auf Mock zurückfällt.

**Begründung:** Exakt die `PaymentProvider`-Naht. Eine echte DocuSign-
Integration (OAuth, Envelope-API, Webhook-Callbacks) ist eigenes Epic-Volumen
und würde im autonomen Lauf Netzwerk-/Key-Risiko bringen. Der Mock liefert eine
stabile `agreementRef` und einen `signedAt`, ist 100% testbar und hält die App
ohne Keys lauffähig. DocuSign ist als Folge-Schritt dokumentiert.

## E4 — Registrar/SIS: echte API vs. Mock-Naht

**Entscheidung:** `RegistrarProvider`-Interface + `MockRegistrarProvider`, der
jede nicht-leere Ref erkennt außer dem Sentinel-Suffix `…-UNKNOWN`. Verifizieren
einer Zulassung konsultiert die Naht; nicht erkannt → `409
ADMISSION_NOT_ON_FILE`.

**Begründung:** Macht die Naht real wirksam und testbar, ohne einen echten
Registrar anzubinden (Hochschul-SIS-APIs sind heterogen und nicht standardisiert
— eigenes Epic, vgl. E11 KYC-Pipeline). Normale Seed-/Demo-Refs werden erkannt,
sodass der "2-Klick-Verify"-Flow funktioniert; der Sentinel demonstriert den
Block-Pfad.

## E5 — Hosted Onboarding: Token-Speicherung & -Validierung

**Entscheidung:** Pure `onboarding-token.ts`: `createOnboardingToken` (32 Byte
Zufall → hex), nur der **SHA-256-Hash** wird persistiert; `validateOnboardingToken`
prüft per timing-safe Hash-Vergleich, dann `usedAt`, dann Ablauf. `now` und die
Zufallsquelle sind injizierbar.

**Begründung:** Stripe-Connect-Muster (one-time link). Den Roh-Token nie
speichern (Leak-Schutz) ist Standard; SHA-256 + `crypto.timingSafeEqual` sind
dependency-frei (Node `crypto`) und deterministisch testbar. 256-bit-Entropie
macht Brute-Force unrealistisch; ein zusätzliches Rate-Limit ist Out-of-Scope.
`complete` verbraucht den Token transaktional (`usedAt`).

## E6 — Onboarding-Status: freie Felder vs. State-Machine

**Entscheidung:** Enum `SchoolOnboardingStatus`
(NOT_STARTED→IN_PROGRESS→SUBMITTED→ACTIVE) mit purer State-Machine
(`nextOnboardingStatus`/`canTransition`) + Readiness-Prädikaten
(`isPayoutDataComplete`, `canApproveCampaigns`, `onboardingChecklist/-ProgressPct`).

**Begründung:** Self-Service-Aktivierung braucht klar definierte, testbare
Übergänge statt verstreuter Boolean-Flags. Ungültige Übergänge werfen laut
(Constitution V); der Service mappt das auf Domain-Exceptions. Die Prädikate
treiben sowohl das Trust-Gate (ACTIVE + payout-verifiziert) als auch die
Onboarding-Fortschrittsanzeige.

## E7 — Studierende-Import: Format & Idempotenz

**Entscheidung:** Purer CSV-Parser (`parseAdmissionCsv`): Header
`email,name,program,admissionRef` (Reihenfolge/Casing flexibel), Email-Regex,
Per-Zeilen-Fehler, Dedupe nach `admissionRef`. Persistenz per `upsert` auf
`(schoolId, admissionRef)` → idempotenter Re-Import.

**Begründung:** Ein bewusst kleiner, voll testbarer CSV-Reader genügt für den
Prototyp (eingebettete Kommas/Quoting-Edge-Cases sind Out-of-Scope). Upsert auf
dem fachlichen Unique-Key macht wiederholten Import sicher — kritisch, weil
Schul-Admins Listen iterativ nachladen.

## E8 — Spender-Geografie: neues Feld vs. Proxy

**Entscheidung:** Minimal-invasive, nullable Spalte `Donation.donorCountry`,
befüllt aus Seed/vorhandenen Daten; das Dashboard gruppiert danach
(`buildSchoolDashboard`), fehlend → "Unknown".

**Begründung:** "Spender-Statistik nach Geografie" ehrlich umzusetzen verlangt
ein Land je Spende; wir haben keins. Ein Recipient-Proxy (Schul-/Studierenden-
Land) wäre falsch beschriftet. Eine nullable Spalte ist additiv und im selben
Migration-Schritt; das Erfassen im öffentlichen Donate-Flow ist Out-of-Scope.

## E9 — School-Webhooks: echter Versand vs. Stub-Emitter

**Entscheidung:** `SchoolWebhookService`, der pure Envelopes
(`school-webhook-events.ts`) persistiert + strukturiert loggt; Fehler werden
geschluckt (darf nie die Geschäftsoperation brechen). `payout.sent` hängt
fire-and-forget hinter dem geprüften Disburse-Transaction-Block.

**Begründung:** Ein echter Auslieferungs-Layer (Endpoint-Registry, HTTP-Retries,
Signatur) ist eigenes Volumen; für den Prototyp genügt ein durchsuchbares,
persistentes Event-Log (analog E6-AuditService: Logging-Fehler schluckt nicht
den Flow). Gleiche Postgres-DB, keine neue Infra.

## Constitution-Check

- **Trust-by-Design:** Verifizierte Zulassung bleibt der einzige Live-Anker;
  Aktivierung setzt `payoutVerified`; Geld nur an die Schule.
- **Provider-Abstraktion:** e-Signatur/Registrar hinter austauschbaren
  Interfaces (Symbol-Tokens, Factory), Mock by default; `PaymentProvider`
  unverändert.
- **Immutabilität:** Alle pure Utils geben neue Objekte zurück (Token-Resultate,
  Dashboard, Envelopes, Parser-Ergebnis).
- **Kleine Module:** Eine Verantwortung je Datei, alle <400 Zeilen; fünf
  fokussierte Services statt eines großen.
- **Boundary-Validation & Envelope:** DTOs mit class-validator
  (whitelist/forbidNonWhitelisted/transform); Domain-Fehler im
  `{success,error}`-Envelope.
