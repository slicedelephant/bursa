# Tasks — 006 Corporate Channel (TDD-geordnet)

Reihenfolge: Tests zuerst (RED), dann Implementierung (GREEN), dann Refactor.
Per-Path-80%-Gates für neuen Code in `apps/api` (package.json jest) und
`apps/web/jest.config.js`.

## Prisma & Payment-Naht
- [ ] T01 Prisma: Enums + `CorporateSponsorship` + `Invoice` + Relationen;
      Migration `corporate_channel`; `prisma generate`.
- [ ] T02 `PaymentProvider.chargeImmediately` (interface + Mock + Stripe);
      Mock-Spec um `chargeImmediately`-Branch erweitern.

## Pure Kerne (Backend, TDD)
- [ ] T03 `corporate/gift-tiers.util.ts` (+ spec): `remainingGapCents`,
      `giftTiers`, `isFullTuition`.
- [ ] T04 `corporate/invoice.util.ts` (+ spec): `documentTypeFor`,
      `computeInvoiceAmounts` (19% USt nur SPONSORING), `buildInvoiceNo`.
- [ ] T05 `corporate/esg.util.ts` (+ spec): `computeEsgMetrics`, `toCsv`.
- [ ] T06 `corporate/pdf.util.ts` (+ spec): `buildSimplePdf` (minimal valides PDF).
- [ ] T07 `campaigns/recognition.util.ts` (+ spec): `toRecognition`.

## Service & Controller (Backend, TDD)
- [ ] T08 `corporate/dto/sponsor.dto.ts` (Boundary-Validation).
- [ ] T09 `corporate/corporate.service.ts` (+ spec, gemocktes Prisma/Provider/
      Donations/Notifications): `sponsor`, `esg`, `esgCsv`, `esgPdf`, `invoice`,
      `settle`.
- [ ] T10 `corporate/corporate.controller.ts` + `corporate.module.ts`;
      `donations.module` exportiert `DonationsService`; `app.module` += Modul.
- [ ] T11 `campaigns`: Detail-Query lädt Sponsorings, Mapper gibt `recognition`.

## Frontend (TDD)
- [ ] T12 `core/models.ts` + `core/api.service.ts` (Corporate-Endpunkte + Blob-Export).
- [ ] T13 `features/corporate/gift-tiers.ts` (+ spec) — pur.
- [ ] T14 `features/corporate/esg-format.ts` (+ spec) — pur.
- [ ] T15 `features/corporate/corporate-sponsor-box.component.ts` (+ spec).
- [ ] T16 `features/corporate/esg-dashboard.component.ts` (+ spec).
- [ ] T17 `features/corporate/recognition-banner.component.ts` (+ spec).
- [ ] T18 `sponsor.page.ts` (ESG-Dashboard) + `campaign.page.ts`
      (Recognition-Banner + Corporate-Box für SPONSOR).

## Integration / Verify
- [ ] T19 Coverage-Gates eintragen (api package.json + web jest.config.js).
- [ ] T20 Seed um Corporate-Sponsorship + Invoice + Recognition erweitern.
- [ ] T21 Verify: `api test`, `web test:cov`, beide `build` grün; Migration committet.
