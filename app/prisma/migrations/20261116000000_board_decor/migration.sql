-- AlterTable
ALTER TABLE "Team" ADD COLUMN "decor" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);
