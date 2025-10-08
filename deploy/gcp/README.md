# GCP Deployment Guide for Catalyst Newsletter

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Terraform** installed (v1.0 or higher)
4. **Docker** installed for building images

## Setup Instructions

### 1. Prepare GCP Project

```bash
# Create a new project (or use existing)
gcloud projects create catalyst-newsletter-prod --name="Catalyst Newsletter"

# Set as active project
gcloud config set project catalyst-newsletter-prod

# Enable billing (required for services)
# Visit: https://console.cloud.google.com/billing
```

### 2. Configure Terraform Variables

```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Required values:
- `project_id`: Your GCP project ID
- `database_url`: PostgreSQL connection string
- `anthropic_api_key`: Your Claude API key
- `domain_name`: Your domain (e.g., catalyst.inovintell.com)

### 3. Initialize Terraform

```bash
# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Apply the configuration
terraform apply
```

### 4. Build and Push Docker Image

```bash
# Build the production image
docker build -t gcr.io/[PROJECT_ID]/catalyst-newsletter:latest ../..

# Configure Docker for GCR
gcloud auth configure-docker

# Push the image
docker push gcr.io/[PROJECT_ID]/catalyst-newsletter:latest
```

### 5. Deploy Application

After Terraform creates the infrastructure:

```bash
# Deploy the Cloud Run service
gcloud run deploy catalyst-newsletter \
  --image gcr.io/[PROJECT_ID]/catalyst-newsletter:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### 6. Configure DNS

Point your domain to the Load Balancer IP:

```bash
# Get the IP address
terraform output load_balancer_ip

# Add an A record in your DNS provider:
# Type: A
# Name: catalyst (or @)
# Value: [LOAD_BALANCER_IP]
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
gcloud run revisions list --service=catalyst-newsletter

# Rollback to previous revision
gcloud run services update-traffic catalyst-newsletter \
  --to-revisions=[PREVIOUS_REVISION]=100
```

## Destroy Resources

```bash
# Remove all resources (WARNING: This will delete everything)
terraform destroy
```

## Troubleshooting

### View Logs
```bash
gcloud run logs read --service=catalyst-newsletter
```

### Check Service Status
```bash
gcloud run services describe catalyst-newsletter
```

### Update Secrets
```bash
gcloud secrets versions add [SECRET_NAME] --data-file=-
```

## Cost Estimates

- **Cloud Run**: ~$5-10/month for light usage
- **Identity Platform**: Free tier covers 50,000 MAU
- **Secret Manager**: ~$0.06/month per secret
- **Load Balancer**: ~$18/month

Total: ~$25-35/month for production deployment