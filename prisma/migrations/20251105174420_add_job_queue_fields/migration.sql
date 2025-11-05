-- Add job queue fields to NewsletterGeneration table
ALTER TABLE "NewsletterGeneration" ADD COLUMN "jobStatus" TEXT NOT NULL DEFAULT 'queued';
ALTER TABLE "NewsletterGeneration" ADD COLUMN "progress" JSONB;
ALTER TABLE "NewsletterGeneration" ADD COLUMN "currentStep" TEXT;
ALTER TABLE "NewsletterGeneration" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "NewsletterGeneration" ADD COLUMN "lastHeartbeat" TIMESTAMP(3);
ALTER TABLE "NewsletterGeneration" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for job queue fields
CREATE INDEX "NewsletterGeneration_jobStatus_createdAt_idx" ON "NewsletterGeneration"("jobStatus", "createdAt");
CREATE INDEX "NewsletterGeneration_lastHeartbeat_idx" ON "NewsletterGeneration"("lastHeartbeat");
