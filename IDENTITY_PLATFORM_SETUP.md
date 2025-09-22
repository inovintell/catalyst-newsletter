# Identity Platform Authentication Setup

This document describes the new authentication setup using Google Identity Platform with Microsoft Entra ID integration.

## Overview

The application now uses Firebase/Identity Platform for authentication, replacing the previous IAP and Workload Federation setup. This provides proper end-user authentication with support for Microsoft Entra ID and Google sign-in.

## Architecture

### Authentication Flow

1. **Frontend (Client)**:
   - User clicks sign-in button
   - Firebase SDK handles authentication with Identity Provider (Microsoft/Google)
   - Receives ID token upon successful authentication
   - Stores token in browser session

2. **API Requests**:
   - Client automatically attaches `Authorization: Bearer <ID_TOKEN>` header
   - API client handles token refresh if needed

3. **Backend Verification**:
   - Middleware verifies ID token using Firebase Admin SDK
   - Extracts user information from verified token
   - Passes user context to API handlers

## Setup Instructions

### 1. Configure Identity Platform

Run the setup script to configure Google Identity Platform:

```bash
cd deploy
./setup-identity-platform.sh
```

This script will:
- Enable required Google Cloud APIs
- Configure Identity Platform
- Set up Microsoft Entra ID as OIDC provider (if credentials provided)
- Generate service account for backend verification

### 2. Configure Secrets

Set up the required secrets for Cloud Run deployment:

```bash
cd deploy
./setup-secrets.sh
```

Follow the prompts to configure:
- Firebase API credentials
- Firebase Admin SDK service account
- Microsoft Entra ID configuration (optional)

### 3. Environment Variables

Add the following to your `.env.local` file:

```env
# Firebase/Identity Platform
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Firebase Admin SDK (single-line JSON)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Microsoft Entra ID (optional)
NEXT_PUBLIC_ENTRA_TENANT_ID=your-tenant-id
```

### 4. Configure Microsoft Entra ID

In the Azure Portal:

1. Navigate to your App Registration
2. Add Redirect URIs:
   - Default: `https://<PROJECT_ID>.firebaseapp.com/__/auth/handler`
   - Custom domain: `https://your-domain.com/__/auth/handler`
3. Configure API permissions as needed

### 5. Configure Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Authentication > Settings
4. Add authorized domains:
   - Your Cloud Run service URL
   - Any custom domains

## File Structure

### New Files Created

- `/lib/auth/identity-platform.ts` - Backend token verification
- `/lib/auth/firebase-client.ts` - Frontend authentication
- `/contexts/AuthContext.tsx` - React authentication context
- `/lib/api-client.ts` - API client with automatic auth headers
- `/app/login/page.tsx` - Login page component
- `/deploy/setup-identity-platform.sh` - Identity Platform setup script
- `/deploy/setup-secrets.sh` - Secrets configuration script

### Removed Files

- `/lib/auth/cloud-run.ts.old` - Old Workload Federation handler
- `/lib/auth/google-iap.ts.old` - Old IAP handler
- Various old deployment scripts (renamed to `.old`)

## Usage in Components

### Protected Pages

Use the `useRequireAuth` hook to protect pages:

```tsx
import { useRequireAuth } from '@/contexts/AuthContext';

export default function ProtectedPage() {
  const { user, userInfo } = useRequireAuth();

  return (
    <div>
      Welcome, {userInfo?.displayName}!
    </div>
  );
}
```

### API Calls

Use the API client for authenticated requests:

```tsx
import { api } from '@/lib/api-client';

// Automatically includes auth header
const response = await api.newsletters.list();
```

### Sign Out

```tsx
import { useAuth } from '@/contexts/AuthContext';

function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button onClick={signOut}>
      Sign Out
    </button>
  );
}
```

## Deployment

Deploy to Cloud Run with the updated configuration:

```bash
gcloud run deploy catalyst-newsletter \
  --source . \
  --region=europe-west1 \
  --project=newsletter-1757943207
```

## Security Considerations

1. **Token Verification**: All API requests are verified server-side using Firebase Admin SDK
2. **HTTPS Only**: Authentication only works over HTTPS
3. **Token Expiry**: Tokens expire after 1 hour and are automatically refreshed
4. **Domain Restrictions**: Only authorized domains can use the authentication flow

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if Firebase credentials are correctly configured
2. **Redirect URI mismatch**: Ensure redirect URIs match in Azure Portal and Firebase
3. **Token verification fails**: Verify Firebase Admin SDK service account key is correct

### Debug Mode

In development, the app works without real authentication. Set `NODE_ENV=development` to use mock auth.

## Migration Notes

This setup replaces:
- IAP (Identity-Aware Proxy) - which was for service-to-service auth
- Workload Identity Federation - which was for service account impersonation

The new setup provides proper end-user authentication suitable for web applications.