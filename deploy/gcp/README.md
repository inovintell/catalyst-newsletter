# GCP Deployment Guide for Catalyst Newsletter

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed for building images

## Setup Instructions

### 1. Prepare GCP Project

```bash
# Create a new project (or use existing)
gcloud projects create catalyst-newsletter-prod --name="Catalyst Newsletter"

# Set as active project
gcloud config set project catalyst-newsletter-prod

# Enable billing (required for services)
# Visit: https://console.cloud.google.com/billing

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
```

### 2. Configure Secrets

Create secrets in Secret Manager for sensitive configuration:

```bash
# Create database URL secret
echo -n "postgresql://user:password@host:5432/dbname" | gcloud secrets create database-url --data-file=-

# Create Anthropic API key secret
echo -n "your-anthropic-api-key" | gcloud secrets create anthropic-api-key --data-file=-
```

### 3. Build and Push Docker Image

```bash
# Build the production image
docker build -t gcr.io/[PROJECT_ID]/catalyst-newsletter:latest ../..

# Configure Docker for GCR
gcloud auth configure-docker

# Push the image
docker push gcr.io/[PROJECT_ID]/catalyst-newsletter:latest
```

### 4. Deploy Application

Deploy the Cloud Run service with required environment variables:

```bash
# Deploy the Cloud Run service
gcloud run deploy catalyst-newsletter \
  --image gcr.io/[PROJECT_ID]/catalyst-newsletter:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=database-url:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --set-env-vars="NODE_ENV=production"
```

### 5. Configure DNS (Optional)

Point your domain to the Cloud Run service URL:

```bash
# Get the service URL
gcloud run services describe catalyst-newsletter --region europe-west1 --format="value(status.url)"

# Add domain mapping (optional)
gcloud run domain-mappings create --service catalyst-newsletter --domain your-domain.com --region europe-west1
```

## Post-Deployment

### Set Up First Admin User

1. Visit your deployed application
2. Register the first user (will become admin)
3. Use this account to create other users

### Configure Identity Platform

1. Visit [GCP Identity Platform Console](https://console.cloud.google.com/customer-identity)
2. Configure authentication providers
3. Set up Microsoft Entra OIDC (optional)

### Monitor Your Application

- **Cloud Run Dashboard**: View metrics and logs
- **Identity Platform**: Monitor authentication
- **Secret Manager**: Manage sensitive data

## Updating the Application

```bash
# Build new image
docker build -t gcr.io/[PROJECT_ID]/catalyst-newsletter:latest ../..

# Push to GCR
docker push gcr.io/[PROJECT_ID]/catalyst-newsletter:latest

# Deploy update
gcloud run deploy catalyst-newsletter \
  --image gcr.io/[PROJECT_ID]/catalyst-newsletter:latest \
  --platform managed \
  --region europe-west1
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service=catalyst-newsletter --region europe-west1

# Rollback to previous revision
gcloud run services update-traffic catalyst-newsletter \
  --to-revisions=[PREVIOUS_REVISION]=100 \
  --region europe-west1
```

## Destroy Resources

```bash
# Delete the Cloud Run service
gcloud run services delete catalyst-newsletter --region europe-west1

# Delete secrets
gcloud secrets delete database-url
gcloud secrets delete anthropic-api-key

# Delete container images (optional)
gcloud container images delete gcr.io/[PROJECT_ID]/catalyst-newsletter:latest
```

## Troubleshooting

### View Logs
```bash
gcloud run logs read --service=catalyst-newsletter --region europe-west1
```

### Check Service Status
```bash
gcloud run services describe catalyst-newsletter --region europe-west1
```

### Update Secrets
```bash
# Update a secret with new value
echo -n "new-secret-value" | gcloud secrets versions add [SECRET_NAME] --data-file=-

# Redeploy to use new secret version
gcloud run services update catalyst-newsletter --region europe-west1
```

## Cost Estimates

- **Cloud Run**: ~$5-10/month for light usage (free tier covers 2M requests/month)
- **Identity Platform**: Free tier covers 50,000 MAU
- **Secret Manager**: ~$0.06/month per secret
- **Container Registry**: ~$0.026/GB/month for storage

Total: ~$5-15/month for production deployment (mostly covered by free tier for small usage)