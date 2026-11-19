import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { canInviteRole, ROLE_METADATA } from '@/lib/rbac';
import { RoleTier, DepartmentCode } from '@/types/requisition';
import { sendUserInvitationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      full_name, 
      target_role, 
      actor_role, 
      actor_name, 
      actor_id 
    } = body as {
      email: string;
      full_name: string;
      target_role: RoleTier;
      actor_role: RoleTier;
      actor_name?: string;
      actor_id?: string;
    };

    if (!email || !full_name || !target_role || !actor_role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, target_role, actor_role' },
        { status: 400 }
      );
    }

    // Enforce 2D RBAC Delegation Rights
    if (!canInviteRole(actor_role, target_role)) {
      return NextResponse.json(
        { 
          error: `Yetkisiz işlem: ${actor_role} rolü, ${target_role} rolünü delege edemez veya davet gönderemez.` 
        },
        { status: 403 }
      );
    }

    const roleMeta = ROLE_METADATA[target_role];
    if (!roleMeta) {
      return NextResponse.json({ error: 'Geçersiz hedef rol tanımı.' }, { status: 400 });
    }

    const targetDepartment: DepartmentCode = roleMeta.department;
    const targetTier = roleMeta.tier;

    // Check if user is already registered in public.corporate_users
    const { data: existingUser } = await supabaseAdmin
      .from('corporate_users')
      .select('id, email, account_status')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser && existingUser.account_status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı aktif bir kullanıcı zaten mevcut.' },
        { status: 409 }
      );
    }

    // Invalidate any previously pending invitations for this email
    await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'PENDING');

    // Generate high-entropy 32-byte cryptographic token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 48-hour expiration
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const resolvedInviterUuid = actor_id || '00000000-0000-0000-0000-000000000000';

    const { data: inviteRecord, error: insertError } = await supabaseAdmin
      .from('user_invitations')
      .insert([
        {
          email: email.trim().toLowerCase(),
          full_name: full_name.trim(),
          target_role,
          target_department: targetDepartment,
          target_tier: targetTier,
          token_hash: tokenHash,
          status: 'PENDING',
          invited_by_uuid: resolvedInviterUuid,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Davet kaydı oluşturulamadı: ' + insertError.message },
        { status: 500 }
      );
    }

    // Determine Base URL for link
    let baseUrl = 'https://spfdemoapp.vercel.app';
    if (process.env.APP_BASE_URL && !process.env.APP_BASE_URL.includes('supabase.co')) {
      baseUrl = process.env.APP_BASE_URL.replace(/\/+$/, '');
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${rawToken}`;

    // Dispatch activation email asynchronously
    void sendUserInvitationEmail({
      recipientEmail: email.trim().toLowerCase(),
      recipientName: full_name.trim(),
      targetRole: target_role,
      targetDepartment,
      inviterName: actor_name || 'Caesar Governance',
      inviterRole: actor_role,
      inviteUrl,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      invitation_id: inviteRecord.invitation_id,
      invite_url: inviteUrl,
      expires_at: expiresAt,
      message: `${full_name} için 48 saat geçerli davet oluşturuldu.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
