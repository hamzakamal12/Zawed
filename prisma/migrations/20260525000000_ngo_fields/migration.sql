-- CreateEnum
CREATE TYPE "NgoType" AS ENUM ('CHARITY', 'FOUNDATION', 'HUMANITARIAN', 'EDUCATIONAL', 'HEALTH', 'ENVIRONMENTAL', 'OTHER');

-- AlterTable: Company — add NGO-specific fields
ALTER TABLE "Company"
  ADD COLUMN "ngoType"            "NgoType",
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "verified"           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "ngoDiscount"        DECIMAL(5,4) NOT NULL DEFAULT 0;

-- AlterTable: Order — add discountAmount for NGO pricing
ALTER TABLE "Order"
  ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
