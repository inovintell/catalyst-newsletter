#!/bin/bash

# Minimal GCP Setup Script for InovIntell Newsletter Generator
# Uses the most cost-effective options for development/testing

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-$(date +%s)"}
REGION=${GCP_REGION:-"europe-west1"}
ENVIRONMENT=${ENVIRONMENT:-"staging"}  # Default to staging for minimal setup
SERVICE_NAME="catalyst-newsletter-${ENVIRONMENT}"
DB_INSTANCE_NAME="newsletter-db"
DB_NAME="catalyst_newsletter"
DB_USER="newsletter_user"

echo "🚀 Setting up GCP resources (Minimal/Dev configuration)"
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

# Create Cloud SQL instance with MINIMAL specs
echo "🗄️ Creating Cloud SQL instance (Minimal specs)..."
# Using public IP to avoid Service Networking complexity
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --assign-ip \
  --no-backup \
  --database-flags=max_connections=10 \
  --storage-size=10GB \
  --storage-type=HDD

# Alternative if you must use PostgreSQL 16:
# gcloud sql instances create $DB_INSTANCE_NAME \
#   --database-version=POSTGRES_16 \
#   --tier=db-custom-1-3840 \
#   --cpu=1 \
#   --memory=3840MB \
#   --region=$REGION \
#   --network=default \
#   --edition=ENTERPRISE \
#   --availability-type=ZONAL \
#   --no-backup \
#   --storage-size=10GB \
#   --storage-type=HDD

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
echo -n "$DB_PASSWORD" | gcloud secrets create database-password --data-file=-

# Database URL secret with actual password
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME"
echo -n "$DATABASE_URL" | gcloud secrets create catalyst-database-url-${ENVIRONMENT} --data-file=-

# Anthropic API key (placeholder - update with actual key)
echo -n "your-anthropic-api-key" | gcloud secrets create catalyst-anthropic-api-key-${ENVIRONMENT} --data-file=-

# JWT secret
openssl rand -base64 32 | tr -d '\n' | gcloud secrets create catalyst-jwt-secret-${ENVIRONMENT} --data-file=-

# Admin password (placeholder - update with actual password)
echo -n "admin123" | gcloud secrets create catalyst-admin-password-${ENVIRONMENT} --data-file=-

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

# Create Cloud Storage bucket for archives (using cheapest storage class)
echo "🪣 Creating storage bucket..."
gsutil mb -p $PROJECT_ID -l $REGION -c NEARLINE gs://${PROJECT_ID}-newsletter-archives/

# Build and deploy initial container
echo "🏗️ Building and deploying container..."
# Using Artifact Registry instead of Container Registry (deprecated)
gcloud builds submit --tag ${REGION}-docker.pkg.dev/$PROJECT_ID/catalyst-newsletter/$SERVICE_NAME:latest .

# Deploy to Cloud Run with minimal resources
echo "🚀 Deploying to Cloud Run (Minimal configuration)..."
gcloud run deploy $SERVICE_NAME \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/catalyst-newsletter/$SERVICE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars CLAUDE_MODEL=claude-opus-4-1-20250805 \
  --set-secrets DATABASE_URL=catalyst-database-url-${ENVIRONMENT}:latest \
  --set-secrets ANTHROPIC_API_KEY=catalyst-anthropic-api-key-${ENVIRONMENT}:latest \
  --set-secrets JWT_SECRET=catalyst-jwt-secret-${ENVIRONMENT}:latest \
  --set-secrets ADMIN_PASSWORD=catalyst-admin-password-${ENVIRONMENT}:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 2 \
  --min-instances 0 \
  --service-account newsletter-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --ingress all

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "📍 Service URL: $SERVICE_URL"
echo ""
echo "💰 Cost-saving configuration applied:"
echo "   - PostgreSQL 15 with db-f1-micro (lowest tier)"
echo "   - Cloud Run: 512Mi RAM, 1 vCPU"
echo "   - Storage: Nearline class for archives"
echo "   - No automatic backups"
echo "   - Min instances: 0 (scales to zero)"
echo ""
echo "⚠️  Important next steps:"
echo "1. Update the Anthropic API key secret with your actual key:"
echo "   echo -n 'your-actual-key' | gcloud secrets versions add catalyst-anthropic-api-key-${ENVIRONMENT} --data-file=-"
echo "2. Update the Admin password secret with your actual password:"
echo "   echo -n 'your-admin-password' | gcloud secrets versions add catalyst-admin-password-${ENVIRONMENT} --data-file=-"
echo "2. Run database migrations:"
echo "   npm run migrate:deploy"
echo "3. Configure Microsoft Entra authentication:"
echo "   - Run: sh deploy/setup-auth.sh"
echo "   - Follow the manual configuration steps in GCP Console and Microsoft Entra"
echo ""
echo "📝 Database password has been automatically generated and stored in Secret Manager"
echo ""
echo "💡 To upgrade for production, consider:"
echo "   - PostgreSQL 16 with db-custom-2-7680 tier"
echo "   - Cloud Run: 2Gi RAM, 2 vCPUs"
echo "   - Enable automatic backups"
echo "   - Set min-instances to 1 for better response times"