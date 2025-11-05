# Bug: EventSource Timeout and Reconnection Handling

## Metadata
issue_number: `16`
adw_id: `5f8fc23c`
issue_json: `{"number":16,"title":"Client-Side EventSource timeout","body":"#  Problem Location\n\n  `app/client/dashboard/page.tsx:163` - EventSource has no error handling or reconnection:\n\n ```js\n const eventSource = new EventSource(`/api/generate/stream?id=${generationId}`)\n```\n\n## Root Cause\n  1. No EventSource error handler - Connection drops silently after ~4 mins\n  2. No reconnection logic - When SSE times out, client gives up\n  3. No polling fallback - Can't check server status after disconnect\n\n## Solution\nAdd EventSource Reconnection \n```js\n  eventSource.onerror = (error) => {\n    // Retry connection if server still processing\n    const checkStatus = setInterval(async () => {\n      const res = await fetch(`/api/generate?id=${generationId}`)\n      const gen = await res.json()\n      if (gen.status === 'completed') {\n        // Show result\n        clearInterval(checkStatus)\n      }\n    }, 3000)\n  }\n```\n "}`

## Bug Description
The client-side EventSource connection in `app/client/dashboard/page.tsx:163` has no error handling or reconnection logic. When the SSE (Server-Sent Events) connection times out after approximately 4 minutes during long-running newsletter generation, the client connection drops silently, leaving users without progress updates or final results. The browser shows a stuck "Generating..." state with no feedback about the actual generation status.

**Symptoms:**
- Connection drops silently after ~4 minutes during newsletter generation
- UI remains in "Generating..." state indefinitely
- No feedback to user about connection loss
- Newsletter may complete successfully on the server but client never receives the result

**Expected Behavior:**
- Client should detect EventSource connection failures
- Client should attempt to reconnect to the SSE stream
- Client should fall back to polling the generation status API if SSE fails repeatedly
- User should see appropriate status messages during reconnection attempts

**Actual Behavior:**
- EventSource closes with no error handling
- No reconnection attempts are made
- UI freezes in loading state
- User must manually refresh the page to recover

## Problem Statement
The EventSource connection lacks robust error handling and reconnection logic, causing silent failures during long-running newsletter generation operations that exceed browser SSE timeout limits.

## Solution Statement
Implement comprehensive EventSource error handling with automatic reconnection logic and a polling fallback mechanism. When the SSE connection drops, the client will attempt to reconnect to the stream. After multiple failed reconnection attempts, the client will fall back to polling the `/api/generate?id={generationId}` endpoint to check generation status and retrieve results when complete.

## Steps to Reproduce
1. Navigate to the Dashboard at `http://localhost:3000`
2. Select multiple sources (3+) and configure a date range
3. Click "Generate Newsletter"
4. Observe the SSE connection in browser DevTools Network tab
5. Wait for approximately 4-5 minutes while newsletter generation continues
6. Observe that the EventSource connection closes (status changes to "finished" or "failed")
7. Note that the UI remains stuck in "Generating..." state
8. Check that no reconnection attempts are made
9. Verify that even if server completes generation successfully, client never receives the result

## Root Cause Analysis
The EventSource connection at `app/client/dashboard/page.tsx:163` is created without any error handling:

```js
const eventSource = new EventSource(`/api/generate/stream?id=${generationId}`)
```

The code only listens for 'status', 'complete', and 'error' events but never implements an `onerror` handler for connection-level errors. When the browser's SSE timeout is reached (~4 minutes), the connection closes automatically, but there is no logic to:

1. Detect the connection closure
2. Attempt to reestablish the SSE stream
3. Fall back to an alternative mechanism (polling) to retrieve generation status
4. Update the UI to reflect connection issues

Additionally, there is no mechanism to query the server for generation status outside of the SSE stream, meaning that once the connection is lost, there is no way for the client to recover without a full page reload.

## Relevant Files
Use these files to fix the bug:

- `app/client/dashboard/page.tsx:163-206` - EventSource creation and event listeners that need error handling and reconnection logic
- `app/client/api/generate/route.ts` - POST endpoint that creates generation records; need to add GET handler to query generation status by ID for polling fallback
- `app/client/api/generate/stream/route.ts` - SSE stream endpoint; ensure it properly handles reconnection scenarios and sends appropriate Connection headers

### New Files
- `.claude/commands/e2e/test_eventsource_reconnection.md` - E2E test to validate reconnection behavior under SSE timeout conditions

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Add GET handler to `/api/generate` for status polling
- Add a GET method handler to `app/client/api/generate/route.ts`
- Accept `id` query parameter (generation ID)
- Query `prisma.newsletterGeneration.findUnique()` for the generation record
- Return status, output (if completed), and error (if failed)
- Include proper error handling for invalid or missing generation IDs
- Return JSON response with `{ id, status, output?, error?, completedAt? }`

### Implement EventSource reconnection logic in dashboard
- In `app/client/dashboard/page.tsx`, wrap EventSource creation in a function to enable reconnection
- Add state variables for tracking reconnection attempts and connection status
- Implement `eventSource.onerror` handler that:
  - Detects connection failures
  - Attempts to reconnect to the SSE stream (max 3 attempts with exponential backoff)
  - Falls back to polling if reconnection fails repeatedly
- Update the existing event listeners to handle reconnection scenarios
- Add UI feedback for connection issues (e.g., "Reconnecting..." status message)

### Implement polling fallback mechanism
- Create a polling function that:
  - Calls `GET /api/generate?id={generationId}` every 3-5 seconds
  - Checks generation status from the response
  - Updates UI with status messages
  - Handles completed generation by displaying output
  - Handles failed generation by displaying error
  - Stops polling when generation reaches terminal state (completed/failed)
- Ensure polling is only activated after SSE reconnection attempts fail
- Clean up polling interval on component unmount

### Add connection state UI feedback
- Update `GenerationProgress` component or dashboard UI to show connection status
- Display messages like:
  - "Generating newsletter..."
  - "Connection lost, reconnecting... (attempt X/3)"
  - "Switched to polling mode, checking status..."
  - "Reconnected successfully"
- Ensure status messages are user-friendly and not overly technical

### Verify SSE stream endpoint configuration
- Review `app/client/api/generate/stream/route.ts`
- Ensure proper SSE headers are set (Content-Type, Cache-Control, Connection)
- Verify the stream properly handles client disconnection/reconnection
- Confirm that the generation continues server-side even if client disconnects

### Create E2E test for reconnection behavior
- Read `.claude/commands/test_e2e.md` to understand the E2E test framework
- Read `.claude/commands/e2e/test_parallel_source_fetching.md` as a reference example
- Create a new E2E test file at `.claude/commands/e2e/test_eventsource_reconnection.md`
- The test should:
  - Start a newsletter generation
  - Simulate SSE connection timeout (using browser automation to close EventSource)
  - Verify that reconnection attempts are made
  - Verify that polling fallback activates after failed reconnections
  - Verify that the newsletter result is retrieved successfully via polling
  - Capture screenshots at each stage (initial generation, connection loss, reconnection, polling, final result)
  - Include assertions for all success criteria

### Run validation commands
- Execute all validation commands listed in the `Validation Commands` section
- Ensure zero regressions in existing tests
- Verify the bug is fixed by running the new E2E test

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run build` - Ensure TypeScript compilation succeeds with no errors
- `npm run lint` - Verify code follows linting standards
- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test file `.claude/commands/e2e/test_eventsource_reconnection.md` to validate the reconnection functionality works correctly under SSE timeout conditions
- Manual validation: Start newsletter generation, wait 4+ minutes to trigger SSE timeout, verify reconnection/polling works and final result is retrieved
- Check browser DevTools Network tab to confirm reconnection attempts and polling requests are made
- Verify no JavaScript errors appear in browser console during reconnection

## Notes
- Browser SSE timeout is typically 4-5 minutes but may vary by browser and network conditions
- Exponential backoff for reconnection attempts: 2s, 4s, 8s (max 3 attempts)
- Polling interval should be reasonable (3-5 seconds) to balance responsiveness and server load
- Consider adding a maximum generation timeout (e.g., 10 minutes) after which polling stops with error message
- Ensure proper cleanup of EventSource and polling intervals on component unmount to prevent memory leaks
- The server-side generation process should continue uninterrupted even if the client disconnects
- If Langfuse tracing is enabled, ensure reconnection attempts are properly traced
