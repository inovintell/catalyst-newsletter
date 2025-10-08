# Deployment Guide - InovIntell Newsletter Generator

## Overview
This guide covers deploying the InovIntell Newsletter Generator to Google Cloud Platform (GCP).

## Prerequisites

1. **GCP Account**: Active Google Cloud Platform account with billing enabled
2. **gcloud CLI**: Installed and configured locally
3. **Docker**: Installed for local testing
4. **Node.js**: v20+ installed
5. **Anthropic API Key**: Valid API key for Claude Opus 4.1

## Local Development

### Using Docker Compose
```bash
# Start all services
npm run docker:compose:build

# Access the application
http://localhost:3000

# Stop services
docker-compose down
```

### Manual Setup
```bash
# Install dependencies
npm install

# Setup database
docker-compose up postgres -d

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

## Production Deployment

### 1. Initial GCP Setup

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="europe-west1"

# Run setup script
npm run deploy:gcp
```

This will create:
- Cloud SQL PostgreSQL instance (PostgreSQL 16)
- Cloud Run service
- Secret Manager secrets (including auto-generated database password)
- Service accounts with proper IAM roles
- Cloud Storage bucket for archives
- Identity Platform and IAP configuration

### 2. Configure Secrets

```bash
# Update Anthropic API key
echo -n 'your-actual-api-key' | gcloud secrets versions add anthropic-api-key --data-file=-

# Note: Database password is automatically generated and stored in Secret Manager
# To retrieve the password if needed:
gcloud secrets versions access latest --secret="database-password"
```

### 3. Configure Authentication (Microsoft Entra via Google Identity Platform)

```bash
# Run authentication setup script
sh deploy/setup-auth.sh
```

#### Manual Configuration Steps:

**In GCP Console:**
1. Go to Identity Platform > Providers
2. Add Microsoft as SAML/OIDC provider
3. Configure with your Microsoft Entra tenant details

**In Microsoft Entra Admin Center:**
1. Create new App Registration
2. Configure redirect URI: `https://[PROJECT_ID].firebaseapp.com/__/auth/handler`
3. Add API permissions for user profile
4. Create client secret and add to GCP Identity Platform

**Configure IAP:**
1. Go to APIs & Services > Credentials
2. Create OAuth 2.0 Client ID for IAP
3. Link IAP to your Cloud Run service

### 4. Deploy Application

#### Using GitHub Actions (Recommended)
```bash
# Push to main branch
git push origin main

# GitHub Actions will automatically:
# - Build Docker image
# - Push to Container Registry
# - Deploy to Cloud Run
```

#### Manual Deployment
```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/catalyst-newsletter

# Deploy to Cloud Run
gcloud run deploy catalyst-newsletter \
  --image gcr.io/$GCP_PROJECT_ID/catalyst-newsletter \
  --region $GCP_REGION \
  --platform managed
```

### 5. Run Database Migrations

```bash
# Connect to Cloud SQL proxy
gcloud sql connect newsletter-db --user=newsletter_user

# Run migrations
npm run db:migrate:deploy
```

## Environment Variables

### Required Secrets (Store in Secret Manager)
- `DATABASE_URL`: PostgreSQL connection string (auto-generated)
- `DATABASE_PASSWORD`: Database password (auto-generated)
- `ANTHROPIC_API_KEY`: Claude API key (manually set)

### Environment Variables (Set in Cloud Run)
- `NODE_ENV`: "production"
- `CLAUDE_MODEL`: "claude-opus-4-1-20250805"
- `NEXT_PUBLIC_APP_URL`: Your application URL
- `GCP_REGION`: "europe-west1"

### Authentication Headers (Set by IAP)
- `X-Goog-IAP-JWT-Assertion`: IAP JWT token
- `X-User-Email`: User email (set by middleware)
- `X-User-ID`: User ID (set by middleware)
- `X-User-Name`: User display name (set by middleware)

## Monitoring

### Health Check
```bash
curl https://your-app-url/api/health
```

### Logs
```bash
# View Cloud Run logs
gcloud run logs read --service catalyst-newsletter --region $GCP_REGION

# Stream logs
gcloud run logs tail --service catalyst-newsletter --region $GCP_REGION
```

### Metrics
- Access Cloud Console > Cloud Run > catalyst-newsletter
- View metrics: CPU, Memory, Request count, Latency

## Updating the Application

### Using CI/CD
```bash
# Make changes and commit
git add .
git commit -m "Update feature"
git push origin main
```

### Manual Update
```bash
# Build new image
npm run build
docker build -t gcr.io/$GCP_PROJECT_ID/catalyst-newsletter:v2 .

# Push and deploy
docker push gcr.io/$GCP_PROJECT_ID/catalyst-newsletter:v2
npm run deploy:update
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service catalyst-newsletter --region $GCP_REGION

# Rollback to previous revision
gcloud run services update-traffic catalyst-newsletter \
  --to-revisions=catalyst-newsletter-00001-abc=100 \
  --region $GCP_REGION
```

## Security Best Practices

1. **API Keys**: Always use Secret Manager, never hardcode
2. **Database**: Use Cloud SQL Auth proxy in production
3. **Network**: Configure VPC connector for internal communication
4. **Access**: Use IAM for fine-grained access control
5. **Updates**: Regularly update dependencies and base images

## Cost Optimization

1. **Cloud Run**:
   - Set appropriate min/max instances
   - Use CPU throttling for non-critical endpoints
   - Configure concurrency based on load

2. **Cloud SQL**:
   - Use appropriate tier (db-f1-micro for development)
   - Enable automatic backups only in production
   - Consider read replicas for high traffic

3. **Storage**:
   - Set lifecycle policies for old newsletters
   - Use nearline/coldline for archives

## Troubleshooting

### Common Deployment Issues (Lessons Learned)

#### Issue 1: Architecture Mismatch - "exec format error"

**Symptom:**
```
Cloud Run does not support image: Container manifest type 'application/vnd.oci.image.index.v1+json' must support amd64/linux
```

**Cause:** Docker image built on Mac ARM64 (Apple Silicon) without platform flag

**Solution:**
The `gcp-deploy.sh` script automatically detects Mac ARM64 and adds the flag. For manual builds:

```bash
# ALWAYS build with platform flag on Mac ARM64
docker build --platform linux/amd64 -t gcr.io/PROJECT_ID/catalyst-newsletter-prod .
docker push gcr.io/PROJECT_ID/catalyst-newsletter-prod
```

**Prevention:** Use the deployment script which handles this automatically.

---

#### Issue 2: Database Connection Failed - "Can't reach database server at localhost:5432"

**Symptom:**
```
P1001: Can't reach database server at `localhost:5432`
```

**Cause:** Incorrect DATABASE_URL format for Prisma + Cloud SQL

**Critical Format:**
```bash
# CORRECT ✅
postgresql://USER:PASS@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE&schema=public

# WRONG ❌
postgresql://USER:PASS@/DATABASE?host=/cloudsql/...  # Missing localhost
postgresql://USER:PASS@localhost/DATABASE?socket=/cloudsql/...  # Use 'host' not 'socket'
postgresql://USER:PASS@localhost:5432/DATABASE  # Don't include port with Unix sockets
```

**Solution:**
```bash
# 1. Update the DATABASE_URL secret with correct format
echo -n "postgresql://newsletter_user:PASSWORD@localhost/catalyst_newsletter?host=/cloudsql/newsletter-1757943207:europe-west1:newsletter-db&schema=public" | \
  gcloud secrets versions add catalyst-database-url-prod --data-file=-

# 2. Redeploy to pick up the new secret
gcloud run deploy catalyst-newsletter-prod \
  --image gcr.io/newsletter-1757943207/catalyst-newsletter-prod \
  --region europe-west1 \
  --update-secrets=DATABASE_URL=catalyst-database-url-prod:latest
```

**Note on Password Encoding:**
- URL-encode special characters in passwords
- Example: `+g2818/6f+bBp` → `%2Bg2818%2F6f%2BbBp`

---

#### Issue 3: Tables Don't Exist - "The table public.User does not exist"

**Symptom:**
```
P2021: The table `public.User` does not exist in the current database
```

**Cause:**
- Migrations failed during startup due to connection issues
- Schema out of sync (missing tables in migration files)

**Diagnostic Steps:**
```bash
# 1. Check migration logs
gcloud run services logs read catalyst-newsletter-prod --region=europe-west1 | grep -B 5 -A 10 "Running database migrations"

# 2. Look for these error patterns:
# - "Error: P1001" = Can't connect to database
# - "Warning: Migration failed, continuing anyway" = Migration failed silently
# - "No pending migrations to apply" = Already applied (but may have failed previously)
```

**Solution:**
If migrations are out of sync, create a new migration:

```bash
# 1. Create migration directory
mkdir -p prisma/migrations/$(date +%Y%m%d)_add_missing_tables

# 2. Add missing table SQL
cat > prisma/migrations/$(date +%Y%m%d)_add_missing_tables/migration.sql << 'EOF'
-- Add missing User table
CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "role" TEXT NOT NULL DEFAULT 'user',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_uid_key" ON "public"."User"("uid");
CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_key" ON "public"."User"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "public"."User"("email");
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "public"."User"("tenantId");
CREATE INDEX IF NOT EXISTS "User_uid_idx" ON "public"."User"("uid");
EOF

# 3. Rebuild and redeploy
docker build --platform linux/amd64 -t gcr.io/newsletter-1757943207/catalyst-newsletter-prod .
docker push gcr.io/newsletter-1757943207/catalyst-newsletter-prod
gcloud run deploy catalyst-newsletter-prod --image gcr.io/newsletter-1757943207/catalyst-newsletter-prod --region=europe-west1
```

**Prevention:** Always verify migrations locally before deploying to production.

---

#### Issue 4: Wrong GCP Project - "Project not found or permission denied"

**Symptom:**
```
Project 'catalyst-newsletter' not found or permission denied
```

**Cause:** `.env.prod` not loaded before deployment script sets default PROJECT_ID

**Solution:**
The updated `gcp-deploy.sh` now loads `.env.prod` early (line 9). If you still encounter this:

```bash
# Verify correct project
gcloud config get-value project

# Set manually
gcloud config set project newsletter-1757943207

# Or export before running script
export GCP_PROJECT_ID="newsletter-1757943207"
./deploy/gcp-deploy.sh
```

---

#### Issue 5: Migration Reports Success But Tables Missing

**Symptom:**
- Migration logs say "No pending migrations to apply"
- But tables don't exist when querying

**Cause:** Previous migration attempts connected to wrong database or failed silently

**Investigation:**
```bash
# Check which migrations Prisma thinks are applied
gcloud run services logs read catalyst-newsletter-prod --region=europe-west1 | grep "migrations found"

# Expected output:
# "2 migrations found in prisma/migrations"
# "Applying migration `20251008_add_user_and_newsletter_generation`"
```

**Solution:**
If Prisma's internal state is corrupted, you may need to:
1. Manually verify tables exist (or don't)
2. Create new migration with `IF NOT EXISTS` clauses
3. Redeploy with new migration

**Nuclear Option (⚠️ DATA LOSS):**
```sql
-- Connect to database
-- DROP ALL tables and let migrations recreate them
-- ONLY do this in development/testing!
```

---

### Database Connection Issues
```bash
# Check Cloud SQL instance status
gcloud sql instances describe newsletter-db --project=newsletter-1757943207

# Check if Cloud SQL connection is configured in Cloud Run
gcloud run services describe catalyst-newsletter-prod --region=europe-west1 --format='value(spec.template.metadata.annotations["run.googleapis.com/cloudsql-instances"])'

# Should return: newsletter-1757943207:europe-west1:newsletter-db

# Verify Cloud Run service account permissions
gcloud projects get-iam-policy newsletter-1757943207 | grep -A 5 "serviceAccount"
```

### Application Errors
```bash
# Check application logs with context
gcloud run services logs read catalyst-newsletter-prod --region=europe-west1 --limit=100

# Filter for errors only
gcloud run services logs read catalyst-newsletter-prod --region=europe-west1 | grep -i "error\|failed\|fatal"

# Check health endpoint
curl https://catalyst-newsletter-prod-1078437195105.europe-west1.run.app/api/health

# Expected healthy response:
# {"status":"healthy","database":"connected","migrations":"applied","sourceCount":0}
```

### Performance Issues
```bash
# Check resource usage
gcloud run services describe catalyst-newsletter-prod --region=europe-west1 --format='value(spec.template.spec.containers[0].resources)'

# Increase memory/CPU if needed
gcloud run services update catalyst-newsletter-prod \
  --memory 2Gi \
  --cpu 2 \
  --region europe-west1

# Check current scaling settings
gcloud run services describe catalyst-newsletter-prod --region=europe-west1 \
  --format='value(spec.template.metadata.annotations["autoscaling.knative.dev/minScale"],spec.template.metadata.annotations["autoscaling.knative.dev/maxScale"])'
```

### Secret Access Issues

```bash
# List all secrets
gcloud secrets list --project=newsletter-1757943207

# View secret (WARNING: shows sensitive data)
gcloud secrets versions access latest --secret=catalyst-database-url-prod

# Check Cloud Run service account has access
gcloud secrets get-iam-policy catalyst-database-url-prod
```

## Support

For issues or questions:
1. Check application logs in Cloud Console
2. Review health check endpoint
3. Contact InovIntell support team

## License

Copyright © 2025 InovIntell - All rights reserved