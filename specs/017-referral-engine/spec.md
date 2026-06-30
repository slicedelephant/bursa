# Feature 017 — Referral- & Advocate-Engine (E15)

**Epic:** E15 · **Größe:** L · **Primär:** Studierende · **Hängt ab von:** E4 (Donor-Account), E16 (Gamification-Primitive) · **Merge aus 2 Vorschlägen**

## Warum (Problem)

Ein Spender ist rund 60% wahrscheinlicher zu spenden, wenn er von einer Peer-Person
referred wurde. Bursa hat aber bisher keinen viralen Loop: Studierende können ihr
Netzwerk nicht systematisch aktivieren, und Spender können Freunde nicht einladen.

E15 schließt diese Lücke mit **einer** Engine, die zwei Gesichter hat:

- **Advocate-Seite (Studierende):** Eine Studierende lädt bis zu ~15 Advocates
  (Alumni, Freunde) ein, die ihre Kampagne bewerben. Jeder Advocate bekommt einen
  eigenen Share-Link und einen Advocate-Badge. Spenden über diesen Link zählen dem
  Advocate zu. Ein Advocate-Leaderboard auf der Kampagnen-Seite plus im
  Fundraiser-Dashboard hält die Werbenden motiviert. Reward-Tiers (3 → Shout-out,
  5 → Name im Recap, 10+ → Special Recognition) sind reine Feature-/Recognition-
  Belohnungen, **keine Cash-Auszahlung** (Compliance).
- **Referral-Seite (Spender):** Jeder Spender hat im Donor-Account einen
  Referral-Link. Ein Tracking-Dashboard zeigt "14 eingeladen, 5 gespendet, 2 aktiv".
  Beide Seiten erhalten bei der ersten geworbenen Spende einen Both-Win-Badge
  (Feature-Unlock, keine Cash). Ein opt-in anonymes Leaderboard und 1-Tap-Sharing zu
  WhatsApp/Telegram/Email/SMS runden es ab. Eine Referral-CTA erscheint nach jeder
  erfolgreichen Spende und im E16-Portfolio.

Beides ist **dieselbe Mechanik**: eindeutiger Link, Attribution-Tracking, Leaderboard,
Feature-Rewards. CAC nahe null, echter viraler Loop.

Strategisch wichtig: Die Engine baut **keine** zweite Gamification-Schicht. Sie speist
Referral-/Advocate-Zählwerte in die in E16 gebauten, donation-freien Primitive
(`rankLeaderboard`, `resolveTier`) ein. Der eindeutige Link nutzt das E8-Einmal-Token-
Muster (nur SHA-256-Hash gespeichert). Das Sharing nutzt das E3-Share-Toolkit. Geld
fließt unverändert über den geprüften Donation-Pfad direkt an die Schule.

## User Stories

- Als MBA-Studierende möchte ich bis zu 10 Alumni einladen, meine Kampagne zu bewerben,
  damit ich mein Netzwerk vergrößere, ohne sie direkt um Geld zu bitten.
- Als Alumni-Advocate möchte ich meinen eindeutigen Share-Link plus vorformulierte
  Templates (Email/WhatsApp/LinkedIn) bekommen, damit ich mit einem Klick werben kann.
- Als Alumni-Advocate möchte ich meine Referral-Stats und meinen Rang auf einem
  Leaderboard sehen, damit ich motiviert bleibe.
- Als Spender möchte ich einen Referral-Link in meinem Account haben und sehen, wie viele
  Freunde eingeladen, gespendet und aktiv sind, damit ich meinen Impact verstehe.
- Als Spender möchte ich für eine geworbene Spende einen Both-Win-Badge erhalten, damit
  ich viral helfen kann — ohne dass Geld an mich (statt an die Schule) fließt.
- Als Studierende möchte ich das Advocate-Leaderboard auf meiner Kampagnen-Seite sehen,
  damit Besucher den Social Proof spüren.

## Scope (was wird gebaut)

**Eindeutige Links (rein, getestet):**
- Generierung pro Spender (Referral) und pro Advocate-Invite (Advocate). Raw-Code wird
  einmal gezeigt, nur der SHA-256-Hash persistiert (E8-Muster).
- Validierung eines präsentierten Codes gegen einen gespeicherten Datensatz (malformed /
  mismatch / revoked).

**Advocate-Seite (Studierende):**
- `POST /campaigns/:id/advocates` — Advocate einladen (Name + optionale Email), bis zu
  15 pro Kampagne. Erzeugt Invite + eindeutigen Share-Link + Bulk-Share-Templates
  (Email/WhatsApp/LinkedIn).
- `GET /campaigns/:id/advocates` — Fundraiser-Dashboard: Liste der Advocates mit
  Referral-Count, Reward-Tier, Rang (über `rankLeaderboard`).
- `GET /campaigns/:id/advocate-leaderboard` — öffentliches Advocate-Leaderboard für die
  Kampagnen-Seite (anonymisierbare Labels).
- Reward-Tiers über `resolveTier` (Schwellen 3/5/10) → Shout-out / Recap / Recognition.

**Referral-Seite (Spender):**
- `GET /donors/me/referral` — Referral-Link + Tracking-Dashboard ("invited/donated/active")
  + Both-Win-Badge-State + Bulk-Share-Templates.
- `POST /donors/me/referral/leaderboard-opt-in` — opt-in/opt-out anonymes Leaderboard.
- `GET /referral/leaderboard` — anonymes Referral-Leaderboard (nur opt-in-Teilnehmer).

**Attribution (rein, getestet, dedupliziert):**
- Beim Donate-Flow wird ein optionaler `referralCode`/`advocateCode` mitgegeben. Eine
  erfolgreiche Spende (PLEDGED/CAPTURED/SUCCEEDED) wird **last-touch** dem Referrer bzw.
  Advocate zugeschrieben. Dedupe pro (Code, Donation): eine Spende zählt genau einmal.
- Geld bleibt unangetastet: es fließt wie immer an die Schule.

**Frontend:**
- Advocate-Management-Panel auf der Studierenden-Seite (`/student`) + Advocate-Leaderboard
  auf der öffentlichen Kampagnen-Seite.
- Referral-Link + Tracking + Leaderboard + Share-Buttons im Donor-Account (E4/E16).
- Referral-CTA-Komponente nach erfolgreicher Spende.
- Pure Helfer (Link-Anzeige, Tracking-Stats-Format, Reward-Tier-Labels, Share-Template-
  Text) mit Web-Coverage-Gates. Reuse des E3-Share-Toolkits.

## Functional Requirements

- **FR-1 (Link-Generierung):** Pro Spender genau ein aktiver Referral-Link; pro
  Advocate-Invite genau ein Share-Link. Raw-Code 1× sichtbar, nur Hash gespeichert.
- **FR-2 (Validierung):** Ein präsentierter Code wird timing-safe gegen den Hash geprüft;
  ungültige Codes (malformed/mismatch/revoked) führen zu keiner Attribution.
- **FR-3 (Advocate-Limit):** Maximal 15 Advocates pro Kampagne; ein 16. Invite wird mit
  `DomainException` abgelehnt.
- **FR-4 (Attribution):** Eine geworbene, gezählte Spende (PLEDGED/CAPTURED/SUCCEEDED)
  zählt dem Referrer/Advocate; dedupliziert pro Donation (last-touch).
- **FR-5 (Reward-Tiers):** Referral-/Advocate-Count → Tier via `resolveTier` mit
  Schwellen 3/5/10; nur Feature-/Recognition-Rewards, nie Cash.
- **FR-6 (Leaderboard):** Advocate- und Referral-Leaderboards entstehen via
  `rankLeaderboard`; deterministischer Tie-Break (id asc). Kein Echtzeit-/WebSocket-Board.
- **FR-7 (Both-Win-Badge):** Bei der ersten geworbenen Spende erhalten Referrer und
  geworbene Person je einen Badge (Feature-Unlock). Read-only abgeleitet.
- **FR-8 (Opt-in-Leaderboard):** Das Referral-Leaderboard listet nur Spender, die
  explizit opt-in gewählt haben; Labels sind anonymisiert.
- **FR-9 (Geld an die Schule):** Attribution verändert weder Betrag noch Empfänger. Geld
  fließt immer an die Schule, nie an den Studierenden oder Referrer.
- **FR-10 (Envelope):** JSON-Routen nutzen `{ success, data?, error? }`; Validierung an
  der Grenze (DTOs); Fehler laut.

## Key Entities

- **ReferralLink** — gehört zu einem DONOR-User; `codeHash` (unique), `optInLeaderboard`,
  `createdAt`. Genau einer pro Spender.
- **AdvocateInvite** — gehört zu einer Kampagne; `name`, optionale `email`, `codeHash`
  (unique), `status` (ACTIVE/REVOKED), `createdAt`. Bis zu 15 pro Kampagne.
- **ReferralAttribution** — verbindet einen Code (Referral **oder** Advocate) mit genau
  einer Donation; `kind` (REFERRAL/ADVOCATE), `referralLinkId?`, `advocateInviteId?`,
  `donationId` (unique → Dedupe), `convertedAt`. Money-frei.

## Success Criteria

- 50%+ der Fundraiser rekrutieren 5+ Advocates (Produktmetrik, nicht im Prototyp messbar).
- Advocate-Conversion 25–30%; Referred-Donor-First-Spende 35%+; Viral Coefficient 1.2+.
- Im Prototyp: Link-Generierung + Validierung + Attribution + Leaderboard + Reward-Tiers
  laufen end-to-end mit Seed-Daten; alle pure-logic-Dateien ≥ 80% Per-Path-Coverage;
  beide Builds grün; `migrate diff` sauber.

## Out of Scope (ehrlich)

- **Keine Cash-Rewards / Geldprämien** für Referrer oder Advocates — ausschließlich
  Feature-/Recognition-Belohnungen (Compliance: Geld geht nur an die Schule).
- **Kein echtes Email-Versenden** — Invites erzeugen Links + vorformulierte Templates;
  es wird kein SMTP/Provider aufgerufen (konsistent mit der Infra-Default-Linie).
- **Attribution ist last-touch** — kein Multi-Touch-Attributionsmodell, keine
  zeitfenster-gewichtete Zuordnung.
- **Kein Echtzeit-Leaderboard / WebSockets** — Boards werden bei Aufruf berechnet
  (`rankLeaderboard`), kein Live-Push.
- **Single-Instance** — keine verteilte Dedupe-Sperre; die DB-Unique auf `donationId`
  ist die Dedupe-Garantie.
- **Keine neue Badge-/Streak-/Leaderboard-Engine** — es werden ausschließlich die
  E16-Primitive (`rankLeaderboard`, `resolveTier`) wiederverwendet.
- **Kein Fraud-/Self-Referral-Hardening über das Vorhandene hinaus** — Self-Referral
  (eigener Code auf eigene Spende) wird simpel geblockt; ausgefeilte Abuse-Erkennung
  bleibt bei E9/E11.
