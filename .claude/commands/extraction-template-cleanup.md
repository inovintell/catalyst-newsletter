# HTA Extraction Template Cleanup Command

## Purpose

This command normalizes and fixes structural issues in HTA extraction templates when transitioning between versions. It's designed to be reusable across different template versions, ensuring consistency in question numbering, native text references, and visual formatting.

## Critical Understanding Before Starting

### What is "Native Text"?
Native text refers to supplementary text fields in the original language of the HTA report. These appear in two patterns:

1. **Row-based (Main grid sheet)**: Native text occupies the row immediately following a question row
   - Column A: Empty or contains "native text" label
   - Column B: Contains "native text" 
   - Column C: Should reference the parent question number (this often needs fixing)

2. **Column-based (most other sheets)**: Native text columns are adjacent to question columns
   - These are DATA ENTRY fields
   - DO NOT add question identifiers to data rows
   - Only the header row should contain identifiers like "native text / Q###"

### Common Mistakes to Avoid
❌ **DON'T** add descriptions to question numbers (wrong: "Q700 / Cost data", correct: "Q700")
❌ **DON'T** add question IDs to native text data entry cells in column-based sheets
❌ **DON'T** assume all native text fields need question references
✅ **DO** fix native text references only in Main grid sheet (row-based)
✅ **DO** keep native text columns in other sheets as empty data entry fields

## Reference Templates

The following templates are stored in the repository for reference:

```
services/extraction-svc/
├── assets/
│   ├── HTA extraction template_V6.41.xlsx    # Original template with issues
│   ├── HTA extraction template_V6.42.xlsx    # Cleaned template (example output)
│   └── hta_template_v6.4_schema.json        # Schema reference
└── docs/
    └── HTA_TEMPLATE_CHANGES_v6.4_to_v6.41.md # Detailed change documentation
```

## Arguments

```python
cleanup_hta_template(
    input_path: str,              # Path to template file
    output_version: str = None,   # Optional: Output version (auto-increments if not provided)
    question_buffer: int = 30,    # Minimum gap between sheet question ranges
    dry_run: bool = False         # Preview changes without saving
)
```

### Required Setup
```bash
# Install dependencies
uv add openpyxl lxml
```

## Workflow

### Step 1: Analyze Existing Structure

1. **Load template and scan all sheets**
   ```python
   # Detect existing question patterns:
   # - Q### (e.g., Q18)
   # - [Q###] (e.g., [Q18])
   # - Q###-### (e.g., Q501-522)
   ```

2. **Map question number usage**
   - Identify highest used question number
   - Find available ranges for new sheets
   - Document existing allocations

### Step 2: Allocate Question Numbers for New Sheets

**Algorithm for Dynamic Allocation:**
```python
def allocate_question_range(existing_questions, buffer_size=30):
    # Find the highest existing question number
    max_q = max(existing_questions)
    
    # Start new allocations at next hundred boundary
    start = ((max_q // 100) + 1) * 100
    
    # Allocate ranges with buffer
    allocations = {
        'Costs GBA only': (start, start + buffer_size),
        'Results Summary GBA only': (start + buffer_size, start + (buffer_size * 2)),
        'Notes': (start + (buffer_size * 2), start + (buffer_size * 3))
    }
    return allocations
```

**Current Template Allocations (v6.41 → v6.42):**
- Existing questions: Q0-Q607
- New allocations:
  - Costs GBA only: Q700-Q729
  - Results Summary GBA only: Q730-Q759
  - Notes: Q760-Q789 (reserved for future use)

### Step 3: Fix Native Text References

#### 3.1 Main Grid Sheet (Row-based Native Text)
```python
# Pattern to identify and fix:
for row in sheet:
    if column_A contains "Q##":
        current_question = extract_number(column_A)
        next_row = row + 1
        
        if next_row.column_B == "native text":
            # Fix: Ensure column C references current_question
            if next_row.column_C != f"Q{current_question}":
                next_row.column_C = f"Q{current_question}"
                log_fix(f"Row {next_row}: Fixed Q reference")
```

**Example Fix:**
```
Row 42: [Q24] Is a managed entry agreement applied?
Row 43: native text | Q21 → Q24  # Fixed from Q21 to Q24
```

#### 3.2 Other Sheets (Column-based Native Text)
**NO ACTION REQUIRED** - These are data entry fields:
- Alternative treatment(s)
- ITC(s)
- Reported outcomes
- Studies & ITCs results

### Step 4: Apply Color Normalization

```python
COLOR_SCHEME = {
    'grey': '#D3D3D3',        # Germany-specific (not filled)
    'yellow': '#FFFF00',      # Fields requiring input
    'turquoise': '#40E0D0',   # Question headers (all countries)
    'light_turquoise': '#AFEEEE'  # Native text indicators
}

# Apply colors based on content patterns:
if cell.is_header and contains_question_number:
    cell.fill = COLOR_SCHEME['turquoise']
elif 'native text' in cell.value:
    cell.fill = COLOR_SCHEME['light_turquoise']
elif 'GERMANY ONLY' in cell.value:
    cell.fill = COLOR_SCHEME['grey']
elif contains_instruction_text:
    cell.fill = COLOR_SCHEME['yellow']
```

### Step 5: Save and Version

1. **Auto-increment version if not specified:**
   ```python
   # Extract version from filename
   current_version = "6.41"  # from HTA extraction template_V6.41.xlsx
   new_version = increment_patch(current_version)  # → "6.42"
   ```

2. **Save files:**
   - Template: `HTA extraction template_V{new_version}.xlsx`
   - Summary: `TEMPLATE_CLEANUP_SUMMARY.md`

## Report Format

### Generated Summary Structure

```markdown
# HTA Template Cleanup Summary

## Template Version: {old_version} → {new_version}
## Date: {timestamp}

## Changes Made:

### Question Number Additions
- {sheet_name}: Added Q{start}-Q{end} ({count} questions)

### Native Text Fixes
- Main grid: Fixed {count} native text references
  - Example: Row {n} changed Q{wrong} → Q{correct}

### Color Normalization
- Applied to {count} sheets
- Color scheme: {description}

## Question Number Allocations:
{sheet}: Q{start}-Q{end} (buffer of {size} questions)

## Validation Results:
✅ No question number overlaps detected
✅ All native text references validated
✅ Color scheme consistently applied
✅ Version incremented to {new_version}

## Files Generated:
- Template: HTA extraction template_V{new_version}.xlsx
- Summary: TEMPLATE_CLEANUP_SUMMARY.md
```

## Validation Checklist

### Pre-Cleanup Validation
- [ ] Verify input file exists and is valid Excel format
- [ ] Check for required sheets (Main grid, etc.)
- [ ] Detect current version from filename
- [ ] Identify new sheets requiring question numbers

### During Cleanup
- [ ] Log all changes for audit trail
- [ ] Verify no question number overlaps
- [ ] Confirm native text pattern detection
- [ ] Track color changes per sheet

### Post-Cleanup Validation
- [ ] All new sheets have question numbers (headers only)
- [ ] Main grid native text references are correct
- [ ] No question IDs in data entry rows
- [ ] Colors applied consistently
- [ ] Summary report generated

## Troubleshooting

### Common Issues and Solutions

1. **Issue**: Question numbers appearing in data rows
   - **Cause**: Incorrectly treating column-based native text as row-based
   - **Solution**: Only Main grid sheet needs native text fixes in rows

2. **Issue**: Question descriptions in headers (e.g., "Q700 / Cost data")
   - **Cause**: Adding descriptive text to question numbers
   - **Solution**: Use only the question number (e.g., "Q700")

3. **Issue**: Overlapping question ranges
   - **Cause**: Insufficient buffer between sheets
   - **Solution**: Maintain minimum 30-question buffer

4. **Issue**: Colors not applying correctly
   - **Cause**: Pattern matching too strict/loose
   - **Solution**: Review regex patterns and cell content
