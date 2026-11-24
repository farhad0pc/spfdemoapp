import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionFromRequest } from '@/lib/authSession';
import { ROLE_METADATA } from '@/lib/rbac';
import { RoleTier } from '@/types/requisition';

const STORAGE_BUCKET = 'inventory-media';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES = new Set(['image/webp', 'image/jpeg', 'image/png']);

const TIER_0_TO_1_AVATAR_ADMIN_ROLES: RoleTier[] = [
  'SYSTEM_ADMIN',
  'EXECUTIVE',
];

function resolveEffectiveCallerRole(
  sessionRole: RoleTier,
  actorRoleOverride?: RoleTier | null
): RoleTier {
  if (
    sessionRole === 'SYSTEM_ADMIN' &&
    actorRoleOverride &&
    ROLE_METADATA[actorRoleOverride]
  ) {
    return actorRoleOverride;
  }
  return sessionRole;
}

function isTier0Or1Admin(role: RoleTier): boolean {
  return TIER_0_TO_1_AVATAR_ADMIN_ROLES.includes(role);
}

function resolveExtFromMime(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('webp')) return 'webp';
  if (clean.includes('png')) return 'png';
  if (clean.includes('jpeg') || clean.includes('jpg')) return 'jpg';
  return 'webp';
}

async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === STORAGE_BUCKET);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
      });
    }
  } catch {
    // Non-fatal if bucket already exists
  }
}

/**
 * POST /api/users/avatar
 * Strictly restricted to Tiers 0-1 (SYSTEM_ADMIN, EXECUTIVE).
 * Uploads compressed WebP/JPEG/PNG avatar to inventory-media/avatars/${user_id}/${uuid}.${ext},
 * updates public.corporate_users, and deletes the replaced storage object.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const userId = String(formData.get('user_id') || '').trim();
    const actorRoleOverride =
      (formData.get('actor_role') as RoleTier | null) || null;

    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      actorRoleOverride
    );

    if (!isTier0Or1Admin(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Profil fotoğrafı yönetimi yalnızca Kademe 0–1 (Sistem Yöneticisi ve Yönetim Kurulu) yetkisine açıktır.',
        },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id alanı zorunludur.' },
        { status: 400 }
      );
    }

    const fileEntry = formData.get('file');
    if (!fileEntry || !(fileEntry instanceof Blob)) {
      return NextResponse.json(
        { error: 'Yüklenecek görsel dosyası bulunamadı. / File is required.' },
        { status: 400 }
      );
    }

    const mimeType = (fileEntry.type || 'image/webp').toLowerCase();
    if (!ALLOWED_MIMES.has(mimeType)) {
      return NextResponse.json(
        {
          error:
            'Yalnızca WebP, JPEG veya PNG formatındaki görseller kabul edilmektedir.',
        },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0 || fileEntry.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        {
          error:
            'Profil fotoğrafı boyutu 2 MB sınırını aşamaz. / File size must be <= 2 MB.',
        },
        { status: 400 }
      );
    }

    const { data: existingUser, error: userFetchErr } = await supabaseAdmin
      .from('corporate_users')
      .select('id, email, avatar_storage_path')
      .eq('id', userId)
      .single();

    if (userFetchErr || !existingUser) {
      return NextResponse.json(
        { error: 'Hedef kullanıcı kaydı bulunamadı.' },
        { status: 404 }
      );
    }

    await ensureBucketExists();

    const ext = resolveExtFromMime(mimeType);
    const storagePath = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
    const arrayBuf = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            'Profil fotoğrafı depolama alanına yüklenemedi: ' +
            uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const avatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from('corporate_users')
      .update({
        avatar_url: avatarUrl,
        avatar_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        {
          error:
            'Kullanıcı profil fotoğrafı güncellenemedi: ' + updateError.message,
        },
        { status: 500 }
      );
    }

    // Best-effort cleanup of replaced avatar file
    const oldPath = existingUser.avatar_storage_path as
      | string
      | null
      | undefined;
    if (oldPath && oldPath !== storagePath) {
      try {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([oldPath]);
      } catch {
        // Ignore cleanup failure
      }
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      avatar_url: avatarUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/users/avatar?user_id=...
 * Strictly restricted to Tiers 0-1 (SYSTEM_ADMIN, EXECUTIVE).
 * Removes the avatar object from Supabase Storage and clears avatar_url & avatar_storage_path.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    let userId = request.nextUrl.searchParams.get('user_id')?.trim() || '';
    let actorRoleOverride =
      (request.nextUrl.searchParams.get('actor_role') as RoleTier | null) ||
      null;

    if (!userId) {
      try {
        const body = (await request.json()) as {
          user_id?: string;
          actor_role?: RoleTier;
        };
        userId = String(body.user_id || '').trim();
        actorRoleOverride = actorRoleOverride || body.actor_role || null;
      } catch {
        // Query param only
      }
    }

    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      actorRoleOverride
    );

    if (!isTier0Or1Admin(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Profil fotoğrafı silme yetkisi yalnızca Kademe 0–1 (Sistem Yöneticisi ve Yönetim Kurulu) rollerine aittir.',
        },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id parametresi zorunludur.' },
        { status: 400 }
      );
    }

    const { data: existingUser, error: fetchErr } = await supabaseAdmin
      .from('corporate_users')
      .select('id, avatar_storage_path')
      .eq('id', userId)
      .single();

    if (fetchErr || !existingUser) {
      return NextResponse.json(
        { error: 'Kullanıcı kaydı bulunamadı.' },
        { status: 404 }
      );
    }

    const oldPath = existingUser.avatar_storage_path as
      | string
      | null
      | undefined;
    if (oldPath) {
      try {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([oldPath]);
      } catch {
        // Ignore storage removal warning
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('corporate_users')
      .update({
        avatar_url: null,
        avatar_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateErr) {
      return NextResponse.json(
        {
          error:
            'Profil fotoğrafı kaydı temizlenemedi: ' + updateErr.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      avatar_url: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
