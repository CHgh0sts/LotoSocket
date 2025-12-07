/*
  Warnings:

  - You are about to drop the column `gameId` on the `cartons` table. All the data in the column will be lost.
  - You are about to drop the column `gameId` on the `drawn_numbers` table. All the data in the column will be lost.
  - You are about to drop the column `gameId` on the `parties` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `games` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partyId` to the `drawn_numbers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `parties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cartons" DROP CONSTRAINT "cartons_gameId_fkey";

-- DropForeignKey
ALTER TABLE "cartons" DROP CONSTRAINT "cartons_partyId_fkey";

-- DropForeignKey
ALTER TABLE "drawn_numbers" DROP CONSTRAINT "drawn_numbers_gameId_fkey";

-- DropForeignKey
ALTER TABLE "games" DROP CONSTRAINT "games_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "parties" DROP CONSTRAINT "parties_gameId_fkey";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "cartons" DROP COLUMN "gameId",
ALTER COLUMN "partyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "drawn_numbers" DROP COLUMN "gameId",
ADD COLUMN     "partyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "parties" DROP COLUMN "gameId",
ADD COLUMN     "roomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL;

-- DropTable
DROP TABLE "games";

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameType" TEXT NOT NULL DEFAULT '1Ligne',
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartons" ADD CONSTRAINT "cartons_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawn_numbers" ADD CONSTRAINT "drawn_numbers_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
