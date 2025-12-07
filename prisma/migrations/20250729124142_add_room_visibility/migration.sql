-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT;
