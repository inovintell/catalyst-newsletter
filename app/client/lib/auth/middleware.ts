import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserById, verifyAuthToken } from './simple-auth';
import { tenantManager, AuthUser } from './tenant-manager';

export interface AuthContext {
  user: AuthUser | null;
  tenantId: string | null;
  isAuthenticated: boolean;
}

export interface JWTPayload {
  uid: string;
  email: string;
  tenantId: string;
  role?: string;
  permissions?: string[];
  exp?: number;
  iat?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export function signJWT(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as any);
}

export function signRefreshToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as any);
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization');
  const cookieToken = req.cookies.get('auth-token')?.value;
  const token = authHeader?.replace('Bearer ', '') || cookieToken;

  if (!token || typeof token !== 'string') {
    return {
      user: null,
      tenantId: null,
      isAuthenticated: false,
    };
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return {
      user: null,
      tenantId: null,
      isAuthenticated: false,
    };
  }

  const user = await getUserById(payload.uid, payload.tenantId);
  if (!user) {
    return {
      user: null,
      tenantId: null,
      isAuthenticated: false,
    };
  }

  const authUser: AuthUser = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: null,
    emailVerified: user.emailVerified,
    tenantId: payload.tenantId,
    role: payload.role,
    permissions: payload.permissions,
    customClaims: {},
  };

  return {
    user: authUser,
    tenantId: payload.tenantId,
    isAuthenticated: true,
  };
}

export async function requireAuth(
  req: NextRequest,
  requiredRole?: string,
  requiredPermissions?: string[]
): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext(req);

  if (!context.isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (requiredRole && context.user?.role !== requiredRole) {
    return NextResponse.json(
      { error: 'Insufficient role privileges' },
      { status: 403 }
    );
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = context.user?.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }

  return context;
}

export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options?: {
    requiredRole?: string;
    requiredPermissions?: string[];
    optional?: boolean;
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (options?.optional) {
      const context = await getAuthContext(req);
      return handler(req, context);
    }

    const authResult = await requireAuth(
      req,
      options?.requiredRole,
      options?.requiredPermissions
    );

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(req, authResult);
  };
}

export function getTenantFromRequest(req: NextRequest): string {
  const host = req.headers.get('host') || '';
  const tenantHeader = req.headers.get('x-tenant-id');
  const tenantCookie = req.cookies.get('tenant-id')?.value;

  if (tenantHeader && typeof tenantHeader === 'string') {
    return tenantHeader;
  }

  if (tenantCookie && typeof tenantCookie === 'string') {
    return tenantCookie;
  }

  const tenantFromHost = tenantManager.getTenantFromHost(host);
  if (tenantFromHost) {
    return tenantFromHost;
  }

  return process.env.DEFAULT_TENANT_ID || 'default-tenant';
}


export async function refreshAuthToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const payload = verifyJWT(refreshToken);
  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.uid, payload.tenantId);
  if (!user) {
    return null;
  }

  const newPayload: Omit<JWTPayload, 'exp' | 'iat'> = {
    uid: user.uid,
    email: user.email || '',
    tenantId: payload.tenantId,
    role: payload.role,
    permissions: payload.permissions,
  };

  return {
    accessToken: signJWT(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.delete('auth-token');
  res.cookies.delete('refresh-token');
  res.cookies.delete('tenant-id');
}