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

export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  allowPasswordSignup: boolean;
  enableEmailLinkSignin: boolean;
  requireEmailVerification: boolean;
  allowedDomains?: string[];
  defaultRole?: string;
  customClaims?: Record<string, any>;
  providers?: AuthProvider[];
}

export interface AuthProvider {
  type: 'oidc' | 'saml' | 'oauth2';
  id: string;
  displayName: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface TenantContext {
  tenantId: string;
  tenant: Tenant | null;
  user: AuthUser | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  tenantId?: string;
  role?: string;
  permissions?: string[];
  customClaims?: Record<string, any>;
}

class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private currentTenant: string | null = null;

  constructor() {
    this.initializeDefaultTenant();
  }

  private async initializeDefaultTenant(): Promise<void> {
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default-tenant';

    const defaultTenant: Tenant = {
      id: defaultTenantId,
      name: 'default',
      displayName: 'Default Tenant',
      settings: {
        allowPasswordSignup: true,
        enableEmailLinkSignin: false,
        requireEmailVerification: false,
        defaultRole: 'user',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(defaultTenantId, defaultTenant);
    this.currentTenant = defaultTenantId;
  }

  async createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const now = new Date();
    const newTenant: Tenant = {
      ...tenant,
      createdAt: now,
      updatedAt: now,
    };

    const tenantConfig: TenantConfig = {
      id: tenant.id,
      displayName: tenant.displayName,
      allowPasswordSignup: tenant.settings.allowPasswordSignup,
      enableEmailLinkSignin: tenant.settings.enableEmailLinkSignin,
      providers: tenant.settings.providers?.map(p => p.id),
    };

    // In production, this would create the tenant in Identity Platform
    this.tenants.set(tenant.id, newTenant);
    return newTenant;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    if (this.tenants.has(tenantId)) {
      return this.tenants.get(tenantId) || null;
    }

    // In production, this would fetch from Identity Platform
    return null;
  }

  async listTenants(): Promise<Tenant[]> {
    // In production, this would list from Identity Platform
    return Array.from(this.tenants.values());
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>
  ): Promise<Tenant | null> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      return null;
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      id: tenantId,
      createdAt: tenant.createdAt,
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);
    return updatedTenant;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    if (tenantId === this.currentTenant) {
      this.currentTenant = process.env.DEFAULT_TENANT_ID || 'default-tenant';
    }

    this.tenants.delete(tenantId);
    return true;
  }

  getCurrentTenant(): string | null {
    return this.currentTenant;
  }

  setCurrentTenant(tenantId: string): void {
    this.currentTenant = tenantId;
  }

  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    // In production, validate against Identity Platform
    return true;
  }

  async assignUserToTenant(
    userId: string,
    tenantId: string,
    role?: string,
    permissions?: string[]
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const claims: UserClaims = {
      tenantId,
      role: role || tenant.settings.defaultRole || 'user',
      permissions: permissions || [],
      ...tenant.settings.customClaims,
    };

    // In production, set custom claims in Identity Platform
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    // In production, remove from Identity Platform
  }

  async getUserTenants(userEmail: string): Promise<string[]> {
    const tenants: string[] = [];

    for (const [tenantId] of this.tenants) {
      // In production, check Identity Platform
      tenants.push(tenantId);
    }

    return tenants;
  }

  async configureMicrosoftEntra(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    entraeTenantId: string
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const provider: AuthProvider = {
      type: 'oidc',
      id: 'microsoft-entra',
      displayName: 'Microsoft Entra ID',
      enabled: true,
      config: {
        clientId,
        clientSecret,
        tenantId: entraeTenantId,
        issuer: `https://login.microsoftonline.com/${entraeTenantId}/v2.0`,
        authorizationUrl: `https://login.microsoftonline.com/${entraeTenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${entraeTenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email'],
      },
    };

    const existingProviders = tenant.settings.providers || [];
    const filteredProviders = existingProviders.filter(p => p.id !== 'microsoft-entra');

    tenant.settings.providers = [...filteredProviders, provider];
    await this.updateTenant(tenantId, { settings: tenant.settings });
  }

  getTenantFromHost(host: string): string | null {
    const subdomain = host.split('.')[0];

    for (const [tenantId, tenant] of this.tenants) {
      if (tenant.name === subdomain) {
        return tenantId;
      }
    }

    return this.currentTenant;
  }
}

export const tenantManager = new TenantManager();