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

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16 (Docker containerized)
- **AI Integration**: Anthropic Claude API with Claude Agent SDK
- **Observability**: Langfuse LLM tracing (optional)
- **Containerization**: Docker & Docker Compose (multi-stage builds)
- **Deployment**: Google Cloud Platform, Cloud Run
- **CI/CD**: GitHub Actions

## Setup Instructions

### Prerequisites
- Docker Desktop (required - handles all dependencies)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository:**
```bash
git clone [repository-url]
cd catalyst-newsletter
```

2. **Set up environment variables:**
```bash
cp .env.sample .env.local
```

Edit `.env.local` with your configuration:
```env
# Database (automatically configured by Docker)
DATABASE_URL="postgresql://newsletter_user:newsletter_pass@postgres:5432/catalyst_newsletter?schema=public"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
APP_ENV="local"

# Claude API Configuration
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
CLAUDE_MODEL="claude-sonnet-4-5-20250929" # Default model, can be changed to any supported Claude model

# Langfuse Observability (optional)
LANGFUSE_SECRET_KEY="your-langfuse-secret-key"
LANGFUSE_PUBLIC_KEY="your-langfuse-public-key"
LANGFUSE_HOST="https://cloud.langfuse.com"
LANGFUSE_TRACING_ENVIRONMENT="local"

# Agent Configuration (optional)
AGENT_UPDATE_WEBHOOK="https://your-webhook-url.com/agent-update"
AGENT_CONFIG_PATH="./agent-configs"
AGENT_AUTO_UPDATE="true"
```

3. **Start the application with Docker:**

**First time setup or after code changes:**
```bash
./scripts/start.sh --build
```

**Subsequent starts (using existing images):**
```bash
./scripts/start.sh
```

This single command will:
- Build optimized Docker images (if `--build` flag is used)
- Start PostgreSQL database with health checks
- Run database migrations automatically
- Start the Next.js application in production mode
- Set up proper networking between services

Visit http://localhost:3000

**To stop the services:**
```bash
Press Ctrl+C
```

The script will automatically clean up all running containers.

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
├── app/
│   └── client/                # Next.js application root
│       ├── api/               # API endpoints
│       │   ├── sources/       # Source management
│       │   ├── generate/      # Newsletter generation
│       │   ├── newsletters/   # Archive management
│       │   └── refine/        # AI refinement
│       ├── dashboard/         # Main generation interface
│       ├── sources/           # Source management UI
│       ├── newsletters/       # Newsletter archive
│       ├── agent-config/      # Agent configuration
│       ├── components/        # React components
│       ├── lib/              # Utilities and services
│       ├── contexts/         # React contexts
│       └── public/           # Static assets
├── prisma/                    # Database schema & migrations
│   ├── schema.prisma         # Data models
│   └── migrations/           # Database migrations
├── scripts/                   # Utility scripts
│   └── start.sh              # Docker startup script
├── agent-configs/            # Claude agent configurations
├── deploy/                   # Deployment scripts & configs
├── specs/                    # Feature specifications
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Service orchestration
├── .env.local               # Environment configuration
└── package.json             # Dependencies & scripts
```

### Key Files

- **Dockerfile**: Multi-stage build for optimized production images
- **docker-compose.yml**: Orchestrates PostgreSQL and Next.js services
- **scripts/start.sh**: Unified script to start/stop all services
- **app/client/**: Next.js 15 App Router application
- **prisma/schema.prisma**: Database schema with NewsSource and Newsletter models

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

### Background Jobs
- `GET /api/jobs/trigger` - Trigger job processor (no authentication required)
  - Starts job processor and returns immediately
  - Returns JSON response with status
  - In production: triggered by Cloud Scheduler every 5 minutes
  - During development: manually trigger with `curl http://localhost:3000/api/jobs/trigger`
- `GET /api/jobs/process` - Long-running processor endpoint (no authentication required)
  - Returns SSE stream with heartbeat events
  - Maintains connection for monitoring processor status
  - Used for debugging and manual monitoring

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
# Start application with Docker (first time or after changes)
./scripts/start.sh --build

# Start application with Docker (subsequent runs)
./scripts/start.sh

# Stop all services
Press Ctrl+C (or docker-compose down)

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Rebuild only the app image
docker-compose build app

# Access database with Prisma Studio (in a new terminal)
docker-compose exec app npx prisma studio

# Run database migrations manually
docker-compose exec app npx prisma migrate deploy

# Access PostgreSQL directly
docker-compose exec postgres psql -U newsletter_user -d catalyst_newsletter

# Remove all containers and volumes (clean slate)
docker-compose down -v
```

### Alternative: Local Development (without Docker)

If you prefer to run the application locally without Docker:

```bash
# Install dependencies
npm install

# Start PostgreSQL separately
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Troubleshooting

### Common Issues

1. **Docker Not Running**
   - Error: `Cannot connect to the Docker daemon`
   - Solution: Start Docker Desktop and wait for it to be ready
   - Run: `./scripts/start.sh` (it will check if Docker is running)

2. **Database Connection Error**
   - Ensure Docker containers are running: `docker-compose ps`
   - Check if PostgreSQL is healthy: `docker-compose logs postgres`
   - Verify DATABASE_URL in .env.local matches docker-compose.yml settings
   - If database is corrupted, reset with: `docker-compose down -v && ./scripts/start.sh --build`

3. **Build Failures**
   - Error: `Module not found` or build errors
   - Solution: Rebuild with clean cache
   ```bash
   docker-compose down
   docker-compose build --no-cache app
   ./scripts/start.sh
   ```

4. **Port Already in Use**
   - Error: `Port 3000 is already allocated`
   - Solution: Find and stop the process using the port
   ```bash
   lsof -ti:3000 | xargs kill -9  # macOS/Linux
   docker-compose down  # Stop existing containers
   ```

5. **Environment Variables Not Loading**
   - Ensure .env.local is in the project root (not in app/client/)
   - Check file permissions: `chmod 644 .env.local`
   - Restart containers: `docker-compose down && ./scripts/start.sh`

6. **Claude API Errors**
   - Verify ANTHROPIC_API_KEY is valid in .env.local
   - Check API rate limits at https://console.anthropic.com/
   - Ensure model name is correct (e.g., claude-sonnet-4-5-20250929)
   - View API errors in logs: `docker-compose logs -f app`

7. **Generation Fails**
   - Check browser console for errors
   - Verify sources are configured at `/sources`
   - Ensure date range contains data
   - Check app logs: `docker-compose logs app | grep -i error`

8. **Import Issues**
   - CSV must have required columns (website, url, topic, geoScope)
   - Check file encoding (UTF-8)
   - Verify data formats match schema

9. **Container Won't Start**
   - Check logs: `docker-compose logs app`
   - Verify migrations ran: `docker-compose logs app | grep prisma`
   - Access container shell: `docker-compose exec app sh`
   - Check disk space: `docker system df`

10. **Performance Issues**
    - Allocate more resources to Docker Desktop
    - Clean up unused images: `docker system prune -a`
    - Check container resources: `docker stats`

## Contributing

Please refer to CONTRIBUTING.md for development guidelines and submission process.

## License

Proprietary - InovIntell © 2025

## Support

For issues or questions, please contact the development team or create an issue in the repository.