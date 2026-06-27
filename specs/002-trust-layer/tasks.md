# Tasks: Trust-Layer (E1)

**Input**: Design documents in `specs/002-trust-layer/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md

Format: `[ID] [P?] [Story] Description` · `[P]` = parallelizable (different files).
Paths: backend `apps/api/src/...`, frontend `apps/web/src/app/...`.
Order is **TDD**: a failing test (RED) precedes its implementation (GREEN), then refactor.

## Phase 1: Backend trust projection (US1, US2 — P1) 🎯 MVP

- [ ] T001 [P] [US1] **RED** — extend `apps/api/src/campaigns/campaign.mapper.spec.ts`: cover a
  new `toTrustSummary(c)` — a `VERIFIED` campaign yields `verifications.admission='VERIFIED'`,
  `schoolConfirmed=true`, `identityChecked=true`; `payoutProof` is **absent** when there is no
  payout / not `DISBURSED`.
- [ ] T002 [P] [US2] **RED** — add a spec case: a `DISBURSED` campaign with a `Payout`
  (`status='SENT'`, `sentAt` set) yields `payoutProof = { schoolName, amountCents, reference,
  sentAt }`; assert no internal fields (`verifiedById`, `payoutAccountRef`, `Payout.id`) leak.
- [ ] T003 [US1] **GREEN** — implement `toTrustSummary(c)` in
  `apps/api/src/campaigns/campaign.mapper.ts` per data-model.md; have `toDetail()` spread
  `trust: toTrustSummary(c)`. Extend the local `CampaignFull` type with `payout?: Payout | null`.
- [ ] T004 [US2] **GREEN** — in `apps/api/src/campaigns/campaigns.service.ts` `detail()`, add
  `payout: true` to the Prisma `include` (no other query change). Verify mapper tests pass.
- [ ] T005 [US1] **REFACTOR** — keep the payout-proof guard (`DISBURSED` + `SENT`/`CONFIRMED` +
  `sentAt`) as a small pure helper; ensure immutability (new object, no input mutation) and
  re-run `npm test` in `apps/api` (coverage ≥80% on the mapper — SC-004).

**Checkpoint**: `GET /campaigns/:id` returns `data.trust`; payout proof appears only for disbursed
campaigns with a sent payout (SC-001, SC-002).

## Phase 2: Reusable web trust components (US1, US3 — P1/P2)

- [ ] T006 [US1] Extend the campaign-detail model in `apps/web/src/app/core/` with the `trust`
  shape (`verifications` + optional `payoutProof`).
- [ ] T007 [P] [US3] **RED→GREEN** — `apps/web/src/app/shared/verified-badge/`: reusable badge
  component + component test (renders when `verified`/`schoolConfirmed`, hidden otherwise).
- [ ] T008 [P] [US1] **RED→GREEN** — `apps/web/src/app/shared/trust-block/`: badges (identity
  checked, admission verified, school confirmed) with explain tooltip, the "Bursa pays directly to
  the school, never to the student" statement, and the "how the money flows" explainer
  (Donor → Bursa carrier → School); component test asserts all badges + the direct-to-school line.

**Checkpoint**: shared trust components exist and are unit-tested.

## Phase 3: Wire components into pages (US1, US2, US3)

- [ ] T009 [US1] `apps/web/src/app/features/campaign/`: render `trust-block` **above** the donate
  CTA (SC-003) and surface the money-flow explainer (section or tooltip/panel) — FR-002, FR-005.
- [ ] T010 [US2] Campaign detail: render a payout-proof block (school, amount, date, reference)
  when `trust.payoutProof` is present; otherwise the direct-to-school promise — FR-003.
- [ ] T011 [P] [US3] `apps/web/src/app/features/gallery/`: each verified card reuses
  `verified-badge` (FR-004).

**Checkpoint**: a donor sees the trust block above the CTA; disbursed campaigns show a public
payout proof; gallery cards show the verified badge.

## Phase 4: Verify & polish

- [ ] T012 Run `npm test` (api + web); confirm ≥80% coverage on the new units (SC-004).
- [ ] T013 [P] Manual pass on a seeded `LIVE` (promise) and a seeded `DISBURSED` (proof) campaign;
  responsive/empty-state check; `npm run dev` smoke.

## Dependencies

- T001/T002 (RED) before T003/T004 (GREEN); T003 before T004 (mapper before service include).
- T006 before T007–T011 (model first). T007/T008 are `[P]` (different folders); both before T009–T011.
- Phase 4 is last. Backend (Phase 1) is independently shippable and is the MVP slice.
