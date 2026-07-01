-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'KES', 'NGN', 'GHS', 'BDT', 'PHP', 'VND');

-- CreateEnum
CREATE TYPE "LocalPaymentMethod" AS ENUM ('CARD', 'SEPA', 'MPESA', 'MOBILE_MONEY', 'GCASH', 'BKASH', 'LOCAL_BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PayoutRoute" AS ENUM ('LOCAL_BANK', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "LocalDepositStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "depositCurrency" "Currency",
ADD COLUMN     "depositMethod" "LocalPaymentMethod",
ADD COLUMN     "localDepositRef" TEXT,
ADD COLUMN     "localDepositStatus" "LocalDepositStatus",
ADD COLUMN     "lockedRate" DOUBLE PRECISION,
ADD COLUMN     "payoutCurrency" "Currency";

-- CreateTable
CREATE TABLE "SchoolPayoutAccount" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "virtualIban" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolPayoutAccount_schoolId_idx" ON "SchoolPayoutAccount"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPayoutAccount_schoolId_country_currency_key" ON "SchoolPayoutAccount"("schoolId", "country", "currency");

-- AddForeignKey
ALTER TABLE "SchoolPayoutAccount" ADD CONSTRAINT "SchoolPayoutAccount_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
