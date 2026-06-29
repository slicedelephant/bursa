# Feature 009 — School-Self-Serve-Portal & Partner-Onboarding (E8)

## WHY

Schulen sind heute der Skalierungs-Flaschenhals von Bursa. Jede Schule wird vom
Bursa-Team manuell verifiziert, onboarded und in den Kampagnen-Workflow
eingehängt: KYC prüfen, Auszahlungsdaten erfassen, Studierende gegen die
Zulassungsliste abgleichen — rund 2-4h pro Schule. Bei 5 Schulen geht das von
Hand; bei den angepeilten 25+ Schulen in sechs Monaten ist es unmöglich ohne
Mehrpersonal. Genau hier zeigt Stripe Connect das Muster: Connected Accounts
onboarden sich selbst über einen hosted Flow mit inkrementeller KYC und
self-service activation, statt dass ein Mensch Daten abtippt.

Dieses Epic verlagert die Angebotsseite vom manuellen Daten-Entry zum
Self-Service, ohne den geprüften Geld- und Verifizierungs-Pfad anzufassen.
Eine **verifizierte Zulassung** bleibt der Trust-Anker, der eine Studierenden-
Kampagne live gehen lässt (Constitution II); neu ist nur, **wer** sie setzt:
der Schul-Admin statt des Bursa-Operators. Geld fließt weiterhin ausschließlich
an die Schule, nie an den Studierenden. In der Tradition von E5/E6/E7 kommt
keine neue externe Infrastruktur dazu: e-Signatur und Registrar liegen hinter
kleinen, austauschbaren Interfaces (wie `PaymentProvider`), Mock by default,
kein echter DocuSign-/Registrar-Call.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **School-Admin-Portal** (eigener, pro Schule gebrandeter Bereich: Schulname +
  Bursa-Logo). Neue Rolle `SCHOOL_ADMIN`, an genau eine Schule gebunden
  (`SchoolAdmin`-Join). Jede Portal-Route ist auf die Schule des Aufrufers
  geschränkt; die IBAN wird in Antworten maskiert, nie voll zurückgegeben.
- **Studierende-Verifizierung**: Schul-Admin importiert eine Zulassungsliste
  (CSV/strukturiert) über einen puren Parser (`admission-import.ts`,
  Header `email,name,program,admissionRef`, Dedupe, Per-Zeilen-Fehler) und
  markiert Datensätze `verified`/`rejected`. Verifizieren prüft die (gemockte)
  Registrar-Naht; eine verifizierte Zulassung ist der Trust-Anker für Live-Gang.
- **Auszahlungsdaten Self-Service**: Bankdaten, Tax-ID, Kontaktperson +
  digitale Vereinbarung. Die e-Signatur ist hinter `EsignatureProvider`
  gemockt (kein echter DocuSign-Call); Unterschrift + vollständige Auszahlungs-
  daten aktivieren die Schule (`payoutVerified = true`).
- **Kampagnen-Genehmigung**: Schul-Admin reviewt und genehmigt Kampagnen vor
  Publikation (Story/Ziel/Deadline sichtbar). Genehmigung nutzt die bestehende
  Verifizierungs-Transition (Zulassung VERIFIED → Kampagne LIVE), schul-skopiert
  und gegated darauf, dass die Schule ACTIVE + payout-verifiziert ist.
- **Echtzeit-Dashboard**: Auszahlungsstatus pro Studierendem (purer
  `payout-status.ts`), Gesamtbudget pro Schule und Spender-Statistik nach
  Geografie (purer `school-dashboard.ts` über ein neues, optionales
  `Donation.donorCountry`).
- **Hosted Onboarding Flow** (à la Stripe): Einmal-Token-Link zum Abschluss der
  Registrierung. Pure Token-Generate/Validate-Logik (`onboarding-token.ts`,
  nur SHA-256-Hash gespeichert, timing-safe Vergleich, Ablauf/used-Prüfung).
- **School-Webhooks**: emittiert/loggt Schul-Events (`student.reported`,
  `campaign.approved`, `payout.sent`) über einen Stub-Emitter, der nur
  persistiert + strukturiert loggt; ein Logging-Fehler bricht nie die
  Geschäftsoperation.

## User Stories

- **US1 (Schul-Admin):** Als Schul-Admin will ich meine Studierenden-Liste
  hochladen und mit zwei Klicks verifizieren, damit ich nicht mit dem
  Bursa-Team koordinieren muss. (P1)
- **US2 (Schul-CFO):** Als Schul-CFO will ich mein Bankkonto einmal eingeben und
  die Vereinbarung unterschreiben, damit meine Schule aktiviert wird und
  Auszahlungen automatisch laufen. (P1)
- **US3 (Bursa-Operator):** Als Operator will ich neue Schulen per Self-Service
  onboarden (Einmal-Link), damit ich meine Zeit auf Moderation/Growth statt
  Daten-Entry verwende. (P1)
- **US4 (Schul-Admin):** Als Schul-Admin will ich Kampagnen meiner Studierenden
  vor Publikation reviewen und genehmigen, damit nur geprüfte Kampagnen live
  gehen. (P1)
- **US5 (Schul-Admin):** Als Schul-Admin will ich ein Echtzeit-Dashboard mit
  Auszahlungsstatus pro Studierendem, Gesamtbudget und Spender-Geografie sehen,
  damit ich gegenüber meiner Buchhaltung reconcilieren kann. (P2)
- **US6 (Schul-IT):** Als Schul-IT will ich Schul-Events (Studierende gemeldet,
  Kampagne genehmigt, Auszahlung gesendet) als Webhook-Log einsehen, um sie
  später in eigene Systeme zu integrieren. (P2)

## Key Entities

- **SchoolAdmin** (neu) — bindet einen `User` (Rolle `SCHOOL_ADMIN`) an genau
  eine `School`; eine Schule kann mehrere Admins haben.
- **School** (erweitert) — `slug`, `onboardingStatus`
  (NOT_STARTED→IN_PROGRESS→SUBMITTED→ACTIVE), Auszahlungsfelder
  (`bankAccountName`, `iban`, `bic`, `taxId`, `contactName`, `contactEmail`),
  Vereinbarungs-Felder (`agreementSignedAt`, `agreementSignerName`,
  `agreementRef`).
- **AdmissionRecord** (neu) — importierte Zulassungszeile
  (`studentEmail`, `studentName`, `programName`, `admissionRef`, `status`
  PENDING/VERIFIED/REJECTED). Unique `(schoolId, admissionRef)` für
  idempotenten Re-Import.
- **SchoolOnboardingToken** (neu) — gehashter Einmal-Token (`tokenHash` unique,
  `expiresAt`, `usedAt`) für den hosted Flow.
- **SchoolWebhookEvent** (neu) — geloggtes Schul-Event (`type`, `status`,
  `payload`).
- **Donation** (erweitert) — `donorCountry?` (nur für die Dashboard-Geografie).

## Success Criteria

- Ein Schul-Admin sieht ausschließlich seine Schule; fremde Schulen/Datensätze
  sind nicht erreichbar (`FORBIDDEN`/`NOT_FOUND`).
- CSV-Import parst saubere Zeilen, meldet Header-/Zeilen-Fehler und zählt
  Duplikate; Re-Import derselben Liste ist idempotent (Upsert auf
  `schoolId+admissionRef`).
- Zulassung verifizieren prüft die Registrar-Naht (Mock erkennt `…-UNKNOWN`
  nicht → `409`); verifizieren/ablehnen emittiert `student.reported`.
- Auszahlungsdaten speichern setzt `IN_PROGRESS`; Vereinbarung unterschreiben
  (mit vollständigen Daten) aktiviert die Schule (`ACTIVE`, `payoutVerified`).
- Kampagnen-Genehmigung setzt die Kampagne LIVE (Zulassung VERIFIED), nur wenn
  die Schule ACTIVE + payout-verifiziert ist; emittiert `campaign.approved`.
- Auszahlung (bestehender Admin-Pfad) emittiert zusätzlich `payout.sent`, ohne
  den geprüften Disburse-Pfad zu verändern.
- Hosted Token: gültiger Token liefert Onboarding-State; ungültig/abgelaufen/
  benutzt/Mismatch → `400`; `complete` aktiviert die Schule und verbraucht den
  Token (transaktional).
- Dashboard liefert Totals, Per-Studierenden-Auszahlungsstatus und
  Spender-Geografie immutabel und korrekt.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. School-Portal-Demodaten).
- `PaymentProvider`-Abstraktion, Immutabilität und `{success,data}`-Envelope
  bleiben gewahrt; e-Signatur/Registrar nur hinter Mock-Interfaces.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** echter DocuSign-/e-Signatur-Anbieter — nur das `EsignatureProvider`-
  Interface + deterministischer Mock. Ein DocuSign-Adapter ist als Folge-Schritt
  dokumentiert (Factory wählt env-basiert, fällt auf Mock zurück).
- **Keine** echte Registrar-/SIS-API — nur das `RegistrarProvider`-Interface +
  Mock (erkennt jede Ref außer Sentinel `…-UNKNOWN`).
- **Keine** echten Multi-Tenant-Subdomains pro Schule. Das "Branding" ist eine
  pro-Schule-Ansicht (Schulname/Logo) unter einer Route, kein eigener Host und
  kein Tenant-Routing.
- **Keine** echte Webhook-Auslieferung (HTTP-Delivery, Retries, Signatur,
  Endpoint-Verwaltung) — der Emitter persistiert + loggt nur; ein
  Lieferungs-/Zustell-Layer ist Folge-Arbeit.
- **Kein** voller registrierungs-/Einladungs-Flow für mehrere Schul-Admins, kein
  Self-Signup als Schul-Admin (Rolle nicht selbst zuweisbar) — Admins werden per
  Seed/Operator angelegt, der hosted Link onboardet die Schule selbst.
- **Kein** Rate-Limit/CAPTCHA auf dem hosten Onboarding-Endpunkt — die
  256-bit-Token-Entropie ist der Schutz; ein zusätzliches Velocity-Limit ist
  ein dokumentierter Folge-Schritt.
- **Kein** Spender-Geo-Capture im öffentlichen Spendenformular —
  `donorCountry` wird vorerst aus Seed/vorhandenen Daten befüllt; das Erfassen
  im Donate-Flow ist Folge-Arbeit.
