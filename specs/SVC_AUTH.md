# Authentication Middleware Analysis Report

## 1. Assumptions

The authentication system makes several key assumptions:

- **Development Mode**: In development (`NODE_ENV !== 'production'`), the system provides mock authentication, returning a dummy user object without actual token verification
- **Service Account Configuration**: Assumes Firebase service account credentials are provided as a JSON string in `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable for production
- **Token Format**: Expects standard Firebase/Identity Platform ID tokens in JWT format with Bearer prefix in Authorization headers
- **Client-Server Architecture**: Assumes client-side authentication through Firebase SDK with server-side verification via Firebase Admin SDK
- **Fallback Auth Support**: Has provisions for Cloud Run authentication (found in `cloud-run.ts.old`), suggesting potential dual-auth capability

## 2. ID Token Flow

The ID token flows through the system as follows:

### Client-Side Flow
1. User initiates authentication via `AuthContext` using Firebase client SDK
2. Authentication happens through identity providers (Microsoft Entra ID or Google)
3. Firebase returns an ID token after successful authentication
4. Token is stored in Firebase Auth state with local persistence
5. API client (`api-client.ts`) automatically retrieves token via `getUserIdToken()`
6. Token attached to all API requests as `Authorization: Bearer <token>`

### Server-Side Flow
1. Middleware (`middleware.ts`) intercepts all incoming requests
2. Extracts Bearer token from Authorization header
3. Verifies token using Firebase Admin SDK (`verifyIdToken()`)
4. Decodes token to extract user claims (uid, email, name, etc.)
5. Passes user information to downstream handlers via custom headers (`x-user-email`, `x-user-id`, `x-user-name`)
6. Protected routes check for valid user object, returning 401 if unauthorized

### Token Refresh
- Client automatically handles token refresh through Firebase SDK
- API client can force refresh if 401 received (`getUserIdToken(true)`)

## 3. External Resources

### Google Cloud Platform Resources
- **Identity Platform/Firebase Auth**: Primary authentication service
- **Cloud Run**: Hosting platform for the application
- **Firebase Project**: Required for Identity Platform integration
- **Service Account**: `firebase-adminsdk@{project-id}.iam.gserviceaccount.com` with `roles/firebase.admin`

### Required GCP APIs
- `identitytoolkit.googleapis.com`
- `firebase.googleapis.com`
- `firebaseauth.googleapis.com`
- `cloudresourcemanager.googleapis.com`
- `run.googleapis.com`

### External Identity Providers
- **Microsoft Entra ID** (Azure AD): OIDC provider for enterprise SSO
- **Google**: OAuth provider for Google account authentication

## 4. Environment Variables

### Client-Side Variables (`NEXT_PUBLIC_*`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase Web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain (`{project-id}.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: GCP project ID
- `NEXT_PUBLIC_ENTRA_TENANT_ID`: Microsoft Entra tenant ID (optional)
- `NEXT_PUBLIC_APP_URL`: Application base URL

### Server-Side Variables
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Service account credentials JSON (single-line format)
- `NODE_ENV`: Environment mode (development/production)

### Deployment Configuration
- `GCP_PROJECT_ID`: Target GCP project (default: "newsletter-1757943207")
- `GCP_REGION`: Deployment region (default: "europe-west1")
- `ENTRA_CLIENT_ID`: Microsoft app client ID
- `ENTRA_CLIENT_SECRET`: Microsoft app client secret

## 5. Authentication Providers

### Microsoft Entra ID (Primary Enterprise Provider)
- Provider ID: `microsoft.com`
- Uses OIDC flow with issuer: `https://login.microsoftonline.com/{tenant-id}/v2.0`
- Requires redirect URI configuration in Azure Portal
- Extracts Microsoft-specific claims (tid, oid, upn)

### Google OAuth
- Standard Google authentication provider
- Simpler setup with automatic Firebase integration

### Email/Password
- Enabled but appears to be optional/fallback method

## 6. Security Boundaries

### Public Paths (No Authentication)
- `/api/health`
- `/_next/*` (Next.js assets)
- `/favicon.ico`
- `/public/*`
- `/login`
- `/__/auth` (Firebase auth handler)

### Protected API Routes
- `/api/generate`
- `/api/refine`
- `/api/newsletters`
- `/api/sources`
- `/api/agent-config`

All other routes require authentication in production mode.