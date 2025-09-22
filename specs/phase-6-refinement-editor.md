# Phase 6: Refinement Editor

## Overview
Enable users to refine and improve generated newsletter content through direct editing and AI-assisted refinement prompts.

## Completed Features

### 1. Refinement Page (`/newsletters/refine`)
- **Direct Content Editing**:
  - Full-text editor with character count
  - Manual editing capabilities
  - Preserve original content for reset

### 2. AI Refinement System
- **Section Selection**:
  - Entire newsletter refinement
  - Section-specific refinement (Executive Summary, Regulatory, Market Access, etc.)

- **Refinement Prompts**:
  - Free-form refinement instructions
  - Quick suggestion buttons:
    - Make it more concise
    - Add more detail
    - Focus on specific markets
    - Include competitor analysis
    - Add data and statistics
    - Adjust for audience (technical/executive)
    - Add action items

### 3. Refinement API (`/api/refine`)
- Mock refinement logic for different prompt types
- Section-aware refinement
- Simulated AI processing delay

### 4. User Actions
- **Apply Refinement**: Send prompt to AI for content improvement
- **Save Changes**: Return to output page with refined content
- **Reset to Original**: Restore initial generated content

## Technical Implementation

### Components Created
```typescript
// app/newsletters/refine/page.tsx
- Main refinement interface
- Section selector
- Refinement prompt input
- Quick suggestions
- Content editor
- Action buttons (Save, Reset)

// app/api/refine/route.ts
- Process refinement requests
- Mock AI refinement logic
- Section-specific handling
```

### State Management
- SessionStorage for passing content between pages
- Local state for editing and refinement status
- Preserve original content for reset functionality

## User Flow

1. **Navigate from Output Page**
   - Click "Refine Content" button
   - Content passed via sessionStorage

2. **Select Refinement Scope**
   - Choose entire newsletter or specific section
   - See section dropdown with options

3. **Provide Refinement Instructions**
   - Type custom instructions
   - Or select quick suggestions
   - Click "Apply Refinement"

4. **Review Changes**
   - See refined content in editor
   - Make manual adjustments if needed
   - Compare with original

5. **Save or Continue**
   - Save changes and return to output
   - Apply additional refinements
   - Reset to original if needed

## Integration Points

### With Phase 4 (Agent Integration)
- Refinement prompts will be sent to actual Claude Code sub-agent
- Real-time streaming of refined content

### With Phase 5 (Output Rendering)
- Refined content displayed with proper formatting
- Export refined version in multiple formats

### With Phase 7 (Agent Configuration)
- Refinement history used to improve agent prompts
- Learn from user preferences

## Mock Refinements (Current Implementation)

| Prompt Keyword | Mock Behavior |
|---------------|--------------|
| "concise" | Reduces content by filtering lines |
| "detail" | Adds placeholder for detailed analysis |
| "executive" | Creates executive summary format |
| "technical" | Adds technical references |
| Other | Adds refinement note to content |

## Future Enhancements (Phase 7)

- Real Claude Code sub-agent integration
- Streaming refinement updates
- Multi-step refinement conversations
- Refinement history and versioning
- Suggested refinements based on content analysis
- Collaborative refinement with team comments

## Success Criteria
✅ Users can navigate to refinement page from output
✅ Manual editing of newsletter content works
✅ AI refinement prompts can be submitted
✅ Quick suggestions provide one-click refinements
✅ Section-specific refinement is available
✅ Original content can be restored
✅ Refined content saves back to output page