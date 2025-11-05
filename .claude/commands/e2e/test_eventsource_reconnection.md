# E2E Test: EventSource Reconnection Handling

Test EventSource reconnection and polling fallback functionality during newsletter generation SSE timeout scenarios.

## User Story

As a newsletter administrator
I want the client to automatically reconnect when SSE connections drop
So that long-running newsletter generations complete successfully without manual intervention

## Prerequisites

- Application is running (npm run dev)
- Database has at least 3 active news sources configured
- Claude Agent SDK is properly configured
- ANTHROPIC_API_KEY is set in environment
- Browser developer tools available for simulating connection issues

## Test Steps

### Step 1: Navigate to Dashboard

1. Navigate to `http://localhost:3000`
2. Take a screenshot of the Dashboard page
3. **Verify** the page title displays "Catalyst Newsletter"
4. **Verify** the "Generate Newsletter" section is visible
5. **Verify** source selection checkboxes are displayed

### Step 2: Configure Newsletter Generation

6. Select at least 3 different news sources from the list
7. Set the "From" date to 7 days ago from today
8. Set the "To" date to today
9. **Verify** the configuration is complete and ready
10. Take a screenshot showing selected sources and date range

### Step 3: Start Newsletter Generation

11. Open browser developer console (F12) and switch to Network tab
12. Click the "Generate Newsletter" button
13. **Verify** the button text changes to "Generating..." or shows a loading state
14. **Verify** the generation progress indicator appears
15. **Verify** an EventSource connection appears in the Network tab (type: eventsource)
16. Take a screenshot of the Network tab showing the EventSource connection
17. Take a screenshot of the generation in progress

### Step 4: Simulate SSE Connection Timeout

18. In the browser console, execute JavaScript to close the EventSource connection:
    ```javascript
    // Find and close the EventSource connection
    // This simulates an SSE timeout
    const proto = Object.getPrototypeOf(EventSource.prototype);
    const originalClose = proto.close;
    proto.close = function() {
      console.log('[TEST] EventSource closed');
      originalClose.call(this);
    };
    ```
19. Wait for approximately 5-10 seconds to ensure the generation has started
20. In the console, find the EventSource object and close it manually or refresh the connection by triggering an error
21. Take a screenshot of the console showing the connection closure

### Step 5: Verify Reconnection Attempts

22. **Verify** the status message changes to show "Connection lost, reconnecting... (attempt 1/3)"
23. **Verify** the UI does not freeze or show an error immediately
24. **Verify** a new EventSource connection appears in the Network tab (reconnection attempt)
25. Take a screenshot showing the reconnection status message
26. Observe the exponential backoff between reconnection attempts (2s, 4s, 8s)
27. **Verify** up to 3 reconnection attempts are made

### Step 6: Verify Polling Fallback Activation

28. If reconnection attempts fail, **verify** status message changes to "Switched to polling mode, checking status..."
29. **Verify** polling requests appear in the Network tab as XHR/fetch requests to `/api/generate?id={generationId}`
30. **Verify** polling requests occur approximately every 3 seconds
31. Take a screenshot showing polling mode status message
32. Take a screenshot of the Network tab showing polling requests

### Step 7: Verify Newsletter Completion via Polling

33. **Verify** the polling mechanism successfully retrieves the generation status
34. **Verify** when the generation completes, the status changes to "Newsletter generated successfully!"
35. **Verify** the newsletter output is displayed correctly
36. **Verify** the newsletter contains content from all selected sources
37. Take a screenshot of the completed newsletter (top section)
38. Take a screenshot of the completed newsletter (bottom section)

### Step 8: Verify No Memory Leaks

39. Open browser console and check for any warnings about unclosed EventSource connections
40. **Verify** polling intervals are cleared after newsletter completion
41. **Verify** no continuous polling occurs after the newsletter is complete
42. Take a screenshot of the console showing no errors or warnings

### Step 9: Test Successful Reconnection (Alternative Path)

43. Start a new newsletter generation
44. Wait 5-10 seconds for generation to start
45. Manually trigger a single EventSource error (without fully closing the server)
46. **Verify** the client successfully reconnects on the first or second attempt
47. **Verify** status message shows "Reconnected successfully" or similar
48. **Verify** the newsletter completes normally via SSE (not polling)
49. Take a screenshot showing successful reconnection

### Step 10: Test Maximum Polling Timeout

50. Start a new newsletter generation
51. Force immediate polling mode by closing EventSource after all reconnection attempts
52. Wait and observe polling behavior
53. **Verify** polling continues for up to 10 minutes maximum
54. **Verify** if generation doesn't complete in 10 minutes, timeout message appears: "Generation timeout exceeded. Please try again."
55. Take a screenshot showing timeout handling (if applicable)

## Success Criteria

- Dashboard loads successfully with source selection interface
- Newsletter generation starts without errors
- EventSource connection is established in the Network tab
- When EventSource connection drops, reconnection attempts are made automatically
- Reconnection status messages are displayed: "Connection lost, reconnecting... (attempt X/3)"
- Up to 3 reconnection attempts occur with exponential backoff (2s, 4s, 8s)
- After failed reconnections, polling fallback activates automatically
- Polling status message is displayed: "Switched to polling mode, checking status..."
- Polling requests appear in Network tab at ~3 second intervals
- Newsletter generation continues server-side during connection loss
- Newsletter is successfully retrieved and displayed via polling
- No JavaScript errors appear in browser console
- No memory leaks from unclosed EventSource or polling intervals
- Successful reconnection works when SSE stream is available
- Maximum polling timeout (10 minutes) is enforced
- At least 10 screenshots are taken:
  1. Initial Dashboard page
  2. Selected sources and date range
  3. Network tab showing EventSource connection
  4. Generation in progress
  5. Connection closure in console
  6. Reconnection status message
  7. Polling mode status message
  8. Network tab showing polling requests
  9. Completed newsletter (top)
  10. Completed newsletter (bottom)
  11. Console showing no errors

## Notes

- This test simulates real-world SSE timeout scenarios (typically 4-5 minutes in browsers)
- Reconnection logic uses exponential backoff to avoid overwhelming the server
- Polling is a fallback mechanism, not the primary delivery method
- Server-side generation must continue even when client disconnects
- Proper cleanup of EventSource and polling intervals prevents memory leaks
- The test may need to be run with longer generation times to trigger real timeouts
- Consider using browser DevTools throttling to simulate poor network conditions
- If testing with real SSE timeouts, wait 4+ minutes for natural connection closure
