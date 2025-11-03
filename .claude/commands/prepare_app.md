# Prepare Application

Setup the application for review or test.

## Variables

- FRONTEND_PORT: If `.ports.env` exists, read FRONTEND_PORT from it, otherwise default to 3000
- POSTGRES_PORT: If `.ports.env` exists, read POSTGRES_PORT from it, otherwise default to 5432

## Overview

Starts Catalyst Newsletter with Docker Compose, which runs:
- PostgreSQL database
- Next.js application

## Setup

1. Check if Docker is running. If not, exit with error.

2. Check if `.env.local` exists in project root:
   - If missing, warn user but continue
   - Show instructions to create .env.local with required API keys

3. Check if `.ports.env` exists:
   - If it exists, source it and use `FRONTEND_PORT` and `POSTGRES_PORT`
   - If not, use defaults: FRONTEND_PORT=3000, POSTGRES_PORT=5432

4. Start the application in background:
   - IMPORTANT: Run in background using `nohup sh ./scripts/start.sh > /dev/null 2>&1 &`
   - The start.sh script uses docker-compose to start PostgreSQL and Next.js
   - Ports from `.ports.env` will be used if file exists
   - Use `./scripts/stop.sh` to stop all services

5. Verify the application is running:
   - Next.js app accessible at http://localhost:FRONTEND_PORT
   - PostgreSQL runs on POSTGRES_PORT

Note: Script uses Docker Compose. See `scripts/` and `README.md` for start, stop, and reset commands.

