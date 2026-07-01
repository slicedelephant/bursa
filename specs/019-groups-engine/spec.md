# Feature 019 — Gruppen-Engine: Cohort-Teams & Giving Circles (E18)

**Epic:** E18 · **Größe:** L · **Primär:** Studierende + Einzelspender · **Hängt ab von:** E2, E4, E16 · **Merge aus 2 Vorschlägen** · **Erstes Epic der Welle C**

## Warum (Problem)

Einzelne Kampagnen isolieren. Team-P2P-Fundraising bringt belegt 1.8-2.5x mehr. MBA-Kohorten
(10-40 pro Jahrgang) sind natürliche Social Units; Diaspora-Communities (Alumni-Gruppen,
Kultur-Vereine) sind gregär. Die zentrale Erkenntnis: **Studierenden-Kohorten und
Spender-Giving-Circles laufen auf derselben Gruppen-/Leaderboard-/Shared-Goal-Infrastruktur.**
Statt zwei Features zu bauen, baut E18 **eine Gruppen-Engine mit zwei Modi** (`COHORT` |
`GIVING_CIRCLE`), die sich Mitgliedschaft, Rollen, Shared-Goal, Leaderboard, Invites, Voting,
Chat und Analytics teilen — nur der Modus unterscheidet, welche Fläche im Frontend gezeigt wird.

E18 baut **nichts** neu, was E16 schon liefert: alle Leaderboards, Badges und die
Portfolio-Aggregation kommen aus den generischen E16-Gamification-Primitiven
(`rankLeaderboard`, `resolveTier`, `aggregateContributions`). Group-Invites nutzen das
E15/E8-One-Time-Token-Muster (`referral-code.util`), der Group-Chat wird über die
E9-Moderations-/Slur-Filter geprüft, und ein Corporate-Sponsor kann eine ganze Kohorte über
den **bestehenden** E5-Corporate-Flow matchen (kein neuer Payment-Pfad).

## User Stories

- Als Fundraiser einer MBA-Kohorte möchte ich mit meinen Klassenkollegen als Team starten
  (min. 2 Mitglieder), damit wir uns über eine gemeinsame Progress-Bar gegenseitig motivieren.
- Als Kohorten-Mitglied möchte ich meine Kampagne als Sub-Kampagne ins Team einbringen, damit
  alle Einzel-Fortschritte in ein Team-Ziel hochrollen.
- Als Bursa-Operator möchte ich einen Corporate-Sponsor die ganze Kohorte matchen lassen
  (E5-Synergie), damit ein Firmen-Gift den kombinierten Fortschritt hebt — Geld an die Schule.
- Als Kohorten-Mitglied möchte ich ein anonymes wöchentliches Ranking mit Badges sehen, damit
  der Wettbewerb motiviert, ohne bloßzustellen.
- Als Team möchte ich ein Stretch-Goal, das bei 80% des kombinierten Ziels unlockt, damit der
  Endspurt einen sichtbaren Belohnungs-Moment bekommt.
- Als Diaspora-Alumni-Gruppe möchte ich eine Giving Circle gründen (Name, privat/öffentlich,
  Logo) und gemeinsam Studierende unserer Uni unterstützen.
- Als Circle-Admin möchte ich Mitglieder mit Rollen (Admin/Contributor/Viewer) verwalten und
  per Link/Token einladen, damit klar ist, wer entscheiden, beitragen oder nur zuschauen darf.
- Als Circle-Admin möchte ich ein Voting starten ("Welche Kampagne unterstützen wir als
  nächstes?"), damit die Gruppe gemeinsam entscheidet.
- Als Circle-Mitglied möchte ich einen moderierten Group-Chat, ein Group-Portfolio und
  Group-Analytics, damit die Gruppe koordiniert, ihren gemeinsamen Impact sieht und sauber bleibt.

## Scope (was wird gebaut)

**Eine Engine, zwei Modi (Kern-Design):**
- `Group` mit `mode` (`COHORT` | `GIVING_CIRCLE`), `visibility` (`PRIVATE` | `PUBLIC`),
  Name, optionalem Logo. Beide Modi teilen: Mitgliedschaft + Rollen, Shared-Goal, Leaderboard,
  Invites, Voting, Chat, Analytics. Der Modus steuert nur die semantische Fläche
  (Cohort-Team-Seite vs. Circle-Seite).

**Cohort-Teams (Studierende):**
- Team-Erstellung (Cohort Fundraising Group, min. 2 Mitglieder gefordert bevor "aktiv").
- Team-Page mit gemeinsamer Progress-Bar (Summe der Sub-Kampagnen-`raisedCents` gegen das
  kombinierte Ziel), Liste der Sub-Kampagnen, Team-Leaderboard (E16 `rankLeaderboard`).
- Cohort-Match: ein Corporate-Sponsor matched die ganze Kohorte über den **bestehenden**
  E5-Corporate-Flow (Betrag pro Kampagne, kein neuer Payment-Pfad).
- Anonymes wöchentliches Ranking mit Badges (E16 `resolveTier`), keine Klarnamen.
- Cohort-Stretch-Goal, das bei ≥ 80% des kombinierten Ziels unlockt (reine Decision).

**Giving Circles (Spender):**
- Circle-Gründung (Name, privat/öffentlich, Logo).
- Member-Management mit Rollen (`ADMIN` | `CONTRIBUTOR` | `VIEWER`) + Invites via Link/Token
  (E15/E8-Muster; QR ist dieselbe URL, kein Extra-Backend).
- Shared Fundraising Goal mit Fortschritts-Bar (Summe der Beiträge gegen das Ziel).
- Team-Leaderboard (Beiträge der Mitglieder, E16 `rankLeaderboard`).
- Group-Voting: Mitglieder stimmen ab, welche Kampagne als nächstes unterstützt wird (Tally).
- Moderierter Group-Chat (E9-Keyword-/Slur-Filter, wie der E17-Student-Voice-Loop).
- Group-Analytics (Aggregat: Beiträge, Mitglieder, Ziel-Fortschritt, aktive Woche) +
  Group-Portfolio (E16 `aggregateContributions` über die Gruppen-Beiträge).

**Pure-Logic (rein, getestet, je `.spec.ts` + 80%-Per-Path-Gate, kein `Date.now()`):**
- **Membership-/Rollen-State-Machine** — Join/Leave/Rollen-Änderung deterministisch; letzter
  Admin darf nicht degradiert/entfernt werden; Modus-/Sichtbarkeits-Invarianten.
- **Shared-Goal-Aggregator + Fortschritt** — summiert Beiträge/Sub-Kampagnen zu Ziel-Fortschritt.
- **Stretch-Goal-Unlock-Decision** — entscheidet aus Fortschritt + Schwelle (Default 80%), ob
  unlocked.
- **Group-Leaderboard-Assembler** — mappt Mitglieder-Beiträge auf `rankLeaderboard` (E16),
  optional anonymisiert.
- **Voting-Tally** — zählt Stimmen pro Option, ermittelt Sieger + deterministischen Tie-Break,
  meldet Quorum/offen.
- **Group-Analytics-Aggregator** — faltet Beiträge (E16 `aggregateContributions`) + Mitglieder
  zu einem Analytics-View.
- **Invite-Token** — E15/E8-Muster (`createReferralCode`/`hashReferralCode`/`validate`) für
  Group-Invites (Link, hash-only Persistenz).

**Backend (`apps/api/src/groups/`):**
- Group-CRUD + Membership/Rollen + Shared-Goal + Leaderboard + Voting + Invites + (moderierter)
  Chat + Analytics für **beide** Modi. Reuse E16-Gamification, E9-Moderation, E15-Invites,
  E5-Corporate-Cohort-Match. Prisma-I/O hinter den gegateten Primitiven.

**Frontend (`apps/web/src/app/features/groups/`):**
- Create/Join-Group, Team-/Circle-Seite (Shared-Progress, Mitglieder, Leaderboard,
  Sub-Kampagnen/Portfolio), Voting-UI, moderierter Chat, Cohort-Stretch-Goal-Anzeige. Pure
  Helfer (Group-Format, Rollen-Labels, Stretch-Goal-Format, Voting-Format, Chat-Hinweis) mit
  Web-Coverage-Gates.

## Functional Requirements

- **FR-1 (Eine Engine, zwei Modi):** `Group.mode` (`COHORT`|`GIVING_CIRCLE`) teilt Membership,
  Rollen, Shared-Goal, Leaderboard, Invites, Voting, Chat, Analytics. Kein zweiter Datenpfad.
- **FR-2 (E16-Reuse):** Alle Leaderboards nutzen E16 `rankLeaderboard`, alle Badges
  E16 `resolveTier`, das Group-Portfolio/Analytics E16 `aggregateContributions`. Kein neues
  Leaderboard-/Badge-/Aggregat-System.
- **FR-3 (Membership-State-Machine):** Join/Leave/Rollen-Änderung ist rein + deterministisch;
  min. 1 `ADMIN` bleibt immer; eine Cohort ist erst "aktiv" ab ≥ 2 Mitgliedern.
- **FR-4 (Shared-Goal):** Der Fortschritt ist die Summe der Beiträge (Circle) bzw. der
  Sub-Kampagnen-`raisedCents` (Cohort) gegen das kombinierte Ziel; rein berechnet, on read.
- **FR-5 (Stretch-Goal):** Unlockt deterministisch bei ≥ Schwelle (Default 80%) des kombinierten
  Ziels; reine Decision, kein Reward-Payout (Recognition-only, Compliance).
- **FR-6 (Voting):** Ein Vote hat Optionen (Kampagnen); Mitglieder stimmen genau einmal pro
  Vote ab; das Tally ist rein, deterministisch, mit stabilem Tie-Break + Quorum-Meldung.
- **FR-7 (Invites):** Group-Invites nutzen das E15/E8-Token-Muster: Roh-Token im Link, nur der
  Hash persistiert; ein Token validiert vor dem Beitritt; Ablauf/Rolle am Token.
- **FR-8 (Chat moderiert):** Jede Chat-Nachricht läuft synchron über die E9-Keyword-/Slur-Filter
  (`voice-moderation`-Linie); nur APPROVE wird gepostet; REJECT liefert Gründe, nichts wird
  sichtbar. Kein Live-Socket — request/response.
- **FR-9 (Cohort-Match = E5):** Ein Corporate-Sponsor matched eine Kohorte, indem er über den
  **bestehenden** E5-`CorporateService.sponsor`-Flow je Sub-Kampagne sponsert; E18 baut keinen
  neuen Payment-Pfad und schreibt nie selbst auf `Donation`/`Payout`.
- **FR-10 (Geld an die Schule):** Nichts in E18 berührt Betrag, Status oder Empfänger einer
  Spende. Gruppen sind eine soziale/Koordinations-Schicht; Geld fließt weiter an die Schule.
- **FR-11 (Envelope):** JSON-Routen nutzen `{ success, data?, error? }`; Validierung an der
  Grenze (DTOs); Fehler laut (`DomainException`).

## Key Entities

- **Group** — die Gruppe: `mode` (COHORT/GIVING_CIRCLE), `visibility` (PRIVATE/PUBLIC), `name`,
  `logoUrl?`, `sharedGoalCents`, `stretchThresholdPct` (Default 80), `createdAt`. Owner ist der
  Gründer (erster ADMIN).
- **GroupMember** — Mitgliedschaft: `groupId`, `userId`, `role` (ADMIN/CONTRIBUTOR/VIEWER),
  `joinedAt`. `@@unique([groupId, userId])`.
- **GroupInvite** — Einladung (hash-only, E15/E8): `groupId`, `codeHash`, `role`, `status`
  (ACTIVE/REVOKED/USED), `expiresAt?`, `createdAt`. Roh-Token nur im Link.
- **GroupCampaign** — Sub-Kampagne-Link (Cohort): `groupId`, `campaignId`, `addedByUserId`.
  `@@unique([groupId, campaignId])`. Verknüpft eine Kampagne mit dem Team-Ziel.
- **GroupContribution** — money-freier Gruppen-Beitrags-Datensatz (Circle): `groupId`, `userId`,
  `donationId` (Referenz auf die bestehende Spende), `valueCents` (Spiegel, für Aggregat/
  Leaderboard). Money-frei: kein neuer Geld-Pfad, nur eine Projektion für Analytics/Leaderboard.
- **GroupVote** — ein Voting: `groupId`, `question`, `status` (OPEN/CLOSED), `createdAt`.
- **GroupVoteOption** — eine Option: `voteId`, `campaignId`, `label`.
- **GroupVoteBallot** — eine Stimme: `voteId`, `optionId`, `userId`. `@@unique([voteId, userId])`.
- **GroupMessage** — moderierte Chat-Nachricht: `groupId`, `userId`, `text`, `status`
  (APPROVED/REJECTED), `moderationReason?`, `createdAt`.

## Success Criteria

- 20% der Kampagnen in einer Cohort Group; Cohort-Funding 2.2x vs. Solo; 10% der Spender
  gründen/treten Gruppen bei; Group-Velocity 1.8x; Avg. Donation in Group +25%
  (Produktmetriken, im Prototyp nicht messbar).
- Im Prototyp: Group-CRUD + Membership/Rollen + Shared-Goal + Leaderboard + Voting + Invites +
  moderierter Chat + Analytics laufen end-to-end mit Seed-Daten (eine Cohort mit Sub-Kampagnen +
  Corporate-Match, eine Giving Circle mit Mitgliedern + Shared-Goal + Vote + moderierter
  Nachricht); alle pure-logic-Dateien ≥ 80% Per-Path-Coverage; beide Builds grün;
  `migrate diff` sauber; Seed idempotent.

## Out of Scope (ehrlich)

- **Kein Echtzeit-WebSocket-Leaderboard** — das Ranking wird **on read** berechnet (reiner
  E16-`rankLeaderboard`), kein Live-Board, kein Socket, kein Pub/Sub.
- **Kein Live-Chat-Socket** — der Group-Chat ist ein **moderiertes request/response**: POST
  moderiert + speichert, GET liest die Historie. Keine WebSockets, kein Typing-Indicator,
  keine Push-Delivery.
- **Single-Instance** — keine verteilte Sperre/Dedupe über Instanzen; die DB-Uniques
  (Member/Ballot/Invite) sind die Garantien.
- **Cohort-Match = E5-Flow** — der Corporate-Match läuft über den **bestehenden**
  E5-`CorporateService.sponsor` je Sub-Kampagne; **kein neuer Payment-Pfad**, keine
  Cohort-eigene Zahlungslogik.
- **Chat-/Voice-Moderation = E9-Keyword-Heuristik** — kein ML-Moderationsmodell; die
  wiederverwendete E9-Wortliste + Slur-Blocklist ist illustrativ, kein externer Provider.
- **Keine Cash-Rewards an Badges/Stretch-Goals** — reine Recognition/Feature-Unlocks
  (Compliance, Constitution II). Das Stretch-Goal schaltet einen Anzeige-Zustand frei, keine
  Auszahlung.
- **QR = dieselbe Invite-URL** — kein serverseitiger QR-Generator; der Client kann die
  Invite-URL beliebig als QR rendern. Der Token-Pfad ist Link/QR-identisch.
- **Kein Group-eigenes Recurring/Payout** — Gruppen sind money-frei; jede Spende läuft weiter
  über den bestehenden E2/E4/E5-Pfad und fließt an die Schule.
