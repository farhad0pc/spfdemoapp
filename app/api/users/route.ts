import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  PROTECTED_ROOT_EMAIL,
  ROLE_METADATA,
  canChangeOperationalStatus,
  canChangeUserRole,
  canEditUserDetails,
  canSuspendAccount,
  canViewProtectedRoot,
  isProtectedRootUser,
} from '@/lib/rbac';
import {
  getDevVaultFromRequest,
  getSessionFromRequest,
} from '@/lib/authSession';
import {
  RoleTier,
  DepartmentCode,
  OperationalStatus,
  TeamRecord,
  CorporateUserProfile,
} from '@/types/requisition';

const VALID_OPERATIONAL_STATUSES = new Set<OperationalStatus>([
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
]);

function normalizeTeamRow(raw: Record<string, unknown>): TeamRecord {
  const deptRaw = String(raw.department || 'TECH_OFFICE').toUpperCase();
  const validDepts: DepartmentCode[] = [
    'SYSTEM',
    'EXECUTIVE',
    'TECH_OFFICE',
    'PURCHASING',
    'DEPOT',
  ];
  const department: DepartmentCode = validDepts.includes(
    deptRaw as DepartmentCode
  )
    ? (deptRaw as DepartmentCode)
    : 'TECH_OFFICE';

  return {
    id: String(raw.id || raw.team_id || ''),
    name: String(raw.name || raw.team_name || 'Team'),
    code:
      raw.code != null
        ? String(raw.code)
        : raw.team_code != null
        ? String(raw.team_code)
        : null,
    department,
    leader_user_id:
      raw.leader_user_id != null
        ? String(raw.leader_user_id)
        : raw.leader_id != null
        ? String(raw.leader_id)
        : raw.manager_id != null
        ? String(raw.manager_id)
        : null,
    description: raw.description != null ? String(raw.description) : null,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
  };
}

async function recordGovernanceAuditLog(params: {
  actorId?: string | null;
  actorEmail?: string | null;
  targetUserId: string;
  targetEmail?: string | null;
  actionType: string;
  changes: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('user_audit_logs').insert([
      {
        actor_user_id: params.actorId || null,
        target_user_id: params.targetUserId,
        action_type: params.actionType,
        changes_payload: {
          actor_email: params.actorEmail || null,
          target_email: params.targetEmail || null,
          ...params.changes,
        },
      },
    ]);
    if (error) {
      await supabaseAdmin.from('user_audit_logs').insert([
        {
          actor_id: params.actorId || null,
          target_id: params.targetUserId,
          action: params.actionType,
          details: {
            actor_email: params.actorEmail || null,
            target_email: params.targetEmail || null,
            ...params.changes,
          },
        },
      ]);
    }
  } catch {
    // Non-fatal if audit table columns vary
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestedPreviewRole =
      (request.nextUrl.searchParams.get('role') as RoleTier) ||
      'TECH_OFFICE_USER';
    const session = getSessionFromRequest(request);

    // If SYSTEM_ADMIN session is active, allow role simulation preview via ?role=
    const effectiveRole: RoleTier =
      session?.role === 'SYSTEM_ADMIN'
        ? requestedPreviewRole || 'SYSTEM_ADMIN'
        : session?.role || requestedPreviewRole;
    const effectiveMeta = ROLE_METADATA[effectiveRole];

    let usersQuery = supabaseAdmin
      .from('corporate_users')
      .select('*')
      .order('authority_tier', { ascending: true })
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

    const [{ data: users, error: usersErr }, { data: invites, error: invitesErr }] =
      await Promise.all([usersQuery, invitesQuery]);

    if (usersErr || invitesErr) {
      const errMsg = usersErr?.message || invitesErr?.message;
      return NextResponse.json(
        { error: 'Veri listesi alınamadı: ' + errMsg },
        { status: 500 }
      );
    }

    // Fetch public.teams (gracefully empty if table not yet populated)
    let teams: TeamRecord[] = [];
    try {
      const { data: teamRows } = await supabaseAdmin
        .from('teams')
        .select('*')
        .order('name', { ascending: true });
      if (teamRows) {
        teams = (teamRows as Record<string, unknown>[]).map(normalizeTeamRow);
      }
    } catch {
      teams = [];
    }

    const teamMap = new Map<string, TeamRecord>();
    teams.forEach((t) => {
      if (t.id) teamMap.set(t.id, t);
    });

    const canSeeRoot = canViewProtectedRoot(effectiveRole);

    // Filter out protected root account for Tiers 1-4 and normalize additive fields
    const normalizedUsers = ((users || []) as CorporateUserProfile[])
      .filter((u) => {
        if (!canSeeRoot && isProtectedRootUser(u)) {
          return false;
        }
        return true;
      })
      .map((u) => {
        const isRoot = isProtectedRootUser(u);
        const rawOpStatus = u.operational_status;
        const resolvedOpStatus: OperationalStatus = isRoot
          ? 'ACTIVE'
          : u.account_status === 'SUSPENDED'
          ? 'SUSPENDED'
          : rawOpStatus && VALID_OPERATIONAL_STATUSES.has(rawOpStatus)
          ? rawOpStatus
          : 'ACTIVE';

        return {
          ...u,
          avatar_url: u.avatar_url ?? null,
          phone_number: u.phone_number ?? null,
          job_title: u.job_title ?? null,
          team_id: u.team_id ?? null,
          team: u.team_id ? teamMap.get(u.team_id) || null : null,
          operational_status: resolvedOpStatus,
          is_protected_root: isRoot,
        };
      });

    // Resolve caller's own team_id from corporate_users
    let callerTeamId: string | null = null;
    if (session?.email) {
      const callerRecord = ((users || []) as CorporateUserProfile[]).find(
        (u) => u.email?.toLowerCase() === session.email.toLowerCase()
      );
      callerTeamId = callerRecord?.team_id || null;
    }

    const rootEmail = (
      process.env.SYSTEM_ROOT_EMAIL || PROTECTED_ROOT_EMAIL
    )
      .trim()
      .toLowerCase();
    const isDevElevated = Boolean(getDevVaultFromRequest(request, rootEmail));

    return NextResponse.json({
      users: normalizedUsers,
      invitations: invites || [],
      teams,
      callerTeamId,
      effectiveRole,
      isFailsafeActive: Boolean(session?.isFailsafe),
      isDevElevated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const body = await request.json();
    const {
      user_id,
      new_role,
      new_status,
      new_operational_status,
      full_name,
      phone_number,
      job_title,
      team_id,
      actor_role,
    } = body as {
      user_id: string;
      new_role?: RoleTier;
      new_status?: 'ACTIVE' | 'SUSPENDED';
      new_operational_status?: OperationalStatus;
      full_name?: string;
      phone_number?: string | null;
      job_title?: string | null;
      team_id?: string | null;
      actor_role?: RoleTier;
    };

    const effectiveActorRole: RoleTier | null =
      session?.role === 'SYSTEM_ADMIN'
        ? actor_role || 'SYSTEM_ADMIN'
        : session?.role || actor_role || null;

    if (!user_id || !effectiveActorRole) {
      return NextResponse.json(
        { error: 'user_id ve yetkili oturum zorunludur.' },
        { status: 400 }
      );
    }

    const { data: targetUserRaw, error: fetchErr } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchErr || !targetUserRaw) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    const targetUser = targetUserRaw as CorporateUserProfile;
    const isTargetRoot = isProtectedRootUser(targetUser);

    // Resolve actor profile (for actorId and team scoping)
    let actorProfile: CorporateUserProfile | null = null;
    if (session?.email) {
      const { data: aData } = await supabaseAdmin
        .from('corporate_users')
        .select('*')
        .eq('email', session.email)
        .maybeSingle();
      actorProfile = (aData as CorporateUserProfile | null) || null;
    }

    // =========================================================================
    // 1. PROTECTED ROOT ACCOUNT IMMUTABILITY & STEP-UP VAULT GATE
    // =========================================================================
    if (isTargetRoot) {
      if (effectiveActorRole !== 'SYSTEM_ADMIN') {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Korumalı Root (Tier 0) hesabı başka roller tarafından görüntülenemez veya düzenlenemez.',
          },
          { status: 403 }
        );
      }

      if (
        (new_role && new_role !== 'SYSTEM_ADMIN') ||
        new_status === 'SUSPENDED' ||
        (new_operational_status && new_operational_status !== 'ACTIVE')
      ) {
        return NextResponse.json(
          {
            error:
              'Korumalı Root (Tier 0) hesabının rolü veya aktif durumu değiştirilemez ve askıya alınamaz.',
          },
          { status: 403 }
        );
      }

      const rootEmail = (
        process.env.SYSTEM_ROOT_EMAIL || PROTECTED_ROOT_EMAIL
      )
        .trim()
        .toLowerCase();
      const vault = getDevVaultFromRequest(request, rootEmail);
      if (!vault) {
        return NextResponse.json(
          {
            error:
              'Korumalı Root hesabında değişiklik yapmak için Geliştirici Güvenlik Kasası (PIN) doğrulaması gereklidir.',
            code: 'DEV_VAULT_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const auditChanges: Record<string, unknown> = {};

    // =========================================================================
    // 2. OPTION 1: ACCOUNT SUSPENSION (STRICTLY TIER 0 & TIER 1)
    // =========================================================================
    if (new_status && new_status !== targetUser.account_status) {
      if (!canSuspendAccount(effectiveActorRole, targetUser)) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Hesap askıya alma / aktifleştirme yetkisi yalnızca Kademe 0 (Sistem Yöneticisi) ve Kademe 1 (Yönetim Kurulu) rollerine aittir.',
          },
          { status: 403 }
        );
      }
      updates.account_status = new_status;
      updates.operational_status =
        new_status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
      auditChanges.account_status = {
        from: targetUser.account_status,
        to: new_status,
      };
    }

    // =========================================================================
    // 3. OPTION 1: OPERATIONAL STATUS ('ACTIVE' | 'ON_LEAVE' | 'SUSPENDED')
    // =========================================================================
    if (
      new_operational_status &&
      new_operational_status !== targetUser.operational_status
    ) {
      if (!VALID_OPERATIONAL_STATUSES.has(new_operational_status)) {
        return NextResponse.json(
          {
            error:
              'Geçersiz operasyonel durum. Yalnızca ACTIVE, ON_LEAVE veya SUSPENDED kabul edilir.',
          },
          { status: 400 }
        );
      }

      if (
        new_operational_status === 'SUSPENDED' &&
        !canSuspendAccount(effectiveActorRole, targetUser)
      ) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Yalnızca Kademe 0–1 kullanıcı hesabını askıya alabilir.',
          },
          { status: 403 }
        );
      }

      if (
        !canChangeOperationalStatus(
          effectiveActorRole,
          targetUser,
          actorProfile?.team_id
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Bu personelin operasyonel durumunu (Aktif / İzinde) değiştirme yetkiniz bulunmamaktadır.',
          },
          { status: 403 }
        );
      }

      updates.operational_status = new_operational_status;
      auditChanges.operational_status = {
        from: targetUser.operational_status || 'ACTIVE',
        to: new_operational_status,
      };
    }

    // =========================================================================
    // 4. ROLE ASSIGNMENT
    // =========================================================================
    if (new_role && new_role !== targetUser.role) {
      if (!canChangeUserRole(effectiveActorRole, targetUser)) {
        return NextResponse.json(
          {
            error: `Yetkisiz işlem (403): ${effectiveActorRole} rolü, bu kullanıcının rolünü değiştiremez.`,
          },
          { status: 403 }
        );
      }
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
      auditChanges.role = { from: targetUser.role, to: new_role };
    }

    // =========================================================================
    // 5. PROFILE & TEAM METADATA (full_name, phone_number, job_title, team_id)
    // =========================================================================
    const hasMetadataEdits =
      full_name !== undefined ||
      phone_number !== undefined ||
      job_title !== undefined ||
      team_id !== undefined;

    if (hasMetadataEdits) {
      if (
        !canEditUserDetails(
          effectiveActorRole,
          targetUser,
          actorProfile?.team_id
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Bu personelin profil veya ekip bilgilerini düzenleme yetkiniz bulunmamaktadır.',
          },
          { status: 403 }
        );
      }

      if (typeof full_name === 'string' && full_name.trim()) {
        updates.full_name = full_name.trim();
        auditChanges.full_name = full_name.trim();
      }
      if (phone_number !== undefined) {
        const cleanPhone =
          typeof phone_number === 'string' && phone_number.trim()
            ? phone_number.trim()
            : null;
        updates.phone_number = cleanPhone;
        auditChanges.phone_number = cleanPhone;
      }
      if (job_title !== undefined) {
        const cleanTitle =
          typeof job_title === 'string' && job_title.trim()
            ? job_title.trim()
            : null;
        updates.job_title = cleanTitle;
        auditChanges.job_title = cleanTitle;
      }
      if (team_id !== undefined) {
        const cleanTeamId =
          typeof team_id === 'string' && team_id.trim() ? team_id.trim() : null;
        updates.team_id = cleanTeamId;
        auditChanges.team_id = {
          from: targetUser.team_id || null,
          to: cleanTeamId,
        };
      }
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

    await recordGovernanceAuditLog({
      actorId: actorProfile?.id || session?.userId || null,
      actorEmail: session?.email || effectiveActorRole,
      targetUserId: user_id,
      targetEmail: targetUser.email,
      actionType: new_status
        ? `USER_ACCOUNT_${new_status}`
        : new_operational_status
        ? `USER_OPERATIONAL_${new_operational_status}`
        : new_role
        ? 'USER_ROLE_CHANGED'
        : 'USER_PROFILE_UPDATED',
      changes: auditChanges,
    });

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
