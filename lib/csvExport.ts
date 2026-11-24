import {
  DepotStockBalance,
  DepotTransaction,
  AssetRegisterItem,
  DepotLocation,
  InventoryCatalogItem,
} from '@/types/requisition';
import {
  getItemComplianceIssues,
  getComplianceIssueLabel,
} from '@/components/ItemDetailsModal';
import { DICTIONARY } from '@/lib/i18n';

export interface CsvExportOptions {
  lang: 'tr' | 'en';
  canViewFinancials: boolean;
  depotLocations?: DepotLocation[];
  scopeSlug?: string;
}

/**
 * Safely reads optional extended columns that may be returned by Supabase SELECT *
 * without requiring redundant type assertions at every call site.
 */
function getExtraField(
  record: object | null | undefined,
  key: string
): unknown {
  if (!record || typeof record !== 'object') return undefined;
  return (record as Record<string, unknown>)[key];
}

/**
 * RFC-4180 CSV cell serializer with Excel formula-injection protection.
 * - Preserves pure numeric values (including negative numbers) as unprefixed numbers.
 * - Neutralizes non-numeric strings starting with =, +, -, @, \t, or \r by prefixing `'`.
 * - Escapes embedded quotes (" -> "") and wraps cells containing commas, quotes, or newlines.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Neutralize Excel CSV formula injection on non-numeric strings
  const trimmed = str.trim();
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(trimmed);
  if (!isPureNumber && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds a clean, descriptive CSV filename incorporating active tab, filter scope, and YYYY-MM-DD date.
 */
export function buildExportFilename(
  tabSlug: 'balances' | 'movements' | 'assets',
  scopeSlug = 'all'
): string {
  const cleanScope =
    scopeSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all';
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `caesar-depot-${tabSlug}-${cleanScope}-${yyyy}-${mm}-${dd}.csv`;
}

/**
 * Prepends UTF-8 BOM (\uFEFF) so Microsoft Excel renders Turkish diacritics cleanly,
 * triggers an immediate browser file download, and revokes the object URL.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function serializeCsvMatrix(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const dataLines = rows.map((row) =>
    row.map((cell) => escapeCsvCell(cell)).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

function formatAttributeSummary(
  attrs: Record<string, unknown> | null | undefined
): string {
  if (!attrs || typeof attrs !== 'object') return '';
  return Object.entries(attrs)
    .filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '')
    .map(([k, val]) => `${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
    .join('; ');
}

/**
 * Exports Live Stock Balances (Tab 1) with full relational catalog + depot schema,
 * computed compliance status, optional Tier 0-2 financial columns, and dynamic attr_* columns.
 */
export function exportDepotBalancesCsv(
  rows: DepotStockBalance[],
  options: CsvExportOptions
): void {
  const { lang, canViewFinancials, depotLocations = [], scopeSlug = 'all' } =
    options;
  const complianceOkLabel = DICTIONARY[lang].depot.complianceOk;

  const depotMap = new Map<string, DepotLocation>();
  depotLocations.forEach((d) => depotMap.set(d.depot_id, d));

  // Collect all unique custom attribute keys across the exported rows
  const dynamicAttrKeySet = new Set<string>();
  rows.forEach((b) => {
    const attrs = b.catalog_item?.attributes;
    if (attrs && typeof attrs === 'object') {
      Object.keys(attrs).forEach((k) => {
        if (k.trim()) dynamicAttrKeySet.add(k);
      });
    }
  });
  const dynamicAttrKeys = Array.from(dynamicAttrKeySet).sort((a, b) =>
    a.localeCompare(b, 'en')
  );

  const headers: string[] = [
    // Identity & Classification
    'item_id',
    'barcode_ean',
    'legacy_code',
    'manufacturer_article',
    'item_name_tr',
    'item_name_en',
    'product_domain',
    'category',
    'subcategory',
    'resource_type_code',
    'parent_item_id',
    'is_trackable_asset',
    // Depot & Live Stock Metrics
    'depot_id',
    'depot_name',
    'project_id',
    'unit_of_measure',
    'packaging_unit_type',
    'set_piece_count',
    'quantity_on_hand',
    'quantity_reserved',
    'quantity_available',
    'min_stock_threshold',
  ];

  if (canViewFinancials) {
    headers.push(
      'base_cost_eur',
      'commercial_markup_pct',
      'valued_unit_price_eur',
      'total_stock_value_eur',
      'source_unit_price',
      'source_currency',
      'price_basis',
      'price_region',
      'price_source',
      'price_as_of_date'
    );
  }

  headers.push(
    // Engineering Consumption Coefficients
    'consumption_rate',
    'consumption_metric',
    'consumption_basis',
    'consumption_source',
    'consumption_as_of_date',
    // Supplier, Media & Lifecycle Governance
    'supplier_name',
    'brand_model',
    'product_url',
    'primary_image_url',
    'record_status',
    'review_status',
    'lifecycle_status',
    'compliance_status',
    'last_scanned_at',
    // Specifications, Notes & Flattened Attributes
    'specification',
    'notes',
    'custom_attributes_summary',
    ...dynamicAttrKeys.map((k) => `attr_${k}`)
  );

  const matrix: unknown[][] = rows.map((b) => {
    const item: InventoryCatalogItem | undefined = b.catalog_item;
    const depot = depotMap.get(b.depot_id);
    const qtyOnHand = Number(b.quantity_on_hand || 0);
    const qtyReserved = Number(b.quantity_reserved || 0);
    const qtyAvailable = Number((qtyOnHand - qtyReserved).toFixed(4));

    const baseCost = Number(item?.base_cost_eur || 0);
    const markupPct = Number(item?.commercial_markup_pct ?? 15);
    const valuedUnitPrice = Number((baseCost * (1 + markupPct / 100)).toFixed(2));
    const totalStockValue = Number((qtyOnHand * valuedUnitPrice).toFixed(2));

    const issues = getItemComplianceIssues(item);
    const complianceStatus =
      issues.length === 0
        ? complianceOkLabel
        : issues
            .map((issue) => getComplianceIssueLabel(issue, lang))
            .join(' | ');

    const attrs =
      item?.attributes && typeof item.attributes === 'object'
        ? item.attributes
        : null;

    const rowCells: unknown[] = [
      // Identity & Classification
      item?.item_id || b.catalog_item_id,
      item?.barcode_ean ?? '',
      item?.legacy_code ?? '',
      item?.manufacturer_article ?? '',
      item?.item_name_tr ?? '',
      item?.item_name_en ?? '',
      item?.product_domain ?? '',
      item?.category ?? '',
      item?.subcategory ?? '',
      getExtraField(item, 'resource_type_code') ?? '',
      getExtraField(item, 'parent_item_id') ?? '',
      Boolean(item?.is_trackable_asset),
      // Depot & Live Stock Metrics
      b.depot_id,
      depot?.depot_name ?? '',
      depot?.project_id ?? '',
      item?.unit_of_measure ?? '',
      item?.packaging_unit_type ?? 'SINGLE_ITEM',
      item?.set_piece_count ?? 1,
      qtyOnHand,
      qtyReserved,
      qtyAvailable,
      Number(b.min_stock_threshold ?? 0),
    ];

    if (canViewFinancials) {
      rowCells.push(
        baseCost,
        markupPct,
        valuedUnitPrice,
        totalStockValue,
        item?.source_unit_price ?? '',
        item?.source_currency ?? '',
        getExtraField(item, 'price_basis') ?? '',
        getExtraField(item, 'price_region') ?? '',
        getExtraField(item, 'price_source') ?? '',
        getExtraField(item, 'price_as_of_date') ?? ''
      );
    }

    rowCells.push(
      // Engineering Consumption Coefficients
      item?.consumption_rate ?? '',
      item?.consumption_metric ?? '',
      getExtraField(item, 'consumption_basis') ?? '',
      getExtraField(item, 'consumption_source') ?? '',
      getExtraField(item, 'consumption_as_of_date') ?? '',
      // Supplier, Media & Lifecycle Governance
      item?.supplier_name ?? '',
      item?.brand_model ?? '',
      item?.product_url ?? '',
      item?.primary_image_url ?? '',
      item?.record_status ?? '',
      item?.review_status ?? '',
      item?.lifecycle_status ?? '',
      complianceStatus,
      b.last_scanned_at ?? '',
      // Specifications, Notes & Flattened Attributes
      item?.specification ?? '',
      getExtraField(item, 'notes') ?? getExtraField(b, 'notes') ?? '',
      formatAttributeSummary(attrs),
      ...dynamicAttrKeys.map((k) => (attrs ? attrs[k] ?? '' : ''))
    );

    return rowCells;
  });

  const csv = serializeCsvMatrix(headers, matrix);
  triggerCsvDownload(csv, buildExportFilename('balances', scopeSlug));
}

/**
 * Exports Movement & Dispatch Ledger (Tab 2) with full transaction + catalog schema
 * and RBAC financial masking for Tiers 3-4.
 */
export function exportDepotTransactionsCsv(
  rows: DepotTransaction[],
  options: CsvExportOptions
): void {
  const { canViewFinancials, depotLocations = [], scopeSlug = 'all' } = options;

  const depotMap = new Map<string, DepotLocation>();
  depotLocations.forEach((d) => depotMap.set(d.depot_id, d));

  const headers: string[] = [
    'transaction_id',
    'transaction_code',
    'created_at',
    'movement_type',
    'depot_id',
    'item_id',
    'barcode_ean',
    'item_name_tr',
    'item_name_en',
    'quantity',
    'unit_of_measure',
  ];

  if (canViewFinancials) {
    headers.push('unit_cost_eur', 'total_cost_eur');
  }

  headers.push(
    'supplier_name',
    'irsaliye_number',
    'invoice_number',
    'target_project_id',
    'target_building_id',
    'target_unit_id',
    'recipient_name',
    'performed_by',
    'has_missing_docs',
    'notes'
  );

  const matrix: unknown[][] = rows.map((tx) => {
    const item = tx.catalog_item;
    const depot = depotMap.get(tx.depot_id);
    const qty = Number(tx.quantity || 0);
    const unitCost = Number(tx.unit_cost_eur || 0);
    const totalCost = Number(
      (Number(tx.final_valued_cost_eur || unitCost) * qty).toFixed(2)
    );

    const rowCells: unknown[] = [
      tx.transaction_id,
      tx.transaction_code,
      tx.created_at ?? '',
      tx.movement_type,
      tx.depot_id,
      tx.catalog_item_id,
      item?.barcode_ean ?? '',
      item?.item_name_tr ?? '',
      item?.item_name_en ?? '',
      qty,
      item?.unit_of_measure ?? '',
    ];

    if (canViewFinancials) {
      rowCells.push(unitCost, totalCost);
    }

    rowCells.push(
      tx.supplier_name ?? item?.supplier_name ?? '',
      tx.irsaliye_number ?? '',
      tx.invoice_number ?? '',
      getExtraField(tx, 'target_project_id') ?? depot?.project_id ?? '',
      tx.target_building_id ?? '',
      tx.target_unit_label ?? getExtraField(tx, 'target_unit_id') ?? '',
      getExtraField(tx, 'recipient_name') ?? '',
      getExtraField(tx, 'performed_by') ?? tx.confirmed_by_uuid ?? '',
      Boolean(tx.has_missing_docs),
      tx.notes ?? ''
    );

    return rowCells;
  });

  const csv = serializeCsvMatrix(headers, matrix);
  triggerCsvDownload(csv, buildExportFilename('movements', scopeSlug));
}

/**
 * Exports Serialized Asset Register (Tab 3) with full custody + linked catalog schema.
 */
export function exportDepotAssetsCsv(
  rows: AssetRegisterItem[],
  options: CsvExportOptions
): void {
  const { scopeSlug = 'all' } = options;

  const headers: string[] = [
    'asset_id',
    'asset_tag',
    'serial_number',
    'item_id',
    'barcode_ean',
    'item_name_tr',
    'item_name_en',
    'brand_model',
    'supplier_name',
    'current_depot_id',
    'custody_status',
    'assigned_building_id',
    'assigned_unit_id',
    'assigned_to',
    'warranty_expiry',
    'last_updated',
    'notes',
  ];

  const matrix: unknown[][] = rows.map((asset) => {
    const item = asset.catalog_item;
    return [
      asset.asset_id,
      asset.asset_tag,
      asset.serial_number,
      asset.catalog_item_id,
      asset.barcode_ean ?? item?.barcode_ean ?? '',
      item?.item_name_tr ?? '',
      item?.item_name_en ?? '',
      item?.brand_model ?? '',
      item?.supplier_name ?? '',
      asset.current_depot_id ?? '',
      asset.custody_status,
      asset.deployed_building_id ?? '',
      asset.deployed_unit_label ?? '',
      getExtraField(asset, 'assigned_to') ?? '',
      asset.warranty_expiry_date ?? '',
      asset.updated_at ?? asset.created_at ?? '',
      asset.notes ?? '',
    ];
  });

  const csv = serializeCsvMatrix(headers, matrix);
  triggerCsvDownload(csv, buildExportFilename('assets', scopeSlug));
}
