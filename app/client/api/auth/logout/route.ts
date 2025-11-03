import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, clearAuthCookies } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const context = await getAuthContext(req);

    // Token revocation would be handled here if using Firebase

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}