import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  DEV_VAULT_COOKIE_NAME,
  getDevVaultFromRequest,
  getSessionFromRequest,
  signDevVaultToken,
} from '@/lib/authSession';
import { PROTECTED_ROOT_EMAIL } from '@/lib/rbac';

const ELEVATION_TTL_SECONDS = 15 * 60; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

const failedAttemptsMap = new Map<
  string,
  { count: number; firstAttemptAt: number }
>();

function getConfiguredRootEmail(): string {
  return (process.env.SYSTEM_ROOT_EMAIL || PROTECTED_ROOT_EMAIL)
    .trim()
    .toLowerCase();
}

function getRateLimitKey(request: NextRequest, email: string): string {
  const forwarded = request.headers.get('x-forwarded-for') || 'local';
  const ip = forwarded.split(',')[0]?.trim() || 'local';
  return `${email.toLowerCase()}::${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = failedAttemptsMap.get(key);
  if (!entry) return { allowed: true, retryAfterSec: 0 };

  if (now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsMap.delete(key);
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - entry.firstAttemptAt);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = failedAttemptsMap.get(key);
  if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsMap.set(key, { count: 1, firstAttemptAt: now });
  } else {
    failedAttemptsMap.set(key, {
      count: entry.count + 1,
      firstAttemptAt: entry.firstAttemptAt,
    });
  }
}

function clearFailedAttempts(key: string): void {
  failedAttemptsMap.delete(key);
}

/**
 * Verifies a plaintext PIN against DEV_SECURITY_PIN_HASH using crypto.scryptSync
 * and crypto.timingSafeEqual. Supports:
 * - "salt:hashHex"
 * - "scrypt:salt:hashHex"
 * - "scrypt$salt$hashHex"
 * - "$scrypt$salt$hashHex"
 */
function verifyPinAgainstHash(pin: string, rawStoredHash: string): boolean {
  const cleanHash = rawStoredHash.trim();
  if (!pin || !cleanHash) return false;

  let salt = '';
  let expectedHex = '';

  if (cleanHash.includes(':')) {
    const parts = cleanHash.split(':').filter(Boolean);
    if (parts.length === 2) {
      [salt, expectedHex] = parts;
    } else if (parts.length >= 3 && parts[0].toLowerCase() === 'scrypt') {
      salt = parts[1];
      expectedHex = parts[2];
    }
  } else if (cleanHash.includes('$')) {
    const parts = cleanHash.split('$').filter(Boolean);
    if (parts.length === 2) {
      [salt, expectedHex] = parts;
    } else if (parts.length >= 3 && parts[0].toLowerCase() === 'scrypt') {
      salt = parts[1];
      expectedHex = parts[2];
    }
  }

  if (!salt || !expectedHex) {
    return false;
  }

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (expectedBuf.length === 0) return false;
    const derivedBuf = crypto.scryptSync(pin, salt, expectedBuf.length);
    if (derivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

async function writeVaultAuditLog(params: {
  actorId?: string | null;
  actorEmail: string;
  actionType: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('user_audit_logs').insert([
      {
        actor_user_id: params.actorId || null,
        target_user_id: params.actorId || null,
        action_type: params.actionType,
        changes_payload: {
          actor_email: params.actorEmail,
          ...params.metadata,
        },
      },
    ]);
    if (error) {
      // Fallback for alternate user_audit_logs column names
      await supabaseAdmin.from('user_audit_logs').insert([
        {
          actor_id: params.actorId || null,
          target_id: params.actorId || null,
          action: params.actionType,
          details: {
            actor_email: params.actorEmail,
            ...params.metadata,
          },
        },
      ]);
    }
  } catch {
    // Non-fatal if audit table schema differs
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const rootEmail = getConfiguredRootEmail();
  if (
    !session ||
    session.role !== 'SYSTEM_ADMIN' ||
    session.email.trim().toLowerCase() !== rootEmail
  ) {
    return NextResponse.json({ elevated: false }, { status: 200 });
  }

  const vault = getDevVaultFromRequest(request, rootEmail);
  return NextResponse.json({
    elevated: Boolean(vault),
    expiresAt: vault?.exp || null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const rootEmail = getConfiguredRootEmail();

    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const sessionEmail = session.email.trim().toLowerCase();
    if (session.role !== 'SYSTEM_ADMIN' || sessionEmail !== rootEmail) {
      await writeVaultAuditLog({
        actorId: session.userId,
        actorEmail: sessionEmail,
        actionType: 'DEV_VAULT_UNAUTHORIZED_ATTEMPT',
        metadata: { role: session.role },
      });
      return NextResponse.json(
        {
          error:
            'Yetkisiz erişim (403): Geliştirici Güvenlik Kasası yalnızca Korumalı Root (Tier 0) hesabına açıktır.',
        },
        { status: 403 }
      );
    }

    const rateKey = getRateLimitKey(request, sessionEmail);
    const limitStatus = checkRateLimit(rateKey);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla başarısız PIN denemesi. Lütfen ${Math.ceil(
            limitStatus.retryAfterSec / 60
          )} dakika sonra tekrar deneyin.`,
          retryAfterSec: limitStatus.retryAfterSec,
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { pin?: string };
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

    if (!pin) {
      return NextResponse.json(
        { error: 'Güvenlik PIN kodu zorunludur. / Security PIN is required.' },
        { status: 400 }
      );
    }

    const storedPinHash = process.env.DEV_SECURITY_PIN_HASH || '';
    if (!storedPinHash) {
      return NextResponse.json(
        {
          error:
            'Sunucu yapılandırma hatası: DEV_SECURITY_PIN_HASH tanımlı değil.',
        },
        { status: 500 }
      );
    }

    const isValid = verifyPinAgainstHash(pin, storedPinHash);
    if (!isValid) {
      recordFailedAttempt(rateKey);
      await writeVaultAuditLog({
        actorId: session.userId,
        actorEmail: sessionEmail,
        actionType: 'DEV_VAULT_PIN_FAILED',
        metadata: { timestamp: new Date().toISOString() },
      });
      return NextResponse.json(
        {
          error:
            'Geçersiz Geliştirici Güvenlik PIN kodu. / Invalid Developer Security PIN.',
        },
        { status: 401 }
      );
    }

    clearFailedAttempts(rateKey);
    const exp = Math.floor(Date.now() / 1000) + ELEVATION_TTL_SECONDS;
    const vaultToken = signDevVaultToken({
      email: sessionEmail,
      elevated: true,
      exp,
    });

    await writeVaultAuditLog({
      actorId: session.userId,
      actorEmail: sessionEmail,
      actionType: 'DEV_VAULT_VERIFIED',
      metadata: { expires_at: new Date(exp * 1000).toISOString() },
    });

    const response = NextResponse.json({
      success: true,
      elevated: true,
      expiresAt: exp,
    });

    response.cookies.set(DEV_VAULT_COOKIE_NAME, vaultToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ELEVATION_TTL_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
