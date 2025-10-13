#!/bin/bash

# GCP Deployment Script for Catalyst Newsletter
# This script deploys the application to Google Cloud Run

set -e

# Determine environment from script argument or default to prod
ENVIRONMENT=${1:-"prod"}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(prod|staging)$ ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [prod|staging]"
    exit 1
fi

# Load environment variables early (before setting defaults)
ENV_FILE=".env.${ENVIRONMENT}"
if [ -f "$ENV_FILE" ]; then
    echo "📋 Loading ${ENVIRONMENT} environment variables from ${ENV_FILE}..."
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "⚠️  Environment file ${ENV_FILE} not found, using defaults and environment variables"
fi

# Configuration (use environment variables if set, otherwise use defaults)
PROJECT_ID=${GCP_PROJECT_ID:-"catalyst-newsletter"}
REGION=${GCP_REGION:-"europe-west1"}
# Always append environment suffix to service name
SERVICE_NAME="catalyst-newsletter-${ENVIRONMENT}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Catalyst Newsletter to GCP"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Environment: ${ENVIRONMENT}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not logged in to gcloud. Please run: gcloud auth login"
    exit 1
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"

# Validate required environment variables
echo ""
echo "🔍 Validating environment configuration..."
VALIDATION_FAILED=false

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set in environment"
    VALIDATION_FAILED=true
elif [[ ! "$DATABASE_URL" =~ @localhost/.*\?host=/cloudsql/ ]]; then
    echo "❌ DATABASE_URL format incorrect!"
    echo "   Expected: postgresql://USER:PASS@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE&schema=public"
    echo "   Got: ${DATABASE_URL:0:50}..."
    VALIDATION_FAILED=true
else
    echo "✅ DATABASE_URL format valid"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set in environment"
    VALIDATION_FAILED=true
else
    echo "✅ ANTHROPIC_API_KEY set"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET not set in environment (will be auto-generated)"
else
    echo "✅ JWT_SECRET set"
fi

if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo "❌ Validation failed. Please check your .env.prod file and ensure all required variables are set."
    echo "   Required: DATABASE_URL, ANTHROPIC_API_KEY"
    echo "   Optional: JWT_SECRET (auto-generated if not set)"
    exit 1
fi

echo "✅ Environment validation passed"
echo ""

# Set the project
echo "📌 Setting GCP project..."
gcloud config set project ${PROJECT_ID} 2>/dev/null || {
    echo "❌ Project ${PROJECT_ID} not found or you don't have access"
    echo "Please create the project first or update PROJECT_ID"
    exit 1
}

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable \
    run.googleapis.com \
    containerregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    identitytoolkit.googleapis.com \
    --quiet

# Build the Docker image
echo "🏗️ Building Docker image..."

# Detect platform and add --platform flag for Mac ARM64
PLATFORM_FLAG=""
if [[ $(uname -m) == "arm64" ]] && [[ $(uname -s) == "Darwin" ]]; then
    echo "📱 Detected Mac ARM64 - building for linux/amd64 (Cloud Run compatibility)"
    PLATFORM_FLAG="--platform linux/amd64"
fi

docker build ${PLATFORM_FLAG} -t ${IMAGE_NAME} .

# Push to Google Container Registry
echo "📤 Pushing image to GCR..."
docker push ${IMAGE_NAME}

# Create secrets if they don't exist
echo "🔐 Managing secrets..."
create_secret_if_not_exists() {
    SECRET_NAME=$1
    SECRET_VALUE=$2

    if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null; then
        echo "Secret ${SECRET_NAME} already exists"
    else
        echo "Creating secret ${SECRET_NAME}"
        echo -n "${SECRET_VALUE}" | gcloud secrets create ${SECRET_NAME} \
            --data-file=- \
            --replication-policy="automatic" \
            --project=${PROJECT_ID}
    fi
}

# Create secrets for sensitive data with proper naming convention
create_secret_if_not_exists "catalyst-jwt-secret-${ENVIRONMENT}" "${JWT_SECRET:-$(openssl rand -base64 32)}"
create_secret_if_not_exists "catalyst-database-url-${ENVIRONMENT}" "${DATABASE_URL}"
create_secret_if_not_exists "catalyst-anthropic-api-key-${ENVIRONMENT}" "${ANTHROPIC_API_KEY}"
create_secret_if_not_exists "catalyst-admin-password-${ENVIRONMENT}" "${ADMIN_PASSWORD:-admin123}"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID}" \
    --set-env-vars="DEFAULT_TENANT_ID=default-tenant" \
    --set-env-vars="ADMIN_EMAIL=${ADMIN_EMAIL:-admin@inovintell.com}" \
    --set-secrets="JWT_SECRET=catalyst-jwt-secret-${ENVIRONMENT}:latest" \
    --set-secrets="DATABASE_URL=catalyst-database-url-${ENVIRONMENT}:latest" \
    --set-secrets="ANTHROPIC_API_KEY=catalyst-anthropic-api-key-${ENVIRONMENT}:latest" \
    --set-secrets="ADMIN_PASSWORD=catalyst-admin-password-${ENVIRONMENT}:latest" \
    --add-cloudsql-instances="${PROJECT_ID}:${REGION}:newsletter-db" \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 100 \
    --min-instances 0 \
    --max-instances 10 \
    --port 3000

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "🌐 Your application is running at: ${SERVICE_URL}"
echo ""
echo "📝 Next steps:"
echo "1. Update your DNS to point to this URL"
echo "2. Configure Identity Platform in GCP Console"
echo "3. Set up monitoring and logging"
echo "4. Configure backup for your database"
echo ""
echo "🔑 To update secrets, use:"
echo "gcloud secrets versions add SECRET_NAME --data-file=-"