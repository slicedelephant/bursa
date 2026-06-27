# Plan — 006 Corporate Channel

## Ansatz

Viele kleine, pure Kerne (Coverage-Rückgrat) + ein schlanker `corporate`-Nest-
Service (gemocktes Prisma) + Angular-Hüllen. Der Corporate-Pfad ist ein eigenes
Modul (analog `recurring`), das die `PaymentProvider`-Naht (neu
`chargeImmediately`), den getesteten `DonationsService.captureCampaign` und den
`NotificationsService` als Kollaboratoren nutzt — der gegatete
`donations.service.ts` wird NICHT verändert.

## Backend (NestJS + Prisma)

1. **Prisma**: Enums `SponsorshipTier`, `RecognitionKind`, `InvoiceDocType`,
   `InvoiceStatus`; Models `CorporateSponsorship`, `Invoice`; Reverse-Relationen
   an `Donation`/`CorporateProfile`/`Campaign`. Migration `corporate_channel`.
2. `payments/payment-provider.interface.ts` += `chargeImmediately(input: ChargeInput): Promise<PaymentResult>`.
3. `payments/mock-payment.provider.ts` += `chargeImmediately` (delegiert an die
   bestehende `charge`-Logik, Fail-Sentinel `.13`).
4. `payments/stripe-payment.provider.ts` += `chargeImmediately` (delegiert an
   das bestehende private `chargeNow`, automatic-capture PaymentIntent).
5. `corporate/gift-tiers.util.ts` (pur): `remainingGapCents`, `giftTiers(goal,
   raised)`, `isFullTuition(amount, goal, raised)`.
6. `corporate/invoice.util.ts` (pur): `documentTypeFor(logoRecognition)`,
   `computeInvoiceAmounts(netCents, docType)` (19% USt nur bei SPONSORING),
   `buildInvoiceNo(year, seedId)`.
7. `corporate/esg.util.ts` (pur): `computeEsgMetrics(rows)` (Studierende/Länder/
   Schulen/Summe/Voll-/Named-Stipendien), `toCsv(rows)`.
8. `corporate/pdf.util.ts` (pur): `buildSimplePdf(title, lines)` → minimal
   gültiges einseitiges PDF (korrekte xref-Offsets aus laufender Byte-Länge).
9. `campaigns/recognition.util.ts` (pur): `toRecognition(sponsorships)` →
   nicht-anonyme `{ companyName, logoUrl?, scholarshipName? }[]`.
10. `corporate/dto/sponsor.dto.ts`: `amountCents` (Min) **oder** `tier`;
    `method` (CARD|SEPA), `scholarshipName?`, `logoRecognition?`,
    `impactReportOptIn?`, `poNumber?`, `vatId?`, `message?` — Boundary-validiert.
11. `corporate/corporate.service.ts`:
    - `sponsor(campaignId, userId, dto)`: donatable-Campaign + Corporate-Profile
      laden; Tier→Betrag bzw. `amountCents`; `splitContribution`-Kappung;
      `recognitionKind`/`documentType` ableiten; Zahlung (`chargeImmediately`
      für CARD, `createSepaPledge` für SEPA); in tx Donation (CORPORATE,
      SUCCEEDED) + CorporateSponsorship + Invoice anlegen, Kampagne hochzählen
      (+FUNDED). Bei Zielerreichung `donations.captureCampaign(campaignId)`
      aufrufen (offene Pledges mitcapturen). Corporate-Dank + ggf.
      Impact-Report-Abo über `notifications`.
    - `esg(userId)`: Sponsorings des Sponsors → `computeEsgMetrics` + Zeilen.
    - `esgCsv(userId)` / `esgPdf(userId)`: Export-Strings/Buffer.
    - `invoice(userId, sponsorshipId)`: Ownership-Check → Invoice-Doc.
    - `settle(userId, sponsorshipId)`: SEPA-Rechnung PENDING→PAID (+settledAt).
12. `corporate/corporate.controller.ts`: `POST
    campaigns/:campaignId/corporate/sponsor` (SPONSOR); `GET sponsors/me/esg`;
    `GET sponsors/me/esg/export.csv` + `.../export.pdf` (via `@Res()`, umgeht
    Envelope); `GET sponsors/me/sponsorships/:id/invoice`; `POST
    sponsors/me/sponsorships/:id/settle`.
13. `corporate/corporate.module.ts` (imports DonationsModule, NotificationsModule).
14. `donations/donations.module.ts`: `exports: [DonationsService]`.
15. `campaigns/campaign.mapper.ts` + `campaigns.service.detail`: Sponsorings in
    den Detail-Query aufnehmen, `recognition` über `toRecognition` ausgeben.
16. `app.module.ts`: `CorporateModule`.

## Frontend (Angular 20, Signals)

1. `core/models.ts`: `SponsorshipTier`, `RecognitionKind`, `GiftTier`,
   `EsgMetrics`, `EsgRow`, `CorporateInvoice`, `CorporateSponsorshipResult`,
   `CampaignRecognition`; `CampaignDetail` += `recognition`.
2. `core/api.service.ts`: `corporateSponsor`, `esgDashboard`, `esgCsv`/`esgPdf`
   (Blob-Download), `corporateInvoice`, `settleSponsorship`.
3. `features/corporate/gift-tiers.ts` (pur): `tierLabel`, `formatTier`,
   `isFull`.
4. `features/corporate/esg-format.ts` (pur): Metrik-Labels/Reihenfolge.
5. `features/corporate/corporate-sponsor-box.component.ts`: dominanter
   Full-Tuition-CTA (exakter Restbetrag) + Tier-Auswahl + Recognition-Opt-in
   (Named Scholarship, Logo, Impact-Report) + USt-ID/PO + Karte/SEPA; zeigt nach
   Erfolg den Beleg.
6. `features/corporate/esg-dashboard.component.ts`: Metrik-Kacheln + CSV-/PDF-
   Export-Buttons.
7. `features/corporate/recognition-banner.component.ts`: Named Scholarship +
   Firmenlogos auf der Kampagnenseite.
8. `features/sponsor/sponsor.page.ts`: ESG-Dashboard einbinden.
9. `features/campaign/campaign.page.ts`: Recognition-Banner + (für SPONSOR) die
   `corporate-sponsor-box` statt der einfachen `sepa-pledge`.

## Tests (TDD, >=80% neuer Code — Per-Path-Gates)

- **Backend gated:** `gift-tiers.util`, `invoice.util`, `esg.util`, `pdf.util`,
  `campaigns/recognition.util`, `corporate.service`,
  `payments/mock-payment.provider` (bleibt gated; `chargeImmediately`-Branch).
- **Frontend gated:** `corporate/gift-tiers`, `corporate/esg-format`,
  `corporate/corporate-sponsor-box.component`,
  `corporate/esg-dashboard.component`, `corporate/recognition-banner.component`.

## Constitution-Check

- **Immutabilität**: pure Utils geben neue Objekte zurück; Service mutiert keine
  Inputs. Getestet.
- **Kleine Module**: jede neue Datei < ~300 Zeilen, ein Zweck.
- **PaymentProvider-Abstraktion**: Corporate nutzt nur `chargeImmediately` /
  `createSepaPledge` — kein direkter Stripe-Zugriff im Domänencode. Tauschbar.
- **Boundary-Validation + Envelope**: Sponsor-DTO am Boundary; Exporte bewusst
  via `@Res()` ohne Envelope (Binär-/Text-Download), dokumentiert.
- **Trust-by-Design**: Geld geht weiter modelliert direkt an die Schule; Netto =
  Tuition-Beitrag bleibt 100% schulgebunden, USt ist reiner Rechnungsaufschlag.
  Full-Tuition triggert die getestete `captureCampaign`-Auszahlung.

## Complexity Tracking

Bewusste Abweichungen (mit einfacherer, verworfener Alternative):
- **Eigenes `corporate`-Modul + `chargeImmediately`** statt Wiederverwendung von
  `donateSepa`/AoN — vermeidet Kopplung an den geldkritischen E2-Capture-Pfad.
  Einfachere Alternative (Corporate in `donations.service`) verworfen, weil sie
  die gegatete, delikate Datei aufbläht.
- **Eigener Mini-PDF-Writer** statt npm-Lib — Constitution verbietet neue
  externe Infra; ein kleiner, getesteter, pure Writer genügt für ein
  einseitiges Report-PDF.
- **SEPA-Settlement nur auf der Rechnung** (PENDING→PAID), Donation sofort
  SUCCEEDED — hält Goal-/Capture-Mathematik (E2) unangetastet. Einfachere
  Alternative (SEPA als PLEDGE) verworfen wegen Vermischung mit der
  AoN-Capture-Semantik.
