#!/bin/bash

# Setup Identity Platform with Microsoft Entra ID for Cloud Run
set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"newsletter-1757943207"}
REGION=${GCP_REGION:-"europe-west1"}
SERVICE_NAME="catalyst-newsletter"

# Microsoft Entra ID Configuration
ENTRA_CLIENT_ID=${ENTRA_CLIENT_ID:-""}
ENTRA_CLIENT_SECRET=${ENTRA_CLIENT_SECRET:-""}
ENTRA_TENANT_ID=${ENTRA_TENANT_ID:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up Identity Platform for Cloud Run${NC}"
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

# Enable required APIs
echo -e "${YELLOW}2️⃣ Enabling required APIs...${NC}"
gcloud services enable \
    identitytoolkit.googleapis.com \
    firebase.googleapis.com \
    firebaseauth.googleapis.com \
    cloudresourcemanager.googleapis.com \
    run.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create Firebase project (if not exists)
echo -e "${YELLOW}3️⃣ Initializing Firebase project...${NC}"
firebase projects:list | grep $PROJECT_ID || firebase projects:addfirebase $PROJECT_ID

# Get the Cloud Run service URL
echo -e "${YELLOW}4️⃣ Getting Cloud Run service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${YELLOW}ℹ️  Cloud Run service not deployed yet. Using placeholder URL.${NC}"
    SERVICE_URL="https://$SERVICE_NAME-xxxxx-$REGION.a.run.app"
fi

# Configure Identity Platform
echo -e "${YELLOW}5️⃣ Configuring Identity Platform...${NC}"

# Enable Email/Password provider (optional)
echo "Enabling Email/Password authentication..."
gcloud identity-platform providers create email-password \
    --enabled \
    --password-required \
    --email-required \
    2>/dev/null || echo "Email/Password provider already exists"

# Configure Microsoft Entra ID as OIDC provider
if [ -n "$ENTRA_CLIENT_ID" ] && [ -n "$ENTRA_CLIENT_SECRET" ] && [ -n "$ENTRA_TENANT_ID" ]; then
    echo -e "${YELLOW}6️⃣ Configuring Microsoft Entra ID as OIDC provider...${NC}"

    # Create OIDC provider configuration
    cat > oidc-config.json << EOF
{
  "name": "microsoft.com",
  "displayName": "Microsoft",
  "enabled": true,
  "clientId": "$ENTRA_CLIENT_ID",
  "clientSecret": "$ENTRA_CLIENT_SECRET",
  "issuer": "https://login.microsoftonline.com/$ENTRA_TENANT_ID/v2.0",
  "responseType": {
    "idToken": true,
    "code": false,
    "token": false
  }
}
EOF

    # Create the OIDC provider
    gcloud identity-platform providers create oidc.microsoft \
        --display-name="Microsoft" \
        --enabled \
        --client-id="$ENTRA_CLIENT_ID" \
        --client-secret="$ENTRA_CLIENT_SECRET" \
        --issuer="https://login.microsoftonline.com/$ENTRA_TENANT_ID/v2.0" \
        2>/dev/null || echo "Microsoft OIDC provider already exists"

    rm -f oidc-config.json
    echo -e "${GREEN}✅ Microsoft Entra ID configured${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Microsoft Entra ID configuration (missing credentials)${NC}"
    echo "   Set ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, and ENTRA_TENANT_ID to configure"
fi

# Configure authorized domains
echo -e "${YELLOW}7️⃣ Configuring authorized domains...${NC}"

# Add Firebase default domain
firebase auth:import --project $PROJECT_ID /dev/null 2>/dev/null || true

# Add custom domain if Cloud Run URL is available
if [ "$SERVICE_URL" != "https://$SERVICE_NAME-xxxxx-$REGION.a.run.app" ]; then
    DOMAIN=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|/.*||')
    echo "Adding authorized domain: $DOMAIN"

    # Note: This requires manual configuration in Firebase Console
    echo -e "${YELLOW}⚠️  Please manually add the following domain in Firebase Console:${NC}"
    echo "   $DOMAIN"
fi

# Generate service account key for backend verification
echo -e "${YELLOW}8️⃣ Setting up service account for backend...${NC}"

SERVICE_ACCOUNT_EMAIL="firebase-adminsdk@$PROJECT_ID.iam.gserviceaccount.com"

# Check if service account exists
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo "Service account already exists"
else
    echo "Creating service account..."
    gcloud iam service-accounts create firebase-adminsdk \
        --display-name="Firebase Admin SDK Service Account" \
        --project=$PROJECT_ID
fi

# Grant necessary roles
echo "Granting roles to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/firebase.admin" \
    --quiet

# Create and download service account key
KEY_FILE="firebase-service-account-key.json"
echo "Generating service account key..."
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID

# Convert to single-line JSON for environment variable
if [ -f "$KEY_FILE" ]; then
    SERVICE_ACCOUNT_KEY=$(cat $KEY_FILE | jq -c '.')
    echo -e "${GREEN}✅ Service account key generated${NC}"
    echo ""
    echo -e "${YELLOW}📝 Add this to your .env.local file:${NC}"
    echo ""
    echo "FIREBASE_SERVICE_ACCOUNT_KEY='$SERVICE_ACCOUNT_KEY'"
    echo ""

    # Clean up the key file (keep it secure!)
    rm -f $KEY_FILE
fi

# Output configuration summary
echo ""
echo -e "${GREEN}🎉 Identity Platform setup complete!${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Service URL: $SERVICE_URL"
echo ""

echo -e "${YELLOW}🔑 Firebase Configuration:${NC}"
echo "Get these values from Firebase Console > Project Settings:"
echo "  https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo ""
echo "Add to your .env.local:"
echo "NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>"
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$PROJECT_ID.firebaseapp.com"
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID"
echo ""

if [ -n "$ENTRA_TENANT_ID" ]; then
    echo -e "${YELLOW}🔐 Microsoft Entra ID Configuration:${NC}"
    echo "NEXT_PUBLIC_ENTRA_TENANT_ID=$ENTRA_TENANT_ID"
    echo ""
    echo "Configure redirect URI in Azure Portal:"
    echo "  https://$PROJECT_ID.firebaseapp.com/__/auth/handler"
    echo ""
    if [ "$SERVICE_URL" != "https://$SERVICE_NAME-xxxxx-$REGION.a.run.app" ]; then
        DOMAIN=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|/.*||')
        echo "For custom domain, also add:"
        echo "  https://$DOMAIN/__/auth/handler"
    fi
fi

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Add the environment variables to your .env.local file"
echo "2. Update your Cloud Run deployment with the new environment variables"
echo "3. Configure authorized domains in Firebase Console:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
echo "4. If using custom domain, configure the auth handler endpoint"
echo "5. Deploy your application with the new authentication setup"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"