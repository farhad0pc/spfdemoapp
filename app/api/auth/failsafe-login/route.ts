import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SESSION_SECRET = process.env.FAILSAFE_SECRET || 'caesar-godtier-failsafe-secret-2026';

function signSession(data: { email: string; role: string; exp: number }): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve acil durum şifresi zorunludur.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Call PostgreSQL SECURITY DEFINER RPC verify_failsafe_credentials
    const { data: isValid, error: rpcError } = await supabaseAdmin.rpc(
      'verify_failsafe_credentials',
      {
        p_email: cleanEmail,
        p_password: password,
      }
    );

    if (rpcError) {
      // In case the DB RPC is unseeded or missing during initial cold start, provide diagnostic info
      console.error('[FAILSAFE RPC ERROR]', rpcError);
      return NextResponse.json(
        { 
          error: 'Acil durum doğrulama servisi yanıt vermedi: ' + rpcError.message,
          hint: 'Veritabanında public.verify_failsafe_credentials fonksiyonu tanımlı olmalıdır.'
        },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz acil durum kimlik bilgileri. Yetkisiz giriş engellendi.' },
        { status: 401 }
      );
    }

    // Lookup corporate_users profile
    const { data: userProfile } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Ensure last_login_at is updated
    if (userProfile) {
      await supabaseAdmin
        .from('corporate_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userProfile.id);
    }

    // Create signed session token for 24 hours
    const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
    const sessionToken = signSession({
      email: cleanEmail,
      role: 'SYSTEM_ADMIN',
      exp,
    });

    const response = NextResponse.json({
      success: true,
      message: 'God-Tier acil durum kimlik doğrulaması başarılı. Root yetkileri aktifleştirildi.',
      role: 'SYSTEM_ADMIN',
      email: cleanEmail,
      full_name: userProfile?.full_name || 'System Administrator (God-Tier)',
    });

    // Set HTTP-Only Cookie
    response.cookies.set('caesar_failsafe_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 3600,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  // Logout / clear failsafe cookie
  const response = NextResponse.json({ success: true, message: 'Oturum kapatıldı.' });
  response.cookies.delete('caesar_failsafe_session');
  return response;
}
