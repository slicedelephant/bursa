# Implementation Plan — Feature 007 Security-Hardening

## Architektur-Überblick

Ein neues, in sich geschlossenes `security`-Modul im Backend bündelt die
defensiven Bausteine; bestehende Module werden nur minimal-invasiv erweitert
(Decorator/Guard anhängen, Header-Middleware in `main.ts`, Redaction im
Exception-Filter). Frontend bekommt einen kleinen `account`-Feature-Bereich plus
einen Passwort-Stärke-Baustein. Keine neue externe Infra; alles in-memory bzw.
in der bestehenden Postgres-DB.

```
apps/api/src/security/
  rate-limit.store.ts            (pure)   Fixed-Window-Zähler
  rate-limit.store.spec.ts
  rate-limit.decorator.ts                 @RateLimit({limit,windowMs,name})
  rate-limit.guard.ts                     RateLimitGuard (429 + Header)
  rate-limit.guard.spec.ts
  security-headers.ts            (pure)   Header-Map (CSP/HSTS/…)
  security-headers.spec.ts
  env-validation.ts              (pure)   validateEnv(env,{production})
  env-validation.spec.ts
  webhook-signature.ts           (pure)   HMAC-Verifikation (Stripe-Schema)
  webhook-signature.spec.ts
  stripe-webhook.guard.ts                 StripeWebhookGuard
  stripe-webhook.guard.spec.ts
  pii-redact.ts                  (pure)   redact(value) deep + immutabel
  pii-redact.spec.ts
  password-policy.ts             (pure)   assessPassword / validateStrongPassword
  password-policy.spec.ts
  is-strong-password.validator.ts         class-validator Constraint
  totp.ts                        (pure)   RFC 6238 verifyTotp/generateTotp
  totp.spec.ts
  admin-mfa.guard.ts                      AdminMfaGuard (env-gated)
  admin-mfa.guard.spec.ts
  audit.service.ts                        AuditService.record/list
  audit.service.spec.ts
  account.service.ts                      GDPR export + anonymize
  account.service.spec.ts
  account.controller.ts                   /account/export, /account/delete
  webhook.controller.ts                   POST /payments/webhook
  security.module.ts

apps/api/src/main.ts               + securityHeaders-Middleware, validateEnv, rawBody
apps/api/src/common/all-exceptions.filter.ts  + redact() im Logging
apps/api/src/auth/dto/register.dto.ts         + @IsStrongPassword()
apps/api/src/auth/auth.controller.ts          + @RateLimit auf login/register
apps/api/src/auth/auth.service.ts             + Audit (login/login_failed)
apps/api/src/donations/donations.controller.ts + @RateLimit auf card
apps/api/prisma/schema.prisma                 + AuditLog, User.anonymizedAt
apps/api/prisma/seed.ts                        + AuditLog-Demodaten

apps/web/src/app/core/password-strength.ts        (pure) Scorer
apps/web/src/app/core/pii-mask.ts                  (pure) maskEmail
apps/web/src/app/features/auth/password-strength-meter.component.ts
apps/web/src/app/features/account/account-security.ts   (pure) Export-Helfer
apps/web/src/app/features/account/privacy-panel.component.ts
apps/web/src/app/features/auth/register.page.ts    + Meter eingebunden
apps/web/src/app/core/api.service.ts               + exportMyData/deleteMyAccount
```

## TDD-Reihenfolge (Tests zuerst, RED → GREEN → REFACTOR)

Pure Kerne zuerst (leicht 80% zu erreichen, höchster Schutzwert), dann Guards/
Services (mit Mocks), dann dünne Wiring-Schicht (Controller/Module/main.ts),
zuletzt Frontend.

1. **pii-redact** (pure) — fundamental, von Audit + Filter genutzt.
2. **rate-limit.store** (pure) → **rate-limit.guard** → Decorator/Wiring.
3. **security-headers** (pure) → main.ts-Middleware.
4. **env-validation** (pure) → main.ts-Bootcheck.
5. **webhook-signature** (pure) → **stripe-webhook.guard** → webhook.controller.
6. **password-policy** (pure) → **is-strong-password.validator** → RegisterDto.
7. **totp** (pure) → **admin-mfa.guard**.
8. **audit.service** → **account.service** → account.controller; Auth-Audit-Wiring.
9. **Prisma-Migration** `security_hardening` + Seed-Erweiterung.
10. **Frontend** password-strength + pii-mask + Komponenten + register-Einbindung
    + api.service-Methoden.
11. **VERIFY**: api test, web test:cov, beide build; Per-Path-Gates eintragen.

## Risiko-/Stabilitäts-Leitplanken

- Keine Änderung an der `PaymentProvider`-Abstraktion oder am geprüften
  Donation-Capture-Pfad — Rate-Limit hängt nur als Guard davor.
- `rawBody: true` ist additiv (bestehender JSON-Parser bleibt aktiv).
- Passwort-Policy greift nur am HTTP-Boundary (DTO/ValidationPipe); Unit-Tests,
  die `AuthService.register` direkt rufen, und der Seed (direktes bcrypt) bleiben
  unberührt.
- AdminMfaGuard ist ohne `ADMIN_TOTP_SECRET` ein No-op → App ohne MFA lauffähig.
- `validateEnv` wirft nur bei `NODE_ENV=production`; lokal nur Warnung.
- Migration additiv (neue Tabelle + nullable Spalte) → keine Datenmigration nötig.

## Complexity Tracking

- **Neues `security`-Modul:** gerechtfertigt — bündelt Cross-Cutting-Concerns
  hochkohäsiv statt sie über Feature-Module zu streuen (Constitution IV).
- **AuditLog-Tabelle + Migration:** gerechtfertigt — persistente
  Zugriffsprotokollierung ist Kern-Scope; gleiche DB, keine neue Infra.
- **Dependency-freie Eigenbauten** (Rate-Limit, Header, HMAC, TOTP, Passwort):
  bewusst gewählt statt Libraries (helmet/throttler/zxcvbn/stripe-SDK/otplib),
  um neue Dependencies/Netzwerk-Installs zu vermeiden und 100% testbaren Code zu
  halten. Trade-off (kein verteilter State, keine Library-Pflege) im
  Out-of-Scope dokumentiert.
