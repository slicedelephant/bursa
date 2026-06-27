-- CreateEnum
CREATE TYPE "TributeType" AS ENUM ('HONOR', 'MEMORY');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('THANK_YOU', 'MILESTONE', 'IMPACT_UPDATE', 'GOAL_REACHED', 'RECURRING_CHARGE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "recurringPledgeId" TEXT,
ADD COLUMN     "tributeName" TEXT,
ADD COLUMN     "tributeType" "TributeType";

-- CreateTable
CREATE TABLE "RecurringPledge" (
    "id" TEXT NOT NULL,
    "donorUserId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "chargesCount" INTEGER NOT NULL DEFAULT 0,
    "totalChargedCents" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastChargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateSubscription" (
    "id" TEXT NOT NULL,
    "donorUserId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpdateSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "campaignId" TEXT,
    "emailLogged" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringPledge_donorUserId_idx" ON "RecurringPledge"("donorUserId");

-- CreateIndex
CREATE INDEX "RecurringPledge_campaignId_idx" ON "RecurringPledge"("campaignId");

-- CreateIndex
CREATE INDEX "RecurringPledge_status_nextRunAt_idx" ON "RecurringPledge"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "UpdateSubscription_campaignId_idx" ON "UpdateSubscription"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "UpdateSubscription_donorUserId_campaignId_key" ON "UpdateSubscription"("donorUserId", "campaignId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_donorUserId_idx" ON "Donation"("donorUserId");

-- CreateIndex
CREATE INDEX "Donation_recurringPledgeId_idx" ON "Donation"("recurringPledgeId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_recurringPledgeId_fkey" FOREIGN KEY ("recurringPledgeId") REFERENCES "RecurringPledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPledge" ADD CONSTRAINT "RecurringPledge_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPledge" ADD CONSTRAINT "RecurringPledge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateSubscription" ADD CONSTRAINT "UpdateSubscription_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateSubscription" ADD CONSTRAINT "UpdateSubscription_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
