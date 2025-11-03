# E2E Test: Excel Import Functionality

Test Excel file import functionality for news sources.

## User Story

As a newsletter administrator
I want to import news sources from Excel files
So that I can efficiently bulk-upload sources with hyperlinked URLs

## Prerequisites

- Application is running (npm run dev)
- test-import.xlsx file exists in the project root
- Database is accessible

## Test Steps

### Step 1: Navigate to Sources Page

1. Navigate to `http://localhost:3000/sources`
2. Take a screenshot of the Sources page
3. **Verify** the page title displays "News Sources"
4. **Verify** the "Import Excel" button is visible
5. **Verify** the "Add New Source" button is visible

### Step 2: Open Import Dialog

6. Click the "Import Excel" button
7. Take a screenshot of the import dialog
8. **Verify** the dialog title displays "Import Sources from Excel"
9. **Verify** the file format description shows:
   - "Upload an Excel file (.xlsx or .xls)"
   - Column format: "Website | Topic | Link | Comment | Geo scope"
   - Hyperlink support message is displayed
10. **Verify** file input accepts only .xlsx and .xls files
11. **Verify** two duplicate handling options are shown:
    - Skip duplicates (default selected)
    - Update duplicates

### Step 3: Select Excel File

12. Click the file input to select a file
13. Select the `test-import.xlsx` file from the project root
14. **Verify** the file name appears in the file input
15. **Verify** the Import button becomes enabled
16. Take a screenshot showing the selected file

### Step 4: Import with Skip Duplicates

17. Ensure "Skip duplicates" option is selected
18. Click the "Import" button
19. **Verify** the button text changes to "Importing..."
20. **Verify** the Import button becomes disabled during import
21. Wait for import to complete
22. **Verify** the Import Summary section appears
23. **Verify** the summary shows:
    - Number of new sources imported (should be 5)
    - No update count (or 0 updated)
    - Green success background color
24. Take a screenshot of the import summary
25. **Verify** the dialog closes automatically after 3 seconds
26. **Verify** the sources table refreshes and displays the imported sources

### Step 5: Verify Imported Data

27. Take a screenshot of the sources table
28. **Verify** the following sources appear in the table:
    - TechCrunch (Technology, Global)
    - The Verge (Technology, Global)
    - Reuters (Business, Global)
    - Bloomberg (Finance, Global)
    - BBC News (General, UK)
29. **Verify** URLs were correctly extracted from hyperlinks
30. Click on any imported source to view details
31. **Verify** the Comment field contains the expected text

### Step 6: Test Duplicate Handling

32. Click the "Import Excel" button again
33. Select the same `test-import.xlsx` file
34. Ensure "Skip duplicates" is selected
35. Click "Import" button
36. **Verify** the Import Summary shows:
    - 0 new sources imported
    - 5 duplicates skipped
    - Yellow warning background for skipped items
37. Click "View skipped sources" to expand details
38. **Verify** all 5 sources are listed as skipped
39. Take a screenshot of the skipped sources details

### Step 7: Test Update Duplicates

40. Keep the import dialog open (or reopen it)
41. Select the same `test-import.xlsx` file
42. Select "Update duplicates" option
43. Click "Import" button
44. **Verify** the Import Summary shows:
    - 0 new sources imported
    - 5 sources updated
    - Blue info background for updates
45. Take a screenshot of the update summary
46. **Verify** the dialog closes and table refreshes

### Step 8: Test Invalid File Handling

47. Click "Import Excel" button
48. Try to select a .csv file (if file picker allows)
49. **Verify** .csv files are not selectable in the file picker
50. Cancel the file selection
51. **Verify** Import button remains disabled without a valid file

## Success Criteria

- Sources page loads successfully
- Import Excel dialog opens and displays correct format instructions
- Excel file upload accepts .xlsx and .xls files only
- Hyperlink support is mentioned in the dialog
- File selection updates the UI appropriately
- Import progress is shown with disabled button and "Importing..." text
- Import summary displays accurate counts for imported, updated, and skipped sources
- Success/warning background colors are displayed correctly
- Skipped sources details are expandable and show correct information
- Dialog auto-closes after successful import
- Sources table refreshes and displays imported data
- Duplicate handling works correctly for both "skip" and "update" modes
- URLs are correctly extracted from hyperlinked cells
- All imported source data matches the Excel file content
- At least 6 screenshots are taken:
  1. Initial Sources page
  2. Import dialog with format instructions
  3. Selected file ready to import
  4. First import summary (new sources)
  5. Second import summary (skipped duplicates)
  6. Update import summary (updated sources)
