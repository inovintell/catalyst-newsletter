# E2E Test: Parallel Source Fetching

Test parallel source fetching functionality using the source-fetcher subagent for newsletter generation.

## User Story

As a newsletter administrator
I want sources to be fetched in parallel using specialized subagents
So that newsletter generation completes faster and provides more timely intelligence

## Prerequisites

- Application is running (npm run dev)
- Database has at least 3 active news sources configured
- Claude Agent SDK is properly configured
- ANTHROPIC_API_KEY is set in environment

## Test Steps

### Step 1: Navigate to Dashboard

1. Navigate to `http://localhost:3000`
2. Take a screenshot of the Dashboard page
3. **Verify** the page title displays "Catalyst Newsletter"
4. **Verify** the "Generate Newsletter" section is visible
5. **Verify** source selection checkboxes are displayed

### Step 2: Select Multiple Sources

6. Select at least 3 different news sources from the list (e.g., NICE, EMA, ISPOR)
7. **Verify** selected sources have different topics (HTA Decisions, Drug Approvals, etc.)
8. **Verify** selected sources have different geographic scopes (UK, EU, Global)
9. Take a screenshot showing selected sources

### Step 3: Configure Date Range

10. Set the "From" date to 7 days ago from today
11. Set the "To" date to today
12. **Verify** the date range picker displays the correct dates
13. Take a screenshot of the configured date range

### Step 4: Initiate Newsletter Generation

14. Click the "Generate Newsletter" button
15. **Verify** the button text changes to "Generating..." or shows a loading state
16. **Verify** the generation progress indicator appears
17. Take a screenshot of the generation in progress
18. **Verify** no immediate errors appear in the browser console

### Step 5: Monitor Streaming Progress

19. Observe the streaming newsletter content as it appears
20. **Verify** content begins to appear within 30 seconds
21. **Verify** the newsletter includes an executive summary section
22. **Verify** content is displayed progressively (streamed in real-time)
23. Take a screenshot of partial content during streaming

### Step 6: Verify Completed Newsletter

24. Wait for newsletter generation to complete
25. **Verify** the generation completes successfully (no error messages)
26. **Verify** the newsletter contains sections from all 3+ selected sources
27. **Verify** each section includes:
    - Source name attribution
    - Publication dates
    - News item titles
    - Summaries and key points
    - Relevant URLs
28. Take a screenshot of the completed newsletter (top section)
29. Scroll down and take a screenshot of the bottom section

### Step 7: Validate Content Structure

30. **Verify** the newsletter follows the expected format (executive/detailed/custom)
31. **Verify** news items are organized by category or source
32. **Verify** no placeholder text like "TODO" or "Coming soon" appears
33. **Verify** URLs in the newsletter are valid and clickable
34. **Verify** the newsletter ends cleanly without follow-up questions

### Step 8: Check for Errors and Logs

35. Open browser developer console (F12)
36. **Verify** no JavaScript errors are logged
37. **Verify** no failed network requests (check Network tab)
38. Take a screenshot of the console showing no errors
39. If server logs are accessible, check for agent invocation messages
40. **Verify** no critical errors in server logs

### Step 9: Test Partial Failure Handling

41. Generate a new newsletter with one invalid source (if possible, or skip this step)
42. **Verify** the newsletter generates successfully with content from valid sources
43. **Verify** a note is included about the failed source (if applicable)
44. Take a screenshot showing graceful error handling

### Step 10: Test Single Source

45. Deselect all sources except one
46. Generate a newsletter with a single source
47. **Verify** generation completes successfully with single-source content
48. **Verify** no errors occur when only one subagent is invoked
49. Take a screenshot of the single-source newsletter

## Success Criteria

- Dashboard loads successfully with source selection interface
- Multiple sources (3+) can be selected from different topics and regions
- Date range can be configured correctly
- Newsletter generation starts without errors
- Content streams progressively in real-time
- Newsletter completes successfully within reasonable time (< 2 minutes)
- Generated newsletter includes content from all selected sources
- Newsletter structure is well-organized with proper sections
- Source attribution is preserved for all news items
- No errors appear in browser console during generation
- No failed network requests or server errors
- Graceful handling of partial failures (if tested)
- Single-source generation works correctly
- Newsletter format matches expected output (executive summary, organized content, no conversational additions)
- At least 7 screenshots are taken:
  1. Initial Dashboard page
  2. Selected sources
  3. Configured date range
  4. Generation in progress
  5. Partial streamed content
  6. Completed newsletter (top)
  7. Completed newsletter (bottom)
  8. Browser console showing no errors

## Notes

- Actual parallel execution performance may not be directly measurable from the UI
- Focus is on functional correctness: all sources are processed and newsletter is complete
- Monitor server logs (if available) to verify subagent invocations
- If Claude API rate limits are hit, wait and retry
- Token usage may be higher due to parallel subagent execution
