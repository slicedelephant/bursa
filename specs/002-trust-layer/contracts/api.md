# API Contracts: Trust-Layer (E1) — Phase 1

**No new endpoints.** This feature extends the existing public detail endpoint only. Envelope,
base URL and auth are unchanged (`{ "success": true, "data": ... }`, `http://localhost:3000/api`).
Money fields are integer **cents** (EUR).

## Extended: GET /campaigns/:id

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/campaigns/:id` | public | Existing detail payload **plus** a read-only `trust` projection. Visibility invariant unchanged (non-public statuses → 404). |

### Added response field: `data.trust`

```jsonc
{
  "success": true,
  "data": {
    // ... existing toDetail fields (id, title, school, donorCount, recentDonations, updates, …)
    "trust": {
      "verifications": {
        "admission": "VERIFIED",   // 'VERIFIED' | 'PENDING' | 'REJECTED'
        "schoolConfirmed": true,    // School.payoutVerified
        "identityChecked": true     // symbolic: derived from admission === 'VERIFIED'
      },
      "payoutProof": {              // present ONLY for a disbursed campaign with a sent payout
        "schoolName": "INSEAD",
        "amountCents": 4500000,
        "reference": "PAYOUT-7F3A2C",
        "sentAt": "2026-06-20T10:15:00.000Z"
      }
    }
  }
}
```

### Behaviour

- `trust.verifications` is **always** present on a public detail response (every visible campaign is
  `VERIFIED`). `schoolConfirmed` mirrors `School.payoutVerified`; `identityChecked` is `true` iff
  the admission is `VERIFIED` (symbolic in the prototype).
- `trust.payoutProof` is present **iff** the campaign is `DISBURSED` and a dispatched `Payout`
  exists (`status ∈ {SENT, CONFIRMED}`, `sentAt` set). For `LIVE`/`FUNDED` (no payout) the key is
  **omitted** and the client renders the "funds are disbursed directly to the school" promise.

### Not exposed (FR-006)

No verifier identity (`verifiedById`/`verifiedAt`/`note`), no `payoutAccountRef`, no `Payout.id` /
`proofNote` / internal status, no donor PII beyond the existing anonymity rule. The extension is
strictly additive — no existing field changes, no new query parameters.

### Error codes

Unchanged. A missing/non-public campaign still returns `NOT_FOUND` (404).
