let admin: any;
let getAuth: any;
let cert: any;
let initializeApp: any;

if (typeof window === 'undefined') {
  admin = require('firebase-admin');
  getAuth = require('firebase-admin/auth').getAuth;
  const app = require('firebase-admin/app');
  cert = app.cert;
  initializeApp = app.initializeApp;
}

export interface TenantConfig {
  id: string;
  displayName: string;
  allowPasswordSignup: boolean;
  enableEmailLinkSignin: boolean;
  providers?: string[];
}

export interface UserClaims {
  tenantId: string;
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

class IdentityPlatformService {
  private app: any = null;
  private auth: any = null;
  private tenantManager: any = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized || typeof window !== 'undefined') return;

    try {
      const projectId = process.env.GCP_PROJECT_ID;
      const serviceAccountPath = process.env.GCP_SERVICE_ACCOUNT_KEY;

      if (!projectId) {
        console.warn('GCP_PROJECT_ID not set, using mock authentication mode');
        return;
      }

      let serviceAccount: any;

      if (serviceAccountPath && serviceAccountPath !== 'path-to-service-account-key.json') {
        try {
          serviceAccount = require(serviceAccountPath);
        } catch (error) {
          console.error('Failed to load service account key:', error);
        }
      }

      const appConfig: any = {
        projectId,
      };

      if (serviceAccount && cert) {
        appConfig.credential = cert(serviceAccount);
      }

      if (initializeApp) {
        this.app = initializeApp(appConfig, 'identity-platform');
        this.auth = getAuth ? getAuth(this.app) : null;
        this.tenantManager = this.auth ? this.auth.tenantManager() : null;
        this.initialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize Identity Platform:', error);
    }
  }

  async createTenant(config: TenantConfig): Promise<any | null> {
    if (!this.tenantManager) {
      console.error('Tenant manager not initialized');
      return null;
    }

    try {
      const tenant = await this.tenantManager.createTenant({
        displayName: config.displayName,
        passwordSignupAllowed: config.allowPasswordSignup,
        emailLinkSignInEnabled: config.enableEmailLinkSignin,
      });

      return tenant;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      return null;
    }
  }

  async getTenant(tenantId: string): Promise<any | null> {
    if (!this.tenantManager) {
      console.error('Tenant manager not initialized');
      return null;
    }

    try {
      return await this.tenantManager.getTenant(tenantId);
    } catch (error) {
      console.error('Failed to get tenant:', error);
      return null;
    }
  }

  async listTenants(): Promise<any[]> {
    if (!this.tenantManager) {
      console.error('Tenant manager not initialized');
      return [];
    }

    try {
      const result = await this.tenantManager.listTenants();
      return result.tenants;
    } catch (error) {
      console.error('Failed to list tenants:', error);
      return [];
    }
  }

  async createUser(
    email: string,
    password: string,
    displayName?: string,
    tenantId?: string
  ): Promise<any | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      const user = await authInstance.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string, tenantId?: string): Promise<any | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      return await authInstance.getUserByEmail(email);
    } catch (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }
  }

  async getUserById(uid: string, tenantId?: string): Promise<any | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      return await authInstance.getUser(uid);
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  async setCustomUserClaims(
    uid: string,
    claims: UserClaims,
    tenantId?: string
  ): Promise<void> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      await authInstance.setCustomUserClaims(uid, claims);
    } catch (error) {
      console.error('Failed to set custom claims:', error);
    }
  }

  async verifyIdToken(
    idToken: string,
    tenantId?: string
  ): Promise<any | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      return await authInstance.verifyIdToken(idToken);
    } catch (error) {
      console.error('Failed to verify ID token:', error);
      return null;
    }
  }

  async createCustomToken(
    uid: string,
    claims?: object,
    tenantId?: string
  ): Promise<string | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      return await authInstance.createCustomToken(uid, claims);
    } catch (error) {
      console.error('Failed to create custom token:', error);
      return null;
    }
  }

  async deleteUser(uid: string, tenantId?: string): Promise<void> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      await authInstance.deleteUser(uid);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  async updateUser(
    uid: string,
    updates: any,
    tenantId?: string
  ): Promise<any | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      return await authInstance.updateUser(uid, updates);
    } catch (error) {
      console.error('Failed to update user:', error);
      return null;
    }
  }

  async sendPasswordResetEmail(email: string, tenantId?: string): Promise<string | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      const link = await authInstance.generatePasswordResetLink(email);
      return link;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return null;
    }
  }

  async sendEmailVerification(uid: string, tenantId?: string): Promise<string | null> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return null;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      const user = await authInstance.getUser(uid);
      if (!user.email) {
        throw new Error('User has no email');
      }

      const link = await authInstance.generateEmailVerificationLink(user.email);
      return link;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      return null;
    }
  }

  async revokeRefreshTokens(uid: string, tenantId?: string): Promise<void> {
    if (!this.auth) {
      console.error('Auth not initialized');
      return;
    }

    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      await authInstance.revokeRefreshTokens(uid);
    } catch (error) {
      console.error('Failed to revoke refresh tokens:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const identityPlatform = new IdentityPlatformService();