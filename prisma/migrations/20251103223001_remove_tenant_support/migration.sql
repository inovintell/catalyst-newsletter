-- Remove tenant support from User table

-- Drop tenant-related indexes
DROP INDEX IF EXISTS "User_tenantId_idx";
DROP INDEX IF EXISTS "User_tenantId_email_key";

-- Drop tenantId column
ALTER TABLE "User" DROP COLUMN IF EXISTS "tenantId";

-- Add unique constraint on email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
