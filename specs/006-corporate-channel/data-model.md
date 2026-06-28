# Data Model — 006 Corporate Channel

Money is integer cents (EUR). New models/enums extend the existing schema; no
existing column is dropped. Migration: `corporate_channel`.

## New Enums

```prisma
enum SponsorshipTier {
  SEMESTER
  YEAR
  FULL
  CUSTOM
}

enum RecognitionKind {
  ANONYMOUS   // no public recognition (pure donation)
  LOGO        // logo recognition (=> sponsoring => VAT invoice)
  NAMED       // named scholarship (logo optional)
}

enum InvoiceDocType {
  DONATION    // Zuwendungsbestätigung, no VAT
  SPONSORING  // Sponsoring invoice with 19% VAT
}

enum InvoiceStatus {
  ISSUED      // card paid -> issued+paid path collapses to PAID
  PENDING     // SEPA committed, awaiting settlement
  PAID        // settled / card captured
}
```

## New Models

```prisma
model CorporateSponsorship {
  id                 String          @id @default(cuid())
  donationId         String          @unique
  corporateProfileId String
  campaignId         String
  tier               SponsorshipTier
  fullTuition        Boolean         @default(false)
  scholarshipName    String?
  logoRecognition    Boolean         @default(false)
  recognitionKind    RecognitionKind @default(ANONYMOUS)
  impactReportOptIn  Boolean         @default(false)
  poNumber           String?
  vatId              String?
  createdAt          DateTime        @default(now())

  donation         Donation         @relation(fields: [donationId], references: [id], onDelete: Cascade)
  corporateProfile CorporateProfile @relation(fields: [corporateProfileId], references: [id], onDelete: Cascade)
  campaign         Campaign         @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  invoice          Invoice?

  @@index([corporateProfileId])
  @@index([campaignId])
}

model Invoice {
  id            String         @id @default(cuid())
  sponsorshipId String         @unique
  invoiceNo     String         @unique
  documentType  InvoiceDocType
  netCents      Int
  vatCents      Int
  grossCents    Int
  currency      String         @default("EUR")
  vatId         String?
  poNumber      String?
  status        InvoiceStatus  @default(ISSUED)
  settledAt     DateTime?
  issuedAt      DateTime       @default(now())

  sponsorship CorporateSponsorship @relation(fields: [sponsorshipId], references: [id], onDelete: Cascade)
}
```

## Relations added to existing models

- `Donation`         += `sponsorship CorporateSponsorship?`
- `CorporateProfile` += `sponsorships CorporateSponsorship[]`
- `Campaign`         += `sponsorships CorporateSponsorship[]`

## Invariants

- One `Invoice` per `CorporateSponsorship` (1:1).
- `documentType = SPONSORING` ⇔ `logoRecognition = true` (VAT applies);
  otherwise `DONATION` (`vatCents = 0`, `grossCents = netCents`).
- `netCents = donation.amountCents` (the goal-bound tuition contribution).
- CARD ⇒ invoice `PAID`; SEPA ⇒ invoice `PENDING` until `settle` ⇒ `PAID`.
- `fullTuition = true` ⇒ the sponsorship amount covered the remaining gap; the
  campaign reaches its goal and is funded immediately; outstanding donor pledges
  are captured via the existing `DonationsService.captureCampaign`.
