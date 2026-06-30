-- CreateEnum
CREATE TYPE "VerificationSubject" AS ENUM ('STUDENT', 'SPONSOR');

-- CreateEnum
CREATE TYPE "VerificationCaseStatus" AS ENUM ('STARTED', 'LIVENESS_PASSED', 'DOCUMENT_VERIFIED', 'AML_CLEARED', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewQueueStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmlDecision" AS ENUM ('CLEAR', 'HIT', 'BLOCKED');

-- CreateTable
CREATE TABLE "VerificationCase" (
    "id" TEXT NOT NULL,
    "subjectType" "VerificationSubject" NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "admissionRecordId" TEXT,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'STARTED',
    "reviewQueueStatus" "ReviewQueueStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "decisionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivenessResult" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivenessResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVerification" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "extractedName" TEXT NOT NULL,
    "extractedSchool" TEXT,
    "extractedDegree" TEXT,
    "nameMatchScore" INTEGER NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "registrarConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmlScreening" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "decision" "AmlDecision" NOT NULL,
    "reasons" JSONB NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmlScreening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationCase_reviewQueueStatus_riskScore_idx" ON "VerificationCase"("reviewQueueStatus", "riskScore");

-- CreateIndex
CREATE INDEX "VerificationCase_subjectUserId_idx" ON "VerificationCase"("subjectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LivenessResult_caseId_key" ON "LivenessResult"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVerification_caseId_key" ON "DocumentVerification"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "AmlScreening_caseId_key" ON "AmlScreening"("caseId");

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_admissionRecordId_fkey" FOREIGN KEY ("admissionRecordId") REFERENCES "AdmissionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivenessResult" ADD CONSTRAINT "LivenessResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVerification" ADD CONSTRAINT "DocumentVerification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmlScreening" ADD CONSTRAINT "AmlScreening_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerificationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
