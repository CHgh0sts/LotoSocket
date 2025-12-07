/*
  Warnings:

  - You are about to drop the column `isCompleted` on the `cartons` table. All the data in the column will be lost.
  - You are about to drop the column `partyId` on the `cartons` table. All the data in the column will be lost.
  - The primary key for the `parties` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isActive` on the `parties` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `parties` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `parties` table. All the data in the column will be lost.
  - The `id` column on the `parties` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `currentNumber` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `gameType` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the `drawn_numbers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roomId` to the `cartons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cartons" DROP CONSTRAINT "cartons_partyId_fkey";

-- DropForeignKey
ALTER TABLE "drawn_numbers" DROP CONSTRAINT "drawn_numbers_partyId_fkey";

-- DropForeignKey
ALTER TABLE "parties" DROP CONSTRAINT "parties_userId_fkey";

-- AlterTable
ALTER TABLE "cartons" DROP COLUMN "isCompleted",
DROP COLUMN "partyId",
ADD COLUMN     "roomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "parties" DROP CONSTRAINT "parties_pkey",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "userId",
ADD COLUMN     "listNumbers" INTEGER[],
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "parties_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "currentNumber",
DROP COLUMN "gameType";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tempCreateRoom" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "drawn_numbers";

-- AddForeignKey
ALTER TABLE "cartons" ADD CONSTRAINT "cartons_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("code") ON DELETE CASCADE ON UPDATE CASCADE;
