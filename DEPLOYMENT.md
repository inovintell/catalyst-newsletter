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

### Database Connection Issues
```bash
# Check Cloud SQL instance status
gcloud sql instances describe newsletter-db

# Verify Cloud Run service account permissions
gcloud projects get-iam-policy $GCP_PROJECT_ID
```

### Application Errors
```bash
# Check application logs
gcloud run logs read --service catalyst-newsletter --limit 50

# Check health endpoint
curl https://your-app-url/api/health
```

### Performance Issues
```bash
# Increase memory/CPU
gcloud run services update catalyst-newsletter \
  --memory 4Gi \
  --cpu 4

# Check metrics
gcloud monitoring metrics-explorer
```

## Support

For issues or questions:
1. Check application logs in Cloud Console
2. Review health check endpoint
3. Contact InovIntell support team

## License

Copyright © 2025 InovIntell - All rights reserved