-- CreateEnum
CREATE TYPE "MatchClaimStatus" AS ENUM ('DETECTED', 'OFFERED', 'CLAIMED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmployerIntegrationLevel" AS ENUM ('AUTO_SUBMIT', 'PORTAL', 'MANUAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employerDomain" TEXT,
ADD COLUMN     "employerName" TEXT,
ADD COLUMN     "matchUsedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matchYear" INTEGER;

-- CreateTable
CREATE TABLE "EmployerMatchProgram" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "matchRatio" INTEGER NOT NULL,
    "annualCapCents" INTEGER NOT NULL,
    "minDonationCents" INTEGER NOT NULL DEFAULT 0,
    "integrationLevel" "EmployerIntegrationLevel" NOT NULL DEFAULT 'PORTAL',
    "applyUrlTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerMatchProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchClaim" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "matchDonationId" TEXT,
    "programId" TEXT NOT NULL,
    "donorUserId" TEXT,
    "campaignId" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "matchCents" INTEGER NOT NULL,
    "status" "MatchClaimStatus" NOT NULL DEFAULT 'CLAIMED',
    "applyUrl" TEXT,
    "pdfRef" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployerMatchProgram_domain_key" ON "EmployerMatchProgram"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "MatchClaim_donationId_key" ON "MatchClaim"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchClaim_matchDonationId_key" ON "MatchClaim"("matchDonationId");

-- CreateIndex
CREATE INDEX "MatchClaim_donorUserId_createdAt_idx" ON "MatchClaim"("donorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchClaim_campaignId_idx" ON "MatchClaim"("campaignId");

-- CreateIndex
CREATE INDEX "MatchClaim_status_idx" ON "MatchClaim"("status");

-- AddForeignKey
ALTER TABLE "MatchClaim" ADD CONSTRAINT "MatchClaim_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EmployerMatchProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchClaim" ADD CONSTRAINT "MatchClaim_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchClaim" ADD CONSTRAINT "MatchClaim_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchClaim" ADD CONSTRAINT "MatchClaim_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchClaim" ADD CONSTRAINT "MatchClaim_matchDonationId_fkey" FOREIGN KEY ("matchDonationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
