# Tasks 017 — Referral- & Advocate-Engine (E15)

## Phase 0 — Branch + Spec-Kit (Commit 1, docs)
- [x] T000 `git checkout -b 017-referral-engine` von `main`
- [x] T001 spec.md, research.md, plan.md, data-model.md, contracts/api.md, quickstart.md, tasks.md

## Phase 1 — Pure-Logic (Tests zuerst) (Commit 2, feat(api))
- [x] T010 `referral/referral-code.util.spec.ts` + `referral-code.util.ts`
      (`createReferralCode`, `hashReferralCode`, `validateReferralCode`) — E8-Muster
- [x] T011 `referral/referral-attribution.util.spec.ts` + `referral-attribution.util.ts`
      (`resolveAttribution`: gültig/self-referral/status/dedupe)
- [x] T012 `referral/reward-tier.util.spec.ts` + `reward-tier.util.ts`
      (`referralReward` — Wrapper über E16 `resolveTier`, Schwellen 3/5/10, perks, no cash)
- [x] T013 `referral/referral-leaderboard.util.spec.ts` + `referral-leaderboard.util.ts`
      (`buildAdvocateLeaderboard`, `buildReferralLeaderboard` — über E16 `rankLeaderboard`)
- [x] T014 `referral/share-template.util.spec.ts` + `share-template.util.ts`
      (`buildShareTemplates` — email/whatsapp/linkedin pre-filled)
- [x] T015 `referral/referral-stats.util.spec.ts` + `referral-stats.util.ts`
      (`computeReferralStats` — conversion, viral coefficient, label)

## Phase 2 — Service / Controller / Modul (Commit 2)
- [x] T020 `referral/referral.service.ts` (Prisma-I/O hinter den Primitiven):
      `donorReferral`, `setLeaderboardOptIn`, `referralLeaderboard`, `inviteAdvocate`,
      `advocates`, `advocateLeaderboard`, `attributeDonation`
- [x] T021 `referral/dto/invite-advocate.dto.ts`, `referral/dto/opt-in.dto.ts`
- [x] T022 `referral/referral.controller.ts` (3 Controller-Flächen)
- [x] T023 `referral/referral.module.ts` (+ in `app.module.ts` registriert, exportiert Service)
- [x] T024 `referral/referral.service.spec.ts` (gemocktes Prisma — Verhalten/Limit/Dedupe)
- [x] T025 Donations-Pfad: optionaler `referralCode` → nach Erfolg
      `ReferralService.attributeDonation` (fire-and-forget, money-frei)

## Phase 3 — Prisma + Seed (Commit 2)
- [x] T030 `schema.prisma`: `ReferralLink`, `AdvocateInvite`, `ReferralAttribution`,
      Enums `ReferralKind`, `AdvocateInviteStatus`, Backrefs an User/Campaign/Donation
- [x] T031 Migration `referral_engine`
- [x] T032 `seed.ts`: Fundraiser + Advocates + geworbene Spenden, Spender mit
      Referral-Stats + Both-Win-Badge — idempotent
- [x] T033 Per-Path-80%-Gates in `apps/api/package.json` für alle neuen pure-logic-Dateien

## Phase 4 — Frontend (Commit 3, feat(web))
- [x] T040 `referral/referral-link.spec.ts` + `referral-link.ts`
- [x] T041 `referral/referral-stats-format.spec.ts` + `referral-stats-format.ts`
- [x] T042 `referral/share-templates.spec.ts` + `share-templates.ts` (reuse E3 `buildShareLinks`)
- [x] T043 `referral/referral-panel.component.spec.ts` + `referral-panel.component.ts`
- [x] T044 `referral/referral-cta.component.spec.ts` + `referral-cta.component.ts`
- [x] T045 `referral/advocate-manager.component.spec.ts` + `advocate-manager.component.ts`
- [x] T046 `referral/advocate-leaderboard.component.spec.ts` + `advocate-leaderboard.component.ts`
- [x] T047 `models.ts` (E15-Typen), `api.service.ts` (Referral-/Advocate-Calls),
      `donor.page.ts` integriert Panel + CTA
- [x] T048 Per-Path-80%-Gates in `apps/web/jest.config.js` für alle neuen Dateien

## Phase 5 — Verify + PR (Commit 4, docs)
- [x] T050 `test:cov` (api+web) grün · beide `build` grün · `seed` clean
- [x] T051 `migrate status` up-to-date · `migrate diff --exit-code` sauber
- [x] T052 `prettier --check` clean (api+web), inkl. `models.ts`
- [x] T053 `docs/EPICS-PROGRESS.md` E15-Abschnitt + Status FERTIG; PR öffnen
