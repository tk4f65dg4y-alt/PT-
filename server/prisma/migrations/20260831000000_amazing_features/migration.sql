-- CreateEnum
CREATE TYPE "MovementPattern" AS ENUM ('SQUAT', 'HINGE', 'PUSH', 'PULL', 'LUNGE', 'CORE', 'CARRY', 'CARDIO', 'MOBILITY');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "libraryItemId" TEXT;

-- CreateTable
CREATE TABLE "ExerciseLibraryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" "MovementPattern" NOT NULL,
    "muscles" TEXT NOT NULL,
    "cue" TEXT NOT NULL,
    "defaultSets" INTEGER,
    "defaultReps" TEXT,
    "defaultRest" INTEGER,

    CONSTRAINT "ExerciseLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLibraryItem_name_key" ON "ExerciseLibraryItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "ExerciseLibraryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

