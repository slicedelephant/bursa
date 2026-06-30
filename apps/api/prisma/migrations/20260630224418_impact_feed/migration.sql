-- CreateEnum
CREATE TYPE "StudentMessageStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'TELEGRAM', 'MESSENGER');

-- CreateTable
CREATE TABLE "StudentMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "videoUrl" TEXT,
    "voiceUrl" TEXT,
    "status" "StudentMessageStatus" NOT NULL DEFAULT 'PENDING',
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationChannelPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "FeedChannel" NOT NULL,
    "optIn" BOOLEAN NOT NULL DEFAULT false,
    "handle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationChannelPref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentMessage_campaignId_status_idx" ON "StudentMessage"("campaignId", "status");

-- CreateIndex
CREATE INDEX "NotificationChannelPref_userId_idx" ON "NotificationChannelPref"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannelPref_userId_channel_key" ON "NotificationChannelPref"("userId", "channel");

-- CreateIndex
CREATE INDEX "FeedRead_userId_readAt_idx" ON "FeedRead"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedRead_userId_feedItemKey_key" ON "FeedRead"("userId", "feedItemKey");

-- AddForeignKey
ALTER TABLE "StudentMessage" ADD CONSTRAINT "StudentMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationChannelPref" ADD CONSTRAINT "NotificationChannelPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedRead" ADD CONSTRAINT "FeedRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
