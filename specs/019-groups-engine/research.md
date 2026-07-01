# Research & Clarify — Feature 019 Gruppen-Engine (E18)

## Entscheidung 1 — Eine Engine, zwei Modi (kein zweiter Datenpfad)

**Entscheidung:** Ein einziges `groups`-Modul mit einem `Group.mode`-Enum
(`COHORT` | `GIVING_CIRCLE`). Studierenden-Kohorten und Spender-Giving-Circles teilen sich
**dasselbe** Datenmodell und dieselbe Service-Logik: Mitgliedschaft, Rollen, Shared-Goal,
Leaderboard, Invites, Voting, Chat, Analytics. Der Modus steuert nur die semantische Fläche
(welche Frontend-Seite gezeigt wird und ob Sub-Kampagnen [Cohort] oder Beiträge [Circle] das
Shared-Goal speisen).

**Begründung:** Der Auftrag ist explizit: "Student cohorts and donor giving-circles run on the
SAME group/leaderboard/shared-goal infrastructure — build ONE engine with two modes." Zwei
getrennte Features wären Duplikat (Constitution IV: high cohesion, low coupling; ein Modul, eine
klare Aufgabe). Die Roadmap nennt beide als "Merge aus 2 Vorschlägen".

**Konsequenz:** Ein `groups`-Modul, ein Satz Prisma-Modelle mit `mode`-Diskriminator, ein
Service. Modus-spezifische Regeln (Cohort braucht ≥ 2 Mitglieder + Sub-Kampagnen; Circle nutzt
Beiträge) leben als reine Verzweigungen in den Primitiven, nicht als zweiter Pfad.

## Entscheidung 2 — Alle Leaderboards/Badges/Aggregate aus den E16-Primitiven

**Entscheidung:** `group-leaderboard.ts` wickelt E16 `rankLeaderboard`, die Wochen-/
Ranking-Badges E16 `resolveTier`, und `group-analytics.ts` + das Group-Portfolio E16
`aggregateContributions`. Kein neues Leaderboard-, Badge- oder Aggregat-System.

**Begründung:** Der Auftrag ist eindeutig: "REUSE for team/circle leaderboards, member badges,
shared-goal progress. Do NOT build a new leaderboard/badge system." E16 hat die generischen,
donation-freien Primitive bereits gebaut (`apps/api/src/gamification/`) — genau als Build-Once
für E15 und E18 (Cross-Group-Thema 1 der Roadmap). E15 ist bereits ihr erster echter Consumer.

**Konsequenz:** Die Group-Primitive sind dünne Assembler über den E16-Kernen. Sie stehen selbst
unter dem 80%-Gate, aber der Ranking-/Tier-/Aggregat-Kern bleibt E16.

## Entscheidung 3 — Membership-/Rollen-State-Machine als reine, deterministische Logik

**Entscheidung:** `membership.ts` (rein) entscheidet Join/Leave/Rollen-Änderung. Invarianten:
mindestens ein `ADMIN` bleibt immer (der letzte Admin kann nicht degradiert/entfernt werden);
Doppel-Mitgliedschaft ist blockiert (per DB-Unique + reine Vorprüfung); eine Cohort ist erst
"aktiv" ab ≥ 2 Mitgliedern. Rollen: `ADMIN` (verwaltet + entscheidet), `CONTRIBUTOR` (beiträgt +
stimmt ab + chattet), `VIEWER` (liest nur).

**Begründung:** Der Auftrag verlangt eine "group membership/role state machine" als reine Logik.
Als reine Funktion ist sie deterministisch + trivial testbar (kein I/O). Der letzte-Admin-Schutz
verhindert verwaiste Gruppen (Governance-Invariante).

**Konsequenz:** Der Service ruft die reine Entscheidung, bevor er persistiert; DomainException
mappt die verbotenen Transitionen (z.B. `LAST_ADMIN`, `ALREADY_MEMBER`) auf 400/409.

## Entscheidung 4 — Shared-Goal-Aggregator rein, Fortschritt on read

**Entscheidung:** `shared-goal.ts` (rein) summiert die Beiträge (Circle: `GroupContribution`)
bzw. die Sub-Kampagnen-`raisedCents` (Cohort: `GroupCampaign` → `Campaign`) zu einem
Ziel-Fortschritt (`raisedCents`, `goalCents`, `percent`, `remaining`). On read berechnet — kein
persistierter, driftender Fortschritts-Zähler.

**Begründung:** Wie in E16/E17: abgeleiteter State driftet nicht. Das kombinierte Ziel ist die
Summe der Teile; ein zweiter persistierter Zähler wäre eine Fehlerquelle (Constitution V:
Invarianten prüfen, nicht duplizieren).

**Konsequenz:** `shared-goal.ts` ist rein + gegated; der Service reicht ihm die aus Prisma
geladenen Beiträge/Sub-Kampagnen. Der `Group.sharedGoalCents` ist das Ziel (Eingabe), nicht der
Fortschritt (abgeleitet).

## Entscheidung 5 — Stretch-Goal-Unlock als reine Decision (Recognition-only)

**Entscheidung:** `stretch-goal.ts` (rein) entscheidet aus `{ raisedCents, goalCents,
thresholdPct }` → `{ unlocked, percent, remainingToStretch }`. Default-Schwelle 80%. Das
Unlock schaltet **nur** einen Anzeige-Zustand frei (z.B. "Stretch reward unlocked") — **kein**
Cash-Reward, kein Payout.

**Begründung:** Roadmap: "Cohort-Stretch-Goal: bei 80% Gesamtziel unlock Special Reward";
Auftrag: "a cohort stretch-goal that unlocks at e.g. 80%". Constitution II: Geld bleibt
schulgebunden — ein Reward-Payout an ein Team wäre ein Verstoß. Deshalb Recognition-only.

**Konsequenz:** `stretch-goal.ts` ist rein + gegated; das Frontend zeigt den Unlock-Zustand.
Keine Auszahlungslogik, kein neues Geld-Modell.

## Entscheidung 6 — Voting-Tally rein, ein Ballot pro Mitglied

**Entscheidung:** `voting.ts` (rein) zählt `GroupVoteBallot`-Stimmen pro Option, ermittelt den
Sieger (höchste Stimmen, stabiler Tie-Break über die Options-ID), meldet Gesamt-Stimmen,
Quorum-Status (optional) und ob der Vote offen/entschieden ist. Genau ein Ballot pro
`(voteId, userId)` (DB-Unique + reine Vorprüfung).

**Begründung:** Der Auftrag verlangt einen "voting tally" als reine Logik. Deterministisch +
testbar; der stabile Tie-Break vermeidet nicht-deterministische Sieger.

**Konsequenz:** `voting.ts` ist rein + gegated; der Service persistiert Ballots und ruft das
Tally on read. Nur ADMIN öffnet/schließt einen Vote; CONTRIBUTOR stimmt ab.

## Entscheidung 7 — Group-Invites über das E15/E8-Token-Muster

**Entscheidung:** `group-invite.ts` (rein) wiederverwendet das E15/E8-Muster: intern
`createReferralCode`/`hashReferralCode`/`validateReferralCode` aus
`referral/referral-code.util.ts`. Der Roh-Token steht **nur** im Invite-Link (einmal gezeigt);
persistiert wird nur der `codeHash`. Ein zusätzliches reines `decideInviteAcceptance` prüft
Status (ACTIVE), Ablauf (`expiresAt` gegen injiziertes `now`) und ob der User schon Mitglied ist.

**Begründung:** Der Auftrag verlangt explizit: "reuse the E15 referral-code/invite pattern for
group invites (email/link/QR-ish token)" und "invite token (reuse E15/E8 pattern)". E15/E8 haben
das timing-safe, hash-only Token bereits — ein zweites Token-Schema wäre Duplikat + Security-Risk.
QR ist dieselbe URL (kein Extra-Backend).

**Konsequenz:** `group-invite.ts` importiert die E15-Util und steht selbst unter dem 80%-Gate.
Der Service speichert `codeHash` + `role` + `expiresAt`; beim Beitritt validiert er den Roh-Token
timing-safe.

## Entscheidung 8 — Group-Chat moderiert über die E9-Filter (kein Live-Socket)

**Entscheidung:** `chat-moderation.ts` (rein) wiederverwendet die E9-Heuristik (`normalizeText` +
`matchSuspiciousKeywords` aus `trust-safety/ofac-keyword-matcher.ts`) plus die illustrative
Slur-Blocklist (dieselbe Linie wie der E17-`voice-moderation`). Es entscheidet APPROVE/REJECT +
Gründe und validiert die Textlänge. Der Chat ist **request/response**: POST moderiert + speichert
(nur APPROVE sichtbar), GET liest die Historie. **Kein WebSocket.**

**Begründung:** Der Auftrag verlangt: "reuse the E9 moderation/slur-filter logic to moderate
group chat" und "chat is moderated request/response, no live socket". E9/E17 haben die
deterministische Keyword-Heuristik bereits; ein zweiter Filter wäre Duplikat. Kein ML-Modell,
kein Socket (Out-of-Scope).

**Konsequenz:** `chat-moderation.ts` importiert die E9-Util und steht unter dem 80%-Gate. REJECT
speichert Status + Grund, wird aber nie in der Historie ausgeliefert (Feed zeigt nur APPROVED).

## Entscheidung 9 — Cohort-Match über den bestehenden E5-Corporate-Flow (kein neuer Payment-Pfad)

**Entscheidung:** Der "Corporate matched die Kohorte"-Fall läuft über den **bestehenden**
E5-`CorporateService.sponsor(campaignId, userId, dto)` je Sub-Kampagne der Cohort. Der
`GroupsService` ruft E5 als Kollaborator (injiziert), iteriert über die `GroupCampaign`-Links und
sponsert je Kampagne mit einem Teilbetrag. E18 schreibt **nie** selbst auf `Donation`/`Payout`.

**Begründung:** Der Auftrag verlangt: "a corporate sponsor can match a whole cohort (E5 synergy)"
und "cohort matching reuses the E5 corporate flow, no new payment path". Constitution III:
Payments hinter der Provider-Abstraktion; ein neuer Payment-Pfad wäre ein Bruch. E5 hat den
getesteten, provider-abstrahierten Flow bereits.

**Konsequenz:** Der `GroupsModule` importiert den `CorporateModule` (bzw. injiziert
`CorporateService`). Der Cohort-Match ist eine dünne Orchestrierung über E5 — kein eigener
Geld-Code. Der reine `cohort-match.ts` berechnet nur die Betrags-Aufteilung über die
Sub-Kampagnen (money-frei, deterministisch); das tatsächliche Sponsern macht E5.

## Entscheidung 10 — Analytics + Portfolio über E16 `aggregateContributions`

**Entscheidung:** `group-analytics.ts` (rein) faltet die Gruppen-Beiträge (money-freie
`GroupContribution`-Spiegel) über E16 `aggregateContributions` zu Total/Count/Distinct-Targets/
Impact-per-Target + kombiniert das mit Mitglieder-Count, Ziel-Fortschritt und der aktiven Woche.
Das Group-Portfolio ist derselbe E16-Aggregat-Kern, projiziert auf die Gruppen-Sicht.

**Begründung:** Der Auftrag verlangt: "group analytics aggregator" (pure) und "a group portfolio
(reuse E16 portfolio)". E16 `aggregateContributions` ist der donation-freie Aggregat-Kern — genau
dafür gedacht (Cross-Group-Thema 1).

**Konsequenz:** `group-analytics.ts` importiert E16 und steht unter dem 80%-Gate; kein zweiter
Aggregat-Algorithmus.

## Entscheidung 11 — `now` injiziert in jede Zeit-Logik

**Entscheidung:** Jede reine Funktion mit Zeitbezug (Invite-Ablauf, aktive Woche, wöchentliches
Ranking) bekommt `now`/`referenceDate` **injiziert** — kein `Date.now()` im reinen Kern.

**Begründung:** Der Auftrag verlangt: "Inject `now` into any time logic (no `Date.now()` in pure
fns)". Das vermeidet flaky Zeit-Tests (Linie E16/E17).

**Konsequenz:** Der Service reicht `new Date()` als Default herein; die reinen Kerne bleiben
deterministisch + testbar mit fixen Referenzdaten.
