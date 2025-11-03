# E2E Test: Basic Extraction API

Test basic extraction functionality in the HTA Extraction Service via the interactive API documentation.

## User Story

As a developer
I want to test the extraction endpoint through the API documentation
So that I can verify the service extracts HTA data correctly

## Prerequisites

Obtain the developer API key from `API_KEYS.md`:
- **API Key**: `extr_dev_4f3a9b7c8d2e1f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1v0w`

## Test Steps

### Step 1: Navigate and Authorize

1. Navigate to the `Application URL/docs`
2. Take a screenshot of the Swagger/OpenAPI documentation page
3. **Verify** the page title contains "Swagger UI"
4. **Verify** the API endpoints are listed:
   - POST /api/v1/extract
   - GET /api/v1/schemas
   - GET /health/live
   - GET /health/ready

5. Click the "Authorize" button (lock icon) at the top right of the page
6. In the authorization dialog, enter the API key in the "X-API-Key" field:
   ```
   extr_dev_4f3a9b7c8d2e1f6g5h4i3j2k1l0m9n8o7p6q5r4s3t2u1v0w
   ```
7. Click the "Authorize" button to confirm
8. **Verify** the authorization is successful (lock icon should change to indicate authorized state)
9. Click "Close" to dismiss the authorization dialog
10. Take a screenshot showing the authorized state

### Step 2: Test the Extraction Endpoint

11. Scroll to the POST /api/v1/extract endpoint
12. Click to expand the endpoint details
13. Click the "Try it out" button (this should now be enabled after authorization)
14. Take a screenshot of the request body schema
15. **Verify** the request body shows required fields:
    - document_content
    - schema_version
    - document_metadata

16. Enter test request body (use mock data for Skyrizi):
    ```json
    {
      "document_content": "Test HTA document for Skyrizi",
      "schema_version": "6.42",
      "document_metadata": {
        "document_id": "SKYRIZI_CT-17924",
        "agency": "HAS"
      }
    }
    ```
17. Click the "Execute" button
18. **Verify** the response status is 200 (not 401 Unauthorized)
19. **Verify** the response body contains:
    - document_id
    - schema_version
    - data object with main_grid
    - metadata with extraction_timestamp
20. Take a screenshot of the response

## Success Criteria
- /docs page loads successfully
- Authorization with API key works correctly
- Lock icon indicates authorized state
- API documentation is interactive and functional
- POST /api/v1/extract endpoint is accessible after authorization
- "Try it out" functionality is enabled after authorization
- Request executes successfully with status 200 (not 401)
- Response contains properly structured extraction data
- 3 screenshots are taken:
  1. Initial Swagger UI page
  2. Authorized state
  3. Successful API response
