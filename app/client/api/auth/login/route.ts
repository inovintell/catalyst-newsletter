import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, generateAuthToken } from '@/lib/auth/simple-auth';
import { signJWT, signRefreshToken } from '@/lib/auth/middleware';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
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

    const { email, password, rememberMe } = validation.data;

    const user = await validatePassword(email, password);
    if (!user) {
      console.log('Login failed for:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('Login successful for:', email);

    const role = user.role || 'user';
    const permissions = user.permissions || [];

    const jwtPayload = {
      uid: user.uid,
      email: user.email || '',
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

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}