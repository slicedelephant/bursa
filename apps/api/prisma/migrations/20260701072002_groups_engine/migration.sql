-- CreateEnum
CREATE TYPE "GroupMode" AS ENUM ('COHORT', 'GIVING_CIRCLE');

-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('ACTIVE', 'REVOKED', 'USED');

-- CreateEnum
CREATE TYPE "GroupVoteStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "GroupMessageStatus" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "mode" "GroupMode" NOT NULL,
    "visibility" "GroupVisibility" NOT NULL DEFAULT 'PRIVATE',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "sharedGoalCents" INTEGER NOT NULL DEFAULT 0,
    "stretchThresholdPct" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCampaign" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupContribution" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupVote" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "GroupVoteStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupVoteOption" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "GroupVoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupVoteBallot" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupVoteBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "GroupMessageStatus" NOT NULL DEFAULT 'APPROVED',
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_mode_visibility_idx" ON "Group"("mode", "visibility");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_codeHash_key" ON "GroupInvite"("codeHash");

-- CreateIndex
CREATE INDEX "GroupInvite_groupId_status_idx" ON "GroupInvite"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupCampaign_groupId_idx" ON "GroupCampaign"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCampaign_groupId_campaignId_key" ON "GroupCampaign"("groupId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupContribution_donationId_key" ON "GroupContribution"("donationId");

-- CreateIndex
CREATE INDEX "GroupContribution_groupId_idx" ON "GroupContribution"("groupId");

-- CreateIndex
CREATE INDEX "GroupVote_groupId_status_idx" ON "GroupVote"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupVoteOption_voteId_idx" ON "GroupVoteOption"("voteId");

-- CreateIndex
CREATE INDEX "GroupVoteBallot_optionId_idx" ON "GroupVoteBallot"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupVoteBallot_voteId_userId_key" ON "GroupVoteBallot"("voteId", "userId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_status_idx" ON "GroupMessage"("groupId", "status");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCampaign" ADD CONSTRAINT "GroupCampaign_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCampaign" ADD CONSTRAINT "GroupCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupContribution" ADD CONSTRAINT "GroupContribution_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupContribution" ADD CONSTRAINT "GroupContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupContribution" ADD CONSTRAINT "GroupContribution_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVote" ADD CONSTRAINT "GroupVote_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVoteOption" ADD CONSTRAINT "GroupVoteOption_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "GroupVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVoteOption" ADD CONSTRAINT "GroupVoteOption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVoteBallot" ADD CONSTRAINT "GroupVoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "GroupVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVoteBallot" ADD CONSTRAINT "GroupVoteBallot_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "GroupVoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupVoteBallot" ADD CONSTRAINT "GroupVoteBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
