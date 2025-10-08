#!/bin/bash

# GCP Setup Script for InovIntell Newsletter Generator
# This script sets up the necessary GCP resources for deployment

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-1757943207"}
REGION=${GCP_REGION:-"europe-west1"}
ENVIRONMENT=${ENVIRONMENT:-"prod"}  # Default to prod if not specified
SERVICE_NAME="catalyst-newsletter-${ENVIRONMENT}"
DB_INSTANCE_NAME="newsletter-db"
DB_NAME="catalyst_newsletter"
DB_USER="newsletter_user"

echo "🚀 Setting up GCP resources for InovIntell Newsletter Generator"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  identitytoolkit.googleapis.com \
  iap.googleapis.com \
  servicenetworking.googleapis.com \
  compute.googleapis.com

# Create Artifact Registry repository if it doesn't exist
echo "📦 Setting up Artifact Registry..."
gcloud artifacts repositories create catalyst-newsletter \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for Catalyst Newsletter" 2>/dev/null || echo "Repository already exists"

# Configure Docker authentication for Artifact Registry
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL instance..."
# Using db-custom-1-3840 for development (1 vCPU, 3.75 GB RAM)
# For production, consider db-custom-2-7680 or higher
# Using public IP to avoid Service Networking complexity
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-custom-1-3840 \
  --region=$REGION \
  --assign-ip \
  --edition=ENTERPRISE \
  --availability-type=ZONAL \
  --no-backup \
  --database-flags=max_connections=50 \
  --storage-size=10GB \
  --storage-type=SSD

# Create database
echo "📊 Creating database..."
gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE_NAME

# Generate secure password for database user
echo "🔑 Generating secure database password..."
DB_PASSWORD=$(openssl rand -base64 32)

# Create database user with generated password
echo "👤 Creating database user..."
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password="$DB_PASSWORD"

# Create secrets in Secret Manager
echo "🔐 Creating secrets..."

# Store database password in Secret Manager
# Using printf instead of echo -n for better compatibility
printf "%s" "$DB_PASSWORD" | gcloud secrets create database-password --data-file=-

# Database URL secret with actual password
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME"
printf "%s" "$DATABASE_URL" | gcloud secrets create catalyst-database-url-${ENVIRONMENT} --data-file=-

# Anthropic API key (placeholder - update with actual key)
printf "%s" "your-anthropic-api-key" | gcloud secrets create catalyst-anthropic-api-key-${ENVIRONMENT} --data-file=-

# JWT secret
printf "%s" "$(openssl rand -base64 32)" | gcloud secrets create catalyst-jwt-secret-${ENVIRONMENT} --data-file=-

# Admin password (placeholder - update with actual password)
printf "%s" "admin123" | gcloud secrets create catalyst-admin-password-${ENVIRONMENT} --data-file=-

# Create service account for Cloud Run
echo "🔑 Creating service account..."
gcloud iam service-accounts create newsletter-sa \
  --display-name="Newsletter Service Account"

# Grant necessary permissions
echo "🛡️ Setting up IAM permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:newsletter-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:newsletter-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create Cloud Storage bucket for archives
echo "🪣 Creating storage bucket..."
gsutil mb -p $PROJECT_ID -l $REGION gs://${PROJECT_ID}-newsletter-archives/

# Build and deploy initial container
echo "🏗️ Building and deploying container..."
# Using Artifact Registry instead of Container Registry (deprecated)
gcloud builds submit --tag ${REGION}-docker.pkg.dev/$PROJECT_ID/catalyst-newsletter/$SERVICE_NAME:latest .

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
# Note: Initially deploying with --allow-unauthenticated
# After IAP is configured, this can be changed to --no-allow-unauthenticated
gcloud run deploy $SERVICE_NAME \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/catalyst-newsletter/$SERVICE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars CLAUDE_MODEL=claude-sonnet-4-5-20250929 \
  --set-secrets DATABASE_URL=catalyst-database-url-${ENVIRONMENT}:latest \
  --set-secrets ANTHROPIC_API_KEY=catalyst-anthropic-api-key-${ENVIRONMENT}:latest \
  --set-secrets JWT_SECRET=catalyst-jwt-secret-${ENVIRONMENT}:latest \
  --set-secrets ADMIN_PASSWORD=catalyst-admin-password-${ENVIRONMENT}:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 0 \
  --service-account newsletter-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --ingress all

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "📍 Service URL: $SERVICE_URL"
echo ""
echo "⚠️  Important next steps:"
echo "1. Update the Anthropic API key secret with your actual key:"
echo "   echo -n 'your-actual-key' | gcloud secrets versions add catalyst-anthropic-api-key-${ENVIRONMENT} --data-file=-"
echo "2. Update the Admin password secret with your actual password:"
echo "   echo -n 'your-admin-password' | gcloud secrets versions add catalyst-admin-password-${ENVIRONMENT} --data-file=-"
echo "2. Run database migrations:"
echo "   # Authorize your IP address to connect (if not already done):"
echo "   gcloud sql instances patch $DB_INSTANCE_NAME --authorized-networks=\$(curl -s ifconfig.me)/32"
echo "   # Get the database instance IP address:"
echo "   gcloud sql instances describe $DB_INSTANCE_NAME --format='value(ipAddresses[0].ipAddress)'"
echo "   # Get the database password from Secret Manager:"
echo "   gcloud secrets versions access latest --secret=database-password"
echo "   # Export DATABASE_URL with the public IP and run migrations:"
echo "   export DATABASE_URL=\"postgresql://$DB_USER:<password>@<IP_ADDRESS>:5432/$DB_NAME?schema=public\""
echo "   npm run db:migrate:deploy"
echo "3. Configure Microsoft Entra authentication:"
echo "   - Run: sh deploy/setup-auth.sh"
echo "   - Follow the manual configuration steps in GCP Console and Microsoft Entra"
echo "4. Configure custom domain (optional)"
echo "5. Set up monitoring and alerts"
echo ""
echo "📝 Database password has been automatically generated and stored in Secret Manager"