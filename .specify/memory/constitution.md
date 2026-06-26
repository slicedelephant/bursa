# FundingApp Constitution

FundingApp is a two-sided giving platform that lets verified, admitted MBA students
from lower-income countries raise tuition from private donors and corporate sponsors,
where funds are disbursed **directly to the business school**, never to the student.

These principles are binding for every feature, plan, and task. When a decision is
ambiguous, the orchestrator researches first, then decides in line with these principles.

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
Every feature flows through the spec-kit pipeline: `specify → clarify → plan → tasks →
implement`. No production code is written before a spec and plan exist for it. The spec
describes WHAT and WHY (user stories, requirements, success criteria); the plan and code
decide HOW. Artifacts live under `specs/<NNN-feature>/`.

### II. Trust & Verification by Design
The platform's entire value rests on trust. Therefore: (a) a student campaign can only
go live after its admission is marked **verified** by an admin; (b) money is always
disbursed to the **school**, modeled explicitly as a payout to a verified institution,
never to a student wallet; (c) every state change that touches money or verification is
auditable. Trust mechanics are first-class domain concepts, not afterthoughts.

### III. Payments Behind a Provider Abstraction
All payment and payout logic sits behind a `PaymentProvider` interface. The prototype
ships a `MockPaymentProvider` (deterministic, no external calls). A real provider
(Stripe Connect, Mangopay, …) must be swappable by implementing the same interface with
zero changes to domain/business code. Card (donor) and SEPA (corporate) flows differ only
in provider-level detail, never in domain logic.

### IV. Immutability & Small, Focused Modules
No mutation of inputs — always return new objects/values. Files stay focused
(200-400 lines typical, 800 hard max). Organize by feature/domain (auth, students,
schools, campaigns, donations, admin), not by technical type. High cohesion, low coupling;
each module has one clear purpose and a well-defined interface.

### V. Validate at the Boundary, Fail Loud
Every inbound request is validated (DTO validation, whitelisting, type coercion off).
Errors are handled explicitly and surfaced as structured API responses
(`{ success, data?, error? }`); never swallow errors silently. Money/verification
operations validate invariants (e.g. cannot donate to an unverified or fully-funded
campaign) before mutating state.

### VI. Privacy & Security
Seed/demo data is fully synthetic — no real personal data of real applicants. Secrets
(DB URL, API keys, OPENAI_KEY) live only in environment variables, never in the repo.
Passwords are hashed (bcrypt). The OPENAI_KEY is used only at seed time to generate
synthetic profile images and is never shipped to the client.

## Technology Stack (locked)

- **Frontend**: Angular 20 (standalone components, signals, Angular Router), Tailwind CSS.
- **Backend**: NestJS 11 (TypeScript), Prisma ORM.
- **Database**: PostgreSQL 16 (Docker Compose for local dev).
- **Payments**: mocked behind `PaymentProvider` (Stripe-ready), no live charges.
- **App language**: English (international audience). Human-facing project docs
  (research report, walkthrough, handover) are German for the maintainer.
- **Seed images**: OpenAI DALL·E via a one-off script, output committed as static assets.

## Development Workflow

- The orchestrator delegates spec/plan/task/implementation work to sub-agents and
  resolves open questions via research before deciding — it does not block on the user.
- Each user story is independently testable and delivers a usable slice; build in
  priority order (P1 → P2 → …) so an MVP exists early.
- Commit in small, logical units with conventional-commit messages
  (`feat:`, `fix:`, `chore:`…). Keep the app runnable at every checkpoint.
- A change is "done" only when the app builds and the relevant flow runs locally.

## Governance

This constitution supersedes ad-hoc preferences. Any deviation (e.g. a 4th app, a heavier
pattern, real payment calls) must be justified in the plan's Complexity Tracking section
with the simpler alternative that was rejected and why. Amendments bump the version below.

**Version**: 1.0.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26
