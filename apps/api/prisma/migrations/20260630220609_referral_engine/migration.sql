-- CreateEnum
CREATE TYPE "ReferralKind" AS ENUM ('REFERRAL', 'ADVOCATE');

-- CreateEnum
CREATE TYPE "AdvocateInviteStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "donorUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "optInLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvocateInvite" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "codeHash" TEXT NOT NULL,
    "status" "AdvocateInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvocateInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "kind" "ReferralKind" NOT NULL,
    "referralLinkId" TEXT,
    "advocateInviteId" TEXT,
    "donationId" TEXT NOT NULL,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_donorUserId_key" ON "ReferralLink"("donorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_codeHash_key" ON "ReferralLink"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdvocateInvite_codeHash_key" ON "AdvocateInvite"("codeHash");

-- CreateIndex
CREATE INDEX "AdvocateInvite_campaignId_idx" ON "AdvocateInvite"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_donationId_key" ON "ReferralAttribution"("donationId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_referralLinkId_idx" ON "ReferralAttribution"("referralLinkId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_advocateInviteId_idx" ON "ReferralAttribution"("advocateInviteId");

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvocateInvite" ADD CONSTRAINT "AdvocateInvite_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_advocateInviteId_fkey" FOREIGN KEY ("advocateInviteId") REFERENCES "AdvocateInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
