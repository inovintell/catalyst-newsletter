# E2E Test Runner

Execute end-to-end (E2E) tests using Playwright browser automation (MCP Server). If any errors occur and assertions fail mark the test as failed and explain exactly what went wrong.

## Variables

adw_id: $1 if provided, otherwise generate a random 8 character hex string
agent_name: $2 if provided, otherwise use 'test_e2e'
e2e_test_file: $3
application_url: $4 if provided, otherwise determine from port configuration:
  - If `.ports.env` exists, source it and use http://localhost:${BACKEND_PORT}/docs
  - Otherwise use default http://localhost:8000/docs

## Instructions

- If `application_url` was not provided, check for `.ports.env`:
  - If it exists, source it and use http://localhost:${BACKEND_PORT}/docs
  - Otherwise use default http://localhost:8000/docs
- Read the `e2e_test_file`
- Digest the `User Story` to first understand what we're validating
- IMPORTANT: Execute the `Test Steps` detailed in the `e2e_test_file` using Playwright browser automation
- Review the `Success Criteria` and if any of them fail, mark the test as failed and explain exactly what went wrong
- Review the steps that say '**Verify**...' and if they fail, mark the test as failed and explain exactly what went wrong
- Capture screenshots as specified
- IMPORTANT: Return results in the format requested by the `Output Format`
- Initialize Playwright browser in headed mode for visibility
- Use the determined `application_url`
- Allow time for async operations and element visibility
- IMPORTANT: Save screenshots using RELATIVE paths from your current working directory
- DO NOT use `pwd` or absolute paths
- IMPORTANT: After taking each screenshot, save it to `Screenshot Directory` with descriptive names
- Capture and report any errors encountered
- Ultra think about the `Test Steps` and execute them in order
- If you encounter an error, mark the test as failed immediately and explain exactly what went wrong and on what step it occurred. For example: '(Step 1 ❌) Failed to find element with selector "try-out-button" on page "http://localhost:8000/docs"'

## Setup

Read and Execute `.claude/commands/prepare_app.md` now to prepare the application for the test.

## Screenshot Directory

agents/<adw_id>/<agent_name>/img/<directory name based on test file name>/*.png

Each screenshot should be saved with a descriptive name that reflects what is being captured. The directory structure ensures that:
- Screenshots are organized by ADW ID (workflow run)
- They are stored under the specified agent name (e.g., e2e_test_runner_0, e2e_test_resolver_iter1_0)
- Each test has its own subdirectory based on the test file name (e.g., test_basic_query → basic_query/)

## Report

- Exclusively return the JSON output as specified in the test file
- Capture any unexpected errors
- IMPORTANT: Ensure all screenshots are saved in the `Screenshot Directory`

### Output Format

```json
{
  "test_name": "Test Name Here",
  "status": "passed|failed",
  "screenshots": [
    "agents/<adw_id>/<agent_name>/img/<test name>/01_<descriptive name>.png",
    "agents/<adw_id>/<agent_name>/img/<test name>/02_<descriptive name>.png",
    "agents/<adw_id>/<agent_name>/img/<test name>/03_<descriptive name>.png"
  ],
  "error": null
}
```