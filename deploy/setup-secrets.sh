#!/bin/bash

# Setup Google Cloud Secrets for Identity Platform Configuration
set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-1757943207"}
REGION=${GCP_REGION:-"europe-west1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up Cloud Run Secrets for Identity Platform${NC}"
echo "============================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}1️⃣ Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable Secret Manager API
echo -e "${YELLOW}2️⃣ Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com

# Function to create or update a secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3

    echo -e "${YELLOW}Creating/updating secret: $SECRET_NAME${NC}"

    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
        # Update existing secret
        echo "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
        echo -e "${GREEN}✅ Updated secret: $SECRET_NAME${NC}"
    else
        # Create new secret
        echo "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
        echo -e "${GREEN}✅ Created secret: $SECRET_NAME${NC}"
    fi

    # Grant Cloud Run access to the secret
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --member="serviceAccount:newsletter-sa@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID \
        --quiet
}

echo ""
echo -e "${YELLOW}3️⃣ Creating secrets for Firebase configuration...${NC}"

# Firebase configuration secrets
read -p "Enter your Firebase API Key: " FIREBASE_API_KEY
create_or_update_secret "firebase-config" "$FIREBASE_API_KEY" "Firebase API configuration"

read -p "Enter your Firebase Auth Domain (e.g., project.firebaseapp.com): " FIREBASE_AUTH_DOMAIN
echo "$FIREBASE_AUTH_DOMAIN" | gcloud secrets versions add firebase-config --data-file=- \
    --project=$PROJECT_ID --secret-version="auth-domain"

read -p "Enter your Firebase Project ID: " FIREBASE_PROJECT_ID
echo "$FIREBASE_PROJECT_ID" | gcloud secrets versions add firebase-config --data-file=- \
    --project=$PROJECT_ID --secret-version="project-id"

echo ""
echo -e "${YELLOW}4️⃣ Setting up Firebase Admin SDK key...${NC}"
echo "Please provide the Firebase Admin SDK service account key."
echo "You can download this from Firebase Console > Project Settings > Service Accounts"
echo ""
read -p "Enter the path to your Firebase service account JSON file: " SERVICE_ACCOUNT_PATH

if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    # Convert to single-line JSON
    SERVICE_ACCOUNT_KEY=$(cat "$SERVICE_ACCOUNT_PATH" | jq -c '.')
    create_or_update_secret "firebase-admin-key" "$SERVICE_ACCOUNT_KEY" "Firebase Admin SDK service account key"
else
    echo -e "${RED}❌ File not found: $SERVICE_ACCOUNT_PATH${NC}"
    echo "Skipping Firebase Admin SDK key setup"
fi

echo ""
echo -e "${YELLOW}5️⃣ Setting up Microsoft Entra ID configuration (optional)...${NC}"
read -p "Do you want to configure Microsoft Entra ID? (y/n): " CONFIGURE_ENTRA

if [ "$CONFIGURE_ENTRA" = "y" ] || [ "$CONFIGURE_ENTRA" = "Y" ]; then
    read -p "Enter your Microsoft Entra Tenant ID: " ENTRA_TENANT_ID
    create_or_update_secret "entra-config" "$ENTRA_TENANT_ID" "Microsoft Entra ID configuration"
fi

echo ""
echo -e "${YELLOW}6️⃣ Verifying existing secrets...${NC}"

# Check if other required secrets exist
MISSING_SECRETS=()

if ! gcloud secrets describe database-url --project=$PROJECT_ID &>/dev/null; then
    MISSING_SECRETS+=("database-url")
fi

if ! gcloud secrets describe anthropic-api-key --project=$PROJECT_ID &>/dev/null; then
    MISSING_SECRETS+=("anthropic-api-key")
fi

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  The following required secrets are missing:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "   - $secret"
    done
    echo ""
    echo "You can create them using:"
    echo "  echo 'SECRET_VALUE' | gcloud secrets create SECRET_NAME --data-file=-"
fi

echo ""
echo -e "${GREEN}🎉 Secrets setup complete!${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Ensure all required secrets are configured"
echo "2. Deploy your Cloud Run service with the updated configuration:"
echo "   gcloud run deploy $SERVICE_NAME --source . --region=$REGION"
echo "3. Test the authentication flow"
echo ""

# Create a summary file
cat > secrets-summary.txt << EOF
Firebase/Identity Platform Secrets Configuration
=================================================

Project ID: $PROJECT_ID
Region: $REGION

Configured Secrets:
- firebase-config (API key, auth domain, project ID)
- firebase-admin-key (Service account key)
$([ "$CONFIGURE_ENTRA" = "y" ] || [ "$CONFIGURE_ENTRA" = "Y" ] && echo "- entra-config (Tenant ID)")

To list all secrets:
  gcloud secrets list --project=$PROJECT_ID

To view a secret version:
  gcloud secrets versions access latest --secret="SECRET_NAME" --project=$PROJECT_ID

To update a secret:
  echo 'NEW_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID
EOF

echo -e "${GREEN}✅ Configuration summary saved to secrets-summary.txt${NC}"