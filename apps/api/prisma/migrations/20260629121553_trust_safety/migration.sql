-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('OPEN', 'EVIDENCE_SUBMITTED', 'REFUND_OFFERED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('SCAM', 'DUPLICATE', 'INAPPROPRIATE', 'MISLEADING', 'OTHER');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "freezeReason" TEXT,
ADD COLUMN     "frozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "frozenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freezeReason" TEXT,
ADD COLUMN     "frozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "reasons" JSONB NOT NULL,
    "autoFlagged" BOOLEAN NOT NULL DEFAULT false,
    "decisionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSignal" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "reasons" JSONB NOT NULL,
    "donationId" TEXT,
    "donorUserId" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargeback" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "donationId" TEXT,
    "campaignId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "reason" TEXT NOT NULL,
    "status" "ChargebackStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceNote" TEXT,
    "refundOffered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFlag" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "visitorId" TEXT,
    "reason" "FlagReason" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModerationCase_campaignId_key" ON "ModerationCase"("campaignId");

-- CreateIndex
CREATE INDEX "ModerationCase_status_riskScore_idx" ON "ModerationCase"("status", "riskScore");

-- CreateIndex
CREATE INDEX "FraudSignal_donorUserId_createdAt_idx" ON "FraudSignal"("donorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_kind_createdAt_idx" ON "FraudSignal"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_campaignId_idx" ON "FraudSignal"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Chargeback_providerEventId_key" ON "Chargeback"("providerEventId");

-- CreateIndex
CREATE INDEX "Chargeback_status_createdAt_idx" ON "Chargeback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Chargeback_campaignId_idx" ON "Chargeback"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignFlag_campaignId_createdAt_idx" ON "CampaignFlag"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignFlag_status_idx" ON "CampaignFlag"("status");

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargeback" ADD CONSTRAINT "Chargeback_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFlag" ADD CONSTRAINT "CampaignFlag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFlag" ADD CONSTRAINT "CampaignFlag_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
