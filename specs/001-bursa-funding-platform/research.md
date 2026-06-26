# Research: Bursa — Funding Platform (Phase 0)

Technical decisions for the prototype. Market/business research lives in the separate German
report `260626_FundingApp_Marktrecherche.md`; this file records *engineering* choices only.

## Decisions

### D1 — ORM: Prisma 6 (not Prisma 7, not TypeORM)
**Decision**: Prisma `^6.x`. **Rationale**: fastest type-safe schema → migration → seed loop, the
best-documented NestJS pairing, trivial seeding. **Alternatives rejected**: Prisma 7 (just released,
ESM-first + new `prisma.config.ts` conventions = avoidable overnight risk); TypeORM (more
boilerplate, decorator drift with Nest 11). Pinned 6 after a 7→6 downgrade during setup.

### D2 — Payments: `PaymentProvider` abstraction + `MockPaymentProvider`
**Decision**: a single interface with `createCardCharge`, `createSepaPledge`, `createPayout`,
returning a deterministic result `{ status, reference }`. The mock derives success/failure from the
amount (sentinel `…13` fails) so flows are testable without external services. **Rationale**:
constitution Principle III; lets Stripe Connect / SEPA slot in later behind the same interface with
zero domain changes. **Alternatives rejected**: real Stripe test mode (user chose fully mocked);
inlining payment logic in services (couples domain to a provider).

### D3 — Money representation: integer cents, EUR
**Decision**: store all amounts as `Int` cents, currency `"EUR"`. **Rationale**: avoids float
rounding errors in goal/raised accounting. **Alternatives rejected**: `Decimal` (heavier, unneeded
for a single-currency prototype); floats (unsafe for money).

### D4 — Auth: JWT (passport-jwt) + bcrypt, role-based guard
**Decision**: email/password → JWT bearer; a `RolesGuard` + `@Roles()` decorator authorizes
STUDENT/DONOR/SPONSOR/ADMIN actions. Public gallery + card donation need no auth. **Rationale**:
lightweight, no external IdP, fits the prototype. **Alternatives rejected**: Clerk/Auth0 (external
setup overhead for an offline prototype); session cookies (JWT is simpler across the split apps).

### D5 — Validation + response envelope
**Decision**: NestJS global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
transform: true })` with class-validator DTOs; a response interceptor wraps payloads as
`{ success: true, data }` and an exception filter emits `{ success: false, error }`. **Rationale**:
boundary validation (Principle V) + consistent client contract. **Note on Zod**: the user's global
preference is Zod, but class-validator is the NestJS-native idiom; using it keeps the code reading
like the framework. Shared enums are duplicated as TS unions on the web side.

### D6 — Frontend: Angular 20 standalone + signals + Tailwind 3.4
**Decision**: Angular 20 (CLI 22 requires Node ≥24.15.0; local is 24.11.1, so pinned CLI 20),
standalone components, signals for state, a typed `ApiService` over `HttpClient`, Tailwind 3.4 with
the sliced-elephant brand palette. **Rationale**: modern, matches the maintainer's Angular 19 stack,
reliable on the current Node. **Alternatives rejected**: Angular 22 (Node engine block); Tailwind 4
(newer PostCSS pipeline = avoidable risk vs rock-solid v3.4).

### D7 — Seed images: OpenAI DALL·E at seed time
**Decision**: a seed step calls OpenAI image generation (key read from `apps/api/.env` or, as a
fallback, parsed from `06_IT/.env`) to produce ~10-12 synthetic portrait images, saved under
`apps/web/public/seed/` and referenced by `StudentProfile.photoUrl`. If the key/API is unavailable,
the seed falls back to deterministic placeholder avatars so the app still runs. **Rationale**:
realistic demo without using any real person's likeness; resilient to no-network. **Alternatives
rejected**: bundling stock photos (licensing + not synthetic); blocking seed on the API (fragile).

### D8 — Local database: Docker Compose Postgres on host port 5433
**Decision**: `postgres:16-alpine` via `docker-compose.yml`, host port 5433. **Rationale**: no local
Postgres installed; 5433 avoids clashes with other projects; one-command `npm run db:up`.
**Alternatives rejected**: SQLite (Prisma enums + parity with prod Postgres); host Postgres install.

## Open questions resolved autonomously (user asleep)

- **Currency**: EUR only for the prototype (display + storage). Multi-currency deferred.
- **One campaign per student**: yes for the prototype (StudentProfile 1:1 Campaign).
- **Over-funding**: cap at remaining goal, record excess as tip (recorded in data-model invariant 5).
- **Receipts**: corporate donation receipts are generated from the Donation record on demand (no
  separate persisted Receipt entity in the prototype).
