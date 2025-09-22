# InovIntell Newsletter Generator

AI-powered newsletter generation tool for HTA, HEOR, and Market Access professionals.

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker Desktop
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd catalyst-newsletter
npm install
```

2. **Set up environment variables:**
```bash
cp .env.sample .env.local
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

## Project Structure

```
catalyst-newsletter/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             # Utilities and services
├── prisma/          # Database schema and migrations
├── public/          # Static assets
└── docker-compose.yml
```

## Features

- **Phase 1**: ✅ Basic setup with Next.js, Tailwind, PostgreSQL
- **Phase 2**: 🚧 Source management CRUD
- **Phase 3**: 📋 Newsletter configuration interface
- **Phase 4**: 📋 Claude Code agent integration
- **Phase 5**: 📋 Newsletter output rendering
- **Phase 6**: 📋 Refinement editor
- **Phase 7**: 📋 Agent auto-configuration
- **Phase 8**: 📋 Newsletter archive management
- **Phase 9**: 📋 UX enhancements
- **Phase 10**: 📋 Testing & optimization

## Database Schema

- **NewsSource**: Stores news source configurations
- **Newsletter**: Stores generated newsletters

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL (Docker)
- Prisma ORM
- Claude Code API integration