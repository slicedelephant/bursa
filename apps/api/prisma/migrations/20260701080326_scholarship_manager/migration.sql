-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'SELECT', 'BOOLEAN', 'EMAIL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'AWARDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScholarStatus" AS ENUM ('AWARDED', 'ENROLLED', 'GRADUATED', 'WORKING', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AwardTrancheStatus" AS ENUM ('NONE', 'HELD', 'RELEASED');

-- CreateTable
CREATE TABLE "ScholarshipProgram" (
    "id" TEXT NOT NULL,
    "corporateProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#4d977c',
    "brandSecondary" TEXT NOT NULL DEFAULT '#6ca5c3',
    "tagline" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramCycle" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "budgetCents" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL DEFAULT 0,
    "awardCents" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationForm" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rubricWeight" INTEGER NOT NULL DEFAULT 0,
    "showIfFieldId" TEXT,
    "showIfValue" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "consensusScore" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAnswer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramReviewer" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "reviewerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewScore" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipAward" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payoutRef" TEXT,
    "ledgerRefId" TEXT,
    "trancheCents" INTEGER NOT NULL DEFAULT 0,
    "gpaThreshold" DOUBLE PRECISION,
    "trancheStatus" "AwardTrancheStatus" NOT NULL DEFAULT 'NONE',
    "tranchePayoutRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarRelationship" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "scholarUserId" TEXT,
    "fullName" TEXT NOT NULL,
    "country" TEXT,
    "gpa" DOUBLE PRECISION,
    "status" "ScholarStatus" NOT NULL DEFAULT 'AWARDED',
    "alumniNetwork" BOOLEAN NOT NULL DEFAULT false,
    "verificationCaseId" TEXT,
    "enrolledAt" TIMESTAMP(3),
    "graduatedAt" TIMESTAMP(3),
    "employedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipProgram_slug_key" ON "ScholarshipProgram"("slug");

-- CreateIndex
CREATE INDEX "ScholarshipProgram_corporateProfileId_idx" ON "ScholarshipProgram"("corporateProfileId");

-- CreateIndex
CREATE INDEX "ProgramCycle_programId_idx" ON "ProgramCycle"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramCycle_programId_year_key" ON "ProgramCycle"("programId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationForm_programId_key" ON "ApplicationForm"("programId");

-- CreateIndex
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_fieldKey_key" ON "FormField"("formId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "Application_tokenHash_key" ON "Application"("tokenHash");

-- CreateIndex
CREATE INDEX "Application_programId_status_idx" ON "Application"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnswer_applicationId_fieldKey_key" ON "ApplicationAnswer"("applicationId", "fieldKey");

-- CreateIndex
CREATE INDEX "ProgramReviewer_programId_idx" ON "ProgramReviewer"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramReviewer_programId_reviewerEmail_key" ON "ProgramReviewer"("programId", "reviewerEmail");

-- CreateIndex
CREATE INDEX "ReviewScore_applicationId_idx" ON "ReviewScore"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewScore_applicationId_reviewerId_fieldKey_key" ON "ReviewScore"("applicationId", "reviewerId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipAward_applicationId_key" ON "ScholarshipAward"("applicationId");

-- CreateIndex
CREATE INDEX "ScholarshipAward_programId_idx" ON "ScholarshipAward"("programId");

-- CreateIndex
CREATE INDEX "ScholarshipAward_schoolId_idx" ON "ScholarshipAward"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarRelationship_awardId_key" ON "ScholarRelationship"("awardId");

-- CreateIndex
CREATE INDEX "ScholarRelationship_programId_status_idx" ON "ScholarRelationship"("programId", "status");

-- AddForeignKey
ALTER TABLE "ScholarshipProgram" ADD CONSTRAINT "ScholarshipProgram_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "CorporateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCycle" ADD CONSTRAINT "ProgramCycle_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationForm" ADD CONSTRAINT "ApplicationForm_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReviewer" ADD CONSTRAINT "ProgramReviewer_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewScore" ADD CONSTRAINT "ReviewScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewScore" ADD CONSTRAINT "ReviewScore_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "ProgramReviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipAward" ADD CONSTRAINT "ScholarshipAward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipAward" ADD CONSTRAINT "ScholarshipAward_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipAward" ADD CONSTRAINT "ScholarshipAward_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarRelationship" ADD CONSTRAINT "ScholarRelationship_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ScholarshipProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarRelationship" ADD CONSTRAINT "ScholarRelationship_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarRelationship" ADD CONSTRAINT "ScholarRelationship_scholarUserId_fkey" FOREIGN KEY ("scholarUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
