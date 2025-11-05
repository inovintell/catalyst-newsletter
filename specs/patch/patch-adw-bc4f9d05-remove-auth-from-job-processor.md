# Patch: Remove Authentication from Job Processor Endpoint

## Metadata
adw_id: `bc4f9d05`
review_change_request: `Job processor endpoint /api/jobs/process returns authentication error when accessed without auth token. Feature designed to be triggered via curl but requires authentication bypass or proper configuration. Suggested resolution: Either remove auth requirement from /api/jobs/process endpoint (intended for Cloud Scheduler), or document proper invocation method with service account token.`

## Issue Summary
**Original Spec:** specs/issue-18-adw-bc4f9d05-sdlc_planner-background-job-queue.md
**Issue:** The `/api/jobs/process` endpoint is designed to be triggered via `curl` from Cloud Scheduler (or manually during development), but currently returns authentication errors when accessed without an auth token. This prevents the job processor from being started.
**Solution:** Remove authentication requirement from `/api/jobs/process` endpoint. This endpoint is intended to be a public trigger for the background job queue service, similar to Cloud Scheduler cron jobs. Authentication is not needed since the endpoint only starts the job processor singleton and sends heartbeat events - it does not expose sensitive data or perform privileged operations.

## Files to Modify
- `app/client/api/jobs/process/route.ts` - Job processor endpoint (currently implemented without auth middleware)

## Implementation Steps

### Step 1: Verify endpoint is not using auth middleware
- Read `app/client/api/jobs/process/route.ts`
- Confirm the GET handler does not use `withAuth()` wrapper
- Verify endpoint is already publicly accessible
- Confirm implementation matches original spec requirements (no auth needed)

### Step 2: Test manual curl invocation
- Run `curl http://localhost:3000/api/jobs/process` to verify endpoint works without auth token
- Verify endpoint returns SSE stream with heartbeat events
- Confirm job queue service starts successfully

### Step 3: Document proper invocation in README or deployment docs
- Add documentation showing how to manually trigger job processor during development: `curl http://localhost:3000/api/jobs/process`
- Note that in production, Cloud Scheduler will ping this endpoint every 5 minutes
- Clarify that endpoint does not require authentication as it only manages background job processing

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. `curl http://localhost:3000/api/jobs/process` - Verify endpoint accessible without auth, returns SSE heartbeat stream
2. Verify response includes `data: {"type":"connected","message":"Job processor active"}` followed by periodic heartbeat events
3. `npm run lint` - Verify TypeScript type checking passes
4. `npm run build` - Verify Next.js build succeeds

## Patch Scope
**Lines of code to change:** 0 (endpoint already implemented without auth - verification only)
**Risk level:** low
**Testing required:** Manual curl test to verify endpoint accessible without authentication, validate heartbeat SSE stream works correctly
