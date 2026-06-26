# Bursa

**Funding that goes straight to the school — never to the student.**

Bursa is a two-sided giving platform where **verified, admitted** MBA students from lower-income
countries raise tuition from private donors (card) and corporate sponsors (SEPA). Funds are
disbursed **directly to the business school**, which is both the trust USP and a legal shield.

This repository is a runnable **prototype** with mocked payments, synthetic seed data, and
AI-generated profile images. It was built spec-first using the
[spec-kit](https://github.com/github/spec-kit) framework.

![Gallery](./docs/screenshots/01-gallery.png)

## Quickstart

Prereqs: Node 24, Docker + Docker Compose.

```bash
npm run db:up          # PostgreSQL via Docker (host port 5433)
npm run install:all    # install apps/api and apps/web deps (first run)
npm run prisma:migrate # apply the schema
npm run seed           # synthetic data + AI portraits (uses OPENAI_KEY)
npm run dev            # API on :3000, web on :4200
```

Open **http://localhost:4200**. API docs (Swagger) at **http://localhost:3000/api/docs**.

### Demo accounts (password `bursa1234`)

| Role | Email |
|---|---|
| Admin | `admin@bursa.test` |
| Sponsor | `sponsor@acme.test` |
| Donor | `donor@bursa.test` |
| Student | `amara@bursa.test` |

## The demo loop

Student submits a campaign → admin verifies the admission → donors (card) and sponsors (SEPA) fund
it → once funded, the admin disburses **directly to the school**. No flow ever pays a student.

See [`docs/WALKTHROUGH.md`](./docs/WALKTHROUGH.md) for a screenshot tour.

## Stack

- **Frontend** — Angular 20 (standalone components, signals) + Tailwind CSS (`apps/web`)
- **Backend** — NestJS 11 + Prisma 6 + PostgreSQL 16 (`apps/api`)
- **Payments** — mocked behind a `PaymentProvider` interface, Stripe/SEPA-ready
- **Seed images** — OpenAI `gpt-image-1` (synthetic portraits, fallback to initials avatars)

```
apps/
  api/   NestJS: auth, schools, students, campaigns, donations, sponsors, payouts, admin
         + payments (provider abstraction), common (envelope, filters, guards)
  web/   Angular: gallery, campaign+donate, auth, student, sponsor, admin
specs/001-bursa-funding-platform/   spec-kit artifacts (spec, plan, data-model, contracts, tasks)
.specify/memory/constitution.md     project constitution
docs/                               walkthrough, orchestration log, screenshots
```

## Design principles (from the constitution)

1. **Spec-driven** — every feature flows through `specify → plan → tasks → implement`.
2. **Trust by design** — campaigns go live only via admin verification; money is modeled as a
   payout to a verified *school*, never a student wallet.
3. **Payments behind an abstraction** — swap `MockPaymentProvider` for a real provider with zero
   domain-code changes.
4. Immutability, small focused modules, boundary validation, structured `{ success, data | error }`
   responses.

## Useful scripts

```bash
npm run db:down     # stop Postgres
npm run db:reset    # wipe + recreate the DB volume
npm run seed        # re-seed (resets to a clean demo state)
npm run dev:api     # API only
npm run dev:web     # web only
npm run build       # build both apps
npm --prefix apps/api test   # backend unit tests
```

## Status

Prototype. Payments are simulated (amounts ending in `.13` fail on purpose). Single currency (EUR).
The legal/nonprofit construct, real tax receipts, and cross-border disbursement are modeled
symbolically. Market research lives in the maintainer's OneDrive workspace
(`260626_FundingApp_Marktrecherche.md`).
