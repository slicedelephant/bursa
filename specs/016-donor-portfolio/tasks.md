# Tasks 016 — Spender-Portfolio & Giving-Streaks (E16)

TDD-geordnet: Tests vor Implementierung. Jede neue pure-logic-Datei bekommt ein
Per-Path-80%-Gate (`apps/api/package.json` bzw. `apps/web/jest.config.js`).

## Phase 0 — Branch + Spec-Kit (Commit 1)
- [x] T000 `git checkout -b 016-donor-portfolio` von `main`
- [x] T001 spec.md, research.md, plan.md, data-model.md, contracts/api.md, quickstart.md, tasks.md

## Phase 1 — Gamification-Primitive (Tests zuerst) (Commit 2, feat(api))
- [x] T010 `gamification/streak.util.spec.ts` + `streak.util.ts` (`computeMonthlyStreak`)
- [x] T011 `gamification/badge.util.spec.ts` + `badge.util.ts` (`resolveTier`, `monthlyGivingBadge`)
- [x] T012 `gamification/leaderboard.util.spec.ts` + `leaderboard.util.ts` (`rankLeaderboard`)
- [x] T013 `gamification/cumulative.util.spec.ts` + `cumulative.util.ts` (`aggregateContributions`)
- [x] T014 `gamification/peer-comparison.util.spec.ts` + `peer-comparison.util.ts` (`comparePeers`)

## Phase 2 — Portfolio-Export-Util (Tests zuerst) (Commit 2)
- [x] T020 `portfolio/portfolio-export.util.spec.ts` + `portfolio-export.util.ts`
      (`toPortfolioCsv`, `portfolioPdfLines`)

## Phase 3 — Service / Controller / Modul (Commit 2)
- [x] T030 `portfolio.service.ts` (+ `portfolio.service.spec.ts` mit gemocktem Prisma):
      `portfolio`, `portfolioCsv`, `portfolioPdf`; mappt Donations → Primitive
- [x] T031 `portfolio.controller.ts` (`donors/me/portfolio` + 2 `@Res()`-Exporte), `@Roles(DONOR)`
- [x] T032 `portfolio.module.ts`, in `app.module.ts` registriert
- [x] T033 Per-Path-80%-Gates in `apps/api/package.json` für alle neuen reinen Dateien

## Phase 4 — Seed (Commit 2)
- [x] T040 seed.ts: `donor@bursa.test` bekommt mehrmonatige Donations über mehrere
      Kampagnen (sichtbare Streak + Badge + Multi-Student-Portfolio). Idempotent,
      kein Mutieren bestehender Geld-Invarianten.

## Phase 5 — Frontend (Commit 3, feat(web))
- [x] T050 `donor/streak-format.spec.ts` + `streak-format.ts`
- [x] T051 `donor/portfolio-stats.spec.ts` + `portfolio-stats.ts`
- [x] T052 `donor/streak-banner.component.spec.ts` + `streak-banner.component.ts`
- [x] T053 `donor/portfolio-grid.component.spec.ts` + `portfolio-grid.component.ts`
- [x] T054 `donor/portfolio-stats.component.spec.ts` + `portfolio-stats.component.ts`
- [x] T055 `models.ts` (Portfolio-Typen), `api.service.ts` (`donorPortfolio`, Export),
      `donor.page.ts` integriert Banner + Stats + Grid + Export-Buttons
- [x] T056 Per-Path-80%-Gates in `apps/web/jest.config.js` für alle neuen Dateien

## Phase 6 — Verify + PR (Commit 4)
- [x] T060 `test:cov` (api+web) grün, beide `build` grün, `seed` clean
- [x] T061 `migrate status` up to date, `migrate diff --exit-code` → No difference
- [x] T062 `prettier --check` clean beide Apps; PR gegen `main`
- [x] T063 `docs/EPICS-PROGRESS.md` E16-Eintrag (FERTIG)
