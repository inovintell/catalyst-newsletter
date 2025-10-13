-- AlterTable
ALTER TABLE "NewsletterGeneration" ADD COLUMN "traceId" VARCHAR(255);

-- CreateIndex
CREATE INDEX "NewsletterGeneration_traceId_idx" ON "NewsletterGeneration"("traceId");
