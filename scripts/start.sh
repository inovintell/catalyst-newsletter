#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Catalyst Newsletter with Docker Compose...${NC}"

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Change to project root
cd "$PROJECT_ROOT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "${YELLOW}Warning: No .env.local file found in project root.${NC}"
    echo "Please configure environment variables:"
    echo "  1. Create .env.local in the project root"
    echo "  2. Add required API keys (ANTHROPIC_API_KEY, Firebase, Langfuse, etc.)"
    echo ""
    echo -e "${YELLOW}Continuing without .env.local file...${NC}"
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped successfully.${NC}"
    exit 0
}

# Trap EXIT, INT, and TERM signals
trap cleanup EXIT INT TERM

# Check if we should rebuild
REBUILD=""
if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
    echo -e "${BLUE}Building Docker images...${NC}"
    REBUILD="--build"
fi

# Start services with Docker Compose
echo -e "${GREEN}Starting PostgreSQL database and Next.js application...${NC}"
echo -e "${BLUE}This may take a few moments on first run...${NC}"
echo ""

# Run docker-compose in foreground
if [ -z "$REBUILD" ]; then
    docker-compose up
else
    docker-compose up --build
fi

# If docker-compose exits, run cleanup
cleanup
