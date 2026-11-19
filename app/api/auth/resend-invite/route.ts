import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { canInviteRole } from '@/lib/rbac';
import { RoleTier } from '@/types/requisition';
import { sendUserInvitationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { invitation_id, actor_role, actor_name } = await request.json();

    if (!invitation_id || !actor_role) {
      return NextResponse.json(
        { error: 'invitation_id ve actor_role alanları zorunludur.' },
        { status: 400 }
      );
    }

    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_id', invitation_id)
      .single();

    if (fetchErr || !invite) {
      return NextResponse.json({ error: 'Davet kaydı bulunamadı.' }, { status: 404 });
    }

    if (!canInviteRole(actor_role as RoleTier, invite.target_role as RoleTier)) {
      return NextResponse.json(
        { error: 'Bu daveti yenileme yetkiniz bulunmuyor.' },
        { status: 403 }
      );
    }

    // Rotate token & reset 48-hour expiration
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('user_invitations')
      .update({
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'PENDING',
        revoked_at: null,
      })
      .eq('invitation_id', invitation_id);

    if (updateErr) {
      return NextResponse.json({ error: 'Davet güncellenemedi: ' + updateErr.message }, { status: 500 });
    }

    let baseUrl = 'https://spfdemoapp.vercel.app';
    if (process.env.APP_BASE_URL && !process.env.APP_BASE_URL.includes('supabase.co')) {
      baseUrl = process.env.APP_BASE_URL.replace(/\/+$/, '');
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${rawToken}`;

    void sendUserInvitationEmail({
      recipientEmail: invite.email,
      recipientName: invite.full_name,
      targetRole: invite.target_role,
      targetDepartment: invite.target_department,
      inviterName: actor_name || 'Caesar Governance',
      inviterRole: actor_role,
      inviteUrl,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      invite_url: inviteUrl,
      expires_at: expiresAt,
      message: 'Davet başarıyla yenilendi (48 saatlik yeni sayaç başlatıldı).',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
