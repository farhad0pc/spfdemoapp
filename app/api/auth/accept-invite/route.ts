import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Davet belirteci (token) eksik.' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const { data: invite, error } = await supabaseAdmin
    .from('user_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json(
      { error: 'Davet bağlantısı bulunamadı veya geçersiz.' },
      { status: 404 }
    );
  }

  if (invite.status !== 'PENDING') {
    return NextResponse.json(
      { 
        error: invite.status === 'ACCEPTED' 
          ? 'Bu davet zaten kabul edilmiş ve hesap aktifleştirilmiştir.' 
          : 'Bu davet yöneticiniz tarafından iptal edilmiştir.' 
      },
      { status: 410 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(invite.expires_at);
  if (now > expiresAt) {
    await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'EXPIRED' })
      .eq('invitation_id', invite.invitation_id);

    return NextResponse.json(
      { error: 'Bu davetin 48 saatlik geçerlilik süresi dolmuştur. Lütfen yöneticinizden yeni davet isteyiniz.' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    full_name: invite.full_name,
    target_role: invite.target_role,
    target_department: invite.target_department,
    target_tier: invite.target_tier,
    expires_at: invite.expires_at,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token ve yeni şifre alanları zorunludur.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter uzunluğunda olmalıdır.' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Geçersiz veya bulunamayan davet bağlantısı.' }, { status: 404 });
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Bu davet aktif değil (kullanılmış veya iptal edilmiş).' },
        { status: 410 }
      );
    }

    const now = new Date();
    if (now > new Date(invite.expires_at)) {
      return NextResponse.json(
        { error: 'Davetin geçerlilik süresi (48 saat) dolmuştur.' },
        { status: 410 }
      );
    }

    // 1. Create or update user in Supabase Auth
    let authUserId: string;

    const { data: authCreated, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invite.full_name,
        role: invite.target_role,
        department: invite.target_department,
      },
    });

    if (authCreateError) {
      // If user already exists in auth.users, update their password and confirm email
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = listData?.users.find((u) => u.email?.toLowerCase() === invite.email.toLowerCase());

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: invite.full_name,
            role: invite.target_role,
            department: invite.target_department,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Auth hesabı oluşturulamadı: ' + authCreateError.message },
          { status: 500 }
        );
      }
    } else {
      authUserId = authCreated.user.id;
    }

    // 2. Activate or upsert public.corporate_users profile
    const { error: profileError } = await supabaseAdmin
      .from('corporate_users')
      .upsert(
        [
          {
            email: invite.email,
            full_name: invite.full_name,
            role: invite.target_role,
            department: invite.target_department,
            authority_tier: invite.target_tier,
            auth_user_id: authUserId,
            account_status: 'ACTIVE',
            last_login_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'email' }
      );

    if (profileError) {
      // Fallback update
      await supabaseAdmin
        .from('corporate_users')
        .update({
          auth_user_id: authUserId,
          account_status: 'ACTIVE',
          role: invite.target_role,
          department: invite.target_department,
          authority_tier: invite.target_tier,
          last_login_at: new Date().toISOString(),
        })
        .eq('email', invite.email);
    }

    // 3. Mark Invitation ACCEPTED
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('invitation_id', invite.invitation_id);

    return NextResponse.json({
      success: true,
      message: 'Hesabınız başarıyla aktifleştirildi. Şimdi giriş yapabilirsiniz.',
      email: invite.email,
      role: invite.target_role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
