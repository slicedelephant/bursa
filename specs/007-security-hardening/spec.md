# Feature 007 — Security-Hardening (OWASP, Rate-Limiting, Secrets, Auth-Härtung, PCI/GDPR)

## WHY

Bursas gesamter USP ist Vertrauen, und ab E2 fließt echtes Geld über die
`PaymentProvider`-Abstraktion plus sensible PII (Identitäts-, Zulassungs- und
Schulnachweise, Spenderdaten über Ländergrenzen). Genau diese Kombination ist
ein Top-Angriffsziel: Spenden-/Wohltätigkeitsplattformen sind überproportional
von Card-Testing betroffen (rund 11% aller von Stripe beobachteten
Card-Testing-Attacken zielen auf Charities, weil Kleinbeträge erlaubt sind und
auf dem Kontoauszug seltener auffallen). Jeder durchgelassene Karten-Test
produziert Chargebacks und Stripe-Risk-Flags; im Extremfall sperrt Stripe das
Konto und legt die ganze Zahl-Engine still. PCI DSS 4.0 ist seit März 2025
verpflichtend, GDPR-Bußgelder treffen auch die grenzüberschreitende
Diaspora-Spende, und Security-Misconfiguration ist laut OWASP zum
zweithäufigsten realen Breach-Grund aufgestiegen. Ein einziger sichtbarer
Vorfall zerstört den Trust-USP nachhaltiger, als jedes Feature ihn aufbaut —
deshalb jetzt, bevor echtes Volumen fließt. Dieses Epic härtet die Plattform
defensiv, ohne neue externe Infrastruktur einzuführen (in-memory, dependency-frei,
in der Tradition des E5-PDF-Writers).

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Rate-Limiting & Velocity-Limits** auf geld- und auth-nahen Endpunkten
  (Login, Registrierung, Donation-Intent). In-memory Fixed-Window-Zähler hinter
  einem `@RateLimit()`-Decorator + `RateLimitGuard`; Überschreitung gibt
  `429 RATE_LIMITED` im `{success,error}`-Envelope plus `Retry-After`/
  `X-RateLimit-*`-Header. Card-Testing- und Brute-Force-Bremse ohne Redis/externe Infra.
- **OWASP-Härtung & Security-Header**: zentral gesetzte Header (CSP, HSTS,
  X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
  über eine pure Header-Funktion + Middleware. Boundary-Validation bleibt
  bestehend (whitelist, forbidNonWhitelisted, transform); ergänzt um eine
  **starke Passwort-Policy** als Boundary-Validator auf der Registrierung.
- **Secrets-Management & sichere Defaults**: pure `validateEnv`-Funktion prüft
  beim Boot alle sicherheitsrelevanten Variablen, verweigert in Produktion
  unsichere Defaults (z.B. `JWT_SECRET="dev-only-change-me"`, zu kurze Secrets)
  und erzwingt `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, wenn
  `PAYMENT_PROVIDER=stripe`. In Dev nur Warnung, in Produktion harter Abbruch.
- **Stripe-Webhook-Signaturprüfung (verpflichtend)**: pure HMAC-SHA256-
  Verifikation (Stripe-Header-Format `t=…,v1=…`, Timestamp-Toleranz,
  timing-safe compare) hinter einem `StripeWebhookGuard` + minimalem
  `POST /payments/webhook`-Endpunkt (raw body), der nur signierte Events
  akzeptiert.
- **PII-/GDPR-Schutz**: pure `redact()`-Funktion entfernt E-Mails, Bearer-Token,
  kartenähnliche Nummern, IBANs und Secret-Keys aus Log-Payloads (wired in den
  globalen Exception-Filter). GDPR-Selbstauskunft (`GET /account/export`) und
  Recht-auf-Löschung (`POST /account/delete`, Anonymisierung) erhalten den
  unveränderlichen Geld-Audit-Trail, scrubben aber PII. Jede sicherheits-/
  geldrelevante Aktion wird in einem **AuditLog** mit PII-armen Metadaten
  protokolliert (Zugriffsprotokollierung).
- **Auth-Härtung (MFA-Baustein)**: pure RFC-6238-TOTP-Verifikation als Baustein
  für Admin-Step-up; ein `AdminMfaGuard` erzwingt einen gültigen `x-mfa-token`
  auf sensiblen Admin-Aktionen, **wenn** `ADMIN_TOTP_SECRET` gesetzt ist —
  sonst No-op, damit die App ohne MFA-Konfiguration lauffähig bleibt.
- **Frontend**: Passwort-Stärke-Meter (pure Scorer + Komponente) auf der
  Registrierung; Datenschutz-Panel im Konto (eigene Daten als JSON exportieren,
  Konto löschen) mit maskierter PII-Anzeige.

## User Stories

- **US1 (Betreiber):** Als Betreiber will ich, dass wiederholte Login- und
  Karten-Versuche von derselben Quelle automatisch ausgebremst werden
  (`429`), damit Brute-Force und Card-Testing unter der Stripe-Risk-Schwelle
  bleiben. (P1)
- **US2 (Betreiber):** Ich will, dass die App in Produktion gar nicht erst
  startet, wenn ein unsicheres Default-Secret oder eine fehlende Stripe-Config
  vorliegt, damit Misconfiguration nicht live geht. (P1)
- **US3 (Betreiber):** Ich will, dass eingehende Zahlungs-Webhooks nur
  akzeptiert werden, wenn ihre Signatur stimmt, damit niemand gefälschte
  Zahlungs-Events einschleust. (P1)
- **US4 (Spender/Studierende):** Als Nutzer will ich mein Recht auf Auskunft
  und Löschung wahrnehmen können (Export + Konto-Löschung/Anonymisierung), ohne
  dass der prüfbare Geld-Trail zerstört wird. (P1)
- **US5 (Nutzer):** Als Registrierender will ich beim Anlegen ein
  Passwort-Stärke-Feedback sehen und an einer starken Policy gehindert werden,
  ein schwaches Passwort zu setzen. (P2)
- **US6 (Betreiber/Admin):** Als Admin will ich sensible Aktionen optional per
  TOTP-Step-up absichern, und jede sicherheitsrelevante Aktion soll
  PII-arm im AuditLog landen. (P2)
- **US7 (Betreiber):** Ich will, dass Fehler-Logs keine E-Mails, Token oder
  Kartennummern leaken (PII-Redaction), damit ein Log-Leak keine GDPR-Panne wird. (P2)

## Key Entities

- **AuditLog** (neu) — `id`, `action` (z.B. `auth.login`, `auth.login_failed`,
  `account.export`, `account.delete`, `admin.verify`), `actorUserId?`,
  `targetType?`, `targetId?`, `ip?`, `metadata Json?` (PII-redacted),
  `createdAt`. Append-only Zugriffs-/Sicherheitsprotokoll.
- **User** (bestehend, erweitert) — `anonymizedAt DateTime?`: markiert ein per
  GDPR-Löschung anonymisiertes Konto; E-Mail/Name werden gescrubbt, Donations
  bleiben (Geld-Trail), aber deren PII-Felder (`donorName`, `message`) werden
  genullt.

## Success Criteria

- Login/Registrierung/Donation-Card-Endpunkte sind rate-limited: nach N
  Versuchen pro Fenster kommt `429 RATE_LIMITED` mit `Retry-After`; legitime
  Nutzung innerhalb des Limits bleibt unberührt.
- `validateEnv` akzeptiert eine sichere Prod-Config und lehnt unsichere
  Defaults/fehlende Stripe-Secrets in Produktion ab (Boot-Abbruch); Dev bleibt
  mit Warnung lauffähig.
- Webhook-Endpoint akzeptiert nur gültig signierte Payloads (HMAC, Toleranz,
  timing-safe), verwirft fehlerhafte mit `400`.
- GDPR: Export liefert die eigenen Daten strukturiert; Löschung anonymisiert das
  Konto und scrubbt PII, ohne Donations-/Audit-Datensätze (Geld-Trail) zu
  löschen. Jede Aktion landet im AuditLog mit PII-redacteten Metadaten.
- Passwort-Policy lehnt schwache Passwörter am Boundary ab; Frontend-Meter zeigt
  korrekt Score/Label.
- PII-Redaction entfernt E-Mails/Token/Karten/IBAN aus geloggten Strukturen
  (immutabel, Original unverändert).
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds
  grün, Prisma-Migration committet, Seed läuft (inkl. AuditLog-Demodaten).
- `PaymentProvider`-Abstraktion, Immutabilität und `{success,data}`-Envelope
  bleiben gewahrt; keine neue externe Infrastruktur.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** verteiltes Rate-Limiting (Redis/Gateway). In-memory Fixed-Window pro
  Instanz reicht für den Prototyp; horizontale Skalierung ist eine spätere
  Infra-Frage.
- **Kein** echtes CAPTCHA/Bot-Challenge-Drittanbieter (hCaptcha/Turnstile) —
  Velocity-Limit als pragmatischer Ersatz; CAPTCHA ist ein dokumentierter
  Folge-Schritt.
- **Keine** echte Verschlüsselung-at-rest jenseits dessen, was Postgres/Disk
  liefert, und kein KMS/Vault — Secrets bleiben in Env, validiert; Vault ist
  später.
- **Kein** vollständiger Per-User-MFA-Enrollment-Flow mit QR/Recovery-Codes —
  nur der TOTP-Verifikations-Baustein + env-gegateter Admin-Step-up-Guard.
- **Kein** Dependency-/SAST-Scanner-CI-Lauf in diesem Branch (Dependabot/CI ist
  Repo-Config, keine App-Logik) — stattdessen liefert dieses Epic eine
  versionierte **Security-Checkliste** als Release-Gate-Dokument
  (`quickstart.md`).
- **Keine** rechtsverbindlichen GDPR-Prozesse (DPA, Aufbewahrungsfristen-
  Automatik) — Export/Erasure sind funktionale Prototyp-Slices.
