# Feature: Background Newsletter Generation with Database Job Queue

## Metadata
issue_number: `18`
adw_id: `bc4f9d05`
issue_json: `{"number":18,"title":"Background Newsletter Generation with Database Job Queue","body":"# Background Newsletter Generation - Implementation Brief\n\n## Overview\nImplement database-backed background job queue for newsletter generation that survives client disconnects, browser closures, and server restarts. Enables true async processing with real-time progress monitoring via dedicated status page.\n\n## Core Problem\nCurrent system fails when generation exceeds 10+ minutes due to SSE timeout, aborting generation and wasting tokens. Users must keep browser open throughout entire process.\n\n## Solution Architecture\n\n### Database Layer (PostgreSQL)\nExtend `NewsletterGeneration` model with persistent job state:\n- `jobStatus`: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'\n- `progress`: JSON with steps, logs, metadata\n- `currentStep`: Human-readable status\n- `processedAt`, `lastHeartbeat`: Timestamps for monitoring\n- `priority`: Future scaling\n- Indexes on `jobStatus` and `lastHeartbeat` for efficient queries\n\n### Job Queue Service (`lib/job-queue.ts`)\nSingleton service managing lifecycle:\n- Poll database every 5s for next queued job (FIFO)\n- Execute via existing `streamNewsletterAgent`\n- Update progress every 10s, heartbeat every 30s\n- Detect stalled jobs (15min timeout), mark failed\n- Support graceful cancellation via AbortController\n\n### Cloud Run Integration (Affordable)\n**API Route**: `GET /api/jobs/process`\n- Long-running streaming endpoint keeps instance alive\n- Singleton pattern prevents duplicate processors\n- Responds with heartbeat every 30s to maintain connection\n- Graceful shutdown on abort signal\n\n**Cost Model**:\n- Development: Manual `curl` trigger\n- Production: Cloud Scheduler (free tier) pings every 5min\n- Scales to zero when idle (~$0), ~$1.50/month active\n- No separate worker infrastructure needed\n\n### Status Page (`/newsletters/[id]/status`)\nReal-time monitoring with EventSource:\n- Poll database every 2s for updates\n- Auto-reconnection on disconnect (reuses existing pattern)\n- Visual progress stepper, live logs, metadata display\n- Cancel button, auto-redirect on completion\n- Works independently of generation process\n\n### API Modifications\n1. **POST `/api/generate`**: Create queued job, return `generationId` immediately\n2. **GET `/api/generate/stream`**: Poll database for job updates (reconnectable)\n3. **POST `/api/generate/cancel`**: Set `jobStatus='cancelled'`, abort if running\n\n### UI Flow\n1. Dashboard → Submit → Immediate redirect to status page\n2. Status page → EventSource streams progress from database\n3. User can navigate away, close browser, return anytime\n4. Archive page shows \"In Progress\" section (polls every 3s)\n5. Completion → Auto-redirect to newsletter output\n\n## Key Technical Details\n- **Persistence**: All state in PostgreSQL, survives restarts\n- **Reconnection**: Status page reconnects to in-progress jobs via database polling\n- **Cancellation**: Database flag + AbortController for immediate stop\n- **Stalled Detection**: `lastHeartbeat` + cleanup job marks abandoned work\n- **Concurrency**: Initial 1 job/time, configurable for scaling\n- **Tracing**: Langfuse `traceId` preserved from job record\n- **Security**: Auth middleware on cancellation endpoint\n\n## Implementation Order\n1. Database schema + migration\n2. Job queue service core logic\n3. API route for job processor (streaming)\n4. Modify POST/GET endpoints for async pattern\n5. Status page UI with EventSource\n6. Dashboard redirect + archive integration\n\n## Success Metrics\n- Jobs survive client disconnect, browser close, server restart\n- Real-time progress visible with <2s latency\n- Zero additional infrastructure cost (Cloud Run only)\n\n"}`

## Feature Description
This feature implements a robust, database-backed background job queue system for newsletter generation that completely decouples the generation process from the client connection. The current system fails when long-running newsletter generation exceeds browser SSE timeout limits (typically 10+ minutes), resulting in aborted generations and wasted API tokens. This feature solves that problem by persisting all job state in PostgreSQL, enabling true asynchronous processing where users can safely close their browsers, navigate away, or experience network disruptions without losing their generation progress.

The solution provides a real-time status monitoring page that can reconnect to in-progress jobs at any time, displays live progress updates and logs, and automatically redirects users when generation completes. The architecture is designed to be cost-effective, leveraging Cloud Run's serverless model to scale to zero when idle (~$0) while maintaining ~$1.50/month operational costs when active, requiring no separate worker infrastructure.

## User Story
As a newsletter administrator
I want newsletter generation to continue running in the background even if I close my browser or lose connection
So that I can initiate long-running generations (10+ minutes) without worrying about timeouts, and return later to view the completed newsletter without wasting expensive API tokens

## Problem Statement
The current newsletter generation system uses Server-Sent Events (SSE) to stream generation progress directly to the browser. This creates a critical dependency between the client connection and the server-side generation process. When generations exceed 10+ minutes (common with comprehensive multi-source newsletters), browsers enforce SSE connection timeouts that abort the generation mid-stream, resulting in incomplete work and wasted Claude API tokens. Users must maintain an active browser window throughout the entire generation process, which is impractical for long-running operations and creates a poor user experience. Additionally, there is no mechanism to resume or monitor generations that were interrupted, and the system lacks graceful handling of server restarts or network disconnections.

## Solution Statement
Implement a database-backed job queue system that persists all generation state in PostgreSQL, completely decoupling the generation execution from client connections. Extend the existing `NewsletterGeneration` model with job queue fields (`jobStatus`, `progress`, `currentStep`, `lastHeartbeat`, `priority`) to track job lifecycle. Create a singleton job queue service that polls the database for queued jobs, executes them using the existing `streamNewsletterAgent`, and updates progress/heartbeat every 10-30 seconds. Modify the `/api/generate` POST endpoint to create queued jobs and return immediately, enabling the dashboard to redirect users to a new `/newsletters/[id]/status` page. This status page uses EventSource to stream database updates, providing real-time progress monitoring with full reconnection support. A dedicated `/api/jobs/process` endpoint runs the job processor in a long-lived Cloud Run instance, maintaining affordability through serverless scaling. Add cancellation support via `/api/generate/cancel` endpoint and integrate job status into the archive page's "In Progress" section. This architecture ensures jobs survive client disconnects, browser closures, and server restarts while providing <2s latency progress updates and costing approximately $1.50/month in production.

## Relevant Files
Use these files to implement the feature:

- **prisma/schema.prisma:43-67** - Contains existing `NewsletterGeneration` model with job queue fields already added (jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority, indexes). Ready to use, requires migration.

- **app/client/api/generate/route.ts** - POST endpoint creates `NewsletterGeneration` records. Needs modification to set `jobStatus='queued'` and return immediately instead of streaming. GET endpoint fetches generation status, can be enhanced to support job polling.

- **app/client/api/generate/stream/route.ts** - Current SSE streaming endpoint. Will be refactored to poll database for job updates instead of executing generation directly. Implements EventSource protocol.

- **app/client/dashboard/page.tsx** - Current dashboard with generation form. Needs modification to redirect to status page after job creation instead of streaming inline. Handles form submission and EventSource connection logic.

- **app/client/newsletters/page.tsx** - Archive page showing completed newsletters. Needs enhancement to add "In Progress" section that polls every 3s for active jobs (jobStatus='queued' or 'running').

- **app/client/lib/claude-agent.ts** - Contains `streamNewsletterAgent()` function used for generation. Job queue service will call this function and capture output progressively.

- **app/client/api/newsletters/route.ts** - Newsletters API for listing/fetching. May need enhancement to filter by jobStatus for "In Progress" section.

- **app/client/components/GenerationProgress.tsx** - Current progress display component. Can be reused/adapted for status page.

- **.claude/commands/e2e/test_eventsource_reconnection.md** - Existing E2E test for EventSource reconnection. Provides reference for testing reconnection logic on status page.

- **.claude/commands/conditional_docs.md** - Documentation on EventSource/SSE patterns. Read `app_docs/feature-5f8fc23c-eventsource-reconnection.md` as this feature heavily involves EventSource and reconnection handling.

- **app_docs/feature-5f8fc23c-eventsource-reconnection.md** - Documentation on existing EventSource reconnection patterns and polling fallback. Essential reference for implementing status page streaming.

### New Files

- **app/client/lib/job-queue.ts** - New singleton job queue service that polls database for queued jobs, executes them via `streamNewsletterAgent`, updates progress/heartbeat, handles cancellation, and detects stalled jobs. Core business logic for background processing.

- **app/client/api/jobs/process/route.ts** - New API endpoint (GET) that runs the job processor in a long-lived streaming connection. Implements heartbeat to keep Cloud Run instance alive. Singleton pattern prevents duplicate processors.

- **app/client/api/generate/cancel/route.ts** - New API endpoint (POST) to cancel running jobs. Sets `jobStatus='cancelled'` in database and signals AbortController if job is actively running. Protected by auth middleware.

- **app/client/newsletters/[id]/status/page.tsx** - New status page for real-time job monitoring. Uses EventSource to stream database updates, displays progress stepper, live logs, metadata, cancel button. Auto-redirects on completion. Supports reconnection to in-progress jobs.

- **.claude/commands/e2e/test_background_job_queue.md** - New E2E test file to validate the background job queue functionality. Should test: job creation, status page display, progress updates, cancellation, browser close/reconnect, completion redirect, archive "In Progress" section. Follow the format of `.claude/commands/e2e/test_eventsource_reconnection.md`.

- **prisma/migrations/XXXXXX_add_job_queue_fields/migration.sql** - Database migration to add job queue fields to `NewsletterGeneration` model (if not already migrated). Fields include jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority, and indexes.

## Implementation Plan
### Phase 1: Foundation
Establish database persistence layer for job queue functionality by ensuring the schema migration is applied. The `NewsletterGeneration` model already contains the necessary job queue fields (jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority) with appropriate indexes. Create the core job queue service (`lib/job-queue.ts`) that encapsulates all job lifecycle management logic: polling, execution, progress tracking, heartbeat updates, cancellation handling, and stalled job detection. This singleton service acts as the central orchestrator for all background newsletter generation jobs.

### Phase 2: Core Implementation
Implement the job processor API endpoint (`/api/jobs/process`) that provides a long-running streaming connection to keep the Cloud Run instance alive while the job queue service operates. Modify the existing `/api/generate` POST endpoint to create jobs in 'queued' status and return immediately rather than executing generation inline. Refactor `/api/generate/stream` to poll the database for job updates and stream them via SSE instead of executing generation directly. Create the cancellation endpoint (`/api/generate/cancel`) with auth middleware protection to safely abort running jobs by setting jobStatus and triggering AbortController.

### Phase 3: Integration
Build the status page UI (`/newsletters/[id]/status`) with EventSource-based real-time updates, progress visualization, cancel button, and auto-redirect on completion. Update the dashboard to redirect to the status page after job creation instead of streaming progress inline. Enhance the archive page to add an "In Progress" section that polls every 3s for active jobs and displays their status. Create comprehensive E2E test covering job creation, status monitoring, cancellation, reconnection, and completion flow. Validate all success metrics: jobs survive disconnects/restarts, progress updates have <2s latency, and system maintains cost efficiency.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Verify Database Schema and Create Migration if Needed
- Read `prisma/schema.prisma` and verify `NewsletterGeneration` model has all required job queue fields
- Check if fields already exist: jobStatus (default "queued"), progress (Json?), currentStep (String?), processedAt (DateTime?), lastHeartbeat (DateTime?), priority (Int, default 0)
- Verify indexes exist: @@index([jobStatus, createdAt]), @@index([lastHeartbeat])
- If fields are missing, update schema and create migration using `npx prisma migrate dev --name add_job_queue_fields`
- If fields exist, verify migration has been applied by running `npx prisma migrate status`
- Run `npx prisma generate` to update Prisma client with new schema

### Create Job Queue Service Core Logic
- Create `app/client/lib/job-queue.ts` with singleton pattern job queue manager
- Implement `JobQueueService` class with methods:
  - `start()`: Begin polling loop (every 5s)
  - `stop()`: Gracefully shutdown and cleanup
  - `pollForNextJob()`: Query database for next queued job (ORDER BY priority DESC, createdAt ASC LIMIT 1)
  - `executeJob(generationId)`: Call `streamNewsletterAgent()`, capture output, update progress
  - `updateProgress(generationId, progress)`: Update progress JSON field every 10s
  - `updateHeartbeat(generationId)`: Update lastHeartbeat timestamp every 30s
  - `cancelJob(generationId)`: Set jobStatus='cancelled', trigger AbortController
  - `detectStalledJobs()`: Find jobs with lastHeartbeat > 15min ago, mark as failed
- Use AbortController to enable cancellation of running generations
- Export singleton instance: `export const jobQueueService = new JobQueueService()`
- Add error handling for database connection issues and generation failures
- Ensure all database updates are atomic and handle race conditions

### Create Job Processor API Endpoint
- Create `app/client/api/jobs/process/route.ts` with GET handler
- Implement long-running streaming endpoint that keeps Cloud Run instance alive
- Initialize `jobQueueService.start()` on first request (singleton pattern)
- Send heartbeat SSE event every 30s to maintain connection
- Handle abort signal for graceful shutdown
- Prevent duplicate processors by checking if service is already running
- Return 200 status with text/event-stream content-type
- Add logging to track processor startup, heartbeat, and shutdown events

### Modify POST /api/generate for Async Job Creation
- Update `app/client/api/generate/route.ts` POST handler
- Change behavior to create `NewsletterGeneration` record with `jobStatus='queued'` instead of 'pending'
- Remove inline execution of generation (keep only record creation)
- Set `startedAt` to current timestamp
- Return response immediately with `generationId` (no waiting for execution)
- Preserve existing config, prompt, traceId storage logic
- Keep all validation and source fetching logic unchanged
- Update response to indicate job is queued: `{ generationId, status: 'queued', message: 'Job queued for processing' }`

### Refactor GET /api/generate/stream for Database Polling
- Update `app/client/api/generate/stream/route.ts` GET handler
- Remove direct execution of `streamNewsletterAgent()` (job processor handles this now)
- Implement polling loop that queries database every 2s for job updates
- Read `progress`, `currentStep`, `jobStatus`, `output` fields from `NewsletterGeneration` record
- Stream updates as SSE events: 'status' for currentStep, 'progress' for detailed progress, 'complete' for finished jobs, 'error' for failures
- Handle jobStatus states: 'queued' → status event, 'running' → progress events, 'completed' → complete event, 'failed' → error event, 'cancelled' → error event
- Preserve existing EventSource event format for backward compatibility
- Add reconnection support by allowing clients to reconnect and resume streaming from current state
- Close stream when jobStatus reaches terminal state ('completed', 'failed', 'cancelled')
- Add timeout after 10 minutes of polling if job doesn't progress

### Create Cancellation API Endpoint
- Create `app/client/api/generate/cancel/route.ts` with POST handler
- Add `withAuth` middleware to protect endpoint
- Accept `generationId` in request body
- Update `NewsletterGeneration` record to set `jobStatus='cancelled'`
- Call `jobQueueService.cancelJob(generationId)` to trigger AbortController if job is running
- Return success response: `{ success: true, message: 'Job cancelled successfully' }`
- Handle case where job is already completed/failed (return 400 with appropriate message)
- Handle case where job doesn't exist (return 404)
- Log cancellation requests with user info and timestamp

### Build Status Page UI with Real-Time Updates
- Create `app/client/newsletters/[id]/status/page.tsx` as new Next.js page
- Extract `id` from URL params using Next.js 15 App Router conventions
- On mount, connect to `/api/generate/stream?id={id}` using EventSource
- Display real-time progress updates using visual progress stepper (e.g., 5 stages: Queued → Fetching Sources → Analyzing Content → Formatting → Complete)
- Show `currentStep` as active stage in progress stepper
- Display live logs from `progress.logs` array in scrollable container
- Show metadata from `progress.metadata` (e.g., sources processed, articles found)
- Add "Cancel Generation" button that calls `/api/generate/cancel`
- Implement auto-reconnection logic (reuse pattern from `app_docs/feature-5f8fc23c-eventsource-reconnection.md`)
- On 'complete' event, auto-redirect to `/newsletters/output` after 2s delay
- On 'error' event, display error message with option to return to dashboard
- Handle case where user navigates directly to status page for completed job (show completion state, redirect immediately)
- Add loading state while establishing EventSource connection
- Style with Tailwind CSS matching existing InovIntell branding

### Update Dashboard to Redirect to Status Page
- Modify `app/client/dashboard/page.tsx` `handleGenerateNewsletter()` function
- After successful POST to `/api/generate`, receive `generationId` from response
- Instead of calling `connectToEventSource(generationId)`, immediately redirect using `window.location.href = \`/newsletters/\${generationId}/status\``
- Remove inline `GenerationProgress` component display logic (no longer needed)
- Remove `connectToEventSource()`, `startPolling()` functions (moved to status page)
- Keep form validation and configuration logic unchanged
- Update button text to "Submit for Generation" to indicate async nature
- Show toast notification: "Generation started! Redirecting to status page..."

### Enhance Archive Page with In Progress Section
- Modify `app/client/newsletters/page.tsx` to add "In Progress" section above completed newsletters
- Query `NewsletterGeneration` table for jobs where `jobStatus IN ('queued', 'running')`
- Display in-progress jobs in separate card/section with:
  - Job ID, creation timestamp, currentStep, progress percentage (if available)
  - "View Status" button linking to `/newsletters/{id}/status`
  - "Cancel" button that calls `/api/generate/cancel`
- Implement polling every 3s to refresh in-progress jobs list (use `setInterval` on mount, clear on unmount)
- Show empty state if no jobs in progress: "No active generations"
- Style in-progress section distinctly (e.g., blue border, animated pulse on active jobs)
- Add filter to exclude in-progress jobs from main newsletters list (show only Newsletter model records, not NewsletterGeneration records)

### Create E2E Test for Background Job Queue
- Read `.claude/commands/test_e2e.md` to understand E2E test execution pattern
- Read `.claude/commands/e2e/test_eventsource_reconnection.md` as reference for structure and format
- Create `.claude/commands/e2e/test_background_job_queue.md` with comprehensive test steps:
  1. Navigate to dashboard and configure newsletter generation
  2. Submit generation and verify immediate redirect to status page
  3. Verify status page displays progress updates within 2s
  4. Close browser tab and reopen status page URL (verify reconnection)
  5. Verify progress continues from where it left off
  6. Test cancellation button (start new generation, click cancel, verify jobStatus='cancelled')
  7. Verify archive page shows job in "In Progress" section during generation
  8. Wait for generation completion, verify auto-redirect to output page
  9. Verify completed newsletter appears in archive (not in "In Progress")
  10. Capture at least 10 screenshots throughout test flow
- Include success criteria covering all core functionality: job creation, status monitoring, reconnection, cancellation, completion
- Follow exact format of reference E2E test file

### Run Validation Commands
- Execute `cd tests && uv run pytest` to validate server-side logic with zero regressions
- Read `.claude/commands/test_e2e.md`
- Execute the new E2E test: `.claude/commands/e2e/test_background_job_queue.md` to validate end-to-end functionality
- Run `npm run type-check` to verify TypeScript compilation with zero errors
- Run `npx prisma migrate status` to confirm migration is applied
- Test manual job processor startup: `curl http://localhost:3000/api/jobs/process` (verify heartbeat SSE events)
- Test job creation: POST to `/api/generate` and verify `jobStatus='queued'` in database
- Test status page: Navigate to `/newsletters/{id}/status` and verify real-time updates
- Test cancellation: POST to `/api/generate/cancel` with valid generationId, verify jobStatus updated
- Test archive "In Progress" section: Create job, verify it appears, wait for completion, verify it disappears
- Verify job survives server restart: Create job, restart server, verify job completes after restart
- Monitor logs for any errors during validation tests

## Testing Strategy
### Unit Tests
- **Job Queue Service Tests**:
  - Test `pollForNextJob()` returns correct job based on priority and FIFO order
  - Test `executeJob()` captures output progressively and updates progress field
  - Test `updateHeartbeat()` updates timestamp correctly every 30s
  - Test `cancelJob()` sets jobStatus='cancelled' and triggers AbortController
  - Test `detectStalledJobs()` identifies jobs with lastHeartbeat > 15min, marks as failed
  - Test singleton pattern prevents multiple instances
- **API Endpoint Tests**:
  - Test POST `/api/generate` creates job with jobStatus='queued', returns generationId
  - Test GET `/api/generate/stream` polls database and streams updates via SSE
  - Test POST `/api/generate/cancel` updates jobStatus and returns success
  - Test GET `/api/jobs/process` starts job processor, sends heartbeat events
- **Database Query Tests**:
  - Test querying jobs by jobStatus with proper indexes
  - Test atomic updates to progress, currentStep, lastHeartbeat fields
  - Test race conditions when multiple processors attempt to claim same job

### Integration Tests
- **End-to-End Job Lifecycle**:
  - Create job via POST `/api/generate` → verify jobStatus='queued'
  - Start job processor → verify job transitions to 'running'
  - Monitor via GET `/api/generate/stream` → verify progress events received
  - Complete generation → verify jobStatus='completed', output stored
- **Status Page Integration**:
  - Navigate to status page → verify EventSource connection established
  - Simulate browser close → reopen status page → verify reconnection works
  - Wait for completion → verify auto-redirect to `/newsletters/output`
- **Cancellation Flow**:
  - Start job → call POST `/api/generate/cancel` → verify jobStatus='cancelled'
  - Verify AbortController triggered, streamNewsletterAgent stops execution
- **Archive Page Integration**:
  - Create job → verify appears in "In Progress" section
  - Poll every 3s → verify status updates reflect latest jobStatus
  - Complete job → verify removed from "In Progress", appears in completed newsletters
- **Server Restart Resilience**:
  - Create job, let it start processing
  - Stop server (docker-compose down)
  - Restart server (docker-compose up)
  - Verify job processor resumes, job completes successfully

### Edge Cases
- **Concurrent Job Execution**: Create multiple jobs, verify only 1 runs at a time (FIFO), others remain queued
- **Stalled Job Detection**: Create job, stop processor before heartbeat update, wait 16 minutes, verify marked as failed
- **Network Interruption During SSE Stream**: Simulate network drop on status page, verify reconnection within 3 attempts
- **Cancellation of Non-Running Job**: Cancel job in 'queued' state, verify transitions to 'cancelled' without execution
- **Status Page for Non-Existent Job**: Navigate to `/newsletters/999999/status`, verify 404 error handling
- **Rapid Job Creation**: Submit 5 jobs in quick succession, verify all queued, processed in FIFO order
- **Browser Tab Duplication**: Open status page in 2 tabs, verify both receive updates, no duplicate processing
- **Generation Exceeding 10 Minutes**: Create job requiring >10min, verify heartbeat maintains connection, completes successfully
- **AbortController Signal Timing**: Cancel job mid-generation, verify output not saved, partial work discarded
- **Database Connection Loss**: Simulate database disconnect during job execution, verify graceful error handling, job marked failed

## Acceptance Criteria
- Database schema includes all job queue fields (jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority) with correct indexes
- POST `/api/generate` creates job with jobStatus='queued' and returns generationId immediately (<500ms response time)
- Job queue service starts via `/api/jobs/process` endpoint, polls database every 5s for queued jobs
- Job queue service executes jobs using `streamNewsletterAgent()`, updates progress every 10s, heartbeat every 30s
- GET `/api/generate/stream` polls database every 2s, streams job updates via SSE with <2s latency
- Status page (`/newsletters/[id]/status`) displays real-time progress, logs, metadata with visual progress stepper
- Status page reconnects automatically on connection loss (up to 3 attempts with exponential backoff)
- Status page auto-redirects to `/newsletters/output` on job completion after 2s delay
- POST `/api/generate/cancel` sets jobStatus='cancelled', triggers AbortController, protected by auth middleware
- Dashboard redirects to status page immediately after job creation (no inline progress display)
- Archive page shows "In Progress" section polling every 3s for jobs with jobStatus='queued' or 'running'
- Archive page "In Progress" section includes "View Status" and "Cancel" buttons for each active job
- Jobs survive client disconnect: close browser during generation, reopen status page, generation continues and completes
- Jobs survive browser closure: close all browser windows, reopen status page later, generation completed
- Jobs survive server restart: restart Docker containers mid-generation, job processor resumes, job completes
- Stalled job detection marks jobs as failed when lastHeartbeat exceeds 15min without update
- Job processor implements singleton pattern, prevents duplicate processors from running simultaneously
- Langfuse traceId preserved from job creation through execution for observability
- All terminal jobStatus states (completed, failed, cancelled) have completedAt timestamp set
- TypeScript compilation succeeds with zero errors (`npm run type-check`)
- Server-side tests pass with zero failures (`cd tests && uv run pytest`)
- E2E test validates full job lifecycle: creation → status monitoring → reconnection → completion → archive display
- System maintains cost efficiency: ~$0 when idle (Cloud Run scales to zero), ~$1.50/month when active

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_background_job_queue.md` test file to validate this functionality works.

- `npx prisma migrate status` - Verify database migration is applied
- `npx prisma generate` - Regenerate Prisma client with job queue schema
- `npm run type-check` - Verify TypeScript compilation with zero errors
- `cd tests && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"dateRange":{"from":"2025-01-01","to":"2025-01-07"},"selectedSources":[1,2,3],"outputFormat":"detailed"}' -i` - Manually test job creation, verify 200 response with generationId and jobStatus='queued'
- `curl http://localhost:3000/api/jobs/process` - Manually start job processor, verify heartbeat SSE events every 30s
- Open browser to `http://localhost:3000/newsletters/{generationId}/status` - Visually verify status page displays real-time updates
- In status page, open browser DevTools Network tab, verify EventSource connection active, receiving 'status' and 'progress' events
- Click "Cancel Generation" button on status page, verify job transitions to 'cancelled' state
- Navigate to `http://localhost:3000/newsletters`, verify "In Progress" section shows active jobs with "View Status" and "Cancel" buttons
- Create job, close browser, reopen status page after 30s, verify progress continues from previous state (reconnection works)
- Create job, restart server (`docker-compose restart app`), verify job completes after restart (persistence works)
- Monitor logs during validation: `docker-compose logs -f app`, verify no errors related to job queue or status streaming

## Notes
- **Cost Optimization**: Cloud Run scales to zero when no jobs are running. Job processor endpoint (`/api/jobs/process`) should be triggered manually during development (`curl` command). In production, use Cloud Scheduler (free tier) to ping endpoint every 5min, maintaining ~$1.50/month cost.

- **Concurrency**: Initial implementation processes 1 job at a time (FIFO). Future enhancement can add `MAX_CONCURRENT_JOBS` environment variable to enable parallel processing. Database query should use `FOR UPDATE SKIP LOCKED` to prevent race conditions when scaling to multiple concurrent jobs.

- **Monitoring**: Integrate with existing Langfuse observability by preserving `traceId` from job creation through execution. Job queue service should create new Langfuse spans for job polling, execution start/end, and cancellation events. This enables full distributed tracing across async job lifecycle.

- **Error Recovery**: Stalled job detection (15min heartbeat timeout) handles cases where job processor crashes mid-execution. Consider adding retry mechanism for failed jobs (e.g., retry up to 3 times with exponential backoff) as future enhancement. Store retry count and error details in `progress` JSON field.

- **Development Workflow**: During development, manually trigger job processor by running `curl http://localhost:3000/api/jobs/process` in a separate terminal. Leave this curl connection open to maintain job processor activity. Use Docker logs (`docker-compose logs -f app`) to monitor job execution in real-time.

- **Status Page Performance**: EventSource connection polls database every 2s. This is acceptable for initial implementation with <10 concurrent users. For production scale (>100 concurrent users), consider using PostgreSQL LISTEN/NOTIFY for push-based updates to reduce database load.

- **Security**: Cancellation endpoint requires authentication. Status page is read-only and doesn't require auth (generationId acts as capability token). Consider adding rate limiting to status page SSE endpoint to prevent abuse (e.g., max 10 connections per IP per minute).

- **Database Indexes**: Ensure indexes on `jobStatus` and `lastHeartbeat` exist to optimize job polling queries. The existing schema already includes these indexes. Monitor query performance using `EXPLAIN ANALYZE` if job queue grows beyond 10,000 records.

- **Testing with Long-Running Jobs**: To test the full flow without waiting 10+ minutes, temporarily modify `streamNewsletterAgent()` to add artificial delays (e.g., `await new Promise(resolve => setTimeout(resolve, 5000))` between chunks). This simulates long-running generation for faster E2E test validation.

- **Archive Page Query Optimization**: The "In Progress" section queries `NewsletterGeneration` table, while completed newsletters come from `Newsletter` table. Ensure UI clearly distinguishes between the two (e.g., different card styles, separate sections). Consider adding tab navigation: "Completed" | "In Progress" | "Failed".

- **Graceful Shutdown**: When stopping the server, the job processor should complete the current job or save partial progress before shutting down. Implement signal handlers (SIGTERM, SIGINT) in `/api/jobs/process` to update job status to 'queued' if interrupted mid-execution, allowing processor to resume on restart.

- **Future Enhancements**:
  - Priority queue: higher priority jobs processed first (schema already includes `priority` field)
  - Scheduled jobs: allow users to schedule newsletter generation for specific time
  - Job history: archive old jobs (>30 days) to separate table for audit trail
  - Multi-tenant isolation: add `userId` field to support multiple users with separate job queues
  - Webhook notifications: POST to external URL when job completes (store webhook URL in job config)
