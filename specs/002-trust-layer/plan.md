# Implementation Plan: Trust-Layer (E1)

**Branch**: `002-trust-layer` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-trust-layer/spec.md`

## Summary

Make the already-built trust mechanics visible *before* the donation. The public campaign
detail response gains a read-only `trust` projection (verification badges + school confirmation +,
for disbursed campaigns, a public payout proof). No new entities, no migration: the projection is
derived from existing data (`AdmissionVerification.status`, `School.payoutVerified`, `Payout`).
The web client renders a reusable trust/badge component above the donate CTA, a "how the money
flows" explainer, and a payout-proof block (with a direct-to-school promise fallback). The gallery
card reuses the same verified badge.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24.

**Primary Dependencies**: Backend — NestJS 11, Prisma 6 (no new deps). Frontend — Angular 20
(standalone, signals), Tailwind CSS (no new deps).

**Storage**: PostgreSQL 16 (existing schema; no migration). `detail()` extends its Prisma
`include` with the already-modeled `payout` relation.

**Testing**: Jest unit tests for the mapper projection (`toTrustSummary` / extended `toDetail`)
and Angular component tests for the trust block, payout-proof block and badge. Target ≥80% on the
new units (SC-004).

**Target Platform**: Local dev. Mobile-responsive web.

**Project Type**: Web application (existing `apps/api` + `apps/web`).

**Performance Goals**: Prototype scale — projection is a pure mapping over an already-fetched
campaign; no extra round trips beyond one added relation in the existing query.

**Constraints**: Read-only/additive — no state changes, no new endpoints, no internal data exposed
(no verifier IDs, no donor PII beyond the existing anonymity rule). Money in EUR cents.

**Scale/Scope**: 1 backend mapper extension + 1 service `include` line; ~3 web components, 1 model
extension. No `app.module.ts` import-order change (only the existing `campaigns` module is touched).

## Constitution Check

*GATE: must pass before and after design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-Driven | PASS | spec → plan → tasks → implement; artifacts under `specs/002-trust-layer/`. |
| II. Trust & Verification by Design | PASS | surfaces the existing publish gate + school-only payout; payout proof is an auditable, public artifact of a real `Payout`. |
| III. Payments behind abstraction | PASS | no payment/payout code touched; reads the existing `Payout` record only. |
| IV. Immutability & small modules | PASS | new `toTrustSummary` pure mapper returns a fresh object; lives in existing `campaign.mapper.ts`; web adds small focused components. |
| V. Validate at boundary | PASS | no new inbound input; projection emits a stable, whitelisted shape via the existing response envelope. |
| VI. Privacy & security | PASS | only public fields exposed (school name, amount, reference, sentAt, statuses); verifier IDs, notes and account refs are never mapped. |

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-trust-layer/
├── plan.md            # this file
├── spec.md
├── data-model.md      # Phase 1 — read-only TrustSummary projection (no new entities)
├── contracts/
│   └── api.md         # Phase 1 — GET /campaigns/:id extension (trust + payoutProof)
└── tasks.md           # Phase 2 — TDD-ordered tasks
```

### Source Code (touched by this feature)

```text
apps/api/src/campaigns/
├── campaign.mapper.ts        # + toTrustSummary(); toDetail() spreads `trust`
├── campaign.mapper.spec.ts   # + projection tests (VERIFIED set, payoutProof present/absent)
└── campaigns.service.ts      # detail(): include `payout: true`

apps/web/src/app/
├── core/                     # campaign detail model gains `trust`
├── shared/
│   ├── verified-badge/       # reusable badge (gallery card + detail)
│   └── trust-block/          # badges + tooltip + "direct to school" + money-flow explainer
└── features/
    ├── campaign/             # trust block above donate CTA + payout-proof block (promise fallback)
    └── gallery/              # card reuses verified-badge
```

**Structure Decision**: Stay inside the existing `campaigns` feature module on the backend and the
existing `shared`/`features` split on the web. The projection is colocated with `toCard`/`toDetail`
in `campaign.mapper.ts` (high cohesion). No new module, no `app.module.ts` change.

## Complexity Tracking

*No constitution violations — section intentionally empty.*
