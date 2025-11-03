# Feature: Import sources from Excel file

## Metadata
issue_number: `11`
adw_id: `3a881d92`
issue_json: `{"number":11,"title":"Import sources from Excel file *.xls not *.csv","body":"Using openpyxl with lxml libraries, read contents of the source files and replace csv processing with it.\nModify upload screen with the description of file format, ability to automatically parse urls from links in the url column.\n\nthere should be no backward compatibility with csv files, stick to excel files only."}`

## Feature Description
This feature migrates the news source import functionality from CSV files to Excel files (.xlsx). The implementation will use openpyxl library for parsing Excel files, support automatic URL extraction from hyperlinks in cells, and update the UI to reflect the new file format requirements. The feature removes CSV support entirely and standardizes on Excel as the sole import format.

## User Story
As a newsletter administrator
I want to import news sources from Excel files with automatic URL extraction from hyperlinks
So that I can efficiently manage sources using spreadsheet software with rich formatting and link support

## Problem Statement
The current CSV import system has limitations:
- CSV files don't support hyperlinks, requiring users to manually copy URLs as text
- No rich formatting or validation capabilities
- Semicolon-delimited format is less standard than Excel
- Manual URL extraction is error-prone and time-consuming

## Solution Statement
Replace CSV processing with Excel file parsing using openpyxl:
- Parse .xlsx files with openpyxl library
- Automatically extract URLs from hyperlinked cells in the URL/Link column
- Update UI to display Excel format requirements and examples
- Remove all CSV-related code and file acceptance
- Maintain existing duplicate handling logic (skip/update)

## Relevant Files
Use these files to implement the feature:

- **app/client/api/sources/import/route.ts:1-102** - Current CSV import endpoint that needs Excel migration. Contains FormData handling, duplicate detection logic, and database operations that will be preserved.

- **app/client/components/CSVImport.tsx:1-199** - Import UI component. Needs renaming to ExcelImport.tsx, file accept attribute changed to .xlsx, format description updated, and button text updated.

- **app/client/sources/page.tsx:125-130** - Source management page that references CSVImport component. Import statement and button text need updating.

- **package.json:1-54** - Project dependencies. Need to add openpyxl equivalent for Node.js (xlsx or exceljs library).

- **prisma/schema.prisma:10-27** - NewsSource model schema. No changes needed, validates current data structure is compatible.

- **test-import.csv:1-6** - Sample CSV file used for testing. Needs conversion to .xlsx format for test data.

- **.claude/commands/test_e2e.md:1-68** - E2E test runner template for understanding test structure
- **.claude/commands/e2e/test_basic_extraction.md:1-83** - E2E test example for understanding test format

### New Files

- **app/client/components/ExcelImport.tsx** - Renamed and refactored version of CSVImport.tsx with Excel-specific UI and validation

- **app/client/lib/excel-parser.ts** - New utility module for Excel file parsing with openpyxl-equivalent library (exceljs), handling hyperlink extraction and data validation

- **test-import.xlsx** - Sample Excel file for testing import functionality, replacing test-import.csv

- **.claude/commands/e2e/test_excel_import.md** - E2E test specification to validate Excel import functionality through the UI

## Implementation Plan

### Phase 1: Foundation
- Research and select appropriate Node.js Excel parsing library (exceljs recommended over xlsx for better hyperlink support)
- Install exceljs library and verify compatibility with Next.js server-side API routes
- Create Excel parsing utility module with hyperlink extraction capabilities
- Create sample .xlsx test file with proper format and hyperlinks

### Phase 2: Core Implementation
- Implement Excel parsing logic to replace CSV text parsing
- Extract URLs from Excel hyperlinks automatically (fallback to cell text if no hyperlink)
- Migrate duplicate handling and validation logic to new parser
- Update API route to accept .xlsx files instead of .csv
- Add error handling for malformed Excel files and missing required columns

### Phase 3: Integration
- Rename and update UI component from CSVImport to ExcelImport
- Update file input accept attribute to .xlsx only
- Modify format description to show Excel column structure
- Update parent page to import and use ExcelImport component
- Update button text throughout UI ("Import CSV" → "Import Excel")
- Remove old CSV test file and verify no CSV references remain

## Step by Step Tasks

### Research and Setup
- Research Node.js Excel libraries (exceljs vs xlsx)
- Install chosen library with `npm install exceljs` or equivalent
- Verify exceljs works in Next.js API routes environment
- Document library choice and rationale in implementation notes

### Create Excel Parser Utility
- Create `app/client/lib/excel-parser.ts` module
- Implement `parseExcelFile(buffer: Buffer)` function
- Add hyperlink extraction from cells (check cell.hyperlink property)
- Add validation for required columns (Website, Topic, Link, Comment, Geo scope)
- Add error handling for malformed files
- Return structured data array matching current CSV parser output format
- Write unit tests for parser utility

### Update API Route
- Update `app/client/api/sources/import/route.ts`
- Import excel-parser utility
- Replace CSV text parsing with Excel parsing
- Convert File to Buffer for excel parser
- Update file validation to check for .xlsx extension
- Preserve existing duplicate handling logic
- Maintain error reporting structure
- Test API endpoint with sample Excel file

### Update UI Components
- Rename `app/client/components/CSVImport.tsx` to `app/client/components/ExcelImport.tsx`
- Update component name and interface names
- Change file input accept attribute from `.csv` to `.xlsx`
- Update format description to show Excel column headers
- Add note about hyperlink support in Link column
- Update button text and loading states
- Update error messages to reference Excel files
- Test component with sample Excel file

### Update Parent Page
- Update `app/client/sources/page.tsx`
- Change import from CSVImport to ExcelImport
- Update button text from "Import CSV" to "Import Excel"
- Verify component integration works correctly

### Create Test Data and E2E Test
- Convert `test-import.csv` to `test-import.xlsx`
- Add hyperlinks to URL/Link column in Excel file
- Include test cases for both hyperlinked and text URLs
- Create `.claude/commands/e2e/test_excel_import.md` test specification
- Define test steps: navigate to sources, open import modal, select file, verify import
- Specify screenshot requirements at each validation step
- Include success criteria for hyperlink extraction validation

### Clean Up
- Delete `test-import.csv` file
- Search codebase for any remaining CSV references
- Remove any CSV-related comments or documentation
- Update any relevant README sections if they mention CSV import

### Validation
- Run all validation commands to ensure zero regressions
- Execute E2E test to validate Excel import works end-to-end
- Verify hyperlink extraction works correctly
- Test error handling with malformed Excel files
- Verify duplicate handling (skip/update) still works

## Testing Strategy

### Unit Tests
- Excel parser utility tests:
  - Parse valid Excel file with all required columns
  - Extract URLs from hyperlinked cells
  - Fallback to cell text when no hyperlink present
  - Handle missing required columns gracefully
  - Reject files with invalid structure
  - Handle Excel files with extra columns

### Integration Tests
- API endpoint tests:
  - Accept .xlsx files and reject .csv files
  - Successfully import sources from Excel
  - Maintain duplicate detection (skip mode)
  - Maintain duplicate update (update mode)
  - Return correct import statistics
  - Handle errors and return appropriate status codes

### Edge Cases
- Excel file with empty rows
- Excel file with header row missing
- Excel file with only header row
- Cell with hyperlink but empty display text
- Cell with text but no hyperlink
- Invalid Excel file (corrupted or wrong format)
- Very large Excel file (performance testing)
- Special characters in cell values
- Multiple sheets in workbook (only parse first sheet)

## Acceptance Criteria
- ✅ CSV import functionality completely removed from codebase
- ✅ Excel (.xlsx) files can be uploaded through UI
- ✅ URLs are automatically extracted from hyperlinked cells
- ✅ Plain text URLs still work when no hyperlink present
- ✅ UI displays Excel format requirements clearly
- ✅ File input only accepts .xlsx files
- ✅ Duplicate handling (skip/update) works identically to CSV version
- ✅ Import statistics are accurate (imported/updated/skipped/errors)
- ✅ Error messages are clear and Excel-specific
- ✅ No console errors or warnings during import
- ✅ E2E test validates complete import workflow
- ✅ All existing sources functionality remains working

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Search for CSV references: `grep -r "CSV\|\.csv" app/client --exclude-dir=node_modules` - Should only show this plan file
- Verify no CSV files: `find . -name "*.csv" -not -path "./node_modules/*"` - Should return empty or only test fixtures
- Check Excel library installed: `cat package.json | grep -i excel` - Should show exceljs dependency
- Verify Excel component exists: `ls -la app/client/components/ExcelImport.tsx` - File should exist
- Verify parser utility exists: `ls -la app/client/lib/excel-parser.ts` - File should exist
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_excel_import.md` to validate Excel import functionality works end-to-end
- Manual test: Upload sample Excel file through UI and verify import succeeds with correct statistics
- Manual test: Upload Excel with hyperlinked URLs and verify URLs extracted correctly
- Manual test: Try to upload CSV file and verify it's rejected

## Notes

### Library Selection
**Recommended: exceljs**
- Better hyperlink support (cell.hyperlink property)
- Actively maintained with good TypeScript support
- Works well in Node.js server environments
- More features for future enhancements

Alternative: xlsx (sheetjs)
- Lightweight and fast
- Hyperlink extraction requires more manual work
- Consider if bundle size is critical

### Excel Format Specification
Expected column headers (case-insensitive matching):
1. **Website** - Source name (required)
2. **Topic** - Content category (required)
3. **Link** - URL (can be hyperlink or text, required)
4. **Comment** - Additional notes (optional)
5. **Geo scope** - Geographic coverage (required)

### Hyperlink Extraction Logic
```typescript
// Pseudocode for URL extraction
const url = cell.hyperlink?.hyperlink || cell.value || cell.text || ''
```

### Future Considerations
- Support for multiple sheets (select sheet in UI)
- Excel template download feature
- Data validation in Excel using formulas
- Richer metadata from Excel formatting (colors, comments)
- Batch operations using Excel formulas
- Export sources back to Excel format
