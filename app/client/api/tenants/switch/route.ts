import { NextRequest, NextResponse } from 'next/server';
import { tenantManager } from '@/lib/auth/tenant-manager';
import { withAuth, signJWT, signRefreshToken } from '@/lib/auth/middleware';
import { z } from 'zod';

const switchTenantSchema = z.object({
  tenantId: z.string(),
});

export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    const body = await req.json();
    const validation = switchTenantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantId } = validation.data;

    if (!context.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const hasAccess = await tenantManager.validateTenantAccess(
      context.user.uid,
      tenantId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this tenant' },
        { status: 403 }
      );
    }

    const tenant = await tenantManager.getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    tenantManager.setCurrentTenant(tenantId);

    const jwtPayload = {
      uid: context.user.uid,
      email: context.user.email || '',
      tenantId,
      role: context.user.role || 'user',
      permissions: context.user.permissions || [],
    };

    const accessToken = signJWT(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        displayName: tenant.displayName,
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

    return response;
  } catch (error) {
    console.error('Error switching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to switch tenant' },
      { status: 500 }
    );
  }
});