-- CreateEnum
CREATE TYPE "HrisProvider" AS ENUM ('MOCK', 'ADP', 'WORKDAY', 'PAYCHEX', 'PAYLOCITY', 'UKG', 'BAMBOOHR');

-- CreateEnum
CREATE TYPE "HrisConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'SYNCED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "PayrollCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "HrisConnection" (
    "id" TEXT NOT NULL,
    "corporateProfileId" TEXT NOT NULL,
    "provider" "HrisProvider" NOT NULL,
    "scopes" TEXT[],
    "status" "HrisConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrisConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollGivingProgram" (
    "id" TEXT NOT NULL,
    "corporateProfileId" TEXT NOT NULL,
    "hrisConnectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollGivingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollMatchRule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "matchRatio" INTEGER NOT NULL,
    "perEmployeeCapCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollMatchRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayrollProfile" (
    "id" TEXT NOT NULL,
    "hrisConnectionId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeExternalId" TEXT NOT NULL,
    "salaryBandCents" INTEGER NOT NULL,
    "payrollCycle" "PayrollCycle" NOT NULL DEFAULT 'MONTHLY',
    "preTaxEligible" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "matchYear" INTEGER,
    "matchUsedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayrollProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollContribution" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "contributionCents" INTEGER NOT NULL,
    "matchCents" INTEGER NOT NULL,
    "preTax" BOOLEAN NOT NULL DEFAULT false,
    "matchDonationId" TEXT,
    "ledgerSequence" INTEGER,
    "deductionRef" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrisConnection_corporateProfileId_idx" ON "HrisConnection"("corporateProfileId");

-- CreateIndex
CREATE INDEX "HrisConnection_status_idx" ON "HrisConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollGivingProgram_hrisConnectionId_key" ON "PayrollGivingProgram"("hrisConnectionId");

-- CreateIndex
CREATE INDEX "PayrollGivingProgram_corporateProfileId_idx" ON "PayrollGivingProgram"("corporateProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollMatchRule_programId_key" ON "PayrollMatchRule"("programId");

-- CreateIndex
CREATE INDEX "EmployeePayrollProfile_userId_idx" ON "EmployeePayrollProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollProfile_hrisConnectionId_employeeExternalId_key" ON "EmployeePayrollProfile"("hrisConnectionId", "employeeExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollContribution_matchDonationId_key" ON "PayrollContribution"("matchDonationId");

-- CreateIndex
CREATE INDEX "PayrollContribution_programId_idx" ON "PayrollContribution"("programId");

-- CreateIndex
CREATE INDEX "PayrollContribution_employeeProfileId_idx" ON "PayrollContribution"("employeeProfileId");

-- CreateIndex
CREATE INDEX "PayrollContribution_campaignId_idx" ON "PayrollContribution"("campaignId");

-- AddForeignKey
ALTER TABLE "HrisConnection" ADD CONSTRAINT "HrisConnection_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "CorporateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollGivingProgram" ADD CONSTRAINT "PayrollGivingProgram_corporateProfileId_fkey" FOREIGN KEY ("corporateProfileId") REFERENCES "CorporateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollGivingProgram" ADD CONSTRAINT "PayrollGivingProgram_hrisConnectionId_fkey" FOREIGN KEY ("hrisConnectionId") REFERENCES "HrisConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMatchRule" ADD CONSTRAINT "PayrollMatchRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PayrollGivingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollProfile" ADD CONSTRAINT "EmployeePayrollProfile_hrisConnectionId_fkey" FOREIGN KEY ("hrisConnectionId") REFERENCES "HrisConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollProfile" ADD CONSTRAINT "EmployeePayrollProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PayrollGivingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeePayrollProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_matchDonationId_fkey" FOREIGN KEY ("matchDonationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

