-- CreateEnum
CREATE TYPE "SponsorshipTier" AS ENUM ('SEMESTER', 'YEAR', 'FULL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecognitionKind" AS ENUM ('ANONYMOUS', 'LOGO', 'NAMED');

-- CreateEnum
CREATE TYPE "InvoiceDocType" AS ENUM ('DONATION', 'SPONSORING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PENDING', 'PAID');

-- CreateTable
CREATE TABLE "CorporateSponsorship" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "corporateProfileId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tier" "SponsorshipTier" NOT NULL,
    "fullTuition" BOOLEAN NOT NULL DEFAULT false,
    "scholarshipName" TEXT,
    "logoRecognition" BOOLEAN NOT NULL DEFAULT false,
    "recognitionKind" "RecognitionKind" NOT NULL DEFAULT 'ANONYMOUS',
    "impactReportOptIn" BOOLEAN NOT NULL DEFAULT false,
    "poNumber" TEXT,
    "vatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateSponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "sponsorshipId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "documentType" "InvoiceDocType" NOT NULL,
    "netCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatId" TEXT,
    "poNumber" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "settledAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateSponsorship_donationId_key" ON "CorporateSponsorship"("donationId");

-- CreateIndex
CREATE INDEX "CorporateSponsorship_corporateProfileId_idx" ON "CorporateSponsorship"("corporateProfileId");

-- CreateIndex
CREATE INDEX "CorporateSponsorship_campaignId_idx" ON "CorporateSponsorship"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_sponsorshipId_key" ON "Invoice"("sponsorshipId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- AddForeignKey
ALTER TABLE "CorporateSponsorship" ADD CONSTRAINT "CorporateSponsorship_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateSponsorship" ADD CONSTRAINT "CorporateSponsorship_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "CorporateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateSponsorship" ADD CONSTRAINT "CorporateSponsorship_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_sponsorshipId_fkey" FOREIGN KEY ("sponsorshipId") REFERENCES "CorporateSponsorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
