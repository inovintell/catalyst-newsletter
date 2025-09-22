# Plan: Multi-tenant Authentication Service with GCP Identity Platform and Microsoft Entra

## Metadata
adw_id: `gcp-enntra-authentication`
prompt: `Multi-tenant identity platform for InovIntell - Single resource to inform and build service that does authentication for all tenants in the company. We would like to utilize microsoft entra (preferably with OIDC, without federation) as one of auth providers. Could switch to password based auth at the beginning before setup of ms entra provider.`
task_type: feature
complexity: complex

## Task Description
Implement a comprehensive multi-tenant authentication service using Google Cloud Platform's Identity Platform as the core authentication infrastructure, with support for Microsoft Entra (formerly Azure AD) as an OIDC provider. The system will support multiple tenants with isolated user pools and configurations, deployed on Cloud Run in europe-west1 region. Initial implementation will support email/password authentication with a clear migration path to Microsoft Entra OIDC integration.

## Objective
Create a production-ready authentication service that provides secure, multi-tenant authentication capabilities for all InovIntell applications, starting with the Catalyst Newsletter application, using GCP Identity Platform with Microsoft Entra OIDC integration.

## Problem Statement
InovIntell needs a centralized authentication service that can handle multiple tenants with complete isolation while supporting enterprise SSO through Microsoft Entra. The current Catalyst Newsletter application lacks proper authentication, and future applications will require the same authentication infrastructure.

## Solution Approach
Leverage Google Identity Platform's native multi-tenancy support to create isolated authentication contexts per tenant. Each tenant will have its own user pool, authentication providers, and custom claims/roles. The service will be deployed as a Cloud Run service with automatic scaling and built-in load balancing. Initial implementation will use email/password authentication with a clear upgrade path to Microsoft Entra OIDC.

## Relevant Files
Use these files to complete the task:

- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/README.md` - Understand current application structure
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/.env.sample` - Review existing environment variables
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/app/api/*` - Existing API structure to integrate auth
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/lib/db.ts` - Database utilities for user session management

### New Files
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/lib/auth/identity-platform.ts` - Core Identity Platform client
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/lib/auth/middleware.ts` - Authentication middleware
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/lib/auth/tenant-manager.ts` - Multi-tenant management
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/lib/auth/providers/entra.ts` - Microsoft Entra OIDC provider
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/app/api/auth/[...auth]/route.ts` - Auth API routes
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/app/(auth)/login/page.tsx` - Login page
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/app/(auth)/register/page.tsx` - Registration page
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/deploy/gcp/identity-platform.tf` - Terraform configuration
- `/Users/clazz/Projects/Inovintell/catalyst-newsletter/deploy/gcp/cloud-run.tf` - Cloud Run deployment

## Implementation Phases
### Phase 1: Foundation
- Set up GCP project and enable Identity Platform API
- Configure Terraform infrastructure as code
- Implement core authentication library with Firebase Admin SDK
- Create multi-tenant management utilities

### Phase 2: Core Implementation
- Build authentication middleware for Next.js
- Implement email/password authentication flow
- Create user registration and login pages
- Add session management with JWT tokens
- Integrate authentication with existing API routes

### Phase 3: Integration & Polish
- Configure Microsoft Entra as OIDC provider
- Implement tenant switching functionality
- Add role-based access control (RBAC)
- Create authentication documentation
- Deploy to Cloud Run with CI/CD pipeline

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Set Up GCP Project and Identity Platform
- Enable Identity Platform API in GCP Console
- Create service account with necessary permissions
- Download service account credentials JSON
- Configure project for europe-west1 region

### 2. Initialize Terraform Infrastructure
- Create Terraform configuration for Identity Platform
- Define multi-tenant configuration structure
- Set up Cloud Run service definition
- Configure automatic SSL certificates

### 3. Install Authentication Dependencies
- Add Firebase Admin SDK: `npm install firebase-admin`
- Add Firebase client SDK: `npm install firebase`
- Add JWT utilities: `npm install jsonwebtoken`
- Add cookie management: `npm install cookies-next`

### 4. Create Core Authentication Library
- Implement Identity Platform client initialization
- Create tenant management utilities
- Build user authentication functions
- Add token validation and refresh logic

### 5. Build Authentication Middleware
- Create Next.js middleware for protected routes
- Implement session validation
- Add tenant context injection
- Build authorization checks

### 6. Implement Email/Password Authentication
- Create registration API endpoint
- Build login API endpoint
- Add password reset functionality
- Implement email verification

### 7. Create Authentication UI Components
- Build login page with tenant selection
- Create registration form
- Add password reset flow
- Implement loading and error states

### 8. Integrate with Existing Application
- Protect existing API routes
- Add user context to API handlers
- Update database schema for user sessions
- Modify frontend to handle authentication

### 9. Configure Microsoft Entra OIDC Provider
- Register application in Microsoft Entra
- Configure OIDC settings in Identity Platform
- Map claims and attributes
- Test SSO flow

### 10. Add Multi-tenant Features
- Implement tenant switching UI
- Create tenant administration endpoints
- Add tenant-specific configurations
- Build tenant isolation validation

### 11. Implement RBAC and Permissions
- Define role structure per tenant
- Create permission checking utilities
- Add role management endpoints
- Update middleware with authorization

### 12. Deploy to Cloud Run
- Build Docker container
- Configure Cloud Run service
- Set up environment variables
- Deploy with GitHub Actions

### 13. Validate Complete Implementation
- Test email/password authentication flow
- Verify Microsoft Entra SSO
- Confirm multi-tenant isolation
- Check performance and security

## Testing Strategy
- Unit tests for authentication utilities using Jest
- Integration tests for API endpoints with Supertest
- E2E tests for complete authentication flows with Playwright
- Security testing for token validation and tenant isolation
- Load testing for Cloud Run scaling behavior
- Manual testing of Microsoft Entra OIDC flow

## Acceptance Criteria
- [ ] Users can register and login with email/password
- [ ] Microsoft Entra SSO works via OIDC (when configured)
- [ ] Each tenant has completely isolated user pools
- [ ] JWT tokens are properly validated and refreshed
- [ ] Protected routes require valid authentication
- [ ] Session management works across page refreshes
- [ ] Tenant switching is seamless for multi-tenant users
- [ ] Service deploys successfully to Cloud Run
- [ ] Automatic scaling handles load appropriately
- [ ] All authentication flows have proper error handling
- [ ] Security headers and CORS are properly configured
- [ ] Monitoring and logging capture authentication events

## Validation Commands
Execute these commands to validate the task is complete:

- `npm run build` - Ensure the application builds without errors
- `npm run type-check` - Verify TypeScript types are correct
- `npm test -- auth` - Run authentication-related tests
- `curl https://[cloud-run-url]/api/health` - Verify Cloud Run deployment
- `gcloud identity-toolkit tenants list` - Confirm tenant configuration
- `npm run e2e:auth` - Run E2E authentication tests

## Notes
- Initial implementation uses email/password to allow immediate deployment
- Microsoft Entra configuration requires enterprise account access
- Use `npm install` for dependencies instead of `uv add` as this is a Node.js project
- Identity Platform provides 50,000 free monthly active users
- Cloud Run costs approximately $5-10/month for 100 users
- Consider implementing rate limiting for authentication endpoints
- Add monitoring with Cloud Logging for authentication events
- Document Microsoft Entra app registration process for operations team
- Plan for regular security audits of authentication implementation