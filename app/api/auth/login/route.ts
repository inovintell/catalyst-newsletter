import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, generateAuthToken } from '@/lib/auth/simple-auth';
import { tenantManager } from '@/lib/auth/tenant-manager';
import { signJWT, signRefreshToken, getTenantFromRequest } from '@/lib/auth/middleware';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
});


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password, tenantId: requestTenantId, rememberMe } = validation.data;
    const tenantId = requestTenantId || getTenantFromRequest(req);

    const tenant = await tenantManager.getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 400 }
      );
    }

    const user = await validatePassword(email, password, tenantId);
    if (!user) {
      console.log('Login failed for:', email, 'in tenant:', tenantId);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('Login successful for:', email);

    const role = user.role || tenant.settings.defaultRole || 'user';
    const permissions = user.permissions || [];

    const jwtPayload = {
      uid: user.uid,
      email: user.email || '',
      tenantId,
      role,
      permissions,
    };

    const accessToken = signJWT(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    const response = NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        photoURL: null,
        tenantId,
        role,
        permissions,
      },
      accessToken,
      refreshToken,
    });

    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : maxAge,
    });

    response.cookies.set('tenant-id', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}