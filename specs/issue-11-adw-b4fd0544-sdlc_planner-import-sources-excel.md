# Feature: Import Sources from Excel File

## Metadata
issue_number: `11`
adw_id: `b4fd0544`
issue_json: `{"number":11,"title":"Import sources from Excel file *.xls not *.csv","body":"Using openpyxl with lxml libraries, read contents of the source files and replace csv processing with it.\nModify upload screen with the description of file format, ability to automatically parse urls from links in the url column.\n\nthere should be no backward compatibility with csv files, stick to excel files only."}`

## Feature Description
Replace the existing CSV import functionality with Excel file (.xls, .xlsx) import capabilities using openpyxl and lxml libraries. The system will parse Excel files to import news sources, automatically detecting and extracting URLs from hyperlinked cells. The upload interface will be updated to reflect the new file format requirements and provide clear guidance on the expected Excel file structure. All CSV-related code will be removed as the system will exclusively support Excel files.

## User Story
As a newsletter administrator
I want to import news sources from Excel files
So that I can efficiently bulk-upload sources with clickable URL links and maintain better data organization using Excel's native features

## Problem Statement
The current CSV import functionality has limitations:
- Cannot preserve clickable URL links from Excel exports
- Requires manual URL extraction from Excel files before import
- CSV format doesn't maintain rich data formatting available in Excel
- Users typically maintain source lists in Excel but must convert to CSV first
- The conversion process is error-prone and adds unnecessary friction

## Solution Statement
Implement native Excel file import using openpyxl library to:
- Directly parse .xls and .xlsx files without intermediate conversion
- Automatically extract URLs from hyperlinked cells in the URL/Link column
- Provide clear file format instructions in the upload UI
- Remove all CSV processing code to maintain a single, streamlined import path
- Leverage lxml for efficient XML parsing of Excel file internals

## Relevant Files
Use these files to implement the feature:

- **app/client/api/sources/import/route.ts** - Current CSV import API endpoint that needs to be replaced with Excel parsing logic
- **app/client/components/CSVImport.tsx** - Import dialog component that needs UI updates for Excel file format and file type acceptance
- **app/client/sources/page.tsx** - Sources management page that references the import dialog (button text and component usage may need updates)
- **prisma/schema.prisma** - Database schema to verify NewsSource model fields align with Excel import structure
- **test-import.csv** - Sample import file that should be replaced with an Excel equivalent for testing
- **package.json** - Dependencies file where we'll need to add openpyxl equivalent for Node.js environment

### New Files

- **app/client/lib/excelParser.ts** - New utility module for Excel file parsing logic using openpyxl-equivalent library
- **test-import.xlsx** - New sample Excel file demonstrating the expected file format with hyperlinked URLs
- **.claude/commands/e2e/test_excel_import.md** - E2E test specification to validate Excel import functionality works end-to-end

## Implementation Plan

### Phase 1: Foundation
Set up Excel parsing infrastructure by identifying and installing the appropriate Node.js library for Excel file processing (since openpyxl is Python-specific). Research indicates `xlsx` (SheetJS) or `exceljs` are suitable alternatives for Node.js/TypeScript environments. Install the chosen library and its type definitions. Create a utility module to encapsulate Excel parsing logic, including cell value extraction and hyperlink URL detection.

### Phase 2: Core Implementation
Replace the CSV parsing logic in the import API endpoint with Excel parsing. Implement logic to:
- Read Excel files from FormData
- Parse the Excel structure to identify headers and data rows
- Extract cell values including text content
- Detect and extract hyperlink URLs from cells (especially in the URL/Link column)
- Map Excel columns to NewsSource database fields
- Maintain existing duplicate handling logic (skip vs update)
- Preserve existing error handling and validation patterns

### Phase 3: Integration
Update the frontend import dialog to:
- Change file input accept attribute from `.csv` to `.xls,.xlsx`
- Update UI text and labels to reference "Excel file" instead of "CSV"
- Update the file format example to show Excel column headers
- Modify button text from "Import CSV" to "Import Excel"
- Update component name and references from CSVImport to ExcelImport
- Add file format description explaining Excel structure and hyperlink support

## Step by Step Tasks

### Research and Select Excel Library
- Research Node.js Excel parsing libraries (xlsx, exceljs, xlsx-populate)
- Evaluate library features for hyperlink extraction capability
- Select library based on: TypeScript support, hyperlink detection, active maintenance, bundle size
- Document library choice rationale

### Install Dependencies
- Run `npm install` command to add selected Excel library (likely `xlsx` or `exceljs`)
- Install TypeScript type definitions if needed (`@types/xlsx` or similar)
- Update package.json with library dependency
- Verify installation with simple test import

### Create Excel Parser Utility
- Create `app/client/lib/excelParser.ts` file
- Implement `parseExcelFile` function that accepts a File object
- Add logic to read Excel file buffer
- Parse workbook and access first worksheet
- Map column headers to identify: Website, Topic, Link, Comment, Geo scope
- Extract row data including cell values
- Implement hyperlink URL extraction for Link column cells
- Return structured data array matching NewsSource format
- Add TypeScript interfaces for parsed data structure
- Include error handling for malformed Excel files

### Update Import API Endpoint
- Read `app/client/api/sources/import/route.ts`
- Remove CSV parsing logic (lines 17-38)
- Import the new Excel parser utility
- Replace CSV parsing with call to `parseExcelFile`
- Update file validation to check for .xls/.xlsx extensions
- Ensure duplicate handling logic remains unchanged
- Maintain existing error response structure
- Update error messages to reference "Excel file" instead of "CSV"
- Test API endpoint with sample Excel file

### Update Import Dialog Component
- Read `app/client/components/CSVImport.tsx`
- Rename component from `CSVImport` to `ExcelImport`
- Rename file from `CSVImport.tsx` to `ExcelImport.tsx`
- Update file input accept attribute: `accept=".xls,.xlsx"`
- Update modal title: "Import Sources from Excel"
- Update file format description to show Excel headers
- Update all UI text references from "CSV" to "Excel"
- Add description about hyperlink support: "URLs can be entered as text or Excel hyperlinks"
- Update import button text
- Update error messages

### Update Sources Page References
- Read `app/client/sources/page.tsx`
- Update import statement from `CSVImport` to `ExcelImport`
- Update import path to reference `ExcelImport.tsx`
- Update button text from "Import CSV" to "Import Excel"
- Verify component integration works correctly

### Create Sample Excel File
- Create `test-import.xlsx` file with sample data
- Include columns: Website, Topic, Link, Comment, Geo scope
- Add sample rows with various sources
- Add hyperlinks to Link column cells demonstrating URL extraction
- Include edge cases: text URLs, hyperlinked URLs, empty cells
- Document file structure in comments or README

### Create E2E Test Specification
- Read `.claude/commands/test_e2e.md` to understand test format
- Read `.claude/commands/e2e/test_basic_extraction.md` for example structure
- Create `.claude/commands/e2e/test_excel_import.md`
- Define User Story for Excel import testing
- Document test steps:
  1. Navigate to /sources page
  2. Click "Import Excel" button
  3. Verify dialog shows Excel file format instructions
  4. Select test-import.xlsx file
  5. Verify file name appears in dialog
  6. Select duplicate handling option
  7. Click Import button
  8. Verify import progress indicator
  9. Verify success message with import summary
  10. Verify sources appear in table
  11. Verify hyperlinked URLs were correctly extracted
- Define success criteria and expected screenshots
- Include validation for URL extraction from hyperlinks

### Remove CSV-Related Code
- Search codebase for any remaining CSV references
- Delete `test-import.csv` file
- Remove any CSV utility functions if they exist
- Update any documentation or comments referencing CSV import
- Verify no CSV file type acceptance remains in code

### Run Validation Commands
- Execute all commands from the Validation Commands section below
- Ensure all tests pass with zero regressions
- Fix any issues discovered during validation
- Verify Excel import works end-to-end via E2E test

## Testing Strategy

### Unit Tests
- Test Excel parser utility with various Excel file structures
- Test hyperlink extraction from different cell types
- Test error handling for invalid Excel files
- Test column mapping with different header variations
- Test row parsing with missing or empty cells
- Mock Excel file inputs to test edge cases

### Integration Tests
- Test full import flow from file upload to database insertion
- Test duplicate handling (skip vs update) with Excel imports
- Test API endpoint error responses for invalid files
- Test that existing sources are correctly updated
- Test transaction rollback on partial import failures

### Edge Cases
- Excel file with no data rows (only headers)
- Excel file with missing required columns
- Cells with hyperlinks but no display text
- Cells with text URLs (not hyperlinked)
- Mixed hyperlink and text URLs in same import
- Excel file with multiple worksheets (only process first)
- Very large Excel files (100+ rows)
- Excel files with special characters in cells
- Empty cells in required fields
- Corrupted or password-protected Excel files
- Excel files from different Excel versions (.xls vs .xlsx)

## Acceptance Criteria
- ✅ User can select and upload .xls or .xlsx files through the import dialog
- ✅ CSV files are no longer accepted by the file input
- ✅ Excel files with hyperlinked URLs correctly extract the URL (not just display text)
- ✅ Excel files with plain text URLs correctly import the text as URL
- ✅ Import dialog clearly describes Excel file format with example columns
- ✅ Import dialog mentions hyperlink support for URL column
- ✅ All existing CSV import code is removed from codebase
- ✅ Duplicate handling (skip/update) works identically to previous CSV implementation
- ✅ Import summary shows correct counts for imported, updated, skipped, and error records
- ✅ Sample Excel file (test-import.xlsx) is provided for testing
- ✅ E2E test validates complete Excel import workflow including hyperlink extraction
- ✅ Error messages are clear and reference Excel format
- ✅ No regression in existing source management functionality

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

```bash
# Verify dependencies are installed
npm list xlsx || npm list exceljs

# Type check the entire application
npm run type-check

# Run Next.js build to ensure no build errors
npm run build

# Start the development server for manual testing
npm run dev
# (Open http://localhost:3000/sources in browser and test Excel import manually)

# Test file upload with sample Excel file
# Manual test: Upload test-import.xlsx and verify:
# - File is accepted by dialog
# - Import completes successfully
# - Hyperlinked URLs are extracted correctly
# - Plain text URLs are imported correctly
# - Import summary shows correct counts
# - Sources appear in the table

# Read .claude/commands/test_e2e.md, then read and execute .claude/commands/e2e/test_excel_import.md
# to validate Excel import functionality end-to-end with automated browser testing

# Verify CSV files are rejected
# Manual test: Try to upload a .csv file and verify it's not accepted by file input

# Check for any remaining CSV references in codebase
grep -r "CSV" app/client/ --exclude-dir=node_modules | grep -v "test_"
# Expected: Only historical references in comments, no active CSV processing code

# Verify test-import.csv has been removed
ls test-import.csv 2>/dev/null && echo "ERROR: CSV file still exists" || echo "OK: CSV file removed"

# Run database connectivity check
docker-compose exec app npx prisma db pull --preview-feature 2>/dev/null || echo "DB connection test not applicable"
```

## Notes

### Library Selection Rationale
Since this is a Node.js/TypeScript Next.js application, we cannot use Python's openpyxl library directly. The recommended alternatives are:
- **xlsx (SheetJS)**: Most popular, comprehensive Excel parsing, supports hyperlinks via `l` property on cells
- **exceljs**: Modern API, good TypeScript support, active maintenance, full hyperlink support
- **Recommendation**: Use `xlsx` for its maturity and extensive hyperlink extraction capabilities

### Hyperlink Extraction Details
Excel cells can contain hyperlinks separate from display text. The parser must:
1. Check if cell has a hyperlink property (e.g., `cell.l` in xlsx library)
2. Extract the hyperlink URL if present
3. Fall back to cell text value if no hyperlink exists
4. Handle both external URLs and internal references

### Migration Strategy
This is a breaking change that removes CSV support entirely. Consider:
- Adding a one-time migration notice for users currently using CSV imports
- Providing documentation on how to save CSV as Excel
- Keeping test-import.csv temporarily for comparison during development, then removing before merge

### Future Enhancements (Out of Scope)
- Support for importing from multiple worksheets
- Column mapping UI for non-standard Excel formats
- Excel file template download feature
- Batch validation before import preview
- Import history and rollback capability
