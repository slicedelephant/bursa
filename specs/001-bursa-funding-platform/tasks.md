# Tasks: Bursa — Funding Platform

**Input**: Design documents in `specs/001-bursa-funding-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md

Format: `[ID] [P?] [Story] Description` · `[P]` = parallelizable (different files).
Paths: backend `apps/api/src/...`, frontend `apps/web/src/app/...`.

## Phase 1: Setup (Shared Infrastructure) — DONE during environment prep

- [x] T001 Monorepo skeleton (`apps/api` NestJS 11, `apps/web` Angular 20, `infra`, `scripts`, `docs`).
- [x] T002 Root scripts (`db:up`, `dev`, `seed`, `install:all`), `.gitignore`, `.env.example`.
- [x] T003 Docker Compose Postgres 16 (host 5433); Tailwind 3.4 + brand palette wired into Angular.
- [x] T004 Prisma 6 installed; `apps/api/.env` `DATABASE_URL` set to the Docker DB.

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T005 Prisma schema from data-model.md in `apps/api/prisma/schema.prisma` (enums + 9 models).
- [ ] T006 First migration (`prisma migrate dev --name init`) + `PrismaModule`/`PrismaService` in `apps/api/src/prisma/`.
- [ ] T007 [P] Common layer in `apps/api/src/common/`: response interceptor (envelope), exception filter, `Roles` decorator + `RolesGuard`, `CurrentUser` decorator.
- [ ] T008 [P] Payments abstraction in `apps/api/src/payments/`: `PaymentProvider` interface + `MockPaymentProvider` (deterministic, `…13` fails) + module/token.
- [ ] T009 Auth module in `apps/api/src/auth/`: register/login (bcrypt), JWT strategy, `JwtAuthGuard`, `/auth/me`.
- [ ] T010 `main.ts` bootstrap: global `ValidationPipe` (whitelist), interceptor, filter, CORS, Swagger at `/api/docs`, global prefix `/api`.
- [ ] T011 [P] Frontend core in `apps/web/src/app/core/`: `ApiService` (envelope-aware HttpClient), `AuthService` + interceptor + guards, TS models/enums, `MoneyPipe` (cents→€), routes shell + navbar/footer in `shared/`.

**Checkpoint**: API boots, DB migrated, auth works, web shell renders.

## Phase 3: User Story 1 — Browse & donate by card (P1) 🎯 MVP

- [ ] T012 [US1] `schools` module: `GET /schools`, `POST /schools`, `PATCH /schools/:id/verify-payout`.
- [ ] T013 [US1] `campaigns` module read side: `GET /campaigns` (gallery filter), `GET /campaigns/:id` (detail), `GET /stats`, visibility invariant 1.
- [ ] T014 [US1] `donations` module: `POST /campaigns/:id/donations/card` via `PaymentProvider`, goal accounting (invariants 3-5), `GET /campaigns/:id/donations`.
- [ ] T015 [P] [US1] Domain unit tests: donation accounting, over-funding cap, mock-failure, visibility.
- [ ] T016 [US1] Web `features/gallery`: landing hero (stats) + verified campaign grid (cards, progress bar, badge, filters).
- [ ] T017 [US1] Web `features/campaign`: detail page (story, school, progress, recent donors) + card donation dialog with success state.

**Checkpoint**: a visitor can browse verified campaigns and donate by card end-to-end.

## Phase 4: User Story 2 — Student onboarding (P1)

- [ ] T018 [US2] `students` module: `PUT /students/profile`, `GET /students/me`.
- [ ] T019 [US2] `campaigns` write side: `POST /campaigns`, `PATCH /campaigns/:id`, `POST /campaigns/:id/submit` (→ PENDING_VERIFICATION + verification PENDING).
- [ ] T020 [US2] Web `features/student`: onboarding wizard (profile → campaign → submit), draft view, status display.

**Checkpoint**: a student can register, build a profile + campaign, and submit for verification.

## Phase 5: User Story 3 — Admin verification & publish (P1)

- [ ] T021 [US3] `admin` module: `GET /admin/verifications`, `POST /admin/campaigns/:id/verify` (→ LIVE, requires school verified), `POST /admin/campaigns/:id/reject`.
- [ ] T022 [P] [US3] System update on verify/reject; verified badge data on campaign detail.
- [ ] T023 [US3] Web `features/admin`: verification queue + verify/reject actions; gallery reflects newly live campaigns.

**Checkpoint**: admin verifies a pending campaign → it goes LIVE with a verified badge.

## Phase 6: User Story 4 — Corporate sponsor via SEPA (P2)

- [ ] T024 [US4] `sponsors` module: `PUT /sponsors/profile`, `GET /sponsors/me/impact`, `GET /sponsors/donations/:id/receipt`.
- [ ] T025 [US4] `POST /campaigns/:id/donations/sepa` (type CORPORATE, method SEPA) via `PaymentProvider`; receipt generation.
- [ ] T026 [US4] Web `features/sponsor`: SEPA pledge flow + impact dashboard + downloadable receipt.

**Checkpoint**: a sponsor pledges by SEPA, gets a receipt, sees impact.

## Phase 7: User Story 5 — Direct payout to school (P2)

- [ ] T027 [US5] `payouts` module: `POST /admin/campaigns/:id/payout` (FUNDED-only, idempotent, to school) → DISBURSED; `GET /admin/payouts`.
- [ ] T028 [P] [US5] Unit test: payout guard (not-funded blocked, double-payout blocked, recipient is school).
- [ ] T029 [US5] Web admin: disburse action on funded campaigns + payouts list.

**Checkpoint**: admin disburses a funded campaign to its school; no student is paid.

## Phase 8: User Story 6 — Updates & retention (P3)

- [ ] T030 [US6] `POST /campaigns/:id/updates`, `GET /campaigns/:id/updates`; auto SYSTEM updates on verify/funded/disbursed.
- [ ] T031 [US6] Web campaign detail: update timeline + owner "post update" form.

## Phase 9: Polish & Cross-Cutting

- [ ] T032 Seed script `apps/api/prisma/seed.ts`: 3 schools, admin/sponsor/donor users, 10-12 students+campaigns (mixed countries/schools), some funded, some pending; donations + updates.
- [ ] T033 [P] DALL·E image generation in seed (key from `apps/api/.env`→`06_IT/.env` fallback), save to `apps/web/public/seed/`, placeholder fallback.
- [ ] T034 [P] Responsive polish + empty/error/loading states + brand styling pass.
- [ ] T035 E2E happy-path check (seeded loop) + `npm run dev` smoke; fix issues.
- [ ] T036 Walkthrough doc (German) with screenshots in `docs/`; update `docs/ORCHESTRATION.md`; README.
- [ ] T037 Commit per logical group; push to `github.com/slicedelephant/fundingApp`.

## Dependencies

- Phase 2 blocks all stories. US1 is the MVP and should be runnable before US2-US6.
- Within a story: models/services before controllers before web. `[P]` tasks touch different files.
- Seed (T032-T033) can be built incrementally but is finalized in Polish so it covers all entities.
