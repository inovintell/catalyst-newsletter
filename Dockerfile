# Dependencies stage
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files from root (for dependencies and prisma)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /build

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma files (keep in separate directory for migrations)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy package.json for build scripts
COPY package.json ./

# Copy Next.js config files to root
COPY app/client/next.config.js ./
COPY app/client/tsconfig.json ./
COPY app/client/postcss.config.js ./
COPY app/client/tailwind.config.js ./

# Copy app/client content to /build/app/ so Next.js finds its app directory
# But also copy shared resources (components, lib, etc.) to root for @/ imports
COPY app/client/(auth) ./app/(auth)/
COPY app/client/agent-config ./app/agent-config/
COPY app/client/api ./app/api/
COPY app/client/dashboard ./app/dashboard/
COPY app/client/newsletters ./app/newsletters/
COPY app/client/sources ./app/sources/
COPY app/client/layout.tsx ./app/
COPY app/client/page.tsx ./app/
COPY app/client/globals.css ./app/
COPY app/client/middleware.ts ./

# Copy shared resources to root for @/ path resolution
COPY app/client/components ./components/
COPY app/client/lib ./lib/
COPY app/client/contexts ./contexts/
COPY app/client/public ./public/

# Copy agent configs
COPY agent-configs ./agent-configs/

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy prisma files for migrations
COPY --from=builder /build/prisma ./prisma
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/node_modules/@prisma ./node_modules/@prisma

# Copy the built Next.js application
COPY --from=builder /build/public ./public
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static

# Copy agent configs
COPY --from=builder /build/agent-configs ./agent-configs

# Copy Anthropic SDK (needed for Claude Agent SDK)
COPY --from=builder /build/node_modules/@anthropic-ai ./node_modules/@anthropic-ai

# Create a simple start script that runs migrations and starts the app
RUN echo '#!/bin/sh' > ./start.sh && \
    echo 'npx prisma migrate deploy' >> ./start.sh && \
    echo 'node server.js' >> ./start.sh && \
    chmod +x ./start.sh

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Start the application with migrations
CMD ["./start.sh"]