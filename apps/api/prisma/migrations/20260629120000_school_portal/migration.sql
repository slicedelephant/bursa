-- CreateEnum
CREATE TYPE "SchoolOnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ACTIVE');

-- AlterTable (E8: donor-geography breakdown on the school dashboard)
ALTER TABLE "Donation" ADD COLUMN "donorCountry" TEXT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SCHOOL_ADMIN';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "agreementRef" TEXT,
ADD COLUMN     "agreementSignedAt" TIMESTAMP(3),
ADD COLUMN     "agreementSignerName" TEXT,
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "onboardingStatus" "SchoolOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "taxId" TEXT;

-- CreateTable
CREATE TABLE "SchoolAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "admissionRef" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolOnboardingToken" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolOnboardingToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolWebhookEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOGGED',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAdmin_userId_key" ON "SchoolAdmin"("userId");

-- CreateIndex
CREATE INDEX "SchoolAdmin_schoolId_idx" ON "SchoolAdmin"("schoolId");

-- CreateIndex
CREATE INDEX "AdmissionRecord_schoolId_status_idx" ON "AdmissionRecord"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRecord_schoolId_admissionRef_key" ON "AdmissionRecord"("schoolId", "admissionRef");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolOnboardingToken_tokenHash_key" ON "SchoolOnboardingToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SchoolOnboardingToken_schoolId_idx" ON "SchoolOnboardingToken"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolWebhookEvent_schoolId_createdAt_idx" ON "SchoolWebhookEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- AddForeignKey
ALTER TABLE "SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRecord" ADD CONSTRAINT "AdmissionRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRecord" ADD CONSTRAINT "AdmissionRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolOnboardingToken" ADD CONSTRAINT "SchoolOnboardingToken_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolWebhookEvent" ADD CONSTRAINT "SchoolWebhookEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

