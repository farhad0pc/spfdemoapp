import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionFromRequest } from '@/lib/authSession';
import { canEditDepotStock, ROLE_METADATA } from '@/lib/rbac';
import {
  InventoryCatalogItem,
  PackagingUnitType,
  RoleTier,
} from '@/types/requisition';

const TIER_0_TO_2_CATALOG_EDIT_ROLES: RoleTier[] = [
  'SYSTEM_ADMIN',
  'EXECUTIVE',
  'TECH_OFFICE_MANAGER',
  'DEPOT_MANAGER',
];

function resolveEffectiveCallerRole(
  sessionRole: RoleTier,
  actorRoleOverride?: RoleTier
): RoleTier {
  // Only Tier 0 (SYSTEM_ADMIN) may preview lower-tier permissions via actor_role
  if (sessionRole === 'SYSTEM_ADMIN' && actorRoleOverride && ROLE_METADATA[actorRoleOverride]) {
    return actorRoleOverride;
  }
  return sessionRole;
}

function generateDeterministicLegacyCode(domain?: string | null): string {
  const prefix =
    domain === 'CONSTRUCTION_MATERIALS'
      ? 'MAT'
      : domain === 'FURNISHING_AND_EQUIPMENT'
      ? 'WH'
      : 'DEP';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

function generateInternalBarcode(): string {
  const ts = Date.now().toString().slice(-9);
  const rand = Math.floor(100 + Math.random() * 900).toString();
  return `299${ts}${rand}`;
}

function deriveTargetDepotId(
  explicitDepotId?: string | null,
  projectId?: string | null,
  domain?: string | null
): string {
  if (explicitDepotId && explicitDepotId !== 'ALL') {
    return explicitDepotId;
  }
  const cleanPrj = (projectId && projectId !== 'ALL' ? projectId : 'PRJ-02')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  if (domain === 'CONSTRUCTION_MATERIALS') {
    return `DEPOT-${cleanPrj}-CONST`;
  }
  return `DEPOT-${cleanPrj}-MAIN`;
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      body.actor_role as RoleTier | undefined
    );

    const canWriteDepot =
      canEditDepotStock(effectiveRole) ||
      TIER_0_TO_2_CATALOG_EDIT_ROLES.includes(effectiveRole);

    if (!canWriteDepot) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem: Depo katalog kaydı oluşturma yetkiniz bulunmamaktadır. / Forbidden.',
        },
        { status: 403 }
      );
    }

    const itemNameTr = String(body.item_name_tr || body.name || '').trim();
    const itemNameEn = String(body.item_name_en || itemNameTr).trim();
    const unitOfMeasure = String(body.unit_of_measure || 'adet').trim();
    const category = String(body.category || '').trim();
    const productDomain = String(
      body.product_domain || 'CONSTRUCTION_MATERIALS'
    ).trim();

    if (!itemNameTr || !unitOfMeasure || !category) {
      return NextResponse.json(
        {
          error:
            'Malzeme adı, birim ve kategori alanları zorunludur. / Item name, unit, and category are required.',
        },
        { status: 400 }
      );
    }

    const itemId = crypto.randomUUID();
    const rawBarcode = String(body.barcode_ean || '').trim();
    const barcodeEan = rawBarcode || generateInternalBarcode();
    const rawLegacyCode = String(body.legacy_code || '').trim();
    const legacyCode =
      rawLegacyCode || generateDeterministicLegacyCode(productDomain);

    const targetDepotId = deriveTargetDepotId(
      body.depot_id,
      body.project_id,
      productDomain
    );

    const baseCostEur = Math.max(0, Number(body.base_cost_eur) || 0);
    const sourceUnitPrice =
      body.source_unit_price !== undefined && body.source_unit_price !== null && body.source_unit_price !== ''
        ? Math.max(0, Number(body.source_unit_price))
        : baseCostEur;
    const sourceCurrency = String(body.source_currency || 'EUR').trim().toUpperCase();
    const markupPct =
      body.commercial_markup_pct !== undefined && body.commercial_markup_pct !== null
        ? Number(body.commercial_markup_pct)
        : 15;
    const packagingType: PackagingUnitType =
      body.packaging_unit_type === 'ATOMIC_SET' ? 'ATOMIC_SET' : 'SINGLE_ITEM';
    const setPieceCount =
      packagingType === 'ATOMIC_SET'
        ? Math.max(2, Number(body.set_piece_count) || 2)
        : 1;
    const isTrackableAsset = Boolean(body.is_trackable_asset);

    const newCatalogRecord: InventoryCatalogItem = {
      item_id: itemId,
      legacy_code: legacyCode,
      item_name_tr: itemNameTr,
      item_name_en: itemNameEn,
      specification: body.specification ? String(body.specification).trim() : null,
      category,
      subcategory: body.subcategory ? String(body.subcategory).trim() : null,
      unit_of_measure: unitOfMeasure,
      base_cost_eur: baseCostEur,
      consumption_rate: 1.0,
      consumption_metric: 'pcs_per_building',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: barcodeEan,
      is_trackable_asset: isTrackableAsset,
      packaging_unit_type: packagingType,
      set_piece_count: setPieceCount,
      commercial_markup_pct: markupPct,
      product_domain: productDomain,
      supplier_name: body.supplier_name ? String(body.supplier_name).trim() : null,
      brand_model: body.brand_model ? String(body.brand_model).trim() : null,
      manufacturer_article: body.manufacturer_article
        ? String(body.manufacturer_article).trim()
        : null,
      source_currency: sourceCurrency,
      source_unit_price: sourceUnitPrice,
      product_url: body.product_url ? String(body.product_url).trim() : null,
      lifecycle_status: body.lifecycle_status
        ? String(body.lifecycle_status).trim()
        : 'ACTIVE',
      attributes:
        body.attributes && typeof body.attributes === 'object'
          ? (body.attributes as Record<string, unknown>)
          : null,
    };

    const { data: insertedItem, error: catalogError } = await supabaseAdmin
      .from('inventory_catalog')
      .insert([newCatalogRecord])
      .select('*')
      .single();

    if (catalogError) {
      return NextResponse.json(
        { error: 'Katalog kaydı oluşturulamadı: ' + catalogError.message },
        { status: 500 }
      );
    }

    const initialQty = Math.max(0, Number(body.initial_qty ?? 0));
    const minStockThreshold = Math.max(0, Number(body.min_stock_threshold ?? 5));
    const nowIso = new Date().toISOString();

    const balancePayload = {
      balance_id: crypto.randomUUID(),
      depot_id: targetDepotId,
      catalog_item_id: itemId,
      quantity_on_hand: initialQty,
      quantity_reserved: 0,
      min_stock_threshold: minStockThreshold,
      last_scanned_at: nowIso,
    };

    const { data: insertedBalance, error: balanceError } = await supabaseAdmin
      .from('depot_stock_balances')
      .upsert([balancePayload])
      .select('*')
      .single();

    if (balanceError) {
      return NextResponse.json(
        { error: 'Depo bakiye kaydı oluşturulamadı: ' + balanceError.message },
        { status: 500 }
      );
    }

    let createdTx = null;
    let createdAsset = null;

    if (initialQty > 0) {
      const txCode = `MOV-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const valuedCost = Number(
        (baseCostEur * (1 + markupPct / 100)).toFixed(2)
      );
      const irsaliye = body.irsaliye_number
        ? String(body.irsaliye_number).trim()
        : null;

      const txInsertPayload = {
        transaction_id: crypto.randomUUID(),
        transaction_code: txCode,
        depot_id: targetDepotId,
        catalog_item_id: itemId,
        movement_type: 'INBOUND_RECEIPT',
        quantity: initialQty,
        irsaliye_number: irsaliye,
        supplier_name: newCatalogRecord.supplier_name,
        unit_cost_eur: baseCostEur,
        final_valued_cost_eur: valuedCost,
        delivery_confirmed: true,
        confirmed_at: nowIso,
        created_at: nowIso,
        notes: `Depot Registry Intake (${itemNameTr})`,
      };

      const { data: txData } = await supabaseAdmin
        .from('depot_transactions')
        .insert([txInsertPayload])
        .select('*')
        .single();

      createdTx = txData
        ? { ...txData, catalog_item: insertedItem }
        : {
            ...txInsertPayload,
            has_missing_docs: !irsaliye,
            catalog_item: insertedItem,
          };

      const serialNo = body.serial_number
        ? String(body.serial_number).trim()
        : '';
      if (isTrackableAsset && serialNo) {
        const assetPayload = {
          asset_id: crypto.randomUUID(),
          asset_tag: `AST-${new Date().getFullYear()}-${crypto
            .randomBytes(2)
            .toString('hex')
            .toUpperCase()}`,
          catalog_item_id: itemId,
          barcode_ean: barcodeEan,
          serial_number: serialNo,
          current_depot_id: targetDepotId,
          custody_status: 'IN_DEPOT',
          inbound_transaction_id: txInsertPayload.transaction_id,
          warranty_expiry_date: body.warranty_expiry_date || null,
          created_at: nowIso,
        };

        const { data: assetData } = await supabaseAdmin
          .from('asset_register')
          .insert([assetPayload])
          .select('*')
          .single();

        createdAsset = assetData
          ? { ...assetData, catalog_item: insertedItem }
          : { ...assetPayload, catalog_item: insertedItem };
      }
    }

    return NextResponse.json({
      success: true,
      item: insertedItem,
      balance: { ...insertedBalance, catalog_item: insertedItem },
      transaction: createdTx,
      asset: createdAsset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum doğrulanamadı. / Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const effectiveRole = resolveEffectiveCallerRole(
      session.role,
      body.actor_role as RoleTier | undefined
    );

    // Strictly enforce Tier 0, 1, or 2 authority (SYSTEM_ADMIN, EXECUTIVE, TECH_OFFICE_MANAGER, DEPOT_MANAGER)
    if (!TIER_0_TO_2_CATALOG_EDIT_ROLES.includes(effectiveRole)) {
      return NextResponse.json(
        {
          error:
            'Yetkisiz işlem (403): Katalog düzenleme yetkisi yalnızca Kademe 0–2 (Sistem Yöneticisi, Yönetim Kurulu, Teknik Ofis Müdürü, Depo Müdürü) rollerine aittir.',
        },
        { status: 403 }
      );
    }

    const itemId = String(body.item_id || '').trim();
    if (!itemId) {
      return NextResponse.json(
        { error: 'item_id alanı zorunludur.' },
        { status: 400 }
      );
    }

    const catalogUpdates: Record<string, unknown> = {};
    const stringFields = [
      'legacy_code',
      'item_name_tr',
      'item_name_en',
      'specification',
      'category',
      'subcategory',
      'unit_of_measure',
      'barcode_ean',
      'packaging_unit_type',
      'product_domain',
      'supplier_name',
      'brand_model',
      'manufacturer_article',
      'source_currency',
      'product_url',
      'lifecycle_status',
      'record_status',
      'review_status',
    ] as const;

    for (const field of stringFields) {
      if (field in body) {
        const val = body[field];
        catalogUpdates[field] =
          val === null || val === undefined || String(val).trim() === ''
            ? null
            : String(val).trim();
      }
    }

    // Ensure required non-null strings stay valid if provided
    if ('item_name_tr' in catalogUpdates && !catalogUpdates.item_name_tr) {
      return NextResponse.json(
        { error: 'Malzeme adı (TR) boş bırakılamaz.' },
        { status: 400 }
      );
    }

    const numericFields = [
      'base_cost_eur',
      'source_unit_price',
      'commercial_markup_pct',
      'set_piece_count',
      'consumption_rate',
    ] as const;

    for (const field of numericFields) {
      if (field in body) {
        const val = body[field];
        catalogUpdates[field] =
          val === null || val === undefined || val === ''
            ? null
            : Number(val);
      }
    }

    if ('is_trackable_asset' in body) {
      catalogUpdates.is_trackable_asset = Boolean(body.is_trackable_asset);
    }

    if ('attributes' in body && (body.attributes === null || typeof body.attributes === 'object')) {
      catalogUpdates.attributes = body.attributes;
    }

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('inventory_catalog')
      .update(catalogUpdates)
      .eq('item_id', itemId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Katalog güncellenemedi: ' + updateError.message },
        { status: 500 }
      );
    }

    let updatedBalance = null;
    if (body.balance_id) {
      const balanceUpdates: Record<string, unknown> = {};
      if (body.min_stock_threshold !== undefined) {
        balanceUpdates.min_stock_threshold = Math.max(
          0,
          Number(body.min_stock_threshold) || 0
        );
      }
      if (body.depot_id && String(body.depot_id).trim()) {
        balanceUpdates.depot_id = String(body.depot_id).trim();
      }

      if (Object.keys(balanceUpdates).length > 0) {
        const { data: bData } = await supabaseAdmin
          .from('depot_stock_balances')
          .update(balanceUpdates)
          .eq('balance_id', String(body.balance_id))
          .select('*')
          .single();

        if (bData) {
          updatedBalance = { ...bData, catalog_item: updatedItem };
        }
      }
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      balance: updatedBalance,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
