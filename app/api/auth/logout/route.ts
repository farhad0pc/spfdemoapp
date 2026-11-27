import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  LEGACY_FAILSAFE_COOKIE_NAME,
  DEV_VAULT_COOKIE_NAME,
} from '@/lib/authSession';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Session terminated.',
  });

  const expireOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set(SESSION_COOKIE_NAME, '', expireOpts);
  response.cookies.set(LEGACY_FAILSAFE_COOKIE_NAME, '', expireOpts);
  response.cookies.set(DEV_VAULT_COOKIE_NAME, '', expireOpts);

  // Also clear any Supabase auth cookies if present
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
      });
    }
  }

  return response;
}
