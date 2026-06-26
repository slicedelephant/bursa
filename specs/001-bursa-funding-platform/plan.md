# Implementation Plan: Bursa — Funding Platform

**Branch**: `001-bursa-funding-platform` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-bursa-funding-platform/spec.md`

## Summary

Build a runnable prototype of Bursa: a two-sided giving platform where verified, admitted MBA
students from lower-income countries raise tuition from private donors (card) and corporate
sponsors (SEPA), with funds disbursed **directly to the school**. Payments are mocked behind a
`PaymentProvider` abstraction. The stack is a NestJS 11 + Prisma 6 + PostgreSQL API and an
Angular 20 + Tailwind web client, with synthetic seed data and AI-generated profile images.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24.

**Primary Dependencies**: Backend — NestJS 11, Prisma 6, @nestjs/jwt + passport-jwt, bcrypt,
class-validator/class-transformer, @nestjs/swagger. Frontend — Angular 20 (standalone, signals),
Angular Router, Tailwind CSS 3.4, RxJS/HttpClient.

**Storage**: PostgreSQL 16 (Docker Compose, host port 5433). Prisma migrations + seed.

**Testing**: Vitest/Jest unit tests for domain services (donation accounting, payout guard,
visibility); a seeded end-to-end happy-path script. Tests are targeted, not exhaustive (prototype).

**Target Platform**: Local dev (one-command start). Mobile-responsive web.

**Project Type**: Web application (separate `apps/api` backend + `apps/web` frontend).

**Performance Goals**: Prototype scale — snappy local UX; campaign progress reflects a donation
within ~1s (SC-004). No load targets.

**Constraints**: Mocked payments only (no external calls); funds never reach a student; EUR cents.

**Scale/Scope**: ~10-12 seeded campaigns, 4 roles, 9 entities, ~6 feature modules, ~8 web routes.

## Constitution Check

*GATE: must pass before and after design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-Driven | PASS | spec → plan → tasks → implement; artifacts under `specs/001-*`. |
| II. Trust & Verification by Design | PASS | publish gate via admin verification; payout only to school; SYSTEM updates audit lifecycle. |
| III. Payments behind abstraction | PASS | `PaymentProvider` interface + `MockPaymentProvider`; domain never calls a provider SDK. |
| IV. Immutability & small modules | PASS | feature modules (auth, schools, students, campaigns, donations, sponsors, payouts, updates, admin); services return new objects. |
| V. Validate at boundary | PASS | global `ValidationPipe` (whitelist + forbidNonWhitelisted), response envelope, exception filter. |
| VI. Privacy & security | PASS | synthetic seed; bcrypt; secrets in env; OPENAI_KEY only at seed time. |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-bursa-funding-platform/
├── plan.md            # this file
├── spec.md
├── research.md        # Phase 0 — tech decisions
├── data-model.md      # Phase 1 — entities/enums/invariants
├── contracts/
│   └── api.md         # Phase 1 — REST endpoints
├── quickstart.md      # Phase 1 — run guide
└── tasks.md           # Phase 2 — /speckit-tasks output
```

### Source Code (repository root)

```text
apps/api/                      # NestJS backend
├── prisma/
│   ├── schema.prisma          # from data-model.md
│   └── seed.ts                # synthetic data + DALL·E images
├── src/
│   ├── main.ts                # bootstrap: ValidationPipe, CORS, Swagger, envelope
│   ├── app.module.ts
│   ├── prisma/                # PrismaModule + PrismaService
│   ├── common/                # response envelope, exception filter, role guard, decorators
│   ├── auth/                  # register/login, JWT strategy, roles
│   ├── payments/              # PaymentProvider interface + MockPaymentProvider
│   ├── schools/               # schools CRUD + payout-verify
│   ├── students/              # student profiles + campaign creation
│   ├── campaigns/             # public gallery, detail, lifecycle, donation accounting
│   ├── donations/             # card + SEPA donations (via payments)
│   ├── sponsors/              # corporate profiles, receipts, impact
│   ├── payouts/               # disbursement to school
│   └── admin/                 # verification queue + actions
└── test/                      # domain unit tests + e2e happy path

apps/web/                      # Angular 20 frontend
└── src/app/
    ├── core/                  # api client, auth service/guard, models, money pipe
    ├── shared/                # UI: navbar, campaign card, progress bar, badge, button
    └── features/
        ├── gallery/           # browse verified campaigns
        ├── campaign/          # campaign detail + donate (card)
        ├── student/           # onboarding: profile + campaign
        ├── sponsor/           # corporate pledge + dashboard
        ├── admin/             # verification queue + payout
        └── auth/              # login / register
```

**Structure Decision**: Web application with two independent apps under `apps/` (no shared
workspace, to avoid Angular/Nest peer conflicts). A root `package.json` provides one-command
orchestration (`db:up`, `dev`, `seed`). A small `packages/shared` may hold shared DTO/enum types if
duplication grows; the prototype keeps types local to each app to stay simple (YAGNI).

## Complexity Tracking

*No constitution violations — section intentionally empty.*
