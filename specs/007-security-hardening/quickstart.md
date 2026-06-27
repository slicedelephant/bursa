# Quickstart & Security-Release-Checkliste — Feature 007

## Lokal starten (unverändert)

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                                   # Postgres (5433)
cd apps/api && npx prisma migrate dev           # wendet security_hardening an
npm run seed                                    # inkl. AuditLog-Demodaten
npm run dev                                     # api + web
```

Lokal greifen die Härtungen "weich":
- `validateEnv` warnt nur (kein Abbruch), HSTS ist aus, AdminMfaGuard ist No-op
  (kein `ADMIN_TOTP_SECRET`), Webhook-Verifikation nutzt `STRIPE_WEBHOOK_SECRET`
  falls gesetzt.

## Tests

```bash
npm --prefix apps/api test            # Backend Jest
npm --prefix apps/web run test:cov    # Frontend Jest + Per-Path-Coverage-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Rate-Limit manuell prüfen

```bash
for i in $(seq 1 7); do \
  curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"x@y.z","password":"wrong-pass-123"}'; done
# erwartet: 401 401 401 401 401 429 429
```

## Webhook-Signatur prüfen (lokal)

```bash
SECRET=whsec_test; TS=$(date +%s); BODY='{"id":"evt_1","type":"ping"}'
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -s -X POST localhost:3000/api/payments/webhook \
  -H "stripe-signature: t=$TS,v1=$SIG" \
  -H 'content-type: application/json' --data "$BODY"
# erwartet: { "success": true, "data": { "received": true } }
```

## Security-Release-Checkliste (Release-Gate)

Vor jedem Production-Deploy abhaken:

- [ ] **Secrets:** `JWT_SECRET` >=32 Zeichen, NICHT `dev-only-change-me`;
      `DATABASE_URL`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` gesetzt,
      wenn `PAYMENT_PROVIDER=stripe`. (`validateEnv` erzwingt das in Prod.)
- [ ] **Keine Secrets im Repo:** `.env` ist gitignored; `git grep -iE
      "sk_live|whsec_|password=" -- ':!*.example'` leer.
- [ ] **Rate-Limits aktiv:** Login/Registrierung/Donation antworten unter Last
      mit `429` (siehe oben).
- [ ] **Security-Header:** `curl -I` zeigt CSP, HSTS (Prod), nosniff, DENY.
- [ ] **Webhook-Signatur:** ungültig signierte Events → `400`.
- [ ] **GDPR:** Export + Anonymisierung getestet; Geld-/Audit-Trail bleibt.
- [ ] **PII-Redaction:** Fehler-Logs enthalten keine E-Mails/Token/Kartennummern.
- [ ] **Passwort-Policy:** schwaches Passwort wird mit `400` abgelehnt.
- [ ] **Admin-MFA:** in Prod `ADMIN_TOTP_SECRET` gesetzt; sensible Admin-Aktion
      verlangt `x-mfa-token`.
- [ ] **Dependencies:** `npm --prefix apps/api audit` + `npm --prefix apps/web
      audit` ohne kritische Findings; Dependabot/SCA im Repo aktiviert (CI-Schritt).
- [ ] **Alle Tests grün**, beide Builds grün.
