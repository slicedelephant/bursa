# Tasks — Feature 007 Security-Hardening (TDD-geordnet)

Tests ZUERST (RED), dann Implementierung (GREEN), dann Refactor. Pure Kerne mit
80%-Per-Path-Gate. Backend `npm --prefix apps/api test`, Frontend
`npm --prefix apps/web run test:cov`.

## Phase A — Pure Backend-Kerne (höchster Schutzwert, leicht 80%)

- [ ] T01 `pii-redact.spec.ts` → `pii-redact.ts`: redact von E-Mail/Bearer/Karte/
      IBAN/Secret-Keys, deep + immutabel (Original unverändert), Arrays/Nested.
- [ ] T02 `rate-limit.store.spec.ts` → `rate-limit.store.ts`: Fixed-Window hit(),
      allow bis Limit, dann block, Reset nach Fenster, getrennte Keys, `now` injiziert.
- [ ] T03 `security-headers.spec.ts` → `security-headers.ts`: Header-Map, HSTS nur
      bei production, CSP-Default, Permissions-Policy.
- [ ] T04 `env-validation.spec.ts` → `env-validation.ts`: akzeptiert sichere
      Prod-Config; lehnt dev-Default-JWT/zu kurz/fehlende Stripe-Secrets in Prod ab;
      Dev gibt Warnungen statt Fehler.
- [ ] T05 `webhook-signature.spec.ts` → `webhook-signature.ts`: gültige Signatur ok,
      manipulierter Body/Signatur/abgelaufener Timestamp/fehlerhaftes Header-Format
      → false; timing-safe.
- [ ] T06 `password-policy.spec.ts` → `password-policy.ts`: Score 0-4, valid-Flag,
      issues für kurz/ohne Ziffer/ohne Großbuchstabe/Blocklist; validateStrongPassword wirft.
- [ ] T07 `totp.spec.ts` → `totp.ts`: generate+verify Round-Trip, Fenster ±1 Step,
      falscher Code/Secret → false.

## Phase B — Guards & Validatoren (mit Mocks)

- [ ] T08 `rate-limit.guard.spec.ts` → `rate-limit.guard.ts` + `rate-limit.decorator.ts`:
      ohne Metadata pass-through; innerhalb Limit ok; über Limit `429` + Header.
- [ ] T09 `stripe-webhook.guard.spec.ts` → `stripe-webhook.guard.ts`: nutzt rawBody +
      Header + Secret; gültig → true, ungültig → 400 DomainException.
- [ ] T10 `admin-mfa.guard.spec.ts` → `admin-mfa.guard.ts`: ohne Secret No-op (true);
      mit Secret + gültigem Token true; fehlend/ungültig → 401 MFA_REQUIRED.
- [ ] T11 `is-strong-password.validator.ts`: class-validator Constraint auf Basis von
      password-policy (über T06 mitgetestet / dünn).

## Phase C — Services (mit Prisma-Mock)

- [ ] T12 `audit.service.spec.ts` → `audit.service.ts`: record() persistiert mit
      redacteten Metadaten; list() filtert; Fehler beim Logging schluckt nicht den Flow.
- [ ] T13 `account.service.spec.ts` → `account.service.ts`: export() liefert eigene
      Daten; anonymize() scrubbt User-PII + Donation-PII, setzt anonymizedAt,
      schreibt Audit, ist idempotent.

## Phase D — Dünne Wiring-Schicht

- [ ] T14 `account.controller.ts` (export/delete, JWT), `webhook.controller.ts`
      (raw body), `security.module.ts`; in `app.module.ts` einhängen.
- [ ] T15 `main.ts`: `rawBody:true`, securityHeaders-Middleware, validateEnv-Bootcheck.
- [ ] T16 `all-exceptions.filter.ts`: redact() im Logging.
- [ ] T17 `register.dto.ts`: `@IsStrongPassword()`; `auth.controller.ts`/`donations.controller.ts`:
      `@RateLimit(...)`; `auth.service.ts`: Audit login/login_failed.

## Phase E — Datenbank

- [ ] T18 `schema.prisma`: `AuditLog` + `User.anonymizedAt`; Migration
      `security_hardening` via `npx prisma migrate dev`.
- [ ] T19 `seed.ts`: AuditLog-Demodaten; Seed lauffähig halten.

## Phase F — Frontend (Per-Path-Gate)

- [ ] T20 `password-strength.spec.ts` → `core/password-strength.ts` (pure Scorer).
- [ ] T21 `pii-mask.spec.ts` → `core/pii-mask.ts` (maskEmail, pure).
- [ ] T22 `account-security.spec.ts` → `features/account/account-security.ts`
      (Export-Dateiname/JSON-Blob-Helfer, pure).
- [ ] T23 `password-strength-meter.component.spec.ts` →
      `features/auth/password-strength-meter.component.ts`.
- [ ] T24 `privacy-panel.component.spec.ts` →
      `features/account/privacy-panel.component.ts`.
- [ ] T25 Einbindung: `register.page.ts` (Meter), `api.service.ts`
      (exportMyData/deleteMyAccount), Route für Privacy-Panel.

## Phase G — Verify & Gates

- [ ] T26 Per-Path-80%-Gates in `apps/api/package.json` (jest) + `apps/web/jest.config.js`.
- [ ] T27 `npm --prefix apps/api test` && `npm --prefix apps/web run test:cov`
      && beide `run build` grün.
- [ ] T28 Commit (logische Einheiten), Branch push, `gh pr create` (Base 006),
      EPICS-PROGRESS aktualisieren.
