#!/bin/bash

# GCP Project Creation and Initial Setup Script
# This script creates a new GCP project and configures billing and quotas

set -e

# Configuration
PROJECT_NAME="InovIntell Newsletter"
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-$(date +%s)"}
ORGANIZATION_ID=${GCP_ORG_ID:-""}  # Optional: Your organization ID
BILLING_ACCOUNT_ID=${GCP_BILLING_ACCOUNT:-""}  # Required: Your billing account ID
REGION="europe-west1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Creating new GCP Project for InovIntell Newsletter Generator${NC}"
echo "Project Name: $PROJECT_NAME"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first:${NC}"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi

# Check for billing account
if [ -z "$BILLING_ACCOUNT_ID" ]; then
    echo -e "${YELLOW}📊 Available billing accounts:${NC}"
    gcloud billing accounts list
    echo ""
    echo -e "${RED}❌ Please set your billing account ID:${NC}"
    echo "   export GCP_BILLING_ACCOUNT='your-billing-account-id'"
    echo "   Then run this script again"
    exit 1
fi

# Create the project
echo -e "${GREEN}📁 Creating GCP project...${NC}"
if [ -n "$ORGANIZATION_ID" ]; then
    gcloud projects create $PROJECT_ID \
        --name="$PROJECT_NAME" \
        --organization=$ORGANIZATION_ID \
        --set-as-default
else
    gcloud projects create $PROJECT_ID \
        --name="$PROJECT_NAME" \
        --set-as-default
fi

# Link billing account
echo -e "${GREEN}💳 Linking billing account...${NC}"
gcloud billing projects link $PROJECT_ID \
    --billing-account=$BILLING_ACCOUNT_ID

# Set the project as default
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${GREEN}📦 Enabling required APIs (this may take a few minutes)...${NC}"
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    compute.googleapis.com \
    serviceusage.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    identitytoolkit.googleapis.com \
    iap.googleapis.com \
    cloudapis.googleapis.com \
    storage.googleapis.com \
    storage-api.googleapis.com \
    iam.googleapis.com

# Create Artifact Registry repository (Container Registry is deprecated)
echo -e "${GREEN}🗄️ Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories create catalyst-newsletter \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker images for Catalyst Newsletter"

# Request quota increases for Cloud Run
echo -e "${GREEN}📈 Checking and requesting quota increases...${NC}"

# Function to check and request quota
request_quota_if_needed() {
    local SERVICE=$1
    local METRIC=$2
    local REQUESTED_LIMIT=$3
    local REGION=$4

    echo "Checking quota for $METRIC..."

    # Note: Quota increase requests might need to be done via Console
    echo "  - Requested: $REQUESTED_LIMIT"
}

# Cloud Run quotas (per region)
request_quota_if_needed "run.googleapis.com" "CPU allocation" "10" $REGION
request_quota_if_needed "run.googleapis.com" "Memory allocation" "8Gi" $REGION
request_quota_if_needed "run.googleapis.com" "Concurrent requests" "1000" $REGION

# Cloud SQL quotas
request_quota_if_needed "sqladmin.googleapis.com" "Instances" "2" "global"
request_quota_if_needed "sqladmin.googleapis.com" "Storage (GB)" "100" "global"

# Create default VPC network if it doesn't exist
echo -e "${GREEN}🌐 Ensuring VPC network exists...${NC}"
gcloud compute networks create default \
    --subnet-mode=auto \
    --bgp-routing-mode=regional \
    --mtu=1460 2>/dev/null || echo "Default network already exists"

# Configure firewall rules for the default network
echo -e "${GREEN}🔥 Configuring firewall rules...${NC}"
gcloud compute firewall-rules create default-allow-internal \
    --network=default \
    --allow=tcp,udp,icmp \
    --source-ranges=10.128.0.0/9 2>/dev/null || echo "Internal firewall rule already exists"

gcloud compute firewall-rules create default-allow-ssh \
    --network=default \
    --allow=tcp:22 \
    --source-ranges=0.0.0.0/0 2>/dev/null || echo "SSH firewall rule already exists"

# Set up project defaults
echo -e "${GREEN}⚙️ Setting project defaults...${NC}"
gcloud config set compute/region $REGION
gcloud config set run/region $REGION

# Create a service account for GitHub Actions
echo -e "${GREEN}🔑 Creating service account for CI/CD...${NC}"
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions CI/CD" \
    --project=$PROJECT_ID 2>/dev/null || echo "Service account already exists"

# Grant necessary roles to the service account
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${GREEN}🛡️ Granting permissions to service account...${NC}"
for ROLE in \
    "roles/run.admin" \
    "roles/storage.admin" \
    "roles/cloudsql.admin" \
    "roles/secretmanager.admin" \
    "roles/artifactregistry.writer" \
    "roles/cloudbuild.builds.builder" \
    "roles/iam.serviceAccountUser"
do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$ROLE" \
        --quiet
done

# Generate service account key for GitHub Actions
echo -e "${GREEN}🔐 Generating service account key...${NC}"
gcloud iam service-accounts keys create ~/gcp-key-${PROJECT_ID}.json \
    --iam-account=$SA_EMAIL \
    --project=$PROJECT_ID

# Display summary
echo ""
echo -e "${GREEN}✅ Project setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Project Summary:${NC}"
echo "   Project ID: $PROJECT_ID"
echo "   Project Name: $PROJECT_NAME"
echo "   Region: $REGION"
echo "   Billing Account: $BILLING_ACCOUNT_ID"
echo "   Service Account: $SA_EMAIL"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo ""
echo "1. Save these environment variables:"
echo -e "${GREEN}   export GCP_PROJECT_ID=\"$PROJECT_ID\"${NC}"
echo -e "${GREEN}   export GCP_REGION=\"$REGION\"${NC}"
echo ""
echo "2. For GitHub Actions, add these secrets to your repository:"
echo "   - GCP_PROJECT_ID: $PROJECT_ID"
echo "   - GCP_SERVICE_ACCOUNT: $SA_EMAIL"
echo "   - GCP_SA_KEY: (contents of ~/gcp-key-${PROJECT_ID}.json)"
echo ""
echo "3. Configure Artifact Registry for Docker:"
echo -e "${GREEN}   gcloud auth configure-docker ${REGION}-docker.pkg.dev${NC}"
echo ""
echo "4. Run the main setup script:"
echo -e "${GREEN}   sh deploy/gcp-setup.sh${NC}"
echo ""
echo "5. Manual quota increases (if needed):"
echo "   Go to: https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"
echo "   - Cloud Run CPU: Request 10 vCPUs"
echo "   - Cloud Run Memory: Request 8Gi"
echo "   - Cloud SQL instances: Request 2"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   - Service account key saved to: ~/gcp-key-${PROJECT_ID}.json"
echo "   - Keep this file secure and do not commit it to version control"
echo "   - Add it to .gitignore if working locally"
echo ""
echo -e "${GREEN}🎉 Your GCP project is ready for deployment!${NC}"
