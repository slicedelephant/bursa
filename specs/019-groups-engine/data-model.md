# Data Model — Feature 019 Gruppen-Engine (E18)

## Neue Prisma-Modelle (9) + Enums (6)

Eine Engine, zwei Modi. `Group.mode` diskriminiert Cohort vs. Circle; alle Modelle teilen sich
beide Modi. Shared-Goal-Fortschritt, Stretch-Unlock, Leaderboard und Analytics sind **keine**
DB-Modelle, sondern reine View-Typen (on read abgeleitet — Linie E16/E17; abgeleiteter State
driftet nicht). Migration: `groups_engine`.

### Enum `GroupMode`
```
COHORT         // Studierenden-Kohorte: Sub-Kampagnen rollen ins Team-Ziel
GIVING_CIRCLE  // Spender-Circle: Beiträge rollen ins Shared-Goal
```

### Enum `GroupVisibility`
```
PRIVATE  // nur per Invite auffindbar/beitretbar
PUBLIC   // im öffentlichen Verzeichnis sichtbar
```

### Enum `GroupRole`
```
ADMIN        // verwaltet Mitglieder/Invites/Votes, kann Cohort-Match auslösen
CONTRIBUTOR  // trägt bei, stimmt ab, chattet
VIEWER       // liest nur
```

### Enum `GroupInviteStatus`
```
ACTIVE   // gültig, einlösbar
REVOKED  // vom Admin zurückgezogen
USED     // eingelöst (defensiv; Multi-Use-Links bleiben ACTIVE)
```

### Enum `GroupVoteStatus`
```
OPEN     // Abstimmung läuft
CLOSED   // beendet; Tally final
```

### Enum `GroupMessageStatus`
```
APPROVED  // Moderation bestanden → im Chat sichtbar
REJECTED  // Slur/Keyword/Länge → gespeichert mit Grund, nie ausgeliefert
```

### `Group`
Die Gruppe (beide Modi). `sharedGoalCents` ist das ZIEL (Eingabe); der Fortschritt wird on read
abgeleitet. `stretchThresholdPct` steuert das Stretch-Unlock (Default 80). Money-frei.
```
id                  String          @id @default(cuid())
mode                GroupMode
visibility          GroupVisibility @default(PRIVATE)
name                String
description         String?
logoUrl             String?
sharedGoalCents     Int             @default(0)
stretchThresholdPct Int             @default(80)
createdAt           DateTime        @default(now())
updatedAt           DateTime        @updatedAt

members       GroupMember[]
invites       GroupInvite[]
campaigns     GroupCampaign[]
contributions GroupContribution[]
votes         GroupVote[]
messages      GroupMessage[]

@@index([mode, visibility])
```

### `GroupMember`
Mitgliedschaft + Rolle. Genau eine Zeile pro `(groupId, userId)`.
```
id       String    @id @default(cuid())
groupId  String
userId   String
role     GroupRole @default(CONTRIBUTOR)
joinedAt DateTime  @default(now())

group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
user  User  @relation("GroupMemberships", fields: [userId], references: [id], onDelete: Cascade)

@@unique([groupId, userId])
@@index([groupId])
```

### `GroupInvite`
Einladung, hash-only (E15/E8-Muster): der Roh-Token steht nur im Link, persistiert wird nur der
`codeHash`. `role` ist die Rolle, die der Beitretende erhält. `expiresAt` optional.
```
id        String            @id @default(cuid())
groupId   String
codeHash  String            @unique
role      GroupRole         @default(CONTRIBUTOR)
status    GroupInviteStatus @default(ACTIVE)
expiresAt DateTime?
createdAt DateTime          @default(now())

group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

@@index([groupId, status])
```

### `GroupCampaign`
Cohort: Sub-Kampagne-Link. Verknüpft eine bestehende `Campaign` mit dem Team-Ziel. Genau eine
Zeile pro `(groupId, campaignId)`.
```
id            String   @id @default(cuid())
groupId       String
campaignId    String
addedByUserId String
createdAt     DateTime @default(now())

group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
campaign Campaign @relation("GroupCampaigns", fields: [campaignId], references: [id], onDelete: Cascade)

@@unique([groupId, campaignId])
@@index([groupId])
```

### `GroupContribution`
Circle: money-freier Spiegel einer bestehenden `Donation` für Aggregat/Leaderboard. **Kein
neuer Geld-Pfad** — `valueCents` ist eine Projektion des bereits erfassten Spendenbetrags, nur
für Analytics/Leaderboard. Genau eine Zeile pro `(groupId, donationId)`.
```
id         String   @id @default(cuid())
groupId    String
userId     String
donationId String
valueCents Int
createdAt  DateTime @default(now())

group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
user     User     @relation("GroupContributions", fields: [userId], references: [id], onDelete: Cascade)
donation Donation @relation("GroupContributionDonation", fields: [donationId], references: [id], onDelete: Cascade)

@@unique([groupId, donationId])
@@index([groupId])
```

### `GroupVote`
Ein Voting: welche Kampagne unterstützt die Gruppe als nächstes?
```
id        String          @id @default(cuid())
groupId   String
question  String
status    GroupVoteStatus @default(OPEN)
createdAt DateTime        @default(now())

group   Group             @relation(fields: [groupId], references: [id], onDelete: Cascade)
options GroupVoteOption[]
ballots GroupVoteBallot[]

@@index([groupId, status])
```

### `GroupVoteOption`
Eine Wahl-Option (eine Kampagne).
```
id         String  @id @default(cuid())
voteId     String
campaignId String
label      String

vote    GroupVote        @relation(fields: [voteId], references: [id], onDelete: Cascade)
ballots GroupVoteBallot[]

@@index([voteId])
```

### `GroupVoteBallot`
Eine Stimme. Genau eine pro `(voteId, userId)` → ein Mitglied stimmt einmal ab.
```
id       String   @id @default(cuid())
voteId   String
optionId String
userId   String
castAt   DateTime @default(now())

vote   GroupVote       @relation(fields: [voteId], references: [id], onDelete: Cascade)
option GroupVoteOption @relation(fields: [optionId], references: [id], onDelete: Cascade)

@@unique([voteId, userId])
@@index([optionId])
```

### `GroupMessage`
Moderierte Chat-Nachricht (E9-Filter). Nur `APPROVED` erscheint im Chat.
```
id               String             @id @default(cuid())
groupId          String
userId           String
text             String
status           GroupMessageStatus @default(APPROVED)
moderationReason String?
createdAt        DateTime           @default(now())

group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
user  User  @relation("GroupMessages", fields: [userId], references: [id], onDelete: Cascade)

@@index([groupId, status])
```

## Relationen-Backrefs (bestehende Modelle)

- `User`: `groupMemberships GroupMember[] @relation("GroupMemberships")`,
  `groupContributions GroupContribution[] @relation("GroupContributions")`,
  `groupMessages GroupMessage[] @relation("GroupMessages")`.
- `Campaign`: `groupLinks GroupCampaign[] @relation("GroupCampaigns")`.
- `Donation`: `groupContribution GroupContribution? @relation("GroupContributionDonation")`.

## Genutzte bestehende Modelle (read-only bzw. E5-Flow)

- `Campaign` (E2/E3) — Sub-Kampagnen der Cohort (`raisedCents`/`goalCents` speisen das
  Shared-Goal), Vote-Optionen.
- `Donation` (E4) — die Circle-Beiträge spiegeln bestehende Spenden (money-frei referenziert).
- `CorporateProfile` / `CorporateService.sponsor` (E5) — der Cohort-Match sponsert je
  Sub-Kampagne über den bestehenden Flow; E18 schreibt nie selbst auf `Donation`/`Payout`.
- E16-Gamification-Primitive (`rankLeaderboard`/`resolveTier`/`aggregateContributions`) — kein
  DB-Modell; reine Kerne, wiederverwendet.

## View-Typen (rein, keine DB)

### Pure-Logic-Inputs/Outputs (money-frei)
- `membership.ts`: `MemberState { userId; role }[]` + Aktion → `MembershipDecision`
  (`allow`, `reason?`, `nextRole?`); `cohortActive(count)`; `canManage/canContribute/canVote(role)`.
- `shared-goal.ts`: `SharedGoalInput { parts: { valueCents }[]; goalCents }` →
  `SharedGoalProgress { raisedCents; goalCents; percent; remainingCents }`.
- `stretch-goal.ts`: `StretchInput { raisedCents; goalCents; thresholdPct }` →
  `StretchResult { unlocked; thresholdPct; thresholdCents; percent; remainingToStretchCents }`.
- `group-leaderboard.ts`: `MemberContribution { userId; label; valueCents }[]` →
  E16-`LeaderboardEntry[]` (optional anonymisiert: "Member #n").
- `voting.ts`: `TallyInput { options: { id }[]; ballots: { optionId }[]; quorum? }` →
  `TallyResult { counts; totalVotes; winnerId; decided; quorumMet }`.
- `group-analytics.ts`: `AnalyticsInput { contributions; memberCount; goal; now }` →
  `GroupAnalytics { totalCents; contributionCount; distinctTargets; memberCount; goalPercent;
  activeWeek }`.
- `group-invite.ts`: `createGroupInvite(role, opts)` → `{ code; codeHash; role; expiresAt? }`;
  `decideInviteAcceptance({ record, rawCode, now, alreadyMember })` → `{ accept; reason? }`.
- `chat-moderation.ts`: `{ text }` → `{ decision: 'APPROVE'|'REJECT'; reasons: string[] }`.
- `cohort-match.ts`: `splitCohortMatch({ subCampaigns: { campaignId; gapCents }[]; totalCents;
  mode })` → `{ campaignId; amountCents }[]` (money-freie Aufteilung; deterministisch).

### Service-View-Typen (vom Service gebaut)
- `GroupDetailView { group; role; sharedGoal; stretch; leaderboard; members; subCampaigns? |
  contributions?; memberCount }`.
- `GroupListView { groups: GroupSummary[] }`.
- `GroupInviteView { link; role; expiresAt? }` (Roh-Token einmal im Link).
- `VoteView { id; question; status; options: { id; label; count }[]; winnerId; totalVotes }`.
- `ChatView { messages: { userId; text; createdAt }[] }` (nur APPROVED).
- `AnalyticsView` (s.o.) + `PortfolioView` (E16-Aggregat projiziert auf die Gruppe).
- `CohortMatchView { sponsored: { campaignId; amountCents }[]; totalCents }`.

## Invarianten

- **Geld:** kein E18-Modell hält einen eigenen Geld-Pfad; `GroupContribution` spiegelt nur eine
  bestehende Spende; der Cohort-Match läuft über E5; E18 schreibt nie auf `Donation`/`Payout`.
- **Eine Engine, zwei Modi:** `Group.mode` diskriminiert; kein zweiter Datenpfad.
- **Letzter Admin:** mindestens ein `ADMIN` je Gruppe bleibt immer (reine Vorprüfung + Service).
- **Cohort aktiv:** eine Cohort ist erst ab ≥ 2 Mitgliedern "aktiv" (`cohortActive`).
- **Member-Dedupe:** `GroupMember @@unique([groupId, userId])` ⇒ ein User = ein Member je Gruppe.
- **Ballot-Dedupe:** `GroupVoteBallot @@unique([voteId, userId])` ⇒ eine Stimme pro Mitglied/Vote.
- **Contribution-Dedupe:** `GroupContribution @@unique([groupId, donationId])` ⇒ eine Spende
  zählt einmal pro Gruppe.
- **Campaign-Dedupe:** `GroupCampaign @@unique([groupId, campaignId])` ⇒ eine Kampagne einmal je
  Cohort.
- **Moderation:** nur `APPROVED` `GroupMessage` erscheint im Chat; REJECT speichert Status+Grund.
- **Invite hash-only:** nur `codeHash` persistiert; Roh-Token nur im Link (E15/E8).
- **Immutability:** alle Primitive geben neue Werte zurück.
