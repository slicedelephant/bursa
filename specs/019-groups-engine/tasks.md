# Tasks 019 — Gruppen-Engine: Cohort-Teams & Giving Circles (E18)

## Phase 0 — Branch + Spec-Kit (Commit 1, docs)
- [x] T000 `git checkout -b 019-groups-engine` von `main`
- [x] T001 spec.md, research.md, plan.md, data-model.md, contracts/api.md, quickstart.md, tasks.md

## Phase 1 — Pure-Logic (Tests zuerst) (Commit 2, feat(api))
- [ ] T010 `groups/membership.spec.ts` + `membership.ts` (Rollen-Enum, `decideJoin`/`decideLeave`/
      `decideRoleChange`, letzter-Admin-Schutz, `cohortActive`, `canManage/canContribute/canVote`)
- [ ] T011 `groups/shared-goal.spec.ts` + `shared-goal.ts` (`computeSharedGoal`, summiert Teile/Ziel)
- [ ] T012 `groups/stretch-goal.spec.ts` + `stretch-goal.ts` (`decideStretchGoal`, Default 80%)
- [ ] T013 `groups/group-leaderboard.spec.ts` + `group-leaderboard.ts` (Wrapper über E16
      `rankLeaderboard`, optional anonym)
- [ ] T014 `groups/voting.spec.ts` + `voting.ts` (`tallyVote`, stabiler Tie-Break, Quorum)
- [ ] T015 `groups/group-analytics.spec.ts` + `group-analytics.ts` (Wrapper über E16
      `aggregateContributions` + Mitglieder + Ziel + aktive Woche, injiziertes now)
- [ ] T016 `groups/group-invite.spec.ts` + `group-invite.ts` (Wrapper über E15
      `createReferralCode`; `decideInviteAcceptance`, injiziertes now)
- [ ] T017 `groups/chat-moderation.spec.ts` + `chat-moderation.ts` (reuse E9 keyword-matcher +
      Slur-Blocklist; Längen-Check)
- [ ] T018 `groups/cohort-match.spec.ts` + `cohort-match.ts` (`splitCohortMatch`, money-freie
      Aufteilung, deterministisch)

## Phase 2 — Service / Controller / Modul (Commit 2)
- [ ] T020 `groups/dto/*.dto.ts` (create-group, invite, join, role, add-campaign, contribute,
      open-vote, cast-ballot, message, cohort-match)
- [ ] T021 `groups/groups.service.ts` (Prisma-I/O + E16/E15/E9/E5-Kollaboratoren hinter den
      Primitiven): create/get/list/join/leave/setRole/invite/addCampaign/contribute/openVote/
      castBallot/tally/closeVote/postMessage/messages/analytics/matchCohort
- [ ] T022 `groups/groups.controller.ts` (`@Controller('groups')`, auth-gated, Gruppen-Rollen-Checks)
- [ ] T023 `groups/groups.module.ts` (importiert `CorporateModule`; in `app.module.ts` registriert)
- [ ] T024 `groups/groups.service.spec.ts` (gemocktes Prisma + gemockter `CorporateService` —
      Verhalten/Rollen/Moderation/Voting/Match)

## Phase 3 — Prisma + Seed (Commit 2)
- [ ] T030 `schema.prisma`: 9 Modelle (Group/GroupMember/GroupInvite/GroupCampaign/
      GroupContribution/GroupVote/GroupVoteOption/GroupVoteBallot/GroupMessage) + 6 Enums,
      Backrefs an User/Campaign/Donation
- [ ] T031 Migration `groups_engine`
- [ ] T032 `seed.ts`: eine Cohort mit 2-3 Sub-Kampagnen + einem Corporate-Match, eine Giving
      Circle mit Mitgliedern + Shared-Goal + einem Vote + einer moderierten (APPROVED) Nachricht —
      idempotent; `clearDatabase()` um die neuen Tabellen erweitert
- [ ] T033 Per-Path-80%-Gates in `apps/api/package.json` für alle neuen pure-logic-Dateien +
      `groups.service.ts`

## Phase 4 — Frontend (Commit 3, feat(web))
- [ ] T040 `groups/group-format.spec.ts` + `group-format.ts` (Modus-/Sichtbarkeits-Label,
      Shared-Goal-Prozent, Stretch-Status)
- [ ] T041 `groups/role-format.spec.ts` + `role-format.ts` (Rollen-Label + Berechtigungs-Hinweis)
- [ ] T042 `groups/voting-format.spec.ts` + `voting-format.ts` (Voting-Status, Sieger, Prozent/Option)
- [ ] T043 `groups/group-detail.component.spec.ts` + `group-detail.component.ts` (Shared-Progress,
      Stretch, Mitglieder, Leaderboard, Sub-Kampagnen/Portfolio)
- [ ] T044 `groups/group-voting.component.spec.ts` + `group-voting.component.ts` (Optionen/abstimmen/Tally)
- [ ] T045 `groups/group-chat.component.spec.ts` + `group-chat.component.ts` (posten + Historie,
      Moderations-Feedback)
- [ ] T046 `groups/groups.page.ts` (Übersicht + Create-Group-Form, Modus-Wahl)
- [ ] T047 `models.ts` (E18-Typen), `api.service.ts` (Group-Calls), `app.routes.ts` (`groups`-Route),
      Nav-Link; `models.ts` prettier-formatiert
- [ ] T048 Per-Path-80%-Gates in `apps/web/jest.config.js` für alle neuen Dateien

## Phase 5 — Verify + PR (Commit 4, docs)
- [ ] T050 `test:cov` (api+web) grün · beide `build` grün · `seed` clean
- [ ] T051 `migrate status` up-to-date · `migrate diff --exit-code` sauber
- [ ] T052 `prettier --check` clean (api+web, inkl. `models.ts`)
- [ ] T053 `docs/EPICS-PROGRESS.md` E18-Abschnitt + Status FERTIG; PR öffnen
