import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, generateAuthToken } from '@/lib/auth/simple-auth';
import { tenantManager } from '@/lib/auth/tenant-manager';
import { signJWT, signRefreshToken, getTenantFromRequest } from '@/lib/auth/middleware';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(100).optional(),
  tenantId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password, displayName, tenantId: requestTenantId } = validation.data;
    const tenantId = requestTenantId || getTenantFromRequest(req);

    const tenant = await tenantManager.getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 400 }
      );
    }

    if (!tenant.settings.allowPasswordSignup) {
      return NextResponse.json(
        { error: 'Password signup is not allowed for this tenant' },
        { status: 403 }
      );
    }

    if (tenant.settings.allowedDomains && tenant.settings.allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1];
      if (!tenant.settings.allowedDomains.includes(emailDomain)) {
        return NextResponse.json(
          { error: 'Email domain not allowed for this tenant' },
          { status: 403 }
        );
      }
    }

    const existingUser = await getUserByEmail(email, tenantId);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const user = await createUser(email, password, displayName, tenantId);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Custom claims are handled in the simple-auth module

    const jwtPayload = {
      uid: user.uid,
      email: user.email || '',
      tenantId,
      role: tenant.settings.defaultRole || 'user',
      permissions: [],
    };

    const accessToken = signJWT(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        tenantId,
        role: tenant.settings.defaultRole || 'user',
      },
      accessToken,
      refreshToken,
    });

    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set('tenant-id', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    if (tenant.settings.requireEmailVerification) {
      console.log('Email verification would be sent to:', user.email);
    }

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}