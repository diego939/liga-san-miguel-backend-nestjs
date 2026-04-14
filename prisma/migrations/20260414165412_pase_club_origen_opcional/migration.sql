-- DropForeignKey
ALTER TABLE "Pase" DROP CONSTRAINT "Pase_clubOrigenId_fkey";

-- AlterTable
ALTER TABLE "Pase" ALTER COLUMN "clubOrigenId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pase" ADD CONSTRAINT "Pase_clubOrigenId_fkey" FOREIGN KEY ("clubOrigenId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
