# Data Model — Feature 017 Referral- & Advocate-Engine (E15)

## Neue Prisma-Modelle (3) + Enums (2)

Drei schlanke Modelle. Both-Win-Badges und Tracking-Stats werden **on read** abgeleitet
(kein Award-Tisch). Migration: `referral_engine`.

### Enum `ReferralKind`
```
REFERRAL   // Spender wirbt Spender (E4 Donor-Account)
ADVOCATE   // Studierende wirbt Advocates für ihre Kampagne
```

### Enum `AdvocateInviteStatus`
```
ACTIVE
REVOKED
```

### `ReferralLink`
Genau ein aktiver Link pro DONOR-User. Der eigene Referral-Link ist das Share-Asset des
Spenders, kein Berechtigungs-Token — daher wird neben dem `codeHash` (für die Lookup-
Validierung beim Attributieren) ein anzeigbarer `code` persistiert, damit der Donor seinen
Link bei jedem Besuch wiederfindet. (Advocate-Invites bleiben strikt hash-only.)
```
id                String   @id @default(cuid())
donorUserId       String   @unique
code              String   @unique   // anzeigbarer Referral-Code (Donor-eigenes Share-Asset)
codeHash          String   @unique   // SHA-256 des Codes (timing-safe Lookup beim Attributieren)
optInLeaderboard  Boolean  @default(false)
createdAt         DateTime @default(now())

donorUser         User     @relation("DonorReferralLink", fields: [donorUserId], references: [id], onDelete: Cascade)
attributions      ReferralAttribution[]
```

### `AdvocateInvite`
Bis zu 15 pro Kampagne (im Service erzwungen).
```
id           String               @id @default(cuid())
campaignId   String
name         String
email        String?
codeHash     String               @unique   // SHA-256, nur Hash gespeichert
status       AdvocateInviteStatus @default(ACTIVE)
createdAt    DateTime             @default(now())

campaign     Campaign             @relation(fields: [campaignId], references: [id], onDelete: Cascade)
attributions ReferralAttribution[]

@@index([campaignId])
```

### `ReferralAttribution`
Verbindet einen Code (Referral **oder** Advocate) mit genau **einer** Donation.
`donationId @unique` ist die Dedupe-Garantie (eine Spende zählt höchstens einmal).
Money-frei — kein Betrag, kein Empfänger, kein Payout-Bezug.
```
id                String       @id @default(cuid())
kind              ReferralKind
referralLinkId    String?
advocateInviteId  String?
donationId        String       @unique
convertedAt       DateTime     @default(now())

referralLink      ReferralLink?    @relation(fields: [referralLinkId], references: [id], onDelete: Cascade)
advocateInvite    AdvocateInvite?  @relation(fields: [advocateInviteId], references: [id], onDelete: Cascade)
donation          Donation         @relation("DonationReferral", fields: [donationId], references: [id], onDelete: Cascade)

@@index([referralLinkId])
@@index([advocateInviteId])
```

### Relationen-Backrefs (bestehende Modelle)
- `User`: `referralLink ReferralLink? @relation("DonorReferralLink")`
- `Donation`: `referralAttribution ReferralAttribution? @relation("DonationReferral")`
- `Campaign`: `advocateInvites AdvocateInvite[]`

## Genutzte bestehende Modelle (read-only)

- `Donation` — Conversion-Quelle (`status ∈ {PLEDGED,CAPTURED,SUCCEEDED}`,
  `donorUserId` für active-Zählung).
- `Campaign` / `StudentProfile` — Kontext für Advocate-Leaderboard-Labels.
- `User` (DONOR) — Eigentümer des Referral-Links.

## View-Typen (rein, keine DB)

### Pure-Logic-Inputs/Outputs (donation-frei)
- `referral-code.util.ts`: `ReferralCodeRecord { codeHash; status?: 'ACTIVE'|'REVOKED' }`,
  `CreatedReferralCode { code; codeHash }`, `CodeValidationResult { valid; reason? }`.
- `referral-attribution.util.ts`: `AttributionInput { code; record; donationStatus;
  donorUserId?; referrerUserId?; alreadyAttributed }`, `AttributionDecision { attribute;
  reason }`.
- `reward-tier.util.ts`: `ReferralReward { tier; nextTier; toNext; perk }` (perk:
  `'NONE'|'SHOUT_OUT'|'RECAP'|'RECOGNITION'`).
- `referral-leaderboard.util.ts`: `LeaderboardRow { id; label; count }` →
  `LeaderboardEntry[]` (über E16 `rankLeaderboard`).
- `share-template.util.ts`: `ShareTemplateInput { channel; url; campaignOrName; lang? }`
  → `{ subject?; body }`.
- `referral-stats.util.ts`: `ReferralStatsInput { invited; donated; active }` →
  `ReferralStats { invited; donated; active; conversionPct; viralCoefficient; label }`.

### Service-View-Typen (vom Service gebaut)
- `DonorReferralView { link; stats; reward; optInLeaderboard; templates }`.
- `AdvocateInviteView { id; name; email?; shareUrl; referralCount; reward; rank }`.
- `AdvocateDashboardView { campaignId; advocateCount; remaining; advocates;
  leaderboard }`.
- `ReferralLeaderboardView { entries }` (anonymisiert).

## Invarianten

- **Geld:** `ReferralAttribution` enthält **keinen** Betrag und keinen Empfänger.
  Attribution verändert weder `Donation.amountCents`, `Donation.status` noch `Payout`.
- **Dedupe:** `ReferralAttribution.donationId @unique` ⇒ eine Spende zählt höchstens einmal.
- **Hash-only (Advocate):** `AdvocateInvite` speichert nur den `codeHash`; der Raw-Code
  wird 1× bei Anlage gezeigt. `ReferralLink` speichert zusätzlich den anzeigbaren `code`
  (Donor-eigenes Share-Asset, kein Berechtigungs-Token).
- **Advocate-Limit:** ≤ 15 ACTIVE Invites pro Kampagne (Service-Check).
- **Self-Referral:** eine Spende des Code-Eigentümers auf den eigenen Code wird nicht
  attribuiert (reine Prüfung in `resolveAttribution`).
- **Immutability:** alle Primitive geben neue Werte zurück.
