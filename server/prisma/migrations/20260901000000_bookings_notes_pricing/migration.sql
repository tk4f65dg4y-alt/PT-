-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "priceLabel" TEXT;

-- CreateTable
CREATE TABLE "SessionBooking" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "clientNote" TEXT,
    "trainerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "SessionBooking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SessionBooking" ADD CONSTRAINT "SessionBooking_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBooking" ADD CONSTRAINT "SessionBooking_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

