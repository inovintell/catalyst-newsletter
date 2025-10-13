# InovIntell Catalyst Newsletter Generator

AI-powered newsletter generation tool for Healthcare Technology Assessment (HTA), Health Economics and Outcomes Research (HEOR), and Market Access professionals.

## Overview

Catalyst Newsletter Generator is a comprehensive application that automates the creation of intelligence updates by aggregating news from governmental, institutional, and company sources. It leverages Claude AI to analyze, synthesize, and generate professional newsletters tailored for the healthcare and pharmaceutical industry.

## Features Status

### Implemented Features ✅

- **Phase 1: Core Infrastructure** ✅ Complete
  - Next.js 14 with App Router
  - PostgreSQL with Docker containerization
  - Prisma ORM integration
  - Tailwind CSS with InovIntell branding

- **Phase 2: Source Management** ✅ Complete
  - Full CRUD operations for news sources
  - CSV bulk import functionality
  - Advanced filtering (topic, geo scope, status)
  - Importance level categorization (100% Important, Important, Standard)

- **Phase 3: Newsletter Configuration** ✅ Complete
  - Date range selection
  - Multi-source selection with bulk actions
  - Output format options (executive/detailed/custom)
  - Custom sections configuration
  - Topic and geographic filtering

- **Phase 4: Claude AI Integration** ✅ Complete
  - Anthropic Claude API integration
  - Streaming generation support
  - Mock generation for testing
  - Error handling and retry logic

- **Phase 5: Output Rendering** ✅ Complete
  - Markdown rendering with syntax highlighting
  - Copy to clipboard functionality
  - Download as .md file
  - Session-based output management

- **Phase 6: Refinement Editor** ✅ Complete
  - AI-assisted content refinement
  - Interactive editing interface
  - Refinement history tracking

- **Phase 7: Agent Configuration** ✅ Complete
  - Automatic agent config generation
  - Dynamic updates when sources change
  - Config versioning and persistence

- **Phase 8: Newsletter Management** ✅ Complete
  - Newsletter archive and listing
  - Individual newsletter viewing
  - Delete functionality
  - Search and filter capabilities

- **Phase 9: UX Enhancements** ✅ Complete
  - Professional dashboard with statistics
  - Real-time generation progress
  - Toast notifications
  - Responsive design
  - Quick start guide

- **Phase 10: Deployment & Testing** 🚧 In Progress
  - GCP deployment configuration
  - GitHub Actions CI/CD
  - Identity Platform integration
  - Performance optimization

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Docker)
- **AI Integration**: Anthropic Claude API (Configurable model)
- **Deployment**: Google Cloud Platform, Cloud Run
- **CI/CD**: GitHub Actions

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker Desktop
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone and install dependencies:**
```bash
git clone [repository-url]
cd catalyst-newsletter
npm install
```

2. **Set up environment variables:**
```bash
cp .env.sample .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
DATABASE_URL="postgresql://newsletter_user:newsletter_pass@localhost:5432/catalyst_newsletter?schema=public"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Claude API Configuration
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
CLAUDE_MODEL="claude-sonnet-4-5-20250929" # Default model, can be changed to any supported Claude model

# Agent Configuration (optional)
AGENT_UPDATE_WEBHOOK="https://your-webhook-url.com/agent-update"
AGENT_CONFIG_PATH="./agent-configs"
AGENT_AUTO_UPDATE="true"
```

3. **Start PostgreSQL with Docker:**
```bash
docker-compose up -d
```

4. **Run database migrations:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Start the development server:**
```bash
npm run dev
```

Visit http://localhost:3000

## Usage Guide

### 1. Configure News Sources
- Navigate to `/sources`
- Add sources individually or import via CSV
- Set importance levels and categories
- Sources are automatically included in agent configuration

### 2. Generate Newsletter
- Go to Dashboard (`/dashboard`)
- Select date range and sources
- Choose output format and sections
- Click "Generate Newsletter"
- Monitor real-time progress

### 3. Refine Content
- After generation, click "Refine with AI"
- Provide refinement instructions
- Claude will enhance the content
- Download or copy the final version

### 4. Manage Archives
- View all newsletters at `/newsletters`
- Search by date or content
- Access previous generations
- Export in multiple formats

## Project Structure

```
catalyst-newsletter/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── sources/       # Source management
│   │   ├── generate/      # Newsletter generation
│   │   ├── newsletters/   # Archive management
│   │   └── refine/        # AI refinement
│   ├── dashboard/         # Main generation interface
│   ├── sources/           # Source management UI
│   ├── newsletters/       # Newsletter archive
│   └── agent-config/      # Agent configuration
├── components/            # React components
│   ├── SourceTable.tsx    # Source listing
│   ├── SourceForm.tsx     # Source editor
│   ├── NewsletterConfig.tsx # Generation settings
│   └── GenerationProgress.tsx # Real-time status
├── lib/                   # Utilities and services
│   ├── claude-api.ts      # Claude integration
│   ├── agent-manager.ts   # Agent config management
│   ├── db.ts             # Database utilities
│   └── api-client.ts     # Frontend API calls
├── prisma/                # Database schema
│   └── schema.prisma     # Data models
├── public/                # Static assets
├── deploy/                # Deployment scripts
└── specs/                 # Feature specifications
```

## API Endpoints

### Sources
- `GET /api/sources` - List all sources with filtering
- `POST /api/sources` - Create new source
- `PUT /api/sources/[id]` - Update source
- `DELETE /api/sources/[id]` - Delete source
- `POST /api/sources/import` - Import CSV
- `POST /api/sources/update-agent` - Trigger agent update

### Newsletter Generation
- `POST /api/generate` - Start generation (non-streaming)
- `POST /api/generate/stream` - Stream generation progress
- `POST /api/refine` - Refine existing newsletter

### Newsletter Management
- `GET /api/newsletters` - List newsletters
- `GET /api/newsletters/[id]` - Get single newsletter
- `DELETE /api/newsletters/[id]` - Delete newsletter

### Configuration
- `GET /api/agent-config` - Get current agent configuration
- `GET /api/health` - Health check endpoint

## Database Schema

### NewsSource
- `id`: Unique identifier
- `website`: Source name
- `url`: Source URL
- `topic`: Content category
- `geoScope`: Geographic coverage
- `importanceLevel`: Priority (100% Important, Important, Standard)
- `sourceType`: Type classification
- `active`: Enable/disable flag
- `createdAt/updatedAt`: Timestamps

### Newsletter
- `id`: Unique identifier
- `title`: Newsletter title
- `content`: Generated content (markdown)
- `metadata`: Configuration used
- `status`: Generation status
- `createdAt/updatedAt`: Timestamps

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Seed database (if configured)
npm run seed

# Type checking
npm run type-check

# Linting
npm run lint
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure Docker is running
   - Check DATABASE_URL in .env.local
   - Run `docker-compose up -d`

2. **Claude API Errors**
   - Verify ANTHROPIC_API_KEY is valid
   - Check API rate limits
   - Ensure model name is correct

3. **Generation Fails**
   - Check browser console for errors
   - Verify sources are configured
   - Ensure date range contains data

4. **Import Issues**
   - CSV must have required columns
   - Check file encoding (UTF-8)
   - Verify data formats

## Contributing

Please refer to CONTRIBUTING.md for development guidelines and submission process.

## License

Proprietary - InovIntell © 2025

## Support

For issues or questions, please contact the development team or create an issue in the repository.