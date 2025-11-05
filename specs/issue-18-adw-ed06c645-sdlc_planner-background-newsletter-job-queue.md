# Feature: Background Newsletter Generation with Database Job Queue

## Metadata
issue_number: `18`
adw_id: `ed06c645`
issue_json: `{"number":18,"title":"Background Newsletter Generation with Database Job Queue","body":"# Background Newsletter Generation - Technical Specification\n\n**Date:** 2025-11-05\n**Status:** Proposed\n**Priority:** High\n\n## Problem Statement\n\nCurrent newsletter generation fails when execution exceeds 10+ minutes due to:\n- Client SSE connection timeouts (10 min browser limit)\n- Server aborts generation on client disconnect\n- No background job processing infrastructure\n- Tight coupling between HTTP connection lifecycle and generation lifecycle\n\n**User Impact:**\n- Generation fails with \"Unknown Error: Error generating newsletter\"\n- Wasted API tokens and processing time\n- Poor UX - users must stay on page, cannot navigate away\n\n## Solution Overview\n\nImplement database-backed background job queue for newsletter generation with:\n- True background processing (survives disconnects, server restarts)\n- Dedicated status page with live progress streaming\n- Auto-reconnection to in-progress jobs\n- Full navigation freedom for users"}`

## Feature Description
This feature implements a robust background job queue system for newsletter generation using the existing PostgreSQL database. The system enables true background processing that survives client disconnects, browser closures, and server restarts. Users gain the ability to start a newsletter generation, navigate away or close their browser, and return later to check progress or retrieve completed newsletters. The implementation includes a dedicated status page with real-time progress streaming, automatic reconnection to in-progress jobs, and comprehensive error handling for stalled or failed jobs.

## User Story
As a newsletter administrator
I want newsletter generation to run in the background without requiring my browser to stay open
So that I can start long-running newsletter generations, navigate away or close my browser, and retrieve the completed newsletter later without wasting API tokens or processing time on failed generations

## Problem Statement
The current newsletter generation system has a critical limitation where long-running generations (10+ minutes) fail due to client-side SSE connection timeouts. When the client disconnects, the server aborts the generation process, resulting in wasted API tokens, lost processing time, and a poor user experience. Users must remain on the page throughout the entire generation process, unable to navigate away or multitask. This creates significant friction for workflows involving large numbers of sources or comprehensive date ranges.

## Solution Statement
Implement a database-backed background job queue system that decouples the newsletter generation lifecycle from HTTP connection lifecycle. The solution introduces new database fields for job status tracking, progress monitoring, and heartbeat detection; a job queue service that processes generations independently of client connections; a dedicated status page for monitoring progress with auto-reconnection; and updates to existing API endpoints to support asynchronous job creation and status polling. This architecture enables true background processing while maintaining real-time progress visibility through database polling.

## Relevant Files
Use these files to implement the feature:

- **prisma/schema.prisma** (lines 43-59) - Extend NewsletterGeneration model with new job queue fields: jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority, and add database indexes for efficient querying
- **app/client/api/generate/route.ts** (POST endpoint, lines 49-177) - Modify to create queued jobs instead of synchronous generation, store job configuration with selectedSources, return generationId immediately for status tracking
- **app/client/api/generate/stream/route.ts** (lines 1-385) - Refactor to poll database for updates instead of tying to active execution, make reconnectable at any time, client disconnect doesn't affect processing
- **app/client/dashboard/page.tsx** (lines 114-179) - Update to redirect to status page immediately after job creation instead of inline progress monitoring
- **app/client/newsletters/page.tsx** - Add "In Progress" section showing active jobs with jobStatus IN ('queued', 'running'), display progress and link to status page
- **app/client/lib/claude-agent.ts** (streamNewsletterAgent function, lines 155-510) - Existing generation logic to be called by job processor
- **README.md** (lines 304-330) - Reference for understanding Docker and development setup patterns

### New Files
- **app/client/lib/job-queue.ts** - Core job queue service implementing NewsletterJobQueue class with methods for start(), stop(), fetchNextJob(), processJob(), updateProgress(), heartbeat(), cleanupStalledJobs(), cancelJob()
- **app/client/api/jobs/process/route.ts** - Long-running API route with streaming response to keep Cloud Run instance alive, triggered by Cloud Scheduler (production) or manual curl (development)
- **app/client/api/generate/cancel/route.ts** - POST endpoint to cancel running jobs, updates jobStatus to 'cancelled', job processor detects and aborts
- **app/client/newsletters/[id]/status/page.tsx** - Dedicated status page with real-time progress display, step indicators, live log stream, cancel button, auto-redirect on completion, reconnection indicator
- **app/client/components/ProgressSteps.tsx** - Visual stepper component showing job progress steps with status indicators
- **app/client/components/CurrentStepDisplay.tsx** - Component displaying current step with progress details
- **app/client/components/LogStream.tsx** - Auto-scrolling log display component for real-time generation logs
- **app/client/components/MetadataDisplay.tsx** - Component showing generation metadata (sources processed, articles found)
- **app/client/components/ConnectionStatus.tsx** - Connection status indicator (Connected, Reconnecting, Disconnected)
- **app/client/components/CancelButton.tsx** - Cancel generation button component
- **app/client/components/InProgressCard.tsx** - Card component for displaying in-progress generations in archive
- **.claude/commands/e2e/test_background_job_queue.md** - E2E test specification validating background job queue functionality, including job creation, status page monitoring, navigation away/return, cancellation, and completion scenarios
- **app_docs/feature-ed06c645-background-job-queue.md** - Feature documentation explaining architecture, usage, configuration, and troubleshooting for the background job queue system

**Documentation to Review:**
- `.claude/commands/conditional_docs.md` - Read to check if additional documentation is required
- `.claude/commands/test_e2e.md` - Read to understand E2E test creation format
- `.claude/commands/e2e/test_eventsource_reconnection.md` - Read as reference for E2E test structure
- `app_docs/feature-5f8fc23c-eventsource-reconnection.md` - Read to understand existing SSE reconnection patterns and how they integrate with this feature

## Implementation Plan
### Phase 1: Database Foundation
Extend the Prisma schema with new fields for job queue management. Add jobStatus, progress (JSON), currentStep, processedAt, lastHeartbeat, and priority fields to NewsletterGeneration model. Create database indexes on jobStatus and lastHeartbeat for efficient querying. Run migration to apply schema changes. This foundation enables persistent job state tracking independent of HTTP connections.

### Phase 2: Core Job Queue Service
Implement the NewsletterJobQueue class in lib/job-queue.ts with full job lifecycle management. Include job fetching with database queries, job processing by calling existing streamNewsletterAgent, progress tracking with database updates, heartbeat mechanism for stalled job detection, and graceful shutdown handling. This service runs independently of client connections.

### Phase 3: Job Processor API Route
Create the /api/jobs/process route with streaming response to keep Cloud Run instances alive during processing. Implement singleton pattern to prevent duplicate processors, heartbeat streaming to maintain connection, and abort signal handling for graceful cleanup. Configure Cloud Scheduler for production and document manual curl commands for development.

### Phase 4: API Endpoint Refactoring
Modify POST /api/generate to create queued jobs instead of synchronous execution, returning generationId immediately. Refactor GET /api/generate/stream to poll database for updates, making it reconnectable at any time. Implement POST /api/generate/cancel for job cancellation. Ensure backward compatibility with existing client code during transition.

### Phase 5: Status Page UI Implementation
Build the dedicated status page at /newsletters/[id]/status with real-time progress visualization. Implement EventSource connection with database polling fallback, progress step indicators, live log streaming, connection status display, cancel button, and auto-redirect on completion. Use existing reconnection patterns from feature-5f8fc23c.

### Phase 6: Dashboard and Archive Integration
Update dashboard to redirect to status page after job creation instead of inline progress. Remove inline progress components from dashboard. Add "In Progress" section to newsletters archive page showing active jobs with polling for status updates. Implement InProgressCard component for displaying job cards with progress.

### Phase 7: UI Component Development
Create reusable UI components for status page: ProgressSteps (visual stepper), CurrentStepDisplay (current step details), LogStream (auto-scrolling logs), MetadataDisplay (statistics), ConnectionStatus (connection indicator), CancelButton (cancellation). Ensure components follow existing design patterns from app/client/components.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Database Schema Migration
- Read prisma/schema.prisma to understand current NewsletterGeneration model
- Add new fields to NewsletterGeneration model:
  - jobStatus String @default("queued") with values: 'queued', 'running', 'completed', 'failed', 'cancelled'
  - progress Json? for step-by-step progress tracking (GenerationProgress interface structure)
  - currentStep String? for human-readable current step
  - processedAt DateTime? for when job processor started
  - lastHeartbeat DateTime? for stalled job detection
  - priority Int @default(0) for future prioritization
- Add database indexes: @@index([jobStatus, createdAt]) and @@index([lastHeartbeat])
- Run: npx prisma migrate dev --name add_job_queue_fields
- Verify migration creates new fields and indexes correctly
- Run: npx prisma generate to update Prisma client types

### 2. Create E2E Test Specification
- Read .claude/commands/test_e2e.md to understand E2E test format
- Read .claude/commands/e2e/test_eventsource_reconnection.md as reference example
- Create .claude/commands/e2e/test_background_job_queue.md with:
  - User Story: As a newsletter administrator, I want to start newsletter generation and navigate away, returning later to check progress
  - Prerequisites: Application running, sources configured, ANTHROPIC_API_KEY set
  - Test Steps covering:
    - Step 1: Navigate to dashboard and configure newsletter
    - Step 2: Start generation and verify redirect to status page
    - Step 3: Verify status page shows real-time progress
    - Step 4: Navigate away to /newsletters page
    - Step 5: Verify "In Progress" section shows active job
    - Step 6: Return to status page via link
    - Step 7: Verify reconnection to same job and progress updates
    - Step 8: Test cancellation functionality
    - Step 9: Start new generation, close browser tab, reopen, navigate to status page
    - Step 10: Verify newsletter completes and auto-redirects to output
  - Success Criteria: All steps pass, screenshots captured, no errors
  - Minimum 12 screenshots required for validation

### 3. Implement Job Queue Service Core
- Create app/client/lib/job-queue.ts with TypeScript interfaces:
  - JobQueueConfig interface (pollInterval, heartbeatInterval, maxRetries, staleJobTimeout, concurrency)
  - GenerationProgress interface matching spec (steps array, logs array, metadata object)
  - GenerationProgressStep interface (name, status, startedAt, completedAt, progress, error)
- Implement NewsletterJobQueue class with:
  - Private properties: isRunning, currentJobId, abortController, config, heartbeatIntervalId
  - Constructor accepting optional JobQueueConfig
  - async start(): Main processing loop using setInterval with pollInterval
  - async stop(): Graceful shutdown, clear intervals, abort current job
  - private async fetchNextJob(): Query database for oldest queued job, return null if none
  - private async processJob(job): Core job processing logic (implement in next step)
  - private async updateProgress(jobId, progress): Update database with progress
  - private async heartbeat(jobId): Update lastHeartbeat field
  - async cleanupStalledJobs(): Find jobs with lastHeartbeat > staleJobTimeout, mark as failed
  - async cancelJob(jobId): Set jobStatus to 'cancelled', abort if currently processing
- Add comprehensive error handling with try-catch blocks
- Add structured logging with console.log for debugging
- Export NewsletterJobQueue class and interfaces

### 4. Implement Job Processing Logic
- In app/client/lib/job-queue.ts processJob method:
  - Update job: jobStatus='running', processedAt=now
  - Start heartbeat interval (30s) to update lastHeartbeat
  - Create initial progress object with steps: Queued (completed), Initializing (in_progress), Fetching sources (pending), Generating content (pending)
  - Call updateProgress with initial state
  - Extract sources from job.config.selectedSources array
  - Fetch sources from database using prisma.newsSource.findMany
  - Handle case where no sources found (mark job as failed)
  - Build agent prompt from sources and config
  - Create AbortController for cancellation support
  - Call streamNewsletterAgent with prompt, pass traceId from job
  - Stream chunks and accumulate output
  - Update progress periodically (every 10s) with logs and metadata
  - Check abortController.signal.aborted in loop for cancellation
  - On completion: Update job with jobStatus='completed', output, completedAt
  - On error: Update job with jobStatus='failed', error message
  - Clear heartbeat interval
  - Handle cancellation: If aborted, update job with jobStatus='cancelled'
- Add specific progress updates for each stage:
  - Initializing: Log configuration details
  - Fetching sources: Log count and names
  - Generating content: Log progress chunks
- Import streamNewsletterAgent from @/lib/claude-agent
- Import PrismaClient and create instance

### 5. Create Job Processor API Route
- Create app/client/api/jobs/process/route.ts
- Implement module-level variable: let processorInstance: NewsletterJobQueue | null = null
- Export async function GET(request: Request):
  - Check if processorInstance?.isRunning, return 200 "Processor already running" if true
  - Create new NewsletterJobQueue instance
  - Set processorInstance = queue
  - Create ReadableStream with TextEncoder for streaming
  - In stream.start(controller):
    - Log "[JobQueue] Starting job processor"
    - Call await queue.start()
    - Create heartbeat setInterval (30s) sending timestamp messages
    - Add request.signal abort listener:
      - Log graceful shutdown
      - Clear heartbeat interval
      - Call await queue.stop()
      - Set processorInstance = null
      - Close stream controller
  - Return new Response(stream) with headers:
    - 'Content-Type': 'text/plain'
    - 'Cache-Control': 'no-cache, no-transform'
    - 'X-Accel-Buffering': 'no'
- Add comprehensive error handling and logging
- Test locally with: curl http://localhost:3000/api/jobs/process

### 6. Modify POST /api/generate for Job Queuing
- Read app/client/api/generate/route.ts POST handler (lines 49-177)
- Modify POST handler:
  - Keep existing validation logic for sources and config
  - Remove synchronous generation execution
  - Create generation record with additional fields:
    - jobStatus: 'queued'
    - progress: Initial progress object with steps
    - currentStep: 'Queued'
    - startedAt: new Date()
  - Store selectedSources in config explicitly
  - Return response with:
    - generationId: generation.id
    - status: 'queued'
    - statusUrl: `/newsletters/${generation.id}/status`
  - Update response to redirect client to status page
- Preserve all existing validation, logging, and tracing logic
- Test: POST /api/generate should return immediately with generationId

### 7. Refactor GET /api/generate/stream for Database Polling
- Read app/client/api/generate/stream/route.ts (lines 1-385)
- Refactor GET handler to poll database instead of active execution:
  - Accept generationId query parameter
  - Fetch initial generation record from database
  - Return 404 if not found
  - Create SSE stream with encoder
  - In stream.start(controller):
    - Send initial status event with current job state
    - Create setInterval (2s) for polling database
    - In poll function:
      - Fetch updated generation record
      - Send progress event with jobStatus, progress, currentStep, lastHeartbeat
      - If jobStatus in ['completed', 'failed', 'cancelled']:
        - Send complete event with output or error
        - Clear interval
        - Close stream
    - Add request.signal abort listener to clear interval
  - Remove direct generation execution logic
  - Keep existing SSE headers and response format
- This makes stream reconnectable at any time
- Test: GET /api/generate/stream?id=123 should poll database

### 8. Implement POST /api/generate/cancel Endpoint
- Create app/client/api/generate/cancel/route.ts
- Import PrismaClient and withAuth middleware
- Export async function POST(request: Request):
  - Parse request body for generationId
  - Validate generationId is provided
  - Update generation record:
    - jobStatus: 'cancelled'
    - status: 'failed'
    - error: 'Generation cancelled by user'
    - completedAt: new Date()
  - Job processor will detect cancelled status on next heartbeat/check
  - Return success response: { success: true }
- Wrap with withAuth middleware for authentication
- Add error handling for invalid IDs or database errors
- Test: POST /api/generate/cancel with generationId

### 9. Create Status Page UI Components
- Create app/client/components/ConnectionStatus.tsx:
  - Accept props: isConnected boolean
  - Display indicator: 🟢 Connected / 🟡 Reconnecting / 🔴 Disconnected
  - Use Tailwind classes for styling
- Create app/client/components/ProgressSteps.tsx:
  - Accept props: steps array (GenerationProgressStep[])
  - Map over steps and display with icons: ✓ completed, ⟳ in_progress, ○ pending, ✗ failed
  - Show progress.percentage for in_progress steps
  - Use vertical stepper layout
- Create app/client/components/CurrentStepDisplay.tsx:
  - Accept props: step string
  - Display current step with animated spinner
- Create app/client/components/LogStream.tsx:
  - Accept props: logs array
  - Auto-scrolling container with max height
  - Display logs with timestamp and level styling
  - Use useEffect to scroll to bottom on new logs
- Create app/client/components/MetadataDisplay.tsx:
  - Accept props: metadata object
  - Display statistics: sourcesProcessed, articlesFound, estimatedDuration
- Create app/client/components/CancelButton.tsx:
  - Accept props: generationId, onCancel callback
  - Implement cancel handler calling POST /api/generate/cancel
  - Show confirmation dialog
  - Disable after click
- Follow existing component patterns from app/client/components

### 10. Implement Status Page
- Create app/client/newsletters/[id]/status/page.tsx
- Define GenerationStatusPageProps interface with params: { id: string }
- Implement page component with state:
  - jobStatus: string
  - progress: GenerationProgress | null
  - currentStep: string
  - isConnected: boolean
  - error: string | null
- Implement useEffect for EventSource connection:
  - Connect to /api/generate/stream?id=${params.id}
  - Handle onmessage events:
    - 'status': Update initial state
    - 'progress': Update jobStatus, progress, currentStep
    - 'complete': Handle completion, redirect to output page if successful
  - Handle onopen: Set isConnected = true
  - Handle onerror: Set isConnected = false, implement reconnection logic (reference feature-5f8fc23c)
  - Cleanup: Close EventSource on unmount
- Render UI with components:
  - ConnectionStatus showing isConnected
  - ProgressSteps showing progress.steps
  - CurrentStepDisplay showing currentStep
  - LogStream showing progress.logs
  - MetadataDisplay showing progress.metadata
  - CancelButton if jobStatus === 'running'
  - Error display if jobStatus === 'failed'
- Implement auto-redirect to /newsletters/[id]/output on completion
- Add loading state while fetching initial data
- Style with Tailwind CSS following existing patterns

### 11. Update Dashboard for Status Page Redirect
- Read app/client/dashboard/page.tsx (lines 114-179)
- Modify handleGenerateNewsletter function:
  - Keep existing validation and API call to POST /api/generate
  - Remove connectToEventSource function (no longer needed)
  - Remove startPolling function (no longer needed)
  - After successful response with generationId:
    - Extract statusUrl from response or construct: `/newsletters/${generationId}/status`
    - Call router.push(statusUrl) to redirect immediately
  - Remove inline generation progress display (GenerationProgress component)
  - Update button state management for immediate redirect
- Remove unused state: generationStatus, hasError
- Keep: generating state for button disable
- Update imports: Remove GenerationProgress component
- Test: Generate button should redirect to status page immediately

### 12. Add In Progress Section to Newsletter Archive
- Read app/client/newsletters/page.tsx
- Create app/client/components/InProgressCard.tsx:
  - Accept props: generation object with id, jobStatus, progress, currentStep, createdAt
  - Display card with:
    - Generation ID and creation time
    - Current status badge (queued/running)
    - Progress percentage if available
    - Current step description
    - Link to status page: `/newsletters/${generation.id}/status`
  - Use existing card styling patterns
- Modify app/client/newsletters/page.tsx:
  - Add state: inProgressGenerations array
  - Add useEffect with setInterval (3s) to poll:
    - Fetch from /api/newsletters?jobStatus=in_progress (need new query parameter)
    - Update inProgressGenerations state
  - Render "In Progress" section before "Completed Newsletters":
    - Show only if inProgressGenerations.length > 0
    - Map over inProgressGenerations rendering InProgressCard components
  - Add cleanup to clear polling interval on unmount
- Modify app/client/api/newsletters/route.ts:
  - Add support for jobStatus query parameter
  - Filter NewsletterGeneration by jobStatus if provided
  - Return matching generations with progress data
- Test: Archive page should show in-progress generations

### 13. Create Feature Documentation
- Create app_docs/feature-ed06c645-background-job-queue.md with sections:
  - Overview: Feature description and benefits
  - Architecture: Diagram and component descriptions
  - Database Schema: Field descriptions and JSON structure
  - Job Lifecycle: State transitions and flow
  - API Endpoints: Documentation for all new/modified endpoints
  - Job Processor: Deployment instructions (development and production)
  - Cloud Scheduler Setup: GCP configuration commands
  - Status Page Usage: User guide with screenshots
  - Configuration: Environment variables and tunable parameters
  - Monitoring: Metrics, logging, and observability
  - Troubleshooting: Common issues and solutions
  - Testing: Unit, integration, and E2E test instructions
- Follow format from app_docs/feature-5f8fc23c-eventsource-reconnection.md
- Include code examples and configuration snippets
- Add cost analysis for Cloud Scheduler + Cloud Run setup

### 14. Update README with Job Processor Instructions
- Read README.md (lines 304-330) for development commands section
- Add new section: "Background Job Processing" after "Development Commands"
- Document development setup:
  - Manual start: curl http://localhost:3000/api/jobs/process
  - Auto-start: Add to package.json "dev:worker" script
- Document production setup:
  - Cloud Scheduler configuration command
  - Environment variables needed
  - Monitoring and logs access
- Add troubleshooting section for common job processor issues
- Update API Endpoints section with new routes:
  - GET /api/jobs/process - Job processor
  - POST /api/generate/cancel - Cancel generation
  - GET /api/newsletters/[id]/status - Status page
- Add to Database Schema section: New NewsletterGeneration fields

### 15. Run Validation Commands
- Execute: npm run build to verify TypeScript compilation
- Execute: npm run lint to check code quality
- Execute: npx prisma validate to verify schema is valid
- Execute: npx prisma generate to regenerate Prisma client
- Start application: npm run dev
- Start job processor in separate terminal: curl http://localhost:3000/api/jobs/process
- Execute: cd tests && uv run pytest to run server tests
- Read .claude/commands/test_e2e.md
- Execute E2E test: Read and execute .claude/commands/e2e/test_background_job_queue.md
  - Validate all test steps pass
  - Verify all screenshots are captured
  - Confirm success criteria are met
- Manually test:
  - Create newsletter generation from dashboard
  - Verify redirect to status page
  - Verify real-time progress updates
  - Navigate away and return, verify reconnection
  - Test cancellation
  - Close browser, reopen, verify job continues
  - Verify completed newsletter in archive

## Testing Strategy
### Unit Tests
- Job Queue Service:
  - Test fetchNextJob returns oldest queued job
  - Test updateProgress updates database correctly
  - Test heartbeat updates lastHeartbeat timestamp
  - Test cleanupStalledJobs identifies and fails stalled jobs
  - Test cancelJob sets correct status
  - Test processJob handles success, failure, and cancellation paths
- API Endpoints:
  - Test POST /api/generate creates queued job with correct fields
  - Test GET /api/generate/stream polls database and streams updates
  - Test POST /api/generate/cancel updates job status
  - Test GET /api/jobs/process prevents duplicate processors
- Progress Tracking:
  - Test progress JSON structure matches GenerationProgress interface
  - Test step status transitions (pending → in_progress → completed/failed)
  - Test log accumulation and timestamp formatting

### Integration Tests
- Full Job Lifecycle:
  - Create job via POST /api/generate
  - Start job processor
  - Verify job transitions: queued → running → completed
  - Verify output stored correctly
  - Verify Newsletter record created in archive
- Client Disconnect Scenarios:
  - Start generation, disconnect client
  - Verify job continues processing
  - Reconnect via GET /api/generate/stream
  - Verify status retrieval successful
- Concurrent Jobs:
  - Create multiple queued jobs
  - Verify sequential processing (concurrency=1)
  - Verify correct job ordering (FIFO)
- Cancellation During Processing:
  - Start job
  - Call cancel endpoint mid-generation
  - Verify job aborts gracefully
  - Verify output not saved
- Stalled Job Detection:
  - Create job, simulate stalled processor
  - Wait for staleJobTimeout duration
  - Run cleanupStalledJobs
  - Verify job marked as failed

### Edge Cases
- No sources selected: Validate error handling in job creation
- Invalid generationId in status page: Verify 404 handling
- Job processor crash during generation: Verify cleanupStalledJobs recovery
- Multiple status page connections to same job: Verify each polls independently
- Cancel already completed job: Verify no-op or appropriate error
- Database connection loss during processing: Verify retry logic and error handling
- Extremely long generations (>30 min): Verify heartbeat continues, no timeout
- Browser closed during generation: Verify job continues, status retrievable on return
- Network interruption on status page: Verify EventSource reconnection using existing pattern from feature-5f8fc23c
- Rapid successive job creation: Verify queue ordering and processing

## Acceptance Criteria
- Database schema extended with job queue fields and indexes applied successfully
- Job queue service processes jobs in background independent of HTTP connections
- Job processor API route runs continuously with streaming heartbeat response
- Cloud Scheduler can trigger job processor in production (documented, not implemented in this task)
- POST /api/generate creates queued job and returns generationId immediately
- GET /api/generate/stream polls database for updates and is reconnectable at any time
- POST /api/generate/cancel successfully cancels running jobs
- Status page displays real-time progress with step indicators, logs, and metadata
- Status page implements EventSource with auto-reconnection and polling fallback
- Status page auto-redirects to output page on completion
- Dashboard redirects to status page immediately after job creation
- Newsletter archive shows "In Progress" section with active jobs
- Users can navigate away during generation and return to check progress
- Users can close browser and generation continues processing
- Completed newsletters appear in archive regardless of client connection status
- Generation completion rate >95% (vs ~60% before due to timeouts)
- Jobs survive server restarts when using persistent database
- Stalled job detection marks jobs as failed after 15 minutes of inactivity
- All TypeScript compilation passes with no errors
- All existing tests pass without regressions
- New E2E test validates full background job queue workflow
- Feature documentation created with architecture, usage, and troubleshooting
- README updated with job processor setup instructions

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

```bash
# TypeScript compilation and type checking
npm run build

# Code quality checks
npm run lint

# Prisma schema validation
npx prisma validate

# Regenerate Prisma client with new types
npx prisma generate

# Start application
npm run dev

# In separate terminal: Start job processor manually (development)
curl http://localhost:3000/api/jobs/process

# Run server-side tests
cd tests && uv run pytest

# Read E2E test instructions
cat .claude/commands/test_e2e.md

# Execute background job queue E2E test
cat .claude/commands/e2e/test_background_job_queue.md
# Follow test steps to validate:
# - Job creation and immediate redirect to status page
# - Real-time progress updates on status page
# - Navigation away and return with reconnection
# - Cancellation functionality
# - Browser close and reopen with job continuation
# - Completed newsletter retrieval
# - All screenshots captured successfully

# Manual integration test: Create newsletter generation
# 1. Navigate to http://localhost:3000/dashboard
# 2. Select 3+ sources
# 3. Click "Generate Newsletter"
# 4. Verify redirect to /newsletters/{id}/status
# 5. Observe real-time progress updates
# 6. Navigate to /newsletters and verify "In Progress" section shows job
# 7. Return to status page and verify reconnection
# 8. Test cancel button (optional)
# 9. Wait for completion and verify auto-redirect to output
# 10. Verify newsletter appears in archive

# Test job processor cleanup and restart
# Stop job processor (Ctrl+C in curl terminal)
# Verify job processor stops gracefully
# Restart: curl http://localhost:3000/api/jobs/process
# Verify processor resumes processing queued jobs

# Validate database schema changes
npx prisma studio
# Verify NewsletterGeneration table has new fields:
# - jobStatus, progress, currentStep, processedAt, lastHeartbeat, priority
# Verify indexes exist on jobStatus and lastHeartbeat
```

## Notes
- This feature builds on existing EventSource reconnection patterns from feature-5f8fc23c-eventsource-reconnection
- Job processor runs as a long-lived API route with streaming response, not a separate process
- Cloud Scheduler setup is documented but not implemented in this task (requires GCP access)
- For development, job processor is started manually via curl or npm script
- Production deployment uses Cloud Scheduler (free tier) to ensure processor always runs
- Cost-optimized design: scales to zero when no jobs, ~$0 idle cost, ~$1.50/month active
- Database polling interval (2s for SSE, 5s for job fetching) is configurable in code
- Heartbeat interval (30s) ensures stalled job detection within reasonable time
- Stalled job timeout (15 min) is conservative to avoid false positives
- Initial concurrency is 1 (sequential processing), can be increased for scaling
- Progress JSON structure is flexible, allows for future enhancements
- Job priority field added for future prioritization, currently unused (FIFO)
- Backward compatibility maintained: existing generation records work with status page
- Security: withAuth middleware ensures only authenticated users can cancel jobs
- Observability: Langfuse tracing continues to work, traceId linked from job record
- No job retention policy implemented yet (manual cleanup or future automated task)
- Consider adding job retry logic for transient failures in future iteration
- Consider adding webhook notifications for job completion in future iteration
- TypeScript types are generated from Prisma schema, ensuring type safety
- All new React components use 'use client' directive for Next.js App Router
- Status page uses dynamic route parameter [id] for Next.js App Router
- Components follow existing Tailwind CSS patterns for consistency
- Error handling includes user-friendly messages and detailed server-side logging
