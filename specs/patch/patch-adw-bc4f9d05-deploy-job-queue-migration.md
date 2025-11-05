# Patch: Deploy Job Queue Fields Migration to Docker Container

## Metadata
adw_id: `bc4f9d05`
review_change_request: `Database schema in Docker container (/app/prisma/schema.prisma) missing job queue fields: jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority. These fields exist in local schema.prisma:43-67 but not in deployed container.`

## Issue Summary
**Original Spec:** specs/issue-18-adw-bc4f9d05-sdlc_planner-background-job-queue.md
**Issue:** Local schema.prisma contains job queue fields (jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority) at lines 43-67, but Docker container at /app/prisma/schema.prisma is missing these fields. Migration exists locally but hasn't been applied to container database.
**Solution:** Create Prisma migration for job queue fields, rebuild Docker image to include updated schema, and deploy migration to container database.

## Files to Modify
- prisma/schema.prisma (already modified locally, needs to be included in Docker image)
- prisma/migrations/ (create new migration if needed)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Prisma migration for job queue fields
- Run `npx prisma migrate dev --name add_job_queue_fields` to create migration
- Verify migration SQL includes all job queue fields: jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority
- Verify migration includes indexes: @@index([jobStatus, createdAt]), @@index([lastHeartbeat])

### Step 2: Rebuild Docker image with updated schema
- Run `docker-compose build app` to rebuild with updated prisma/schema.prisma and new migration
- Verify build completes successfully

### Step 3: Deploy migration to container database
- Run `docker-compose up -d app` to restart container with new image
- Run `docker exec catalyst-newsletter-app npx prisma migrate deploy` to apply migration to database
- Verify migration status: `docker exec catalyst-newsletter-app npx prisma migrate status`
- Run `docker exec catalyst-newsletter-app npx prisma generate` to update Prisma client

### Step 4: Verify schema in container matches local
- Run `docker exec catalyst-newsletter-app cat /app/prisma/schema.prisma | grep -A 30 "model NewsletterGeneration"` to confirm fields exist
- Query database to verify columns exist: `docker exec catalyst-newsletter-postgres psql -U catalyst_user -d catalyst_newsletter -c "\d newsletter_generation"`

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. `docker exec catalyst-newsletter-app npx prisma migrate status` - Should show "Database schema is up to date!"
2. `docker exec catalyst-newsletter-app cat /app/prisma/schema.prisma | grep jobStatus` - Should return jobStatus field definition
3. `docker exec catalyst-newsletter-postgres psql -U catalyst_user -d catalyst_newsletter -c "SELECT column_name FROM information_schema.columns WHERE table_name='NewsletterGeneration' AND column_name IN ('jobStatus', 'progress', 'currentStep', 'processedAt', 'lastHeartbeat', 'priority');"` - Should return all 6 columns
4. `npm run lint` - TypeScript validation
5. `npm run build` - Build validation

## Patch Scope
**Lines of code to change:** 0 (schema already modified, only deployment needed)
**Risk level:** low (additive schema change, backward compatible)
**Testing required:** Verify migration applies cleanly, existing data unaffected, new fields available in container
