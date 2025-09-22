# GCP Deployment Scripts

This directory contains scripts for deploying the Catalyst Newsletter application to Google Cloud Platform.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **gcloud CLI**: Install the Google Cloud SDK
3. **Billing Account**: You need an active billing account ID
4. **Permissions**: You need permissions to create projects (or use an existing project)

## Scripts Overview

### 1. `create-gcp-project.sh` - Project Creation and Initial Setup
Creates a new GCP project with all necessary APIs enabled and initial configuration.

**Usage:**
```bash
# Set your billing account ID
export GCP_BILLING_ACCOUNT="your-billing-account-id"

# Optional: Set organization ID if using an organization
export GCP_ORG_ID="your-org-id"

# Run the script
sh deploy/create-gcp-project.sh
```

**What it does:**
- Creates a new GCP project
- Links billing account
- Enables all required APIs
- Sets up Artifact Registry for Docker images
- Creates service account for CI/CD
- Configures basic networking and firewall rules
- Generates service account key for GitHub Actions

### 2. `check-quotas.sh` - Quota Checker
Checks current quota usage and limits for your project.

**Usage:**
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="europe-west1"

sh deploy/check-quotas.sh
```

**What it shows:**
- Compute Engine quotas
- Cloud Run limits
- Cloud SQL instances
- API rate limits
- Storage quotas
- Service account keys
- Billing status

### 3. `gcp-setup.sh` - Main Deployment Script
Sets up all GCP resources for the application.

**Usage:**
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="europe-west1"

sh deploy/gcp-setup.sh
```

**What it creates:**
- Cloud SQL PostgreSQL 16 instance
- Cloud Run service
- Secret Manager secrets (with auto-generated DB password)
- IAM service accounts and permissions
- Cloud Storage bucket
- Initial deployment

### 4. `setup-auth.sh` - Authentication Configuration
Configures Google Identity Platform and IAP for Microsoft Entra integration.

**Usage:**
```bash
sh deploy/setup-auth.sh
```

**Features:**
- Enables Identity Platform
- Prepares for Microsoft Entra federation
- Sets up IAP configuration
- Provides manual configuration steps

### 5. `enable-iap.sh` - Enable Identity-Aware Proxy
Enables IAP for the deployed Cloud Run service.

**Usage:**
```bash
# Run after the service is deployed
sh deploy/enable-iap.sh
```

**What it does:**
- Updates Cloud Run to require authentication
- Provides manual steps for IAP configuration
- Sets up OAuth consent screen instructions

## Step-by-Step Deployment Guide

### Step 1: Create a New GCP Project

```bash
# 1. Set your billing account
export GCP_BILLING_ACCOUNT="your-billing-account-id"

# 2. Create the project
sh deploy/create-gcp-project.sh

# 3. Note the generated PROJECT_ID and set it
export GCP_PROJECT_ID="generated-project-id"
```

### Step 2: Check Quotas

```bash
# Verify quotas are sufficient
sh deploy/check-quotas.sh

# If needed, request increases via Console
```

### Step 3: Deploy Infrastructure

```bash
# Deploy all GCP resources
sh deploy/gcp-setup.sh

# Update the Anthropic API key
echo -n 'your-anthropic-api-key' | gcloud secrets versions add anthropic-api-key --data-file=-
```

### Step 4: Configure Authentication

```bash
# Set up authentication
sh deploy/setup-auth.sh

# After deployment, enable IAP
sh deploy/enable-iap.sh
```

### Step 5: Manual Configuration

#### In GCP Console:
1. **Identity Platform**:
   - Go to Identity Platform > Providers
   - Add Microsoft as SAML/OIDC provider
   - Enter your Microsoft Entra tenant details

2. **OAuth Consent Screen**:
   - Configure for internal/external users
   - Add required scopes

3. **IAP Configuration**:
   - Create OAuth 2.0 Client for IAP
   - Enable IAP for the Cloud Run service
   - Add authorized users/domains

#### In Microsoft Entra:
1. Create new App Registration
2. Add redirect URI: `https://[PROJECT_ID].firebaseapp.com/__/auth/handler`
3. Configure API permissions
4. Create client secret

### Step 6: Deploy Application

```bash
# Build and deploy
gcloud builds submit --tag europe-west1-docker.pkg.dev/$GCP_PROJECT_ID/catalyst-newsletter/app
gcloud run deploy catalyst-newsletter \
  --image europe-west1-docker.pkg.dev/$GCP_PROJECT_ID/catalyst-newsletter/app \
  --region europe-west1

# Run database migrations
npm run db:migrate:deploy
```

## Environment Variables

```bash
# Required for scripts
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="europe-west1"
export GCP_BILLING_ACCOUNT="your-billing-account-id"  # For project creation
export GCP_ORG_ID="your-org-id"  # Optional
```

## GitHub Actions Setup

After running `create-gcp-project.sh`, add these secrets to your GitHub repository:

1. `GCP_PROJECT_ID`: Your project ID
2. `GCP_SERVICE_ACCOUNT`: The service account email
3. `GCP_SA_KEY`: Contents of the generated key file

## Troubleshooting

### Quota Issues
```bash
# Check current quotas
sh deploy/check-quotas.sh

# Request increases at:
# https://console.cloud.google.com/iam-admin/quotas
```

### API Enablement Issues
```bash
# Manually enable an API
gcloud services enable SERVICE_NAME.googleapis.com
```

### Billing Issues
```bash
# Check billing status
gcloud billing projects describe $GCP_PROJECT_ID

# Link billing account
gcloud billing projects link $GCP_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Authentication Issues
```bash
# Re-authenticate
gcloud auth login

# Set default project
gcloud config set project $GCP_PROJECT_ID
```

## Security Notes

1. **Service Account Keys**: Keep the generated service account key secure
2. **Secrets**: Never commit secrets to version control
3. **IAP**: Always use IAP for production deployments
4. **Database Password**: Automatically generated and stored in Secret Manager
5. **API Keys**: Store in Secret Manager, never in code

## Cost Optimization

- Use `db-f1-micro` for development/staging
- Set appropriate min/max instances for Cloud Run
- Enable Cloud SQL automatic backups only for production
- Use lifecycle policies for Cloud Storage
- Monitor usage regularly in the Console

## Support

For issues:
1. Check the logs: `gcloud run logs read --service catalyst-newsletter`
2. Review quotas: `sh deploy/check-quotas.sh`
3. Check API status: https://status.cloud.google.com/