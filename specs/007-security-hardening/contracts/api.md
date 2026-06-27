# API Contracts — Feature 007 Security-Hardening

Alle Responses folgen dem Envelope `{ success, data? , error? }`.
Fehler: `{ success: false, error: { code, message, details? } }`.

## Cross-cutting (kein neuer Endpoint)

### Security-Header (alle Responses)
Gesetzt via Middleware:
`Content-Security-Policy`, `Strict-Transport-Security` (nur Produktion),
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`,
`X-DNS-Prefetch-Control: off`.

### Rate-Limiting (annotierte Routen)
Antwort bei Überschreitung:
```
HTTP 429
{ "success": false, "error": { "code": "RATE_LIMITED",
  "message": "Too many requests, please try again later." } }
Header: Retry-After: <sek>, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```
Annotiert: `POST /api/auth/login` (5/60s), `POST /api/auth/register` (5/300s),
`POST /api/campaigns/:id/donations/card` (10/60s). Schlüssel: IP + Route.

## POST /api/payments/webhook  (Stripe-Signaturpflicht)

Header: `stripe-signature: t=<unixts>,v1=<hex-hmac>` (raw body wird signiert).

- **gültige Signatur** → `200 { success:true, data:{ received:true } }`
- **fehlende/ungültige Signatur oder abgelaufener Timestamp** →
  `400 { success:false, error:{ code:"INVALID_SIGNATURE", message } }`

Verifikation: `signedPayload = "<t>.<rawBody>"`,
`expected = HMAC_SHA256(STRIPE_WEBHOOK_SECRET, signedPayload)`, timing-safe
Vergleich gegen `v1`, Timestamp innerhalb Toleranz (Default 300s).

## GET /api/account/export  (JWT)

Recht auf Auskunft/Portabilität. Liefert die eigenen Daten:
```
200 { success:true, data:{
  user:{ id, email, role, displayName, createdAt },
  donations:[ { id, amountCents, currency, status, createdAt, campaignId } ],
  recurringPledges:[ … ],
  subscriptions:[ … ],
  exportedAt
} }
```
Schreibt `account.export` ins AuditLog.

## POST /api/account/delete  (JWT)

Recht auf Löschung (Anonymisierung, Geld-Trail bleibt).
```
200 { success:true, data:{ anonymized:true, anonymizedAt } }
```
Effekt: email/displayName/passwordHash gescrubbt, `anonymizedAt` gesetzt, eigene
Donation-PII genullt. Schreibt `account.delete` ins AuditLog. Idempotent: ein
bereits anonymisiertes Konto liefert denselben Erfolg ohne erneute Änderung.

## Auth (bestehend, gehärtet)

- `POST /api/auth/register` — `password` jetzt durch `@IsStrongPassword()`
  validiert. Schwaches Passwort → `400 VALIDATION_ERROR` mit `details`
  (Liste der verletzten Regeln).
- `POST /api/auth/login` — unverändertes Verhalten, zusätzlich rate-limited;
  Erfolg → AuditLog `auth.login`, Fehlschlag → `auth.login_failed`
  (ohne Passwort, E-Mail redacted).

## Admin Step-up (env-gated)

Wenn `ADMIN_TOTP_SECRET` gesetzt ist, verlangen geschützte Admin-Aktionen
zusätzlich `x-mfa-token: <6-stelliger TOTP>`:
- fehlt/ungültig → `401 { success:false, error:{ code:"MFA_REQUIRED" } }`
- gültig → normale Verarbeitung.
Ohne gesetztes Secret ist der Guard ein No-op (Dev-Default).
