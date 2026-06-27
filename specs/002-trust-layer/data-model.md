# Data Model: Trust-Layer (E1)

**No new entities and no migration.** This feature adds a single **read-only projection**,
`TrustSummary`, derived from existing rows already loaded by `GET /campaigns/:id`. Sources:
`AdmissionVerification.status`, `School.payoutVerified` / `School.name`, and the existing
`Payout` (`amountCents`, `reference`, `status`, `sentAt`).

## TrustSummary (projection)

```ts
interface TrustSummary {
  verifications: {
    admission: 'VERIFIED' | 'PENDING' | 'REJECTED'; // AdmissionVerification.status
    schoolConfirmed: boolean;                        // School.payoutVerified
    identityChecked: boolean;                        // symbolic: admission === 'VERIFIED'
  };
  payoutProof?: {
    schoolName: string;   // School.name
    amountCents: number;  // Payout.amountCents (EUR cents)
    reference: string;    // Payout.reference
    sentAt: string;       // Payout.sentAt (ISO) — present only when payout dispatched
  };
}
```

It is attached to the campaign detail response as `trust`.

### Field derivation

| Field | Source | Rule |
|---|---|---|
| `verifications.admission` | `AdmissionVerification.status` | passthrough enum; publicly only `VERIFIED` is reachable (visibility invariant). |
| `verifications.schoolConfirmed` | `School.payoutVerified` | boolean passthrough. |
| `verifications.identityChecked` | `AdmissionVerification.status` | `true` iff `VERIFIED` (symbolic in the prototype — no real ID check). |
| `payoutProof` | `Payout` | **omitted** unless campaign is `DISBURSED` **and** a `Payout` exists with `status ∈ {SENT, CONFIRMED}` **and** `sentAt` is set. |

### Privacy boundary (FR-006)

Never mapped into the projection: `AdmissionVerification.verifiedById` / `verifiedAt` / `note`,
`School.payoutAccountRef`, `Payout.id` / `proofNote` / `status`, donor PII beyond the existing
anonymity rule in `toPublicDonation`. The projection is purely additive and emits no internal IDs.

## Invariants

- **TS-1**: `trust` is present on every public detail response (every visible campaign is `VERIFIED`,
  so `verifications` is always fully populated — SC-001).
- **TS-2**: `payoutProof` is present **iff** there is a dispatched `Payout` for a `DISBURSED`
  campaign; otherwise it is absent and the UI shows the direct-to-school promise (SC-002, edge case
  "DISBURSED without payout record" falls back cleanly).
- **TS-3**: The projection is a pure function of an already-loaded campaign — no extra query beyond
  adding the existing `payout` relation to the detail `include`; returns a new object (immutability).

## Reuse map (existing entities, unchanged)

| Entity | Fields read | Not exposed |
|---|---|---|
| `AdmissionVerification` | `status` | `verifiedById`, `verifiedAt`, `note`, `admissionRef` |
| `School` | `name`, `payoutVerified` | `payoutAccountRef` |
| `Payout` | `amountCents`, `reference`, `sentAt` | `id`, `status` (gate only), `proofNote`, `method` |
