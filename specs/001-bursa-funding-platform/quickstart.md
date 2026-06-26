# Quickstart: Bursa — Funding Platform

Run the prototype locally end-to-end. Prereqs: Node 24, Docker + Docker Compose.

```bash
cd ~/dev/se_projects/fundingApp

# 1) Start PostgreSQL (Docker, host port 5433)
npm run db:up

# 2) Install dependencies for both apps (first run only)
npm run install:all

# 3) Create the database schema
npm run prisma:migrate

# 4) Seed synthetic data + AI profile images
#    (reads OPENAI_KEY from apps/api/.env, or falls back to 06_IT/.env;
#     falls back to placeholder avatars if no key/network)
npm run seed

# 5) Run API (http://localhost:3000) + Web (http://localhost:4200)
npm run dev
```

Open **http://localhost:4200**.

## Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bursa.test` | `bursa1234` |
| Sponsor | `sponsor@acme.test` | `bursa1234` |
| Donor | `donor@bursa.test` | `bursa1234` |
| Student | `amara@bursa.test` | `bursa1234` |

## The end-to-end demo loop (SC-005)

1. **Browse & donate (P1)** — on the landing/gallery, open a verified campaign and donate by card
   (try EUR 50 + a tip). Watch the progress bar move.
2. **Student onboarding (P1)** — log in as the student, see the profile + campaign; or register a new
   student, fill the profile, create a campaign, and submit it for verification.
3. **Admin verification (P1)** — log in as admin, open the review queue, verify the pending campaign;
   it goes LIVE with a "Verified admission" badge and appears in the gallery.
4. **Corporate sponsor (P2)** — log in as the sponsor, pledge by SEPA to a campaign, download the
   receipt, and view the impact dashboard.
5. **Payout to school (P2)** — as admin, take a FUNDED campaign and disburse it; a Payout to the
   school's verified account is created and the campaign becomes DISBURSED. No student is ever paid.
6. **Updates (P3)** — post a campaign update and see it on the public timeline.

## Useful commands

```bash
npm run db:down       # stop Postgres
npm run db:reset      # wipe + recreate Postgres volume
npm run dev:api       # API only
npm run dev:web       # Web only
npm run seed          # re-seed (idempotent reset)
```

## Mock payment notes

Payments are simulated by `MockPaymentProvider`. Any card/SEPA amount succeeds **except** amounts
whose last two cent digits are `13` (e.g. `…,13 €`), which deterministically fail so the failure path
is demoable. No real charges, no external calls.
