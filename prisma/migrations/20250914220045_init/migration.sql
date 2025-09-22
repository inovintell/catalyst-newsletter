-- CreateTable
CREATE TABLE "public"."NewsSource" (
    "id" SERIAL NOT NULL,
    "website" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "comment" TEXT,
    "geoScope" TEXT NOT NULL,
    "importanceLevel" TEXT,
    "requiresScreening" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Newsletter" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourcesUsed" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsSource_topic_idx" ON "public"."NewsSource"("topic");

-- CreateIndex
CREATE INDEX "NewsSource_geoScope_idx" ON "public"."NewsSource"("geoScope");

-- CreateIndex
CREATE INDEX "NewsSource_active_idx" ON "public"."NewsSource"("active");

-- CreateIndex
CREATE INDEX "Newsletter_status_idx" ON "public"."Newsletter"("status");

-- CreateIndex
CREATE INDEX "Newsletter_createdAt_idx" ON "public"."Newsletter"("createdAt");
