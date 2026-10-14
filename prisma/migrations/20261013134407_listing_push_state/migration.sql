-- AlterTable
ALTER TABLE "ChannelListing" ADD COLUMN     "lastPushedAt" TIMESTAMP(3),
ADD COLUMN     "lastPushedQty" INTEGER;
