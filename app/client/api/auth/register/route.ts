import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, generateAuthToken } from '@/lib/auth/simple-auth';
import { signJWT, signRefreshToken } from '@/lib/auth/middleware';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const authToken = req.cookies.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Admin authentication required to create new users' },
        { status: 403 }
      );
    }

    // For now, only allow the first registered user to create more accounts
    // In production, check if user has admin role

    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password, displayName } = validation.data;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const user = await createUser(email, password, displayName);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const jwtPayload = {
      uid: user.uid,
      email: user.email || '',
      role: user.role || 'user',
      permissions: user.permissions || [],
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
        role: user.role || 'user',
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

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}