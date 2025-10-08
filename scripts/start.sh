#!/bin/sh
set -e

echo "Starting application..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "Warning: Migration failed, continuing anyway..."

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
