import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { canManageUser, ROLE_METADATA } from '@/lib/rbac';
import { getSessionFromRequest } from '@/lib/authSession';
import { RoleTier, DepartmentCode } from '@/types/requisition';

export async function GET(request: NextRequest) {
  try {
    const callerRole =
      (request.nextUrl.searchParams.get('role') as RoleTier) ||
      'TECH_OFFICE_USER';
    const session = getSessionFromRequest(request);

    // If fail-safe or SYSTEM_ADMIN session is active, caller is elevated to SYSTEM_ADMIN unless previewing
    const effectiveRole: RoleTier =
      session?.role === 'SYSTEM_ADMIN'
        ? callerRole || 'SYSTEM_ADMIN'
        : session?.role || callerRole;
    const effectiveMeta = ROLE_METADATA[effectiveRole];

    let usersQuery = supabaseAdmin
      .from('corporate_users')
      .select('*')
      .order('created_at', { ascending: false });
    let invitesQuery = supabaseAdmin
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    // Scope queries by department for Division Managers & Purchasing Agent
    if (
      effectiveMeta &&
      effectiveMeta.tier >= 2 &&
      effectiveRole !== 'SYSTEM_ADMIN' &&
      effectiveRole !== 'EXECUTIVE'
    ) {
      const dept: DepartmentCode = effectiveMeta.department;
      usersQuery = usersQuery.eq('department', dept);
      invitesQuery = invitesQuery.eq('target_department', dept);
    }

    const { data: users, error: usersErr } = await usersQuery;
    const { data: invites, error: invitesErr } = await invitesQuery;

    if (usersErr || invitesErr) {
      const errMsg = usersErr?.message || invitesErr?.message;
      return NextResponse.json(
        { error: 'Veri listesi alınamadı: ' + errMsg },
        { status: 500 }
      );
    }

    const normalizedUsers = (users || []).map((u) => ({
      ...u,
      avatar_url: (u as { avatar_url?: string | null }).avatar_url ?? null,
    }));

    return NextResponse.json({
      users: normalizedUsers,
      invitations: invites || [],
      effectiveRole,
      isFailsafeActive: Boolean(session?.isFailsafe),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, new_role, new_status, actor_role } = body as {
      user_id: string;
      new_role?: RoleTier;
      new_status?: 'ACTIVE' | 'SUSPENDED';
      actor_role: RoleTier;
    };

    if (!user_id || !actor_role) {
      return NextResponse.json(
        { error: 'user_id ve actor_role alanları zorunludur.' },
        { status: 400 }
      );
    }

    const { data: targetUser, error: fetchErr } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    if (!canManageUser(actor_role, targetUser.role as RoleTier)) {
      return NextResponse.json(
        {
          error: `Yetkisiz işlem: ${actor_role} rolü, ${targetUser.role} rolündeki kullanıcıyı yönetemez.`,
        },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (new_status) {
      updates.account_status = new_status;
    }

    if (new_role) {
      const newMeta = ROLE_METADATA[new_role];
      if (!newMeta) {
        return NextResponse.json(
          { error: 'Geçersiz yeni rol tanımı.' },
          { status: 400 }
        );
      }
      updates.role = new_role;
      updates.department = newMeta.department;
      updates.authority_tier = newMeta.tier;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('corporate_users')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: 'Kullanıcı güncellenemedi: ' + updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı kaydı başarıyla güncellendi.',
      user: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
