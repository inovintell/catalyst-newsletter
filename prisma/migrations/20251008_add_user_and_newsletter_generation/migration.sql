-- Add missing tables to catalyst_newsletter database

-- CreateTable NewsletterGeneration
CREATE TABLE IF NOT EXISTS "public"."NewsletterGeneration" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable User
CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "role" TEXT NOT NULL DEFAULT 'user',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsletterGeneration_status_idx" ON "public"."NewsletterGeneration"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsletterGeneration_createdAt_idx" ON "public"."NewsletterGeneration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_uid_key" ON "public"."User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_key" ON "public"."User"("tenantId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "public"."User"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_uid_idx" ON "public"."User"("uid");
