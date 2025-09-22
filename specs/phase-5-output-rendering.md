# Phase 5: Output Rendering & Display

## Overview
Enhance the newsletter output display with professional formatting, multiple export options, and preview capabilities.

## Features

### 1. Markdown Rendering
- **Rich Text Display**: Render markdown with proper formatting
  - Headers, lists, tables, links
  - Code blocks with syntax highlighting
  - Bold, italic, and other text formatting
- **Custom Styling**: Apply InovIntell branding to rendered output
- **Table of Contents**: Auto-generate TOC from headers

### 2. Export Options
- **Multiple Formats**:
  - HTML export with embedded styles
  - PDF generation with headers/footers
  - Word document (.docx) export
  - Plain text with preserved formatting
- **Email-ready HTML**: Generate HTML optimized for email clients
- **Print-friendly CSS**: Optimized layout for printing

### 3. Template System
- **Pre-built Templates**:
  - Executive briefing template
  - Detailed analysis template
  - Weekly digest template
  - Custom template builder
- **Template Variables**: Dynamic content insertion
- **Branding Options**: Logo, colors, fonts customization

### 4. Preview Modes
- **Desktop Preview**: Full-width newsletter view
- **Mobile Preview**: Responsive mobile view
- **Email Preview**: How it appears in email clients
- **Print Preview**: Print layout visualization

### 5. Sharing Features
- **Direct Email**: Send newsletter directly from the app
- **Share Links**: Generate shareable links
- **Collaboration**: Comment and annotation system
- **Version History**: Track changes over time

## Technical Implementation

### Components
```typescript
// components/NewsletterRenderer.tsx
- Markdown to HTML conversion
- Template application
- Style injection

// components/ExportOptions.tsx
- Format selection
- Export configuration
- Download handling

// components/PreviewPanel.tsx
- Multiple view modes
- Responsive preview
- Print simulation

// components/TemplateSelector.tsx
- Template gallery
- Custom template editor
- Preview before apply
```

### API Endpoints
```typescript
// /api/export/[format]
- HTML generation
- PDF creation using Puppeteer
- DOCX generation
- Email HTML optimization

// /api/templates
- Template CRUD operations
- Template rendering engine
- Variable substitution

// /api/share
- Generate share links
- Access control
- Expiration management
```

### Libraries Required
- `react-markdown`: Markdown rendering
- `puppeteer`: PDF generation
- `docx`: Word document creation
- `juice`: Inline CSS for emails
- `prismjs`: Syntax highlighting

## User Flow

1. **View Generated Newsletter**
   - See formatted markdown output
   - Navigate sections via TOC

2. **Select Template**
   - Choose from template gallery
   - Preview with current content
   - Apply template styling

3. **Configure Export**
   - Select export format
   - Set export options (headers, footers, etc.)
   - Preview before export

4. **Share or Send**
   - Email directly to recipients
   - Generate shareable link
   - Download in chosen format

## Database Schema

```prisma
model NewsletterTemplate {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  template    Json     // HTML/Markdown template
  variables   Json     // Available variables
  styles      Json     // CSS styles
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SharedNewsletter {
  id           String   @id @default(uuid())
  newsletterId Int
  accessToken  String   @unique
  expiresAt    DateTime?
  viewCount    Int      @default(0)
  createdAt    DateTime @default(now())
}
```

## Success Criteria
- Clean, professional newsletter rendering
- Multiple export formats working correctly
- Templates apply consistently
- Email-ready HTML validates properly
- PDF generation maintains formatting
- Share links work with access control