#!/bin/bash

# Script to check current GCP quotas and limits for the project

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-1757943207"}
REGION=${GCP_REGION:-"europe-west1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Please set GCP_PROJECT_ID environment variable${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Checking GCP Quotas for Project: $PROJECT_ID${NC}"
echo -e "${BLUE}Region: $REGION${NC}"
echo ""

# Set the project
gcloud config set project $PROJECT_ID 2>/dev/null

# Function to check service quota
check_quota() {
    local SERVICE=$1
    local QUOTA_NAME=$2
    local DISPLAY_NAME=$3

    echo -e "${YELLOW}Checking $DISPLAY_NAME...${NC}"

    # Get quota info (this is a simplified version, actual quota API calls are complex)
    gcloud compute project-info describe --project=$PROJECT_ID \
        --format="table(quotas[name=$QUOTA_NAME].limit,quotas[name=$QUOTA_NAME].usage)" 2>/dev/null || \
    echo "  Unable to fetch quota information via CLI. Check in Console."
}

echo -e "${GREEN}=== Compute Engine Quotas ===${NC}"
echo ""

# Check Compute Engine quotas
gcloud compute project-info describe --project=$PROJECT_ID \
    --format="table(
        quotas[name=CPUS].limit:label='CPUs',
        quotas[name=CPUS].usage:label='Used',
        quotas[name=IN_USE_ADDRESSES].limit:label='Static IPs',
        quotas[name=IN_USE_ADDRESSES].usage:label='Used'
    )" 2>/dev/null || echo "Check Compute quotas in Console"

echo ""
echo -e "${GREEN}=== Cloud Run Quotas (Region: $REGION) ===${NC}"
echo ""

# Cloud Run service limits
echo "Cloud Run Service Limits:"
echo "  - Max services: Check in Console"
echo "  - Max revisions per service: 1000"
echo "  - Max concurrent requests: 1000 (per instance)"
echo "  - Max instances: 100 (default)"
echo "  - CPU: 4 vCPUs max per instance"
echo "  - Memory: 8Gi max per instance"
echo "  - Request timeout: 60 minutes max"

echo ""
echo -e "${GREEN}=== Cloud SQL Quotas ===${NC}"
echo ""

# Check Cloud SQL instances
INSTANCES=$(gcloud sql instances list --format="value(name)" 2>/dev/null | wc -l)
echo "  Cloud SQL Instances: $INSTANCES used"
echo "  Default quota: 40 instances per project"

echo ""
echo -e "${GREEN}=== API Rate Limits ===${NC}"
echo ""

# Check enabled APIs
echo "Key API Rate Limits:"
echo "  - Cloud Run Admin API: 60 requests/minute"
echo "  - Cloud SQL Admin API: 60 requests/minute"
echo "  - Secret Manager API: 6000 requests/minute"
echo "  - Container Registry API: 50,000 requests/10 minutes"

echo ""
echo -e "${GREEN}=== Storage Quotas ===${NC}"
echo ""

# Check storage buckets
BUCKETS=$(gsutil ls 2>/dev/null | wc -l)
echo "  Storage Buckets: $BUCKETS used"
echo "  Artifact Registry repositories: Check in Console"

echo ""
echo -e "${GREEN}=== Service Account Keys ===${NC}"
echo ""

# Count service account keys
for SA in $(gcloud iam service-accounts list --format="value(email)" 2>/dev/null); do
    KEY_COUNT=$(gcloud iam service-accounts keys list --iam-account=$SA --format="value(name)" 2>/dev/null | wc -l)
    echo "  $SA: $KEY_COUNT keys"
done
echo "  Max keys per service account: 10"

echo ""
echo -e "${GREEN}=== Budget & Billing ===${NC}"
echo ""

# Check if billing is enabled
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null)
if [ "$BILLING_ENABLED" = "True" ]; then
    echo -e "  ${GREEN}✓ Billing is enabled${NC}"
    BILLING_ACCOUNT=$(gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)" 2>/dev/null)
    echo "  Billing Account: $BILLING_ACCOUNT"
else
    echo -e "  ${RED}✗ Billing is not enabled${NC}"
fi

echo ""
echo -e "${YELLOW}📝 To request quota increases:${NC}"
echo "  1. Go to: https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"
echo "  2. Filter by service (e.g., Cloud Run API)"
echo "  3. Select the quota you want to increase"
echo "  4. Click 'Edit Quotas' and submit your request"
echo ""
echo -e "${YELLOW}💡 Recommended quotas for production:${NC}"
echo "  - Cloud Run CPU: 10+ vCPUs (total across all services)"
echo "  - Cloud Run Memory: 16+ GiB (total)"
echo "  - Cloud SQL Instances: 2-3 (prod + staging)"
echo "  - Cloud SQL Storage: 100+ GB"
echo "  - Secret Manager secrets: 100+"
echo ""
echo -e "${BLUE}For detailed quota monitoring:${NC}"
echo "  https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"