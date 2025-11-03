#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping Catalyst Newsletter...${NC}"

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Change to project root
cd "$PROJECT_ROOT"

# Stop Docker Compose services
echo -e "${GREEN}Stopping Docker Compose services...${NC}"
docker-compose down

echo -e "${GREEN}✓ All services stopped successfully!${NC}"
