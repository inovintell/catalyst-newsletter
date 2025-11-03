#!/bin/bash

# Kill the trigger_webhook.py process

echo "Stopping trigger_webhook.py server..."

# Find and kill the process
if pgrep -f "trigger_webhook.py" > /dev/null; then
    pkill -f "trigger_webhook.py"
    echo "✓ Webhook server stopped"
else
    echo "⚠ No webhook server process found"
fi

# Also check for any uvicorn processes on port 8010
if lsof -i :8010 > /dev/null 2>&1; then
    echo "Found process on port 8010, killing..."
    lsof -ti :8010 | xargs kill -9 2>/dev/null
    echo "✓ Port 8010 cleared"
fi

echo "Done."