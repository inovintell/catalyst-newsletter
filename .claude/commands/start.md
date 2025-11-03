# Start the application

## Overview

Starts Catalyst Newsletter with Docker Compose, which runs:
- PostgreSQL database
- Next.js application

## Workflow

1. Check if Docker is running. If not, exit with error.

2. Check if `.env.local` exists in project root:
   - If missing, warn user but continue
   - Show instructions to create .env.local with required API keys

3. Check if user passed `--build` or `-b` flag:
   - If yes, set REBUILD="--build" for docker-compose

4. Run `docker-compose up` (or `docker-compose up --build` if rebuild flag set)
   - This runs in foreground with logs visible
   - PostgreSQL starts on configured port
   - Next.js app starts on port 3000 (or configured FRONTEND_PORT)

5. Set up cleanup trap for EXIT, INT, and TERM signals:
   - On exit/interrupt, run `docker-compose down`

Note: Script runs docker-compose in foreground, not background. Logs stream to terminal.