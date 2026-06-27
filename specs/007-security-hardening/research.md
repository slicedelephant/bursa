# Research & Clarify — Feature 007 Security-Hardening

Autonom getroffene Entscheidungen (kein User-Input). Jede offene Frage wurde im
Sinne der Constitution (Trust-by-Design, Provider-Abstraktion, Immutabilität,
kleine Module, Boundary-Validation, {success,data}-Envelope) und der EPICS-
PROGRESS-Direktive (pragmatisch, keine neue externe Infra, robuster getesteter
Kern) entschieden.

## E1 — Rate-Limiting: in-memory vs. @nestjs/throttler vs. Redis

**Entscheidung:** Eigener, dependency-freier In-memory-Fixed-Window-Zähler
(pure `rate-limit.store.ts`) hinter `RateLimitGuard` + `@RateLimit()`-Decorator.

**Begründung:** Redis wäre neue externe Infra (verboten). `@nestjs/throttler`
wäre eine zusätzliche Dependency mit eigenem Storage-Modell und schwerer als nötig
für einen Prototyp; ein npm-Install birgt zudem Netzwerkrisiko im autonomen Lauf.
Ein purer Fixed-Window-Store (Map `key -> {count, resetAt}`, `now` injizierbar)
ist deterministisch, 100% unit-testbar und deckt Card-Testing/Brute-Force pro
Instanz ab. Limitierung (kein verteilter State) ist im Out-of-Scope ehrlich
dokumentiert. Präzedenz: der dependency-freie PDF-Writer aus E5.

**Policy-Werte (Default):** Login 5/60s, Registrierung 5/300s, Donation-Card
10/60s, global fallback aus (nur annotierte Routen). Schlüssel = `ip + ":" +
routeKey`. IP aus `X-Forwarded-For` (erste Adresse) mit Fallback auf
`req.ip`/socket.

## E2 — Velocity gegen Card-Testing

**Entscheidung:** Die Donation-Card-Route bekommt eine strengere Velocity-Policy
(10/60s/IP). Echte CAPTCHA-Challenge ist Out-of-Scope (kein Drittanbieter ohne
neue Infra). Velocity + bestehende `@Min(100)`-Mindestbetrag-Validierung +
Webhook-Signaturpflicht sind der pragmatische Card-Testing-Schutz.

## E3 — Security-Header: helmet vs. pure Funktion

**Entscheidung:** Pure `securityHeaders(opts)` → Header-Map + dünne
`app.use`-Middleware in `main.ts`. Kein `helmet` (zusätzliche Dependency).

**Begründung:** Die benötigten Header sind eine kleine, statische, voll testbare
Funktion. HSTS nur in Produktion (sonst bricht lokales http). CSP defensiv aber
API-tauglich (`default-src 'none'`, da die API JSON liefert; Swagger-Doku unter
`/api/docs` bekommt eine gelockerte CSP nur für diesen Pfad — pragmatisch im Dev).

## E4 — Webhook-Signatur: Stripe-SDK vs. pure HMAC

**Entscheidung:** Pure HMAC-SHA256-Verifikation, die das Stripe-Schema
`t=<ts>,v1=<sig>` nachbildet (`signedPayload = "${t}.${rawBody}"`,
`HMAC_SHA256(secret, signedPayload)`, timing-safe compare, Timestamp-Toleranz).

**Begründung:** Das Stripe-SDK ist optional (lazy require, evtl. nicht
installiert). Die Signaturlogik ist Standard-HMAC und mit Node `crypto`
dependency-frei und deterministisch testbar. So ist die Pflichtprüfung auch im
Mock-Modus aktiv und unit-getestet. `now` wird injiziert für Toleranz-Tests.
NestFactory wird mit `{ rawBody: true }` erstellt, der Endpoint liest
`req.rawBody`.

## E5 — Passwort-Policy: zxcvbn vs. eigene Heuristik

**Entscheidung:** Eigene pure Heuristik `assessPassword(pw)` → `{score 0-4,
label, valid, issues[]}` (Länge >=10, Klein-/Großbuchstabe, Ziffer, kein
trivialer Begriff aus kleiner Blocklist, kein reiner Wiederhol-/Sequenz-Pattern).
Boundary über class-validator-Constraint `@IsStrongPassword()` auf `RegisterDto`.

**Begründung:** zxcvbn ist groß (~800kB) und eine neue Dependency. Eine
transparente Heuristik genügt für den Prototyp, ist deterministisch testbar und
am Boundary erzwungen (Constitution V). Derselbe Scorer existiert spiegelbildlich
im Frontend (`password-strength.ts`) für das Live-Meter — bewusst dupliziert
(keine geteilte Lib über die App-Grenze), klein und testbar auf beiden Seiten.

## E6 — GDPR-Löschung: hartes Delete vs. Anonymisierung

**Entscheidung:** Anonymisierung statt hartem Delete. `account.delete` setzt
`anonymizedAt`, ersetzt `email` durch einen nicht-rückführbaren Platzhalter
(`deleted+<id>@bursa.invalid`), `displayName` durch "Deleted user",
invalidiert das Passwort (random hash), und nullt PII auf den eigenen Donations
(`donorName`, `message`) — **ohne** Donations/Invoices/Audit-Datensätze zu
löschen.

**Begründung:** Constitution II verlangt einen prüfbaren, unveränderlichen
Geld-Trail ("every state change that touches money is auditable"). Ein hartes
User-Delete würde referenzielle Integrität (Donations, Recurring, Subscriptions)
und die Auditierbarkeit brechen. Anonymisierung erfüllt das GDPR-Recht auf
Löschung der PII und erhält gleichzeitig die Finanz-/Audit-Historie (zulässige
Aufbewahrung aus buchhalterischen Gründen). Export (`account.export`) liefert die
eigenen personenbezogenen Daten als JSON (Recht auf Auskunft/Portabilität).

## E7 — AuditLog: separate Tabelle vs. nur Logging

**Entscheidung:** Eigene Prisma-Tabelle `AuditLog` (append-only) + `AuditService`.
Metadaten werden vor dem Persistieren durch `redact()` PII-bereinigt.

**Begründung:** "Zugriffsprotokollierung" verlangt einen durchsuchbaren,
persistenten Trail, nicht nur flüchtige stdout-Logs. Eine schlanke Tabelle ist
keine neue externe Infra (gleiche Postgres-DB). Eine Migration ist nötig — in der
Linie von E1–E5 unproblematisch.

## E8 — MFA: voller Enrollment-Flow vs. Baustein

**Entscheidung:** Nur der **TOTP-Verifikations-Baustein** (pure RFC 6238) +
`AdminMfaGuard`, der bei gesetztem `ADMIN_TOTP_SECRET` einen gültigen
`x-mfa-token` auf sensiblen Admin-Routen verlangt; ohne Secret No-op.

**Begründung:** Ein vollständiger Per-User-Enrollment-Flow (QR-Provisioning,
Recovery-Codes, DB-Secret pro User, UI) ist ein eigenes Epic-Volumen und würde
den geprüften Auth-Pfad destabilisieren. Der pure TOTP-Verifier + ein
env-gegateter Step-up liefert den getesteten Kern und hält die App ohne
MFA-Config voll lauffähig. Per-User-Enrollment ist als Gap dokumentiert.

## E9 — Dependency-/SAST-Scanning

**Entscheidung:** Kein CI-Scanner-Lauf in diesem Branch (das ist Repo-/CI-Config,
keine App-Logik und würde den Diff nicht testbar machen). Stattdessen eine
versionierte **Security-Release-Checkliste** in `quickstart.md` als Release-Gate
plus `npm audit`-Hinweis. Ehrlich als Doc-Deliverable abgegrenzt.

## Constitution-Check

- **Trust-by-Design:** Härtet genau die geld-/verifizierungsnahen Pfade; Geld-Trail
  bleibt durch Anonymisierung-statt-Delete unverändert auditierbar.
- **Provider-Abstraktion:** Keine Geld-Logik geändert; Webhook-Verifikation sitzt
  vor dem Provider, der Provider bleibt die einzige Geld-Naht.
- **Immutabilität:** Alle pure Utils geben neue Objekte zurück (redact, headers,
  rate-limit-Resultate).
- **Kleine Module:** Jede Datei eine Verantwortung, alle <300 Zeilen.
- **Boundary-Validation & Envelope:** Passwort-Policy als DTO-Constraint;
  Rate-Limit/Webhook-Fehler im `{success,error}`-Envelope.
