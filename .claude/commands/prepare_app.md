# Prepare Application

Setup the application for the review or test.

## Variables

PORT: If `.ports.env` exists, read BACKEND_PORT from it, otherwise default to 8000

## Setup

1. Check if `.ports.env` exists:
   - If it exists, source it and use `BACKEND_PORT` for the PORT variable
   - If not, use default PORT: 8000

2. Start the application:
   - IMPORTANT: Make sure the server and client are running on a background process using `nohup sh ./scripts/start.sh > /dev/null 2>&1 &`
   - The start.sh script will automatically use ports from `.ports.env` if it exists
   - Use `./scripts/stop.sh` to stop the extraction server

3. Verify the application is running:
   - The application should be accessible at http://localhost:PORT (where PORT is from `.ports.env` or default 8000)
   
Note: Read `scripts/` and `README.md` for more information on how to start, stop and reset the server and client.

