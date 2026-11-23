import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, hasSupabaseAuthCookie } from '@/lib/authSession';

const PUBLIC_PAGE_PREFIXES = ['/login', '/auth/accept-invite'];
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/invite',
  '/api/auth/accept-invite',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow static assets, Next.js internals, favicon, and local WASM binaries
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/wasm') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Allow public authentication API endpoints
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 3. Verify signed HTTP-only session cookie or Supabase Auth session cookie
  const session = getSessionFromRequest(request);
  const isAuthenticated = Boolean(session) || hasSupabaseAuthCookie(request);

  // 4. Allow public login / invite onboarding pages
  if (PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 5. Enforce hard gate on protected API routes and pages
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid authentication session required.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|wasm/).*)'],
};
