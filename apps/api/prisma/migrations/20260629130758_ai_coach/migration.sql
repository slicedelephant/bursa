-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('TITLE', 'STORY', 'SHARE');

-- CreateTable
CREATE TABLE "AiTokenBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "limitTokens" INTEGER NOT NULL DEFAULT 20000,
    "usedTokens" INTEGER NOT NULL DEFAULT 0,
    "generations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTokenBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AiGenerationKind" NOT NULL,
    "channel" TEXT,
    "locale" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokensCharged" INTEGER NOT NULL,
    "variantCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiTokenBudget_userId_key" ON "AiTokenBudget"("userId");

-- CreateIndex
CREATE INDEX "AiTokenBudget_userId_idx" ON "AiTokenBudget"("userId");

-- CreateIndex
CREATE INDEX "AiGeneration_userId_createdAt_idx" ON "AiGeneration"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiTokenBudget" ADD CONSTRAINT "AiTokenBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
