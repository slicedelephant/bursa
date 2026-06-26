# Feature Specification: Bursa — Funding Platform

**Feature Branch**: `001-bursa-funding-platform`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Bursa — a giving platform where verified, admitted MBA students from lower-income countries raise tuition from private donors (card) and corporate sponsors (SEPA); funds are paid directly to the business school, never to the student."

## Context

Bursa serves the "admitted-but-underfunded" segment: talented people who have cleared the
hard hurdle (admission to a selective European business school) but face a pure capital gap.
The market research (`260626_FundingApp_Marktrecherche.md`) established the defensible moat as
the **bundle**, not any single feature: a sharp niche + dual funding (card for private donors,
SEPA for corporate sponsors) + a "money goes directly to the school" rule that is simultaneously
the trust USP and a legal shield. The closest live model is Feenix (South Africa); the only
scaled full analog is Watsi (healthcare).

This prototype demonstrates the end-to-end product with **mocked payments** behind a clean
provider abstraction (Stripe/SEPA-ready), synthetic seed data, and AI-generated profile images.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse verified campaigns and donate by card (Priority: P1)

A private donor lands on Bursa, browses a gallery of **verified** student campaigns, opens one,
reads the student's story and funding progress, and makes a card donation (mocked) with an
optional tip. The campaign's raised amount updates immediately and the donor sees a confirmation.

**Why this priority**: This is the keystone of the platform — the moment value is delivered
(money raised toward a verified student's tuition). Without it, nothing else matters.

**Independent Test**: Seed a few verified campaigns, open the public gallery, open one campaign,
complete a card donation of EUR 50 + EUR 5 tip, and confirm the raised total increases by 50 and
a donation record exists. Fully testable without auth.

**Acceptance Scenarios**:

1. **Given** verified live campaigns exist, **When** a visitor opens the gallery, **Then** only
   campaigns whose admission is verified and whose status is LIVE are shown, each with student,
   school, goal and progress.
2. **Given** a live campaign, **When** the donor submits a EUR 50 card donation with a EUR 5 tip,
   **Then** a succeeded donation is recorded, the campaign raised amount increases by EUR 50 (the
   tip is tracked separately and does not count toward the goal), and a confirmation is shown.
3. **Given** a campaign already at 100% of its goal, **When** a donor opens it, **Then** it is
   shown as FUNDED and further donations are prevented (or routed to a similar campaign).

---

### User Story 2 - Student creates a profile and submits admission for verification (Priority: P1)

An admitted student registers, builds a story profile (name, country, photo, personal story,
recommendation, target school, MBA program, tuition goal), and submits proof of admission. The
campaign is created in a DRAFT/PENDING_VERIFICATION state and is **not** publicly visible yet.

**Why this priority**: Supply side of the marketplace. The platform needs real, structured
student campaigns before donors have anything to fund.

**Independent Test**: Register as a student, complete the profile, attach an admission reference,
submit for review, and confirm a campaign exists in PENDING_VERIFICATION that does not appear in
the public gallery.

**Acceptance Scenarios**:

1. **Given** a registered student, **When** they complete the profile and submit, **Then** a
   campaign is created with status PENDING_VERIFICATION and an admission verification record with
   status PENDING.
2. **Given** an unverified campaign, **When** any visitor browses the public gallery, **Then** the
   campaign is not listed.
3. **Given** a student editing a draft, **When** required fields (school, program, goal, story) are
   missing, **Then** submission is blocked with a clear validation message.

---

### User Story 3 - Admin verifies admission and publishes the campaign (Priority: P1)

A platform admin reviews pending campaigns, inspects the admission evidence, confirms the target
school is a verified institution with a payout account, and marks the admission **verified** —
which publishes the campaign (status LIVE) with a visible "Verified admission" badge. The admin can
also reject with a reason.

**Why this priority**: Verification is the trust mechanism the entire value proposition rests on.
A campaign may only go live through this gate.

**Independent Test**: As admin, open the review queue, verify one pending campaign, and confirm it
becomes LIVE and appears in the public gallery with a verified badge; reject another and confirm it
stays hidden with a recorded reason.

**Acceptance Scenarios**:

1. **Given** a PENDING_VERIFICATION campaign whose school is verified, **When** the admin marks the
   admission verified, **Then** the campaign status becomes LIVE, the verification record stores
   verifier + timestamp, and the campaign appears publicly with a verified badge.
2. **Given** a pending campaign, **When** the admin rejects it with a reason, **Then** the campaign
   stays hidden, the verification record is REJECTED with the reason, and the student can see it.
3. **Given** a campaign whose school has no verified payout account, **When** the admin tries to
   publish, **Then** publishing is blocked until the school is verified.

---

### User Story 4 - Corporate sponsor pledges via SEPA and gets a receipt + impact view (Priority: P2)

A corporate sponsor registers a company profile, pledges a larger amount to a campaign (or to the
general fund) via SEPA (mocked), receives a donation receipt (Zuwendungsbestätigung), and sees a
simple impact view of the students they have helped fund.

**Why this priority**: Corporate SEPA tickets (40-90k EUR) are how a campaign actually closes and
where the business model's margin lives. Essential for the platform's economics, but the donor +
verification loop (P1) must work first.

**Independent Test**: Register as a sponsor, pledge EUR 20,000 by SEPA to a campaign, confirm a
corporate donation record (method SEPA) is created, a receipt is generated, and the impact view
lists the funded campaign.

**Acceptance Scenarios**:

1. **Given** a sponsor on a campaign, **When** they pledge EUR 20,000 via SEPA, **Then** a corporate
   donation (method SEPA, type CORPORATE) is recorded and the campaign progress updates.
2. **Given** a completed corporate pledge, **When** the sponsor opens their dashboard, **Then** they
   see a downloadable receipt and an impact summary (students/campaigns supported, total committed).

---

### User Story 5 - Direct payout to the school when a campaign is funded (Priority: P2)

Once a campaign reaches its goal, an admin disburses the raised funds **directly to the school's**
verified payout account. The payout is recorded with amount, school, method, reference and status;
**no flow ever pays a student**. The campaign moves to a disbursed/closed state.

**Why this priority**: This is the mechanic that makes the trust promise real and is the legal
shield. It must exist for the story to be credible, but depends on funded campaigns (P1/P2).

**Independent Test**: Take a campaign at 100%, trigger a payout as admin, confirm a Payout record
to the school's account is created (status SENT), the campaign becomes DISBURSED, and there is no
code path that credits a student.

**Acceptance Scenarios**:

1. **Given** a FUNDED campaign, **When** the admin disburses, **Then** a Payout to the school's
   verified account is created with the full raised amount and a reference, and the campaign becomes
   DISBURSED.
2. **Given** a campaign below its goal, **When** the admin attempts a payout, **Then** it is blocked
   (prototype rule: disburse only fully funded campaigns) with a clear message.
3. **Given** any donation or payout flow, **When** funds move, **Then** the recipient is always a
   School, never a StudentProfile.

---

### User Story 6 - Campaign updates and donor retention (Priority: P3)

A campaign owner (student) or admin posts progress updates (e.g. "verified", "50% funded",
"disbursed — enrolled"). Donors see a progress timeline and the latest updates on the campaign page,
reinforcing trust and encouraging repeat giving.

**Why this priority**: Retention and trust amplifier. Valuable but not required for the core loop.

**Independent Test**: Post an update to a campaign and confirm it appears on the public campaign page
in a timeline ordered by date.

**Acceptance Scenarios**:

1. **Given** a live campaign, **When** the owner posts an update, **Then** it appears on the campaign
   page timeline with title, body and date.
2. **Given** key lifecycle events (verified, funded, disbursed), **When** they occur, **Then** a
   system update is added automatically to the timeline.

### Edge Cases

- Donation to an unverified, closed, or fully-funded campaign → rejected with a clear reason.
- A donation that would exceed the remaining goal → accepted but only the remaining amount counts
  toward the goal; the rest is recorded as overflow/tip (prototype: cap at remaining, record excess
  as tip). Decision recorded in plan.
- Admission rejected after a campaign briefly went live → campaign is unpublished.
- Payout attempted twice for the same campaign → second attempt blocked (idempotent).
- Mocked payment "fails" (deterministic test trigger, e.g. a magic amount) → donation recorded as
  FAILED and the goal is unchanged.
- Anonymous donations → donor identity hidden publicly but still recorded internally.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & roles**
- **FR-001**: System MUST support four roles: STUDENT, DONOR, SPONSOR (corporate), ADMIN.
- **FR-002**: System MUST allow registration and login with email + password (hashed); browsing the
  public gallery and donating by card MUST be possible without an account.
- **FR-003**: System MUST authorize actions by role (e.g. only ADMIN verifies; only the owning
  STUDENT edits their campaign).

**Schools**
- **FR-004**: System MUST model a School with name, country, city, website, logo, and a (mock)
  verified payout account; a school MUST be markable as payout-verified.
- **FR-005**: System MUST prevent publishing a campaign whose school is not payout-verified.

**Student profiles & campaigns**
- **FR-006**: A STUDENT MUST be able to create a story profile (display name, country, photo,
  personal story, recommendation/quote, target school, MBA program, tuition goal, currency).
- **FR-007**: System MUST create a Campaign linked to the student and school with status lifecycle
  DRAFT → PENDING_VERIFICATION → LIVE → FUNDED → DISBURSED → CLOSED (and REJECTED).
- **FR-008**: System MUST expose publicly only campaigns with a VERIFIED admission and status in
  {LIVE, FUNDED, DISBURSED}; PENDING/DRAFT/REJECTED MUST be hidden from the public gallery.

**Verification (trust)**
- **FR-009**: System MUST record an AdmissionVerification per campaign with status
  PENDING → VERIFIED | REJECTED, verifier (admin), timestamp, and an optional note/reason.
- **FR-010**: Publishing a campaign (→ LIVE) MUST only happen via admin verification, and MUST show
  a "Verified admission" badge on verified campaigns.

**Donations (mocked payments)**
- **FR-011**: A DONOR MUST be able to donate to a LIVE campaign by card (mocked) with an optional
  tip; the platform fee is 0% (only the optional tip supports the platform).
- **FR-012**: A SPONSOR MUST be able to pledge to a campaign by SEPA (mocked), recorded as a
  CORPORATE donation, with a generated donation receipt.
- **FR-013**: All payment and payout operations MUST go through a single `PaymentProvider`
  abstraction; the prototype MUST use a deterministic `MockPaymentProvider` with no external calls.
- **FR-014**: A donation MUST record amount, tip, currency, method (CARD|SEPA), type
  (PRIVATE|CORPORATE), status (PENDING|SUCCEEDED|FAILED), reference, optional message, anonymity.
- **FR-015**: A successful donation MUST increase the campaign's raised amount by the donation amount
  (not the tip); when raised ≥ goal the campaign MUST become FUNDED.
- **FR-016**: System MUST reject donations to non-LIVE, unverified, or fully-funded campaigns.

**Payouts (direct to school)**
- **FR-017**: System MUST disburse a funded campaign's raised amount **only to the campaign's
  school's verified payout account**, recorded as a Payout (amount, school, method, reference,
  status PENDING→SENT→CONFIRMED). There MUST be no code path that pays a student.
- **FR-018**: System MUST prevent disbursing a campaign that is not fully funded, and MUST be
  idempotent (no double payout).

**Updates & transparency**
- **FR-019**: A campaign owner or admin MUST be able to post updates; key lifecycle events
  (verified, funded, disbursed) SHOULD also create automatic updates.
- **FR-020**: The public campaign page MUST show the student story, school, verified badge, progress
  (raised/goal/percent), recent donors (respecting anonymity), and the update timeline.

**Cross-cutting**
- **FR-021**: All API responses MUST use a consistent envelope (`{ success, data?, error? }`) and
  validate inbound data at the boundary, rejecting unknown fields.
- **FR-022**: Seed data MUST be fully synthetic (no real personal data); profile images MUST be
  AI-generated at seed time.

### Key Entities *(include if feature involves data)*

- **User**: account with email, password hash, role (STUDENT|DONOR|SPONSOR|ADMIN), display name.
- **School**: target institution; name, country, city, website, logo, payout-verified flag, mock
  payout account reference.
- **StudentProfile**: 1:1 with a STUDENT user; country, photo, story, recommendation, MBA program,
  target school.
- **Campaign**: a student's tuition fundraiser; title, story, goal amount, currency, raised amount,
  status, deadline; links student + school; has one AdmissionVerification.
- **AdmissionVerification**: status, verifier, timestamp, note; gates publishing.
- **Donation**: a private or corporate contribution; amount, tip, currency, method, type, status,
  reference, message, anonymity; links campaign + (donor user | sponsor profile).
- **CorporateProfile**: a SPONSOR's company; company name, contact, logo, sector.
- **Payout**: disbursement to a School; amount, method, reference, status, proof-of-use note; links
  campaign + school.
- **CampaignUpdate**: timeline entry; title, body, type (manual|system), author, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can complete a card donation to a verified campaign in under 60
  seconds from opening the campaign page (mocked payment).
- **SC-002**: 100% of publicly visible campaigns have a VERIFIED admission; no unverified campaign is
  ever reachable in the public gallery.
- **SC-003**: In every donation and payout flow, funds are recorded as moving to a School and **never**
  to a StudentProfile (verifiable by inspecting all payout records and the absence of any student
  payout path).
- **SC-004**: Campaign progress (raised/goal/percent) reflects a successful donation within 1 second
  on the campaign page.
- **SC-005**: The full demo loop — student submits → admin verifies → donor + sponsor fund → campaign
  funded → admin disburses to school — can be run end-to-end locally with seeded data in one sitting.
- **SC-006**: The platform ships with at least 10 synthetic verified student campaigns across
  multiple countries and schools, each with an AI-generated profile image.
- **SC-007**: Swapping `MockPaymentProvider` for a real provider requires implementing one interface
  and changes no domain/business code (verified by the abstraction boundary).

## Assumptions

- Payments are **mocked** for the prototype; no real charges, KYC, or bank rails. A clean
  `PaymentProvider` boundary keeps Stripe/SEPA integration a later, isolated step.
- Single display currency **EUR** for the prototype (amounts stored in minor units / integer cents).
- The legal/nonprofit construct (gGmbH/Stiftung), tax receipts, and real cross-border disbursement
  are out of scope for the prototype but are modeled symbolically (receipt records, payout records).
- Admission verification is **manual** by an admin against a referenced admission document; the
  prototype stores a reference/flag rather than processing real documents.
- Seed data and profile images are fully synthetic; the OPENAI_KEY (from `06_IT/.env`) is used only
  at seed time to generate images.
- Target users have a modern browser; mobile-responsive web is in scope, native apps are not.
- App UI language is English; maintainer-facing docs are German.
