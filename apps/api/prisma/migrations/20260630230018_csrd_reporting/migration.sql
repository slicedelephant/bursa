-- CreateEnum
CREATE TYPE "EsgCategory" AS ENUM ('QUALITY_EDUCATION', 'GENDER_EQUALITY', 'GEOGRAPHIC_REACH', 'POVERTY_REDUCTION', 'ECONOMIC_GROWTH');

-- CreateEnum
CREATE TYPE "ReportStandard" AS ENUM ('GRI_2024', 'CSRD_ESRS', 'SASB', 'UN_SDG');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "firstGen" BOOLEAN,
ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "EsgTag" (
    "id" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "category" "EsgCategory" NOT NULL,
    "note" TEXT,
    "taggedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsgTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsgReport" (
    "id" TEXT NOT NULL,
    "standard" "ReportStandard" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsgReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditorAccessGrant" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditorAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EsgTag_ledgerEntryId_key" ON "EsgTag"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "EsgTag_category_idx" ON "EsgTag"("category");

-- CreateIndex
CREATE INDEX "EsgReport_standard_createdAt_idx" ON "EsgReport"("standard", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditorAccessGrant_tokenHash_key" ON "AuditorAccessGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditorAccessGrant_expiresAt_idx" ON "AuditorAccessGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "EsgTag" ADD CONSTRAINT "EsgTag_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgTag" ADD CONSTRAINT "EsgTag_taggedByUserId_fkey" FOREIGN KEY ("taggedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgReport" ADD CONSTRAINT "EsgReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorAccessGrant" ADD CONSTRAINT "AuditorAccessGrant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

