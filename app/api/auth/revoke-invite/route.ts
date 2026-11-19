import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { canManageUser } from '@/lib/rbac';
import { RoleTier } from '@/types/requisition';

export async function POST(request: NextRequest) {
  try {
    const { invitation_id, actor_role } = await request.json();

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

    if (!canManageUser(actor_role as RoleTier, invite.target_role as RoleTier)) {
      return NextResponse.json(
        { error: 'Bu daveti iptal etme yetkiniz bulunmuyor.' },
        { status: 403 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
      })
      .eq('invitation_id', invitation_id);

    if (updateErr) {
      return NextResponse.json({ error: 'Davet iptal edilemedi: ' + updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Davet başarıyla iptal edildi.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
