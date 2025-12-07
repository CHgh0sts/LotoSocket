/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "code" TEXT;

-- Update existing rooms with a default code
UPDATE "rooms" SET "code" = '000000' WHERE "code" IS NULL;

-- Make code NOT NULL
ALTER TABLE "rooms" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");
