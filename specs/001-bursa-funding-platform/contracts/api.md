# API Contracts: Bursa — Funding Platform (Phase 1)

Base URL: `http://localhost:3000/api`. All responses use the envelope
`{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message", "details?" } }`.
Auth is a Bearer JWT (`Authorization: Bearer <token>`). Money fields are integer **cents** (EUR).

Legend — Auth: `public` (none), `student`, `sponsor`, `admin`, `user` (any logged-in).

## Auth

| Method | Path | Auth | Body → Result |
|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, displayName, role? (DONOR\|STUDENT\|SPONSOR) }` → `{ token, user }` |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | user | → `{ user, profile? }` |

ADMIN accounts are created by seed only (not via public register).

## Schools

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/schools` | public | list schools (id, name, country, city, logoUrl, payoutVerified) |
| POST | `/schools` | admin | `{ name, country, city?, website?, logoUrl?, payoutAccountRef? }` |
| PATCH | `/schools/:id/verify-payout` | admin | `{ payoutVerified: true, payoutAccountRef? }` |

## Students & profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| PUT | `/students/profile` | student | upsert `{ fullName, country, story, recommendation?, photoUrl? }` |
| GET | `/students/me` | student | → profile + own campaign (any status) |

## Campaigns

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/campaigns` | student | create DRAFT `{ schoolId, programName, title, story, goalCents, deadline? }` |
| PATCH | `/campaigns/:id` | student (owner) | update DRAFT fields |
| POST | `/campaigns/:id/submit` | student (owner) | DRAFT → PENDING_VERIFICATION (+ verification PENDING), `{ admissionRef? }` |
| GET | `/campaigns` | public | gallery: only VERIFIED & status∈{LIVE,FUNDED,DISBURSED}. Query: `?country=&schoolId=&q=&status=` |
| GET | `/campaigns/:id` | public | detail: campaign + student + school + progress + recent donations (anonymity-respecting) + updates. Non-public statuses 404 to anonymous; owner/admin can read. |
| GET | `/campaigns/:id/updates` | public | timeline (date desc) |
| POST | `/campaigns/:id/updates` | student (owner) / admin | `{ title, body }` (type MANUAL) |
| GET | `/stats` | public | `{ totalRaisedCents, studentsFunded, schools, campaignsLive }` for the landing hero |

## Donations (mocked payments)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/campaigns/:id/donations/card` | public | `{ amountCents, tipCents?, message?, anonymous?, donorName?, donorEmail? }` → `{ donation, campaign }`. Guarded by donation invariants. |
| POST | `/campaigns/:id/donations/sepa` | sponsor | `{ amountCents, message? }` → `{ donation, receipt }` (type CORPORATE, method SEPA) |
| GET | `/campaigns/:id/donations` | public | recent succeeded donations (name or "Anonymous", amount, message, date) |

Mock failure: an `amountCents` whose last two digits are `13` is rejected by the provider → donation
recorded `FAILED`, campaign goal unchanged, response `success:false` `error.code = "PAYMENT_FAILED"`.

## Sponsors (corporate)

| Method | Path | Auth | Notes |
|---|---|---|---|
| PUT | `/sponsors/profile` | sponsor | upsert `{ companyName, sector?, contactName?, logoUrl? }` |
| GET | `/sponsors/me/impact` | sponsor | `{ totalCommittedCents, campaignsSupported[], studentsSupported, donations[] }` |
| GET | `/sponsors/donations/:id/receipt` | sponsor (owner) | receipt payload `{ receiptNo, date, donor, amountCents, campaign, school, issuer }` |

## Admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/verifications?status=PENDING` | admin | review queue (pending campaigns + evidence) |
| POST | `/admin/campaigns/:id/verify` | admin | `{ admissionRef?, note? }` → verification VERIFIED, campaign → LIVE (requires school.payoutVerified), +SYSTEM update |
| POST | `/admin/campaigns/:id/reject` | admin | `{ note }` → verification REJECTED, campaign → REJECTED (hidden) |
| POST | `/admin/campaigns/:id/payout` | admin | disburse FUNDED campaign to its school → `{ payout }`, campaign → DISBURSED (idempotent; blocked if not FUNDED) |
| GET | `/admin/payouts` | admin | list payouts (campaign, school, amount, status, reference) |

## Error codes

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CAMPAIGN_NOT_LIVE`,
`CAMPAIGN_FULLY_FUNDED`, `SCHOOL_NOT_VERIFIED`, `PAYMENT_FAILED`, `PAYOUT_NOT_ALLOWED`,
`ALREADY_PAID_OUT`, `CONFLICT`.
