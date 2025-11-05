# E2E Test: Background Job Queue System

Test the background job queue functionality for newsletter generation, including job creation, status monitoring, cancellation, reconnection, and completion flow.

## User Story

As a newsletter administrator
I want newsletter generation to continue running in the background even if I close my browser or lose connection
So that I can initiate long-running generations without worrying about timeouts

## Prerequisites

- Application is running (npm run dev)
- Database has at least 3 active news sources configured
- Claude Agent SDK is properly configured
- ANTHROPIC_API_KEY is set in environment
- Job processor is running via `curl http://localhost:3000/api/jobs/process` in a separate terminal
- Browser developer tools available

## Test Steps

### Step 1: Start Job Processor

1. Open a new terminal window
2. Run: `curl http://localhost:3000/api/jobs/process`
3. **Verify** the connection establishes and heartbeat events appear every 30 seconds
4. Take a screenshot of the terminal showing heartbeat events
5. Leave this terminal running for the duration of the test

### Step 2: Navigate to Dashboard

6. Navigate to `http://localhost:3000/dashboard`
7. Take a screenshot of the Dashboard page
8. **Verify** the page title displays "Catalyst Newsletter"
9. **Verify** the "Generate Newsletter" section is visible
10. **Verify** source selection is displayed

### Step 3: Configure Newsletter Generation

11. Select at least 3 different news sources from the list
12. Set the "From" date to 7 days ago from today
13. Set the "To" date to today
14. **Verify** the configuration is complete and ready
15. Take a screenshot showing selected sources and date range

### Step 4: Submit Generation and Verify Redirect

16. Open browser developer console (F12) and switch to Network tab
17. Click the "Generate Newsletter" button
18. **Verify** a POST request to `/api/generate` completes successfully
19. **Verify** the response contains `generationId` and `status: "queued"`
20. **Verify** a toast notification appears: "Generation started! Redirecting to status page..."
21. **Verify** the browser redirects to `/newsletters/{generationId}/status` within 1 second
22. Take a screenshot of the redirect happening

### Step 5: Verify Status Page Displays Progress

23. **Verify** the status page displays "Newsletter Generation Status" heading
24. **Verify** the generation ID is shown
25. **Verify** the connection indicator shows "Connected" (green dot)
26. **Verify** the progress stepper displays 4 stages: Queued, Processing, Formatting, Complete
27. **Verify** the current stage is highlighted (either Queued or Processing)
28. **Verify** the current status message is displayed (e.g., "Job queued for processing")
29. Take a screenshot of the status page initial state
30. **Verify** an EventSource connection to `/api/generate/stream?id={generationId}` appears in Network tab
31. Take a screenshot of the Network tab showing the EventSource connection

### Step 6: Monitor Real-Time Progress Updates

32. Wait for the job to transition from "queued" to "running"
33. **Verify** the progress stepper updates to highlight "Processing" stage
34. **Verify** status messages update in real-time (within 2 seconds)
35. **Verify** the Progress Logs section appears and shows log entries
36. **Verify** log entries include timestamps
37. Take a screenshot showing logs and running status
38. **Verify** the job processor terminal shows execution logs
39. Take a screenshot of the job processor terminal showing job execution

### Step 7: Test Browser Close and Reconnection

40. Copy the current status page URL from the address bar
41. Close the browser tab (or entire browser window)
42. Wait 10-15 seconds
43. Open a new browser window/tab
44. Navigate to the copied status page URL
45. **Verify** the status page reconnects to the in-progress job
46. **Verify** the EventSource connection is re-established
47. **Verify** progress updates continue from where they left off
48. **Verify** the current status reflects the actual job state (not starting from beginning)
49. Take a screenshot showing successful reconnection with updated progress

### Step 8: Verify Archive "In Progress" Section

50. While the generation is still running, open a new tab
51. Navigate to `http://localhost:3000/newsletters`
52. **Verify** an "In Progress" section appears above the completed newsletters
53. **Verify** the current generation is listed with its ID and status
54. **Verify** the current step is displayed
55. **Verify** an animated pulse indicator appears next to the job
56. **Verify** "View Status" and "Cancel" buttons are present
57. Take a screenshot of the archive page with "In Progress" section
58. Click "View Status" button
59. **Verify** it navigates to the status page for that job

### Step 9: Test Cancellation (New Generation)

60. Navigate back to dashboard (`/dashboard`)
61. Start a new generation with the same configuration
62. Wait for redirect to status page
63. **Verify** the status page loads for the new generation
64. Click the "Cancel Generation" button
65. **Verify** a confirmation dialog appears: "Are you sure you want to cancel this generation?"
66. Click "OK" to confirm cancellation
67. **Verify** the status updates to "Cancelling..." then "Cancelled by user"
68. **Verify** the job status changes to "cancelled"
69. **Verify** an error message displays: "Generation was cancelled"
70. Take a screenshot of the cancelled generation status

### Step 10: Verify Cancelled Job in Archive

71. Navigate to `/newsletters`
72. **Verify** the cancelled job is no longer in the "In Progress" section
73. **Verify** the cancelled job does not appear in the completed newsletters list
74. Take a screenshot of the archive page without the cancelled job

### Step 11: Wait for First Generation to Complete

75. Navigate back to the first generation's status page (the one not cancelled)
76. **Verify** the generation continues processing
77. Wait for the generation to complete (may take 2-5 minutes)
78. **Verify** the progress stepper reaches "Complete" stage
79. **Verify** status message shows "Newsletter generation completed!"
80. **Verify** the Output Preview section appears with newsletter content
81. Take a screenshot of the completed status page
82. **Verify** after 2 seconds, the page auto-redirects to `/newsletters/output?id={generationId}`
83. Take a screenshot of the newsletter output page

### Step 12: Verify Completed Job in Archive

84. Navigate to `/newsletters`
85. **Verify** the completed job is no longer in the "In Progress" section
86. **Verify** the completed newsletter appears in the main newsletters table
87. **Verify** the status badge shows "completed" (green)
88. **Verify** the "View" button is available for the completed newsletter
89. Take a screenshot of the archive page with the completed newsletter

### Step 13: Test EventSource Reconnection on Connection Loss

90. Start a new generation from the dashboard
91. Wait for redirect to status page
92. In the browser console, execute: `window.dispatchEvent(new Event('offline'))`
93. **Verify** the connection indicator changes to "Disconnected" (red dot)
94. **Verify** reconnection attempts begin automatically
95. **Verify** the status page shows reconnection attempts with exponential backoff
96. Wait a few seconds, then execute: `window.dispatchEvent(new Event('online'))`
97. **Verify** the EventSource connection re-establishes
98. **Verify** progress updates resume
99. Take a screenshot showing successful reconnection

### Step 14: Verify Job Processor Heartbeat

100. Switch to the terminal running the job processor
101. **Verify** heartbeat events continue appearing every 30 seconds
102. **Verify** the heartbeat includes status information (isRunning, currentJobId, activeJobs)
103. Take a screenshot of multiple heartbeat events in the terminal

### Step 15: Stop Job Processor and Verify Stalled Job Detection (Optional)

104. Stop the job processor by pressing Ctrl+C in the terminal
105. Start a new generation from the dashboard
106. **Verify** the job is created and appears in "In Progress"
107. Wait 16 minutes (or modify stalledJobTimeout to 1 minute for testing)
108. **Verify** the job is automatically marked as "failed"
109. **Verify** the error message indicates "Job stalled - no heartbeat detected"
110. Take a screenshot of the stalled job status

## Success Criteria

- [x] Job creation returns immediately with generationId and jobStatus='queued'
- [x] Dashboard redirects to status page within 500ms
- [x] Status page displays real-time progress with <2s latency
- [x] Progress stepper accurately reflects current stage
- [x] Browser close and reopen successfully reconnects to in-progress job
- [x] Archive page "In Progress" section polls and updates every 3 seconds
- [x] Cancellation button successfully cancels running/queued jobs
- [x] Cancelled jobs disappear from "In Progress" section
- [x] Completed jobs auto-redirect to output page after 2 seconds
- [x] Completed jobs appear in archive with "View" button
- [x] EventSource connection handles disconnects with automatic reconnection
- [x] Job processor sends heartbeat events every 30 seconds
- [x] Stalled job detection marks abandoned jobs as failed after timeout
- [x] No console errors or warnings throughout the test
- [x] All screenshots captured successfully (minimum 15 screenshots)

## Notes

- The job processor must be running continuously for jobs to be executed
- In production, use Cloud Scheduler to trigger the job processor endpoint every 5 minutes
- For faster testing, temporarily modify heartbeat and polling intervals
- Ensure sufficient ANTHROPIC_API_KEY credits for multiple test generations
