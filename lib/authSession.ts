import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { RoleTier } from '@/types/requisition';

export const SESSION_COOKIE_NAME = 'caesar_session';
export const LEGACY_FAILSAFE_COOKIE_NAME = 'caesar_failsafe_session';

const SESSION_SECRET =
  process.env.FAILSAFE_SECRET ||
  process.env.APPROVAL_TOKEN_SECRET ||
  'caesar-godtier-failsafe-secret-2026';

export interface AuthSessionPayload {
  email: string;
  role: RoleTier;
  fullName?: string;
  userId?: string;
  isFailsafe?: boolean;
  exp: number;
}

export function signAuthSession(data: AuthSessionPayload): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthSession(cookieVal?: string): AuthSessionPayload | null {
  if (!cookieVal) return null;
  const parts = cookieVal.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    ) as AuthSessionPayload;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!parsed.email || !parsed.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): AuthSessionPayload | null {
  const primaryCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const primarySession = verifyAuthSession(primaryCookie);
  if (primarySession) return primarySession;

  const legacyCookie = request.cookies.get(LEGACY_FAILSAFE_COOKIE_NAME)?.value;
  const legacySession = verifyAuthSession(legacyCookie);
  if (legacySession) return legacySession;

  return null;
}

export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll();
  return allCookies.some(
    (c) =>
      c.name.startsWith('sb-') &&
      (c.name.endsWith('-auth-token') || c.name.includes('-auth-token.')) &&
      Boolean(c.value)
  );
}
