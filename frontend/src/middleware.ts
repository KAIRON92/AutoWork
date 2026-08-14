import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/accounts',
  '/contacts',
  '/templates',
  '/campaigns',
  '/automations',
  '/imports',
  '/logs',
  '/settings',
  '/attachments',
  '/admin',
];

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('autowork_jwt_token')?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Only protect application routes at the edge. Do not assume that the
  // presence of a cookie means the JWT is still valid: the backend verifies
  // the cookie and the client handles 401 responses.
  // This avoids stale-cookie redirect loops between /dashboard and /login.
  if (isProtectedRoute && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Auth pages must remain reachable when a stale/expired cookie is present.
  // The backend/client auth layer will establish or reject the session.
  if (isAuthRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
