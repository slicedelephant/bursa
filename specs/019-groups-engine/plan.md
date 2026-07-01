# Plan 019 — Gruppen-Engine: Cohort-Teams & Giving Circles (E18)

## Wiederverwendung (kein Neubau)

- **E16 Gamification** (`apps/api/src/gamification/`): `rankLeaderboard` (Team-/Circle-
  Leaderboards), `resolveTier` (Wochen-/Ranking-Badges), `aggregateContributions` (Group-
  Analytics + Group-Portfolio). **Kein neues Leaderboard-/Badge-/Aggregat-System.** Die
  Group-Primitive sind dünne Assembler über diesen E16-Kernen.
- **E15 Referral/Invite** (`apps/api/src/referral/referral-code.util.ts`): `createReferralCode`/
  `hashReferralCode`/`validateReferralCode` (E8-One-Time-Token-Muster) werden von
  `group-invite.ts` für die Group-Invites wiederverwendet (Roh-Token im Link, hash-only
  persistiert). Kein zweites Token-Schema.
- **E9 Trust-&-Safety** (`apps/api/src/trust-safety/ofac-keyword-matcher.ts`): `normalizeText` +
  `matchSuspiciousKeywords` werden in `chat-moderation.ts` wiederverwendet (dieselbe Linie wie
  der E17-`voice-moderation`, inkl. Slur-Blocklist). Kein zweiter Moderations-Filter.
- **E5 Corporate** (`apps/api/src/corporate/corporate.service.ts`): `CorporateService.sponsor`
  wird für den Cohort-Match je Sub-Kampagne aufgerufen. **Kein neuer Payment-Pfad**; E18
  schreibt nie auf `Donation`/`Payout`.
- **E4/E2** (`donations`, `campaigns`): Sub-Kampagnen sind bestehende `Campaign`-Zeilen;
  Gruppen-Beiträge referenzieren bestehende `Donation`-Zeilen (money-freier Spiegel).
- **Common**: `DomainException`, `CurrentUser`, `Roles`/`RolesGuard`, `{success,data}`-
  Interceptor, `PrismaService` — unverändert.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

`apps/api/src/groups/` — rein, immutable, kein `Date.now()` in reinen Funktionen
(Referenzzeit injiziert). Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe,
ruft kein I/O.

1. `membership.ts` — `decideJoin`, `decideLeave`, `decideRoleChange`
   (`{ members, actorRole, targetUserId, newRole }` → Entscheidung; letzter-Admin-Schutz,
   Doppel-Mitgliedschaft, `cohortActive(memberCount)` ≥ 2). Rollen-Enum + Berechtigungs-Helfer
   (`canManage`, `canContribute`, `canVote`).
2. `shared-goal.ts` — `computeSharedGoal({ contributions | subCampaigns, goalCents })` →
   `{ raisedCents, goalCents, percent, remainingCents }` (summiert Teile gegen das Ziel).
3. `stretch-goal.ts` — `decideStretchGoal({ raisedCents, goalCents, thresholdPct })` →
   `{ unlocked, thresholdPct, thresholdCents, percent, remainingToStretchCents }` (Default 80%).
4. `group-leaderboard.ts` — `buildGroupLeaderboard(members, { anonymous })` → E16-`rankLeaderboard`
   über die Mitglieder-Beiträge (optional anonymisiertes Label: "Member #n").
5. `voting.ts` — `tallyVote({ options, ballots, quorum? })` → `{ counts, totalVotes, winnerId|null,
   decided, quorumMet }` (stabiler Tie-Break über Options-ID).
6. `group-analytics.ts` — `buildGroupAnalytics({ contributions, memberCount, goal, now })` →
   E16-`aggregateContributions` + Mitglieder + Ziel-Fortschritt + aktive Woche (Portfolio-Sicht).
7. `group-invite.ts` — `createGroupInvite(role, { bytes?, expiresAt? })` (Wrapper über
   E15-`createReferralCode`) + `decideInviteAcceptance({ record, rawCode, now, alreadyMember })`
   (validiert Token timing-safe + Status + Ablauf + Mitgliedschaft).
8. `chat-moderation.ts` — `moderateMessage({ text })` → `{ decision: 'APPROVE'|'REJECT'; reasons }`
   (reuse E9 keyword-matcher + Slur-Blocklist; Längen-Check).
9. `cohort-match.ts` — `splitCohortMatch({ subCampaigns, totalCents, mode })` → money-freie
   Betrags-Aufteilung je Sub-Kampagne (deterministisch; das eigentliche Sponsern macht E5).

## Service / Controller / Modul

`apps/api/src/groups/`:

- `groups.service.ts` — Prisma-I/O hinter den Primitiven + E5/E16/E9/E15-Kollaboratoren:
  - `create(userId, dto)` — legt `Group` + ersten `GroupMember(ADMIN)` an (Gründer).
  - `get(userId, groupId)` — Group-Detail: Shared-Goal (`computeSharedGoal`), Stretch
    (`decideStretchGoal`), Leaderboard (`buildGroupLeaderboard`), Mitglieder, Sub-Kampagnen /
    Beiträge je Modus.
  - `list(userId)` / `listPublic()` — meine Gruppen + öffentliche Circles/Cohorts.
  - `join(userId, groupId, rawToken)` — validiert Invite (`decideInviteAcceptance`) → Member.
  - `leave(userId, groupId)` / `setRole(actorId, groupId, targetId, role)` — über `membership.ts`.
  - `invite(actorId, groupId, dto)` — `createGroupInvite` → `GroupInvite` (hash-only), Link zurück.
  - `addCampaign(userId, groupId, campaignId)` — Cohort: Sub-Kampagne verknüpfen (Owner-skopiert).
  - `contribute(userId, groupId, donationId)` — Circle: bestehende Spende als money-freien
    `GroupContribution`-Spiegel verknüpfen (Betrag gespiegelt für Aggregat/Leaderboard).
  - `openVote/closeVote/castBallot/tally(...)` — Voting über `voting.ts`.
  - `postMessage(userId, groupId, dto)` / `messages(userId, groupId)` — Chat über
    `chat-moderation.ts` (nur APPROVED sichtbar).
  - `analytics(userId, groupId, now)` / `portfolio(userId, groupId)` — `buildGroupAnalytics`.
  - `matchCohort(actorId, groupId, dto)` — Cohort-Match: `splitCohortMatch` → je Sub-Kampagne
    `corporate.sponsor(...)` (E5). **Kein eigener Geld-Code.**
- `groups.controller.ts` — `@Controller('groups')` (auth-gated). Rollen-Checks im Service
  (feingranular pro Gruppen-Rolle, nicht nur globale App-Rolle).
- `groups.module.ts` — Provider/Controller; importiert `CorporateModule` (für `CorporateService`);
  in `app.module.ts` registriert.

`groups.service.ts` ist kein reiner Kern (Prisma-/E5-I/O) und steht nicht unter dem 80%-Gate;
sein Verhalten wird über die gegateten Primitive + ein Service-Spec (gemocktes Prisma + gemockter
`CorporateService`) abgedeckt (Linie E15/E17).

## Datenfluss

1. Gründer erstellt Gruppe → `POST /groups` → `Group` + `GroupMember(ADMIN)`.
2. Admin lädt ein → `POST /groups/:id/invites` → `createGroupInvite` → `GroupInvite` (hash-only) →
   Link zurück (Roh-Token einmal). Beitritt → `POST /groups/:id/join` mit Roh-Token →
   `decideInviteAcceptance` → `GroupMember`.
3. Cohort: Mitglied verknüpft Kampagne → `POST /groups/:id/campaigns` → `GroupCampaign`. Der
   Shared-Goal-Fortschritt = Summe der Sub-Kampagnen-`raisedCents` (on read, `computeSharedGoal`).
4. Circle: Mitglied verknüpft eine bestehende Spende → `POST /groups/:id/contributions` →
   money-freier `GroupContribution`-Spiegel. Shared-Goal = Summe der Beiträge.
5. Stretch: `decideStretchGoal` unlockt bei ≥ 80% (Anzeige-Zustand, kein Payout).
6. Leaderboard: `buildGroupLeaderboard` über E16 `rankLeaderboard` (optional anonym).
7. Voting: Admin öffnet Vote → Mitglieder casten Ballots (1/Person) → `tallyVote` on read.
8. Chat: `POST /groups/:id/messages` → `moderateMessage` (E9) → APPROVE speichert + sichtbar,
   REJECT speichert Grund, unsichtbar. GET liest nur APPROVED.
9. Cohort-Match: Admin/Operator → `POST /groups/:id/match` → `splitCohortMatch` → je Sub-Kampagne
   `corporate.sponsor(...)` (E5). **Geld unangetastet, an die Schule.**
10. Analytics/Portfolio: `buildGroupAnalytics` über E16 `aggregateContributions`.

## Constitution-Checks

- **Geld an die Schule:** E18 schreibt nie auf `Donation`/`Payout`. Der Cohort-Match läuft über
  den bestehenden E5-Flow; `GroupContribution` ist ein money-freier Spiegel (kein neuer Geld-Pfad).
- **Externe Services / Payments hinter Abstraktion:** der Cohort-Match nutzt den provider-
  abstrahierten E5-Flow; kein direkter Payment-Call in E18.
- **Immutability:** alle Primitive geben neue Objekte zurück; kein In-Place-Mutate.
- **Validate at the boundary:** DTOs (`class-validator`) auf allen Write-Routen; Rollen-Checks +
  Membership-Invarianten vor jeder Mutation; Chat-Länge + Invite-Token geprüft.
- **Kleine Module:** je Datei < 400 Zeilen, je Funktion < 50 Zeilen; organisiert nach Feature.
- **Envelope:** `{ success, data?, error? }` auf JSON-Routen (Interceptor).

## Frontend (Angular)

`apps/web/src/app/features/groups/`:
- `group-format.ts` (rein, gegated) — Modus-Label, Sichtbarkeits-Label, Shared-Goal-Prozent-Text,
  Stretch-Goal-Status-Text.
- `role-format.ts` (rein, gegated) — Rollen-Label + Berechtigungs-Hinweis (kann verwalten/
  beitragen/nur lesen).
- `voting-format.ts` (rein, gegated) — Voting-Status, Sieger-Label, Stimmen-Prozent je Option.
- `groups.page.ts` — Übersicht (meine Gruppen + öffentliche) + Create-Group-Form (Modus-Wahl).
- `group-detail.component.ts` — Team-/Circle-Seite: Shared-Progress-Bar, Stretch-Goal-Anzeige,
  Mitglieder-Liste (Rollen), Leaderboard, Sub-Kampagnen (Cohort) / Portfolio (Circle).
- `group-voting.component.ts` — Voting-UI (Optionen, abstimmen, Tally).
- `group-chat.component.ts` — moderierter Chat (Nachrichten posten + Historie, Moderations-Feedback).

`models.ts`: neue E18-Typen (Group/Member/Role/SharedGoal/Stretch/Leaderboard/Vote/Message/
Analytics). `api.service.ts`: `createGroup`, `getGroup`, `listGroups`, `joinGroup`, `inviteToGroup`,
`addGroupCampaign`, `contributeToGroup`, `openVote`, `castBallot`, `groupChat`, `postGroupMessage`,
`groupAnalytics`, `matchCohort`. Neue Route `groups` in `app.routes.ts` (auth-gated). Nav-Link.

## Prisma

Neue Modelle `Group`, `GroupMember`, `GroupInvite`, `GroupCampaign`, `GroupContribution`,
`GroupVote`, `GroupVoteOption`, `GroupVoteBallot`, `GroupMessage` + Enums `GroupMode`,
`GroupVisibility`, `GroupRole`, `GroupInviteStatus`, `GroupVoteStatus`, `GroupMessageStatus`.
Backrefs an `User`/`Campaign`/`Donation`. `SharedGoalView`/`StretchView`/`AnalyticsView` sind
reine View-Typen (kein DB-Modell; on read abgeleitet). Migration `groups_engine`. Seed: eine
Cohort mit 2-3 Sub-Kampagnen + einem Corporate-Match, eine Giving Circle mit Mitgliedern + einem
Shared-Goal + einem Vote + einer moderierten (APPROVED) Nachricht — idempotent über
`clearDatabase()`.

## Verifikation

`test:cov` (api+web) grün · beide `build` grün · `seed` clean · `migrate status` up-to-date ·
`migrate diff --exit-code` → "No difference detected" · `prettier --check` clean (api+web,
inkl. `models.ts`).
