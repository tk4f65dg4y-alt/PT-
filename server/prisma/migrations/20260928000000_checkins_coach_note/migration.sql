-- CreateEnum
CREATE TYPE "CheckInRating" AS ENUM ('EASY', 'JUST_RIGHT', 'BRUTAL');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "coachNote" TEXT,
ADD COLUMN     "coachNoteAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkoutCheckIn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "CheckInRating" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutCheckIn_sessionId_key" ON "WorkoutCheckIn"("sessionId");

-- AddForeignKey
ALTER TABLE "WorkoutCheckIn" ADD CONSTRAINT "WorkoutCheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCheckIn" ADD CONSTRAINT "WorkoutCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

