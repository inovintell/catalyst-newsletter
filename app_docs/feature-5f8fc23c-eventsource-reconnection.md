# EventSource Reconnection and Polling Fallback

**ADW ID:** 5f8fc23c
**Date:** 2025-11-05
**Specification:** specs/issue-16-adw-5f8fc23c-sdlc_planner-eventsource-reconnection.md

## Overview

Implemented robust EventSource reconnection logic with automatic polling fallback to handle SSE connection timeouts during long-running newsletter generation. When EventSource connections drop (typically after ~4 minutes), the client now automatically attempts reconnection with exponential backoff, then falls back to polling the generation status API to ensure users always receive their newsletter results.

## What Was Built

- GET endpoint for querying newsletter generation status by ID
- EventSource reconnection logic with exponential backoff (max 3 attempts)
- Automatic polling fallback mechanism when SSE reconnection fails
- User-facing connection status messages
- Timeout protection (10-minute max polling duration)

## Technical Implementation

### Files Modified

- `app/client/api/generate/route.ts`: Added GET handler to query generation status by ID, returning status, output, error, and completion timestamp
- `app/client/dashboard/page.tsx`: Refactored EventSource logic into `connectToEventSource()` function with reconnection handling and `startPolling()` fallback mechanism
- `.claude/commands/e2e/test_eventsource_reconnection.md`: Created E2E test specification for validating reconnection behavior

### Key Changes

- **GET /api/generate?id={generationId}** - New endpoint returns current generation status, output, and error information for polling fallback
- **connectToEventSource(generationId, attempt)** - Extracted EventSource creation into reusable function that tracks reconnection attempts and implements exponential backoff (2s, 4s, 8s delays)
- **onerror handler** - Detects connection failures, attempts up to 3 reconnections, then activates polling fallback
- **startPolling(generationId)** - Polls generation status every 3 seconds when SSE fails, with 10-minute timeout protection
- **Status messages** - User sees "Connection lost, reconnecting... (attempt X/3)" and "Switched to polling mode, checking status..." during recovery

## How to Use

### Normal Operation

1. Navigate to Dashboard
2. Select sources and date range
3. Click "Generate Newsletter"
4. SSE connection provides real-time progress updates
5. Newsletter completes and redirects to output page

### Connection Loss Recovery

1. If SSE connection drops during generation:
   - Client automatically attempts reconnection (3 attempts with exponential backoff)
   - Status message shows: "Connection lost, reconnecting... (attempt X/3)"
2. If reconnection fails:
   - Client switches to polling mode
   - Status message shows: "Switched to polling mode, checking status..."
   - Polls every 3 seconds until generation completes
3. Newsletter result is retrieved and displayed regardless of connection method

## Configuration

- **Max reconnection attempts**: 3 (hardcoded in `connectToEventSource`)
- **Reconnection backoff**: Exponential (2s, 4s, 8s)
- **Polling interval**: 3 seconds
- **Max polling duration**: 10 minutes
- Modify these values in `app/client/dashboard/page.tsx:240-250`

## Testing

### E2E Test

Execute the E2E test:
```bash
# Read test instructions
cat .claude/commands/test_e2e.md

# Execute reconnection test
cat .claude/commands/e2e/test_eventsource_reconnection.md
```

### Manual Testing

1. Start newsletter generation with multiple sources (3+)
2. Wait for SSE connection timeout (~4-5 minutes)
3. Observe reconnection attempts in browser console
4. Verify polling activates after failed reconnections
5. Confirm newsletter result is retrieved successfully
6. Check Network tab for reconnection requests and polling calls

### Validation Commands

```bash
npm run build    # TypeScript compilation
npm run lint     # Code quality
# Execute E2E test per .claude/commands/e2e/test_eventsource_reconnection.md
```

## Notes

- Browser SSE timeouts vary (typically 4-5 minutes) based on browser and network conditions
- Server-side generation continues uninterrupted even if client disconnects
- Polling provides fallback but is less efficient than SSE; reconnection attempts prioritize SSE first
- 10-minute polling timeout prevents infinite polling for stuck generations
- EventSource and polling intervals are cleaned up on component unmount to prevent memory leaks
- Connection status messages are user-friendly without exposing technical error details
