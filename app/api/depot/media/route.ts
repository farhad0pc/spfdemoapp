import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionFromRequest } from '@/lib/authSession';
import { canEditDepotStock, ROLE_METADATA } from '@/lib/rbac';
import {
  InventoryItemMedia,
  MediaSourceType,
  RoleTier,
} from '@/types/requisition';

const STORAGE_BUCKET = 'inventory-media';
const MAX_PHOTOS_PER_ITEM = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const TIER_0_TO_2_ROLES: RoleTier[] = [
  'SYSTEM_ADMIN',
  'EXECUTIVE',
  'TECH_OFFICE_MANAGER',
  'DEPOT_MANAGER',
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

function canUploadOrSetPrimary(role: RoleTier): boolean {
  return canEditDepotStock(role) || TIER_0_TO_2_ROLES.includes(role);
}

function canDeleteMedia(role: RoleTier): boolean {
  return TIER_0_TO_2_ROLES.includes(role);
}

/**
 * Extracts a canonical Google Drive file ID from common share link formats:
 * - https://drive.google.com/file/d/<ID>/view?usp=sharing
 * - https://drive.google.com/open?id=<ID>
 * - https://drive.google.com/uc?id=<ID>&export=download
 * - https://drive.google.com/thumbnail?id=<ID>
 */
function extractGoogleDriveFileId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      host !== 'drive.google.com' &&
      host !== 'docs.google.com' &&
      !host.endsWith('.googleusercontent.com')
    ) {
      return null;
    }

    const filePathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }

    const idParam = parsed.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) {
      return idParam;
    }

    return null;
  } catch {
    return null;
  }
}

function resolveExtensionFromMime(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('webp')) return 'webp';
  if (clean.includes('png')) return 'png';
  if (clean.includes('jpeg') || clean.includes('jpg')) return 'jpg';
  if (clean.includes('gif')) return 'gif';
  return 'webp';
}

async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === STORAGE_BUCKET);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
      });
    }
  } catch {
    // Non-fatal if bucket already exists
  }
}

async function syncCatalogPrimaryImage(
  catalogItemId: string,
  primaryUrl: string | null
): Promise<void> {
  await supabaseAdmin
    .from('inventory_catalog')
    .update({ primary_image_url: primaryUrl })
    .eq('item_id', catalogItemId);
}

/**
 * GET /api/depot/media?catalog_item_id=<UUID>
 * Returns ordered album photos for a catalog item.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const catalogItemId = request.nextUrl.searchParams
      .get('catalog_item_id')
      ?.trim();

    if (!catalogItemId) {
      return NextResponse.json(
        { error: 'catalog_item_id parametresi zorunludur.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      // Gracefully return empty list if migration has not yet been applied on remote DB
      if (
        error.code === '42P01' ||
        error.message.includes('inventory_item_media')
      ) {
        return NextResponse.json({ media: [] });
      }
      return NextResponse.json(
        { error: 'Medya listesi alınamadı: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      media: (data || []) as InventoryItemMedia[],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/depot/media
 * Supports:
 * 1) multipart/form-data (CAMERA | LOCAL compressed file upload)
 * 2) application/json ({ catalog_item_id, drive_url, source_type: 'GOOGLE_DRIVE', set_primary? })
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

    const contentType = request.headers.get('content-type') || '';

    let catalogItemId = '';
    let sourceType: MediaSourceType = 'LOCAL';
    let setPrimaryRequested = false;
    let actorRoleOverride: RoleTier | null = null;
    let uploadBuffer: Buffer;
    let uploadMimeType = 'image/webp';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      catalogItemId = String(formData.get('catalog_item_id') || '').trim();
      const rawSource = String(formData.get('source_type') || 'LOCAL')
        .trim()
        .toUpperCase();
      sourceType =
        rawSource === 'CAMERA'
          ? 'CAMERA'
          : rawSource === 'GOOGLE_DRIVE'
          ? 'GOOGLE_DRIVE'
          : 'LOCAL';
      setPrimaryRequested =
        formData.get('set_primary') === 'true' ||
        formData.get('set_primary') === '1';
      actorRoleOverride = (formData.get('actor_role') as RoleTier) || null;

      const effectiveRole = resolveEffectiveCallerRole(
        session.role,
        actorRoleOverride
      );
      if (!canUploadOrSetPrimary(effectiveRole)) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Fotoğraf yükleme yetkiniz bulunmamaktadır. / Forbidden.',
          },
          { status: 403 }
        );
      }

      const fileEntry = formData.get('file');
      if (!fileEntry || !(fileEntry instanceof Blob)) {
        return NextResponse.json(
          { error: 'Yüklenecek görsel dosyası bulunamadı. / File is required.' },
          { status: 400 }
        );
      }

      if (fileEntry.size <= 0 || fileEntry.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              'Dosya boyutu 5 MB sınırını aşamaz. / File size must not exceed 5 MB.',
          },
          { status: 400 }
        );
      }

      uploadMimeType = fileEntry.type || 'image/webp';
      if (!uploadMimeType.startsWith('image/')) {
        return NextResponse.json(
          {
            error:
              'Yalnızca görsel dosyaları yüklenebilir. / Only image files are allowed.',
          },
          { status: 400 }
        );
      }

      const arrayBuf = await fileEntry.arrayBuffer();
      uploadBuffer = Buffer.from(arrayBuf);
    } else {
      const body = (await request.json()) as {
        catalog_item_id?: string;
        drive_url?: string;
        source_type?: MediaSourceType;
        set_primary?: boolean;
        actor_role?: RoleTier;
      };

      catalogItemId = String(body.catalog_item_id || '').trim();
      sourceType = 'GOOGLE_DRIVE';
      setPrimaryRequested = Boolean(body.set_primary);
      actorRoleOverride = body.actor_role || null;

      const effectiveRole = resolveEffectiveCallerRole(
        session.role,
        actorRoleOverride
      );
      if (!canUploadOrSetPrimary(effectiveRole)) {
        return NextResponse.json(
          {
            error:
              'Yetkisiz işlem (403): Fotoğraf yükleme yetkiniz bulunmamaktadır. / Forbidden.',
          },
          { status: 403 }
        );
      }

      const rawDriveUrl = String(body.drive_url || '').trim();
      const driveFileId = extractGoogleDriveFileId(rawDriveUrl);
      if (!driveFileId) {
        return NextResponse.json(
          {
            error:
              'Geçersiz Google Drive bağlantısı. Lütfen "Bağlantıya sahip olan herkes" erişimli bir Drive paylaşım linki girin. / Invalid Google Drive share link.',
          },
          { status: 400 }
        );
      }

      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(
        driveFileId
      )}`;

      let driveRes: Response;
      try {
        driveRes = await fetch(directDownloadUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: {
            Accept: 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
          },
        });
      } catch {
        return NextResponse.json(
          {
            error:
              'Google Drive görseli zaman aşımına uğradı veya erişilemedi. / Google Drive fetch timed out.',
          },
          { status: 400 }
        );
      }

      if (!driveRes.ok) {
        return NextResponse.json(
          {
            error: `Google Drive görseli indirilemedi (HTTP ${driveRes.status}). Dosyanın "Bağlantıya sahip olan herkes" olarak paylaşıldığından emin olun.`,
          },
          { status: 400 }
        );
      }

      const fetchedContentType = (
        driveRes.headers.get('content-type') || ''
      ).toLowerCase();
      if (!fetchedContentType.startsWith('image/')) {
        return NextResponse.json(
          {
            error:
              'Google Drive bağlantısı doğrudan bir görsel döndürmedi. Lütfen dosyanın bir görsel olduğundan ve herkese açık paylaşıldığından emin olun. / Drive link did not return an image.',
          },
          { status: 400 }
        );
      }

      const arrayBuf = await driveRes.arrayBuffer();
      if (arrayBuf.byteLength <= 0 || arrayBuf.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              'Google Drive görseli 5 MB sınırını aşıyor. / Drive image exceeds 5 MB limit.',
          },
          { status: 400 }
        );
      }

      uploadBuffer = Buffer.from(arrayBuf);
      uploadMimeType = fetchedContentType.split(';')[0].trim() || 'image/jpeg';
    }

    if (!catalogItemId) {
      return NextResponse.json(
        { error: 'catalog_item_id alanı zorunludur.' },
        { status: 400 }
      );
    }

    // Check existing album count (hard cap = 5 photos per SKU)
    const { data: existingMedia, error: countError } = await supabaseAdmin
      .from('inventory_item_media')
      .select('id, is_primary, display_order, public_url')
      .eq('catalog_item_id', catalogItemId)
      .order('display_order', { ascending: true });

    if (countError) {
      return NextResponse.json(
        { error: 'Mevcut albüm kontrol edilemedi: ' + countError.message },
        { status: 500 }
      );
    }

    const currentItems = existingMedia || [];
    if (currentItems.length >= MAX_PHOTOS_PER_ITEM) {
      return NextResponse.json(
        {
          error:
            'Maksimum 5 fotoğraf sınırına ulaşıldı. Yeni fotoğraf eklemek için önce mevcut bir görseli silin. / Maximum 5 photos per item reached.',
        },
        { status: 400 }
      );
    }

    await ensureBucketExists();

    const ext = resolveExtensionFromMime(uploadMimeType);
    const storagePath = `items/${catalogItemId}/${crypto.randomUUID()}.${ext}`;

    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, uploadBuffer, {
        contentType: uploadMimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json(
        {
          error:
            'Görsel depolama alanına yüklenemedi: ' + storageError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    const isFirstPhoto = currentItems.length === 0;
    const hasExistingPrimary = currentItems.some((m) => m.is_primary);
    const shouldBePrimary =
      isFirstPhoto || !hasExistingPrimary || setPrimaryRequested;

    if (shouldBePrimary && currentItems.length > 0) {
      await supabaseAdmin
        .from('inventory_item_media')
        .update({ is_primary: false })
        .eq('catalog_item_id', catalogItemId);
    }

    const nextDisplayOrder =
      currentItems.length > 0
        ? Math.max(...currentItems.map((m) => Number(m.display_order || 0))) + 1
        : 0;

    const { data: insertedMedia, error: insertError } = await supabaseAdmin
      .from('inventory_item_media')
      .insert([
        {
          catalog_item_id: catalogItemId,
          storage_path: storagePath,
          public_url: publicUrl,
          is_primary: shouldBePrimary,
          display_order: nextDisplayOrder,
          source_type: sourceType,
          file_size_bytes: uploadBuffer.byteLength,
          uploaded_by: session.email,
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: 'Veritabanı medya kaydı oluşturulamadı: ' + insertError.message },
        { status: 500 }
      );
    }

    let primaryImageUrl =
      currentItems.find((m) => m.is_primary)?.public_url || publicUrl;

    if (shouldBePrimary) {
      primaryImageUrl = publicUrl;
      await syncCatalogPrimaryImage(catalogItemId, publicUrl);
    }

    const { data: updatedAlbum } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      mediaItem: insertedMedia as InventoryItemMedia,
      media: (updatedAlbum || [insertedMedia]) as InventoryItemMedia[],
      primary_image_url: primaryImageUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/depot/media
 * Sets the designated media_id as the primary image for catalog_item_id.
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

    const body = (await request.json()) as {
      media_id?: string;
      catalog_item_id?: string;
      actor_role?: RoleTier;
    };

    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      body.actor_role
    );

    if (!canUploadOrSetPrimary(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Ana görsel değiştirme yetkiniz bulunmamaktadır. / Forbidden.',
        },
        { status: 403 }
      );
    }

    const mediaId = String(body.media_id || '').trim();
    const catalogItemId = String(body.catalog_item_id || '').trim();

    if (!mediaId || !catalogItemId) {
      return NextResponse.json(
        { error: 'media_id ve catalog_item_id alanları zorunludur.' },
        { status: 400 }
      );
    }

    const { data: targetMedia, error: targetError } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('id', mediaId)
      .eq('catalog_item_id', catalogItemId)
      .single();

    if (targetError || !targetMedia) {
      return NextResponse.json(
        { error: 'Hedef fotoğraf kaydı bulunamadı.' },
        { status: 404 }
      );
    }

    await supabaseAdmin
      .from('inventory_item_media')
      .update({ is_primary: false })
      .eq('catalog_item_id', catalogItemId);

    await supabaseAdmin
      .from('inventory_item_media')
      .update({ is_primary: true })
      .eq('id', mediaId);

    const newPrimaryUrl = String(targetMedia.public_url);
    await syncCatalogPrimaryImage(catalogItemId, newPrimaryUrl);

    const { data: updatedAlbum } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      media: (updatedAlbum || []) as InventoryItemMedia[],
      primary_image_url: newPrimaryUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/depot/media
 * Strictly restricted to Tiers 0, 1, and 2 (SYSTEM_ADMIN, EXECUTIVE, TECH_OFFICE_MANAGER, DEPOT_MANAGER).
 * Deletes the file from Supabase Storage, removes the database row, and auto-promotes the next photo if primary.
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

    let mediaId = request.nextUrl.searchParams.get('media_id')?.trim() || '';
    let catalogItemId =
      request.nextUrl.searchParams.get('catalog_item_id')?.trim() || '';
    let actorRoleOverride =
      (request.nextUrl.searchParams.get('actor_role') as RoleTier) || null;

    if (!mediaId || !catalogItemId) {
      try {
        const body = (await request.json()) as {
          media_id?: string;
          catalog_item_id?: string;
          actor_role?: RoleTier;
        };
        mediaId = mediaId || String(body.media_id || '').trim();
        catalogItemId =
          catalogItemId || String(body.catalog_item_id || '').trim();
        actorRoleOverride = actorRoleOverride || body.actor_role || null;
      } catch {
        // Ignore empty body if params were passed via query string
      }
    }

    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      actorRoleOverride
    );

    if (!canDeleteMedia(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Fotoğraf silme yetkisi yalnızca Kademe 0–2 (Sistem Yöneticisi, Yönetim Kurulu, Teknik Ofis Müdürü, Depo Müdürü) rollerine aittir.',
        },
        { status: 403 }
      );
    }

    if (!mediaId || !catalogItemId) {
      return NextResponse.json(
        { error: 'media_id ve catalog_item_id alanları zorunludur.' },
        { status: 400 }
      );
    }

    const { data: targetMedia, error: fetchError } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('id', mediaId)
      .eq('catalog_item_id', catalogItemId)
      .single();

    if (fetchError || !targetMedia) {
      return NextResponse.json(
        { error: 'Silinecek fotoğraf kaydı bulunamadı.' },
        { status: 404 }
      );
    }

    if (targetMedia.storage_path) {
      await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([String(targetMedia.storage_path)]);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('inventory_item_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Fotoğraf kaydı silinemedi: ' + deleteError.message },
        { status: 500 }
      );
    }

    const { data: remainingMedia } = await supabaseAdmin
      .from('inventory_item_media')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    const remaining = (remainingMedia || []) as InventoryItemMedia[];
    let nextPrimaryUrl: string | null = null;

    if (remaining.length > 0) {
      const existingPrimary = remaining.find((m) => m.is_primary);
      if (existingPrimary) {
        nextPrimaryUrl = existingPrimary.public_url;
      } else {
        const promoted = remaining[0];
        await supabaseAdmin
          .from('inventory_item_media')
          .update({ is_primary: true })
          .eq('id', promoted.id);
        promoted.is_primary = true;
        nextPrimaryUrl = promoted.public_url;
      }
    }

    await syncCatalogPrimaryImage(catalogItemId, nextPrimaryUrl);

    const sortedRemaining = [...remaining].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });

    return NextResponse.json({
      success: true,
      media: sortedRemaining,
      primary_image_url: nextPrimaryUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
