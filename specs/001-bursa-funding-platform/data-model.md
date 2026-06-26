# Data Model: Bursa — Funding Platform

**Phase 1 output** · drives `apps/api/prisma/schema.prisma`.

All money is stored as **integer cents** (`*Cents: Int`) in **EUR** for the prototype.
IDs are `cuid()`. Timestamps are `DateTime` with `@default(now())` / `@updatedAt`.

## Enums

| Enum | Values |
|---|---|
| `Role` | `STUDENT`, `DONOR`, `SPONSOR`, `ADMIN` |
| `CampaignStatus` | `DRAFT`, `PENDING_VERIFICATION`, `LIVE`, `FUNDED`, `DISBURSED`, `CLOSED`, `REJECTED` |
| `VerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED` |
| `DonationMethod` | `CARD`, `SEPA` |
| `DonationType` | `PRIVATE`, `CORPORATE` |
| `DonationStatus` | `PENDING`, `SUCCEEDED`, `FAILED` |
| `PayoutStatus` | `PENDING`, `SENT`, `CONFIRMED` |
| `UpdateType` | `MANUAL`, `SYSTEM` |

## Entities

### User
| Field | Type | Notes |
|---|---|---|
| id | String cuid PK | |
| email | String unique | login |
| passwordHash | String | bcrypt |
| role | Role | default `DONOR` |
| displayName | String | |
| createdAt / updatedAt | DateTime | |
Relations: `studentProfile?` (1:1), `corporateProfile?` (1:1), `donations[]` (as private donor),
`updates[]` (authored), `verifications[]` (performed as admin).

### School
| id | String cuid PK |
| name | String |
| country | String |
| city | String? |
| website | String? |
| logoUrl | String? |
| payoutVerified | Boolean default false |
| payoutAccountRef | String? — mock IBAN-style reference for the school's account |
Relations: `campaigns[]`, `payouts[]`.

### StudentProfile  (1:1 with a STUDENT User)
| id | String cuid PK |
| userId | String unique FK → User |
| fullName | String |
| country | String |
| photoUrl | String? — AI-generated at seed time |
| story | String @db.Text |
| recommendation | String? @db.Text — quote/endorsement |
Relations: `user`, `campaign?` (1:1; one active campaign per student in the prototype).

### Campaign
| id | String cuid PK |
| studentProfileId | String unique FK → StudentProfile |
| schoolId | String FK → School |
| programName | String — e.g. "Full-Time MBA 2026" |
| title | String |
| story | String @db.Text |
| goalCents | Int |
| currency | String default "EUR" |
| raisedCents | Int default 0 — counts only succeeded donation amounts (NOT tips) |
| tipsCents | Int default 0 — optional tips supporting the platform |
| status | CampaignStatus default DRAFT |
| deadline | DateTime? |
Relations: `studentProfile`, `school`, `verification?` (1:1), `donations[]`, `updates[]`, `payout?` (1:1).

### AdmissionVerification  (1:1 with Campaign)
| id | String cuid PK |
| campaignId | String unique FK → Campaign |
| status | VerificationStatus default PENDING |
| admissionRef | String? — symbolic reference to the admission document |
| note | String? — reviewer note / rejection reason |
| verifiedById | String? FK → User (admin) |
| verifiedAt | DateTime? |
Relations: `campaign`, `verifiedBy?`.

### Donation
| id | String cuid PK |
| campaignId | String FK → Campaign |
| donorUserId | String? FK → User — set for PRIVATE donations |
| corporateProfileId | String? FK → CorporateProfile — set for CORPORATE donations |
| amountCents | Int — counts toward the goal |
| tipCents | Int default 0 — platform tip (PRIVATE only) |
| currency | String default "EUR" |
| method | DonationMethod |
| type | DonationType |
| status | DonationStatus default PENDING |
| providerRef | String? — mock payment reference |
| message | String? |
| anonymous | Boolean default false |
Relations: `campaign`, `donorUser?`, `corporateProfile?`.

### CorporateProfile  (1:1 with a SPONSOR User)
| id | String cuid PK |
| userId | String unique FK → User |
| companyName | String |
| sector | String? |
| contactName | String? |
| logoUrl | String? |
Relations: `user`, `donations[]`.

### Payout  (1:1 with Campaign — disbursement to the SCHOOL)
| id | String cuid PK |
| campaignId | String unique FK → Campaign |
| schoolId | String FK → School |
| amountCents | Int |
| method | DonationMethod default SEPA |
| reference | String |
| status | PayoutStatus default PENDING |
| proofNote | String? — symbolic proof-of-use |
| sentAt | DateTime? |
Relations: `campaign`, `school`. **Invariant: a Payout's recipient is always a School. There is no
student payout relation anywhere in the schema.**

### CampaignUpdate
| id | String cuid PK |
| campaignId | String FK → Campaign |
| authorId | String? FK → User |
| title | String |
| body | String @db.Text |
| type | UpdateType default MANUAL |
Relations: `campaign`, `author?`.

## Domain Invariants (enforced in services, not just schema)

1. **Public visibility**: a campaign is publicly listable iff
   `verification.status == VERIFIED AND status IN (LIVE, FUNDED, DISBURSED)`.
2. **Publish gate**: `status` may become `LIVE` only via admin verification, and only if the
   campaign's `school.payoutVerified == true`.
3. **Donation guard**: a donation is accepted only if the campaign is `LIVE`, verified, and
   `raisedCents < goalCents`. Donations to other states are rejected.
4. **Goal accounting**: on a SUCCEEDED donation, `raisedCents += amountCents` and
   `tipsCents += tipCents`. If `raisedCents >= goalCents`, `status → FUNDED` and a SYSTEM update is
   appended. Tips never count toward the goal.
5. **Over-funding rule (prototype)**: if `amountCents > (goalCents - raisedCents)`, only the
   remaining amount counts toward the goal; the excess is recorded as `tipCents`.
6. **Disbursement**: a payout is allowed only if `status == FUNDED`, `school.payoutVerified`, and no
   existing payout (idempotent). It creates a `Payout` to the school for `raisedCents`, sets
   `status → DISBURSED`, and appends a SYSTEM update. **Never credits a student.**
7. **Mock failure trigger**: a donation `amountCents` ending in the deterministic sentinel `13`
   (e.g. EUR x.13) is treated by `MockPaymentProvider` as a FAILED payment for testing — recorded
   FAILED, goal unchanged.
