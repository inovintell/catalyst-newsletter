import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/middleware';

const publicRoutes = [
  '/login',
  '/register',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/health',
];

const authRoutes = [
  '/login',
  '/register',
  '/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');

  const authToken = request.cookies.get('auth-token')?.value;

  if (!isPublicRoute) {
    if (!authToken) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = verifyJWT(authToken);
    if (!payload) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.uid);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-role', payload.role || 'user');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (isAuthRoute && authToken) {
    const payload = verifyJWT(authToken);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};