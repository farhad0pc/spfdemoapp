import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getDevVaultFromRequest,
  getSessionFromRequest,
} from '@/lib/authSession';
import { PROTECTED_ROOT_EMAIL, isProtectedRootUser } from '@/lib/rbac';
import { CorporateUserProfile, OperationalStatus } from '@/types/requisition';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const { data: profileRaw, error } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('email', session.email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Profil bilgileri alınamadı: ' + error.message },
        { status: 500 }
      );
    }

    const profile = profileRaw as CorporateUserProfile | null;
    let teamName: string | null = null;

    if (profile?.team_id) {
      try {
        const { data: teamRow } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('id', profile.team_id)
          .maybeSingle();
        if (teamRow) {
          const rawTeam = teamRow as Record<string, unknown>;
          teamName = String(rawTeam.name || rawTeam.team_name || '');
        }
      } catch {
        teamName = null;
      }
    }

    const isRoot = profile
      ? isProtectedRootUser(profile)
      : session.email.trim().toLowerCase() === PROTECTED_ROOT_EMAIL;

    const rootEmail = (
      process.env.SYSTEM_ROOT_EMAIL || PROTECTED_ROOT_EMAIL
    )
      .trim()
      .toLowerCase();
    const isDevElevated = Boolean(getDevVaultFromRequest(request, rootEmail));

    const resolvedOpStatus: OperationalStatus = isRoot
      ? 'ACTIVE'
      : profile?.account_status === 'SUSPENDED'
      ? 'SUSPENDED'
      : (profile?.operational_status as OperationalStatus | undefined) ||
        'ACTIVE';

    return NextResponse.json({
      user: {
        id: profile?.id || session.userId || '',
        email: profile?.email || session.email,
        full_name: profile?.full_name || session.fullName || session.email,
        role: profile?.role || session.role,
        department: profile?.department || 'SYSTEM',
        authority_tier: profile?.authority_tier ?? 0,
        account_status: profile?.account_status || 'ACTIVE',
        operational_status: resolvedOpStatus,
        phone_number: profile?.phone_number ?? null,
        job_title: profile?.job_title ?? null,
        team_id: profile?.team_id ?? null,
        team_name: teamName,
        avatar_url: profile?.avatar_url ?? null,
        is_protected_root: isRoot,
        last_login_at: profile?.last_login_at ?? null,
      },
      isDevElevated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/users/me
 * Self-service personal profile update for ALL tiers (0–4).
 * Strictly permits updating ONLY own `full_name` and `phone_number`.
 * Permanently rejects/ignores any attempt to self-escalate role, tier, status, or root flags.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Reject explicit privilege escalation attempts
    if (
      body.role !== undefined ||
      body.authority_tier !== undefined ||
      body.account_status !== undefined ||
      body.is_protected_root !== undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Kişisel profil penceresinden rol, yetki kademesi veya hesap durumu değiştirilemez.',
        },
        { status: 403 }
      );
    }

    const { data: existingRaw, error: fetchErr } = await supabaseAdmin
      .from('corporate_users')
      .select('*')
      .eq('email', session.email.trim().toLowerCase())
      .maybeSingle();

    if (fetchErr || !existingRaw) {
      return NextResponse.json(
        { error: 'Kullanıcı profili bulunamadı.' },
        { status: 404 }
      );
    }

    const existing = existingRaw as CorporateUserProfile;
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.full_name === 'string') {
      const cleanName = body.full_name.trim();
      if (!cleanName) {
        return NextResponse.json(
          { error: 'Ad Soyad alanı boş bırakılamaz. / Full name is required.' },
          { status: 400 }
        );
      }
      updates.full_name = cleanName;
    }

    if (body.phone_number !== undefined) {
      const cleanPhone =
        typeof body.phone_number === 'string' && body.phone_number.trim()
          ? body.phone_number.trim()
          : null;
      updates.phone_number = cleanPhone;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('corporate_users')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: 'Profil güncellenemedi: ' + updateErr.message },
        { status: 500 }
      );
    }

    // Best-effort audit log entry
    try {
      await supabaseAdmin.from('user_audit_logs').insert([
        {
          actor_user_id: existing.id,
          target_user_id: existing.id,
          action_type: 'SELF_PROFILE_UPDATED',
          changes_payload: {
            actor_email: existing.email,
            full_name: updates.full_name ?? existing.full_name,
            phone_number: updates.phone_number ?? existing.phone_number,
          },
        },
      ]);
    } catch {
      // Ignore audit log failure
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
