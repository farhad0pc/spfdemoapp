'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo, useEffect } from 'react';
import {
  InventoryCatalogItem,
  InventoryItemMedia,
  DepotStockBalance,
  DepotTransaction,
  AssetRegisterItem,
  DepotLocation,
  RoleTier,
  PackagingUnitType,
} from '@/types/requisition';
import { canEditDepotStock } from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';
import AttributesEditor from '@/components/AttributesEditor';
import ItemMediaUploadModal from '@/components/ItemMediaUploadModal';

const TIER_0_TO_2_EDIT_ROLES: RoleTier[] = [
  'SYSTEM_ADMIN',
  'EXECUTIVE',
  'TECH_OFFICE_MANAGER',
  'DEPOT_MANAGER',
];

const CONTROL_CLASS =
  'w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500';

export type ItemComplianceIssue =
  | 'UNPRICED'
  | 'MISSING_METADATA'
  | 'REVIEW_REQUIRED';

export function getItemComplianceIssues(
  item: InventoryCatalogItem | null | undefined
): ItemComplianceIssue[] {
  if (!item) return [];
  const issues: ItemComplianceIssue[] = [];

  if (
    item.base_cost_eur == null ||
    Number(item.base_cost_eur) <= 0 ||
    item.lifecycle_status === 'UNPRICED_REVIEW'
  ) {
    issues.push('UNPRICED');
  }

  if (
    !item.category?.trim() ||
    !item.unit_of_measure?.trim() ||
    (item.product_domain === 'FURNISHING_AND_EQUIPMENT' &&
      !item.supplier_name?.trim())
  ) {
    issues.push('MISSING_METADATA');
  }

  if (
    item.lifecycle_status === 'REVIEW_REQUIRED' ||
    item.review_status === 'pending'
  ) {
    issues.push('REVIEW_REQUIRED');
  }

  return issues;
}

export function getComplianceIssueLabel(
  issue: ItemComplianceIssue,
  lang: 'tr' | 'en'
): string {
  const t = DICTIONARY[lang].itemDetails;
  if (issue === 'UNPRICED') return t.complianceUnpriced;
  if (issue === 'MISSING_METADATA') return t.complianceMissingMetadata;
  return t.complianceReviewRequired;
}

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: DepotStockBalance | null;
  item: InventoryCatalogItem | null;
  transactions: DepotTransaction[];
  assets: AssetRegisterItem[];
  depotLocations: DepotLocation[];
  availableCategories: string[];
  currentRole: RoleTier;
  lang: 'tr' | 'en';
  onSaved?: (
    updatedItem: InventoryCatalogItem,
    updatedBalance?: DepotStockBalance | null
  ) => Promise<void> | void;
}

export default function ItemDetailsModal({
  isOpen,
  onClose,
  balance,
  item,
  transactions,
  assets,
  depotLocations,
  availableCategories,
  currentRole,
  lang,
  onSaved,
}: ItemDetailsModalProps) {
  const t = DICTIONARY[lang].itemDetails;
  const td = DICTIONARY[lang].depot;
  const tc = DICTIONARY[lang].common;
  const tm = DICTIONARY[lang].media;

  // Strictly Tiers 0, 1, 2 can edit catalog fields and delete album photos
  const canEditCatalog = TIER_0_TO_2_EDIT_ROLES.includes(currentRole);
  const canDeleteMedia = TIER_0_TO_2_EDIT_ROLES.includes(currentRole);
  // All depot staff authorized to add items (canEditDepotStock + Tiers 0-2) can upload photos & set primary
  const canUploadMedia =
    canEditDepotStock(currentRole) ||
    TIER_0_TO_2_EDIT_ROLES.includes(currentRole);

  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Album Media State (Max 5 photos per SKU)
  const [rawAlbumMedia, setRawAlbumMedia] = useState<InventoryItemMedia[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [mediaActionBusy, setMediaActionBusy] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Edit Form State
  const [formLegacyCode, setFormLegacyCode] = useState<string>('');
  const [formBarcodeEan, setFormBarcodeEan] = useState<string>('');
  const [formManufacturerArticle, setFormManufacturerArticle] =
    useState<string>('');
  const [formNameTr, setFormNameTr] = useState<string>('');
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formProductDomain, setFormProductDomain] = useState<string>(
    'CONSTRUCTION_MATERIALS'
  );
  const [formCategory, setFormCategory] = useState<string>('');
  const [formSubcategory, setFormSubcategory] = useState<string>('');
  const [formDepotId, setFormDepotId] = useState<string>('');
  const [formBaseCostEur, setFormBaseCostEur] = useState<number>(0);
  const [formSourcePrice, setFormSourcePrice] = useState<number>(0);
  const [formSourceCurrency, setFormSourceCurrency] = useState<string>('EUR');
  const [formMarkupPct, setFormMarkupPct] = useState<number>(15);
  const [formSupplierName, setFormSupplierName] = useState<string>('');
  const [formBrandModel, setFormBrandModel] = useState<string>('');
  const [formProductUrl, setFormProductUrl] = useState<string>('');
  const [formUnitOfMeasure, setFormUnitOfMeasure] = useState<string>('adet');
  const [formPackagingType, setFormPackagingType] =
    useState<PackagingUnitType>('SINGLE_ITEM');
  const [formSetPieceCount, setFormSetPieceCount] = useState<number>(1);
  const [formIsTrackableAsset, setFormIsTrackableAsset] =
    useState<boolean>(false);
  const [formLifecycleStatus, setFormLifecycleStatus] =
    useState<string>('ACTIVE');
  const [formRecordStatus, setFormRecordStatus] = useState<string>('active');
  const [formMinThreshold, setFormMinThreshold] = useState<number>(5);
  const [formSpecification, setFormSpecification] = useState<string>('');
  const [formAttributes, setFormAttributes] = useState<Record<string, unknown>>(
    {}
  );

  // Fetch Album Media asynchronously on Modal Open without synchronous setState in effect
  useEffect(() => {
    if (!isOpen || !item?.item_id) return;
    let ignore = false;
    const targetItemId = item.item_id;

    const loadAlbum = async () => {
      try {
        const res = await fetch(
          `/api/depot/media?catalog_item_id=${encodeURIComponent(targetItemId)}`
        );
        if (!ignore && res.ok) {
          const data = (await res.json()) as { media?: InventoryItemMedia[] };
          const list = data.media || [];
          setRawAlbumMedia(list);
          const primary = list.find((m) => m.is_primary) || list[0] || null;
          setSelectedMediaId(primary ? primary.id : null);
        }
      } catch {
        // Ignore fetch failure and fall back to item.primary_image_url
      }
    };

    void loadAlbum();
    return () => {
      ignore = true;
    };
  }, [isOpen, item?.item_id]);

  // Scope album strictly to current item_id so switching items never shows stale photos
  const albumMedia = useMemo(() => {
    if (!item) return [];
    return rawAlbumMedia.filter((m) => m.catalog_item_id === item.item_id);
  }, [rawAlbumMedia, item]);

  const itemTransactions = useMemo(() => {
    if (!item) return [];
    return transactions.filter((tx) => tx.catalog_item_id === item.item_id);
  }, [transactions, item]);

  const itemAssets = useMemo(() => {
    if (!item) return [];
    return assets.filter((a) => a.catalog_item_id === item.item_id);
  }, [assets, item]);

  const complianceIssues = useMemo(
    () => getItemComplianceIssues(item),
    [item]
  );

  const activeMediaItem = useMemo(() => {
    if (albumMedia.length === 0) return null;
    if (selectedMediaId) {
      const found = albumMedia.find((m) => m.id === selectedMediaId);
      if (found) return found;
    }
    return albumMedia.find((m) => m.is_primary) || albumMedia[0];
  }, [albumMedia, selectedMediaId]);

  if (!isOpen || !item) return null;

  const displayImageUrl =
    activeMediaItem?.public_url || item.primary_image_url || null;

  const handleAlbumUpdated = async (
    updatedAlbum: InventoryItemMedia[],
    newPrimaryUrl: string | null
  ) => {
    setRawAlbumMedia(updatedAlbum);
    const nextActive =
      updatedAlbum.find((m) => m.id === selectedMediaId) ||
      updatedAlbum.find((m) => m.is_primary) ||
      updatedAlbum[0] ||
      null;
    setSelectedMediaId(nextActive ? nextActive.id : null);

    if (newPrimaryUrl !== item.primary_image_url) {
      const updatedCatalogItem: InventoryCatalogItem = {
        ...item,
        primary_image_url: newPrimaryUrl,
      };
      await onSaved?.(updatedCatalogItem, balance);
    }
  };

  const handleSetPrimaryMedia = async (targetMedia: InventoryItemMedia) => {
    if (!canUploadMedia || targetMedia.is_primary || mediaActionBusy) return;
    setMediaActionBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/depot/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: targetMedia.id,
          catalog_item_id: item.item_id,
          actor_role: currentRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update primary photo.');
        return;
      }
      await handleAlbumUpdated(
        (data.media || []) as InventoryItemMedia[],
        (data.primary_image_url as string | null) ?? targetMedia.public_url
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setMediaActionBusy(false);
    }
  };

  const handleDeleteMedia = async (targetMedia: InventoryItemMedia) => {
    if (!canDeleteMedia || mediaActionBusy) return;
    if (!window.confirm(tm.deleteConfirmPrompt)) return;

    setMediaActionBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/depot/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: targetMedia.id,
          catalog_item_id: item.item_id,
          actor_role: currentRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to delete photo.');
        return;
      }
      await handleAlbumUpdated(
        (data.media || []) as InventoryItemMedia[],
        (data.primary_image_url as string | null) ?? null
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setMediaActionBusy(false);
    }
  };

  const enterEditMode = () => {
    if (!canEditCatalog) return;
    setFormLegacyCode(item.legacy_code || '');
    setFormBarcodeEan(item.barcode_ean || '');
    setFormManufacturerArticle(item.manufacturer_article || '');
    setFormNameTr(item.item_name_tr || '');
    setFormNameEn(item.item_name_en || '');
    setFormProductDomain(item.product_domain || 'CONSTRUCTION_MATERIALS');
    setFormCategory(item.category || '');
    setFormSubcategory(item.subcategory || '');
    setFormDepotId(
      balance?.depot_id || depotLocations[0]?.depot_id || 'DEPOT-PRJ02-MAIN'
    );
    setFormBaseCostEur(Number(item.base_cost_eur || 0));
    setFormSourcePrice(
      Number(item.source_unit_price ?? item.base_cost_eur ?? 0)
    );
    setFormSourceCurrency(item.source_currency || 'EUR');
    setFormMarkupPct(Number(item.commercial_markup_pct ?? 15));
    setFormSupplierName(item.supplier_name || '');
    setFormBrandModel(item.brand_model || '');
    setFormProductUrl(item.product_url || '');
    setFormUnitOfMeasure(item.unit_of_measure || 'adet');
    setFormPackagingType(item.packaging_unit_type || 'SINGLE_ITEM');
    setFormSetPieceCount(Number(item.set_piece_count || 1));
    setFormIsTrackableAsset(Boolean(item.is_trackable_asset));
    setFormLifecycleStatus(item.lifecycle_status || 'ACTIVE');
    setFormRecordStatus(item.record_status || 'active');
    setFormMinThreshold(Number(balance?.min_stock_threshold ?? 5));
    setFormSpecification(item.specification || '');
    setFormAttributes(
      item.attributes && typeof item.attributes === 'object'
        ? { ...item.attributes }
        : {}
    );
    setErrorMessage(null);
    setShowConfirmPrompt(false);
    setIsEditing(true);
  };

  const handleRequestSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameTr.trim()) {
      setErrorMessage(
        lang === 'tr'
          ? 'Malzeme adı (TR) zorunludur.'
          : 'Item Name (TR) is required.'
      );
      return;
    }
    setErrorMessage(null);
    setShowConfirmPrompt(true);
  };

  const handleExecuteConfirmedSave = async () => {
    setSaving(true);
    setErrorMessage(null);

    const serializedAttributes =
      formAttributes && Object.keys(formAttributes).length > 0
        ? formAttributes
        : null;

    try {
      const res = await fetch('/api/depot/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_role: currentRole,
          item_id: item.item_id,
          balance_id: balance?.balance_id,
          legacy_code: formLegacyCode.trim() || null,
          barcode_ean: formBarcodeEan.trim() || null,
          manufacturer_article: formManufacturerArticle.trim() || null,
          item_name_tr: formNameTr.trim(),
          item_name_en: formNameEn.trim() || formNameTr.trim(),
          product_domain: formProductDomain,
          category: formCategory.trim() || null,
          subcategory: formSubcategory.trim() || null,
          depot_id: formDepotId,
          base_cost_eur: Number(formBaseCostEur) || 0,
          source_unit_price: Number(formSourcePrice) || 0,
          source_currency: formSourceCurrency.trim() || 'EUR',
          commercial_markup_pct: Number(formMarkupPct) || 0,
          supplier_name: formSupplierName.trim() || null,
          brand_model: formBrandModel.trim() || null,
          product_url: formProductUrl.trim() || null,
          unit_of_measure: formUnitOfMeasure.trim() || 'adet',
          packaging_unit_type: formPackagingType,
          set_piece_count:
            formPackagingType === 'ATOMIC_SET'
              ? Math.max(2, Number(formSetPieceCount) || 2)
              : 1,
          is_trackable_asset: formIsTrackableAsset,
          lifecycle_status: formLifecycleStatus.trim() || 'ACTIVE',
          record_status: formRecordStatus.trim() || 'active',
          min_stock_threshold: Number(formMinThreshold) || 0,
          specification: formSpecification.trim() || null,
          attributes: serializedAttributes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (lang === 'tr'
              ? 'Veritabanı güncellenemedi.'
              : 'Failed to update database record.')
        );
        setSaving(false);
        setShowConfirmPrompt(false);
        return;
      }

      setIsEditing(false);
      setShowConfirmPrompt(false);
      await onSaved?.(
        data.item as InventoryCatalogItem,
        (data.balance as DepotStockBalance) || null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const baseCost = Number(item.base_cost_eur || 0);
  const markup = Number(item.commercial_markup_pct ?? 15);
  const valuedUnitPrice = Number((baseCost * (1 + markup / 100)).toFixed(2));
  const qtyOnHand = balance?.quantity_on_hand ?? 0;
  const qtyReserved = balance?.quantity_reserved ?? 0;
  const minThreshold = balance?.min_stock_threshold ?? 5;
  const itemDisplayTitle =
    lang === 'tr' ? item.item_name_tr : item.item_name_en || item.item_name_tr;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans select-none">
      <div className="relative w-full md:w-[calc(100vw-1rem)] md:max-w-4xl bg-white dark:bg-[#0f172a] rounded-t-2xl md:rounded-2xl shadow-2xl border-t md:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Mobile Bottom-Sheet Drag Handle Pill */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 bg-slate-50 dark:bg-slate-900/60">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                {item.legacy_code || 'SKU'}
              </span>
              {item.barcode_ean && (
                <span className="text-xs font-mono font-light text-slate-500 dark:text-slate-400">
                  EAN: {item.barcode_ean}
                </span>
              )}
              {!canEditCatalog && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {t.readOnlyBadge}
                </span>
              )}
              {complianceIssues.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {td.incompleteSkuBadge} ({complianceIssues.length})
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-1">
              {itemDisplayTitle}
            </h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Strictly Tier 0, 1, or 2 Edit Button */}
            {canEditCatalog && activeTab === 'RECORD' && !isEditing && (
              <button
                type="button"
                onClick={enterEditMode}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title={t.btnEdit}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>{t.btnEdit}</span>
              </button>
            )}

            {canEditCatalog && isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setShowConfirmPrompt(false);
                  setErrorMessage(null);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                {t.btnCancelEdit}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(false);
                setIsUploadModalOpen(false);
                onClose();
              }}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={tc.close}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Full Database Record vs Item History */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 bg-white dark:bg-[#0f172a] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('RECORD')}
            className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'RECORD'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.tabRecord}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('HISTORY');
              setIsEditing(false);
              setShowConfirmPrompt(false);
            }}
            className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.tabHistory} ({itemTransactions.length + itemAssets.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Compliance Alert Banner */}
          {activeTab === 'RECORD' && complianceIssues.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{t.complianceBannerTitle}</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-xs font-light text-amber-900 dark:text-amber-200">
                {complianceIssues.map((issue) => (
                  <li key={issue}>{getComplianceIssueLabel(issue, lang)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Explicit Save Confirmation Banner / Dialog */}
          {showConfirmPrompt && isEditing && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-700 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 uppercase">
                  {t.confirmTitle}
                </h4>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.confirmPrompt}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmPrompt(false)}
                  disabled={saving}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {tc.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedSave}
                  disabled={saving}
                  className="min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {saving ? tc.saving : t.btnConfirmSave}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: FULL DATABASE RECORD (READ MODE) */}
          {activeTab === 'RECORD' && !isEditing && (
            <div className="space-y-5 text-xs select-text">
              {/* ========================================================= */}
              {/* MILESTONE v2.9.0: TOP-LEFT PHOTO / ALBUM HERO + TELEMETRY */}
              {/* Desktop (md:+): 2-col hero with 180x180px rounded frame   */}
              {/* Mobile (< md): Stacked full-width 4:3 hero gallery        */}
              {/* ========================================================= */}
              <div className="flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                {/* Left Column: Album Frame + 5-Slot Thumbnail Strip + RBAC Actions */}
                <div className="w-full md:w-[180px] shrink-0 flex flex-col space-y-2.5">
                  {/* Primary / Active Photo Frame */}
                  <div className="relative w-full aspect-[4/3] max-h-60 md:max-h-none md:w-[180px] md:h-[180px] md:aspect-square rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden flex items-center justify-center group">
                    {displayImageUrl ? (
                      <>
                        <img
                          src={displayImageUrl}
                          alt={itemDisplayTitle}
                          loading="lazy"
                          decoding="async"
                          onClick={() => setIsLightboxOpen(true)}
                          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.03]"
                        />

                        {/* Primary Badge */}
                        {(activeMediaItem?.is_primary ||
                          albumMedia.length <= 1) && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-xs text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            ★ {tm.primaryBadge}
                          </span>
                        )}

                        {/* Album Counter Badge */}
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-xs text-[10px] font-mono font-bold text-white border border-white/10">
                          {Math.max(1, albumMedia.length)}/5
                        </span>

                        {/* Bottom Overlay Controls: Set Primary & Delete (Strictly Tier 0-2) */}
                        {activeMediaItem && (
                          <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between gap-1">
                            {canUploadMedia && !activeMediaItem.is_primary ? (
                              <button
                                type="button"
                                disabled={mediaActionBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleSetPrimaryMedia(activeMediaItem);
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-[10px] font-bold truncate cursor-pointer"
                                title={tm.setPrimary}
                              >
                                ★ {tm.setPrimary}
                              </button>
                            ) : (
                              <span />
                            )}

                            {canDeleteMedia && (
                              <button
                                type="button"
                                disabled={mediaActionBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteMedia(activeMediaItem);
                                }}
                                className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                                title={tm.deletePhoto}
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Dashed Camera Placeholder when Empty */
                      <div
                        onClick={() => {
                          if (canUploadMedia) setIsUploadModalOpen(true);
                        }}
                        className={`w-full h-full flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl ${
                          canUploadMedia
                            ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                            : ''
                        }`}
                      >
                        <svg
                          className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          {tm.noPhotoPlaceholder}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5-Slot Mini Thumbnail Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {[0, 1, 2, 3, 4].map((slotIdx) => {
                      const slotMedia = albumMedia[slotIdx];
                      const isSelected =
                        slotMedia && activeMediaItem?.id === slotMedia.id;

                      if (slotMedia) {
                        return (
                          <button
                            key={slotMedia.id}
                            type="button"
                            onClick={() => setSelectedMediaId(slotMedia.id)}
                            className={`relative w-9 h-9 md:w-8 md:h-8 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 dark:border-blue-400 ring-1 ring-blue-500/40'
                                : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                            }`}
                            title={`${tm.albumTitle} #${slotIdx + 1}`}
                          >
                            <img
                              src={slotMedia.public_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                            {slotMedia.is_primary && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={`empty-slot-${slotIdx}`}
                          type="button"
                          disabled={
                            !canUploadMedia || albumMedia.length >= 5
                          }
                          onClick={() => {
                            if (canUploadMedia && albumMedia.length < 5) {
                              setIsUploadModalOpen(true);
                            }
                          }}
                          className={`w-9 h-9 md:w-8 md:h-8 rounded-lg shrink-0 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 ${
                            canUploadMedia && albumMedia.length < 5
                              ? 'hover:border-blue-400 hover:text-blue-500 cursor-pointer'
                              : 'opacity-40 cursor-default'
                          }`}
                          title={tm.addPhoto}
                        >
                          +
                        </button>
                      );
                    })}
                  </div>

                  {/* Prominent + Add Photo Pill Button */}
                  {canUploadMedia && (
                    <button
                      type="button"
                      disabled={albumMedia.length >= 5}
                      onClick={() => setIsUploadModalOpen(true)}
                      className={`w-full min-h-[40px] py-2 px-3 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 border transition-colors ${
                        albumMedia.length >= 5
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs cursor-pointer'
                      }`}
                    >
                      <span>
                        {albumMedia.length >= 5
                          ? tm.maxPhotosLimit
                          : `+ ${tm.addPhoto}`}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right Column: Identity Summary & 4-Stat Live Stock / Valuation Telemetry */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                        {item.product_domain || 'CONSTRUCTION_MATERIALS'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {balance?.depot_id || 'DEPOT-PRJ02-MAIN'}
                      </span>
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {item.category}
                          {item.subcategory ? ` • ${item.subcategory}` : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.item_name_tr}
                    </h3>
                    {item.item_name_en &&
                      item.item_name_en !== item.item_name_tr && (
                        <p className="text-xs font-light text-slate-500 dark:text-slate-400">
                          {item.item_name_en}
                        </p>
                      )}
                    {(item.brand_model || item.supplier_name) && (
                      <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                        {item.brand_model ? `${item.brand_model}` : ''}
                        {item.brand_model && item.supplier_name ? ' • ' : ''}
                        {item.supplier_name ? `${item.supplier_name}` : ''}
                      </p>
                    )}
                  </div>

                  {/* 4-Metric Stock & Price Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {t.lblQtyOnHand}
                      </span>
                      <span className="text-base sm:text-lg font-light text-slate-900 dark:text-white">
                        {qtyOnHand}{' '}
                        <span className="text-[11px] text-slate-400">
                          {item.unit_of_measure}
                        </span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {t.lblQtyReserved}
                      </span>
                      <span className="text-base sm:text-lg font-light text-amber-600 dark:text-amber-400">
                        {qtyReserved}{' '}
                        <span className="text-[11px] text-slate-400">
                          {item.unit_of_measure}
                        </span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {t.lblMinThreshold}
                      </span>
                      <span className="text-base sm:text-lg font-light text-slate-700 dark:text-slate-300">
                        {minThreshold}{' '}
                        <span className="text-[11px] text-slate-400">
                          {item.unit_of_measure}
                        </span>
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        {t.lblValuedPriceEur}
                      </span>
                      <span className="text-base sm:text-lg font-light text-emerald-600 dark:text-emerald-400">
                        €
                        {valuedUnitPrice.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Identity & Classification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity Section */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    {t.secIdentity}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblLegacyCode}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.legacy_code || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblBarcodeEan}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white break-all">
                        {item.barcode_ean || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblManufacturerArticle}
                      </span>
                      <span className="font-mono font-light text-slate-700 dark:text-slate-300">
                        {item.manufacturer_article || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblItemId}
                      </span>
                      <span className="font-mono font-light text-[11px] text-slate-500 break-all">
                        {item.item_id}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblNameTr}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.item_name_tr}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblNameEn}
                      </span>
                      <span className="font-light text-slate-700 dark:text-slate-300">
                        {item.item_name_en || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Classification Section */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    {t.secClassification}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblProductDomain}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white break-words">
                        {item.product_domain || 'CONSTRUCTION_MATERIALS'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblDepotId}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {balance?.depot_id || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblCategory}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.category || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblSubcategory}
                      </span>
                      <span className="font-light text-slate-700 dark:text-slate-300">
                        {item.subcategory || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblLifecycleStatus}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.lifecycle_status || 'ACTIVE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblLastScanned}
                      </span>
                      <span className="font-light text-slate-500">
                        {balance?.last_scanned_at
                          ? new Date(balance.last_scanned_at).toLocaleString(
                              lang === 'tr' ? 'tr-TR' : 'en-US'
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Commercial Section */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    {t.secCommercial}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblBaseCostEur}
                      </span>
                      <span className="font-light text-slate-900 dark:text-white">
                        €
                        {baseCost.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblSourcePrice} ({item.source_currency || 'EUR'})
                      </span>
                      <span className="font-light text-slate-700 dark:text-slate-300">
                        {item.source_unit_price !== null &&
                        item.source_unit_price !== undefined
                          ? `${item.source_unit_price} ${
                              item.source_currency || 'EUR'
                            }`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblMarkupPct}
                      </span>
                      <span className="font-light text-slate-700 dark:text-slate-300">
                        %{markup}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblBrandModel}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.brand_model || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblSupplierName}
                      </span>
                      <span className="font-light text-slate-800 dark:text-slate-200">
                        {item.supplier_name || '—'}
                      </span>
                    </div>
                    {item.product_url && (
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {t.lblProductUrl}
                        </span>
                        <a
                          href={item.product_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all font-light"
                        >
                          {item.product_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Packaging & Tracking Section */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    {t.secPackaging}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblUnitOfMeasure}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.unit_of_measure || 'adet'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblPackagingType}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.packaging_unit_type || 'SINGLE_ITEM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblSetPieceCount}
                      </span>
                      <span className="font-light text-slate-700 dark:text-slate-300">
                        {item.set_piece_count || 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblTrackableAsset}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.is_trackable_asset
                          ? lang === 'tr'
                            ? 'EVET (Seri No Takibi)'
                            : 'YES (Serialized)'
                          : lang === 'tr'
                          ? 'HAYIR'
                          : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        {t.lblRecordStatus}
                      </span>
                      <span className="font-bold uppercase text-slate-700 dark:text-slate-300">
                        {item.record_status} / {item.review_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Specification, Notes & Structured Attributes (Read-Only) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  {t.secSpecs}
                </h3>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                    {t.lblSpecification}
                  </span>
                  <p className="font-light text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {item.specification || '—'}
                  </p>
                </div>
                {item.attributes && Object.keys(item.attributes).length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      {t.lblAttributes}
                    </span>
                    <AttributesEditor
                      value={item.attributes}
                      onChange={() => {}}
                      productDomain={item.product_domain || undefined}
                      readOnly
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1 (EDIT MODE — STRICTLY TIERS 0, 1, 2) */}
          {activeTab === 'RECORD' && isEditing && canEditCatalog && (
            <form onSubmit={handleRequestSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblLegacyCode}
                  </label>
                  <input
                    type="text"
                    value={formLegacyCode}
                    onChange={(e) => setFormLegacyCode(e.target.value)}
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblBarcodeEan}
                  </label>
                  <input
                    type="text"
                    value={formBarcodeEan}
                    onChange={(e) => setFormBarcodeEan(e.target.value)}
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblManufacturerArticle}
                  </label>
                  <input
                    type="text"
                    value={formManufacturerArticle}
                    onChange={(e) => setFormManufacturerArticle(e.target.value)}
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblNameTr} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNameTr}
                    onChange={(e) => setFormNameTr(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblNameEn}
                  </label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblProductDomain}
                  </label>
                  <select
                    value={formProductDomain}
                    onChange={(e) => setFormProductDomain(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    <option value="CONSTRUCTION_MATERIALS">
                      CONSTRUCTION_MATERIALS
                    </option>
                    <option value="FURNISHING_AND_EQUIPMENT">
                      FURNISHING_AND_EQUIPMENT
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblDepotId}
                  </label>
                  <select
                    value={formDepotId}
                    onChange={(e) => setFormDepotId(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    {depotLocations.map((dl) => (
                      <option key={dl.depot_id} value={dl.depot_id}>
                        {dl.depot_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblCategory}
                  </label>
                  <input
                    type="text"
                    list="catalog-categories-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                  <datalist id="catalog-categories-list">
                    {availableCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSubcategory}
                  </label>
                  <input
                    type="text"
                    value={formSubcategory}
                    onChange={(e) => setFormSubcategory(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblBaseCostEur}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBaseCostEur}
                    onChange={(e) => setFormBaseCostEur(Number(e.target.value))}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSourcePrice}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSourcePrice}
                    onChange={(e) => setFormSourcePrice(Number(e.target.value))}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSourceCurrency}
                  </label>
                  <select
                    value={formSourceCurrency}
                    onChange={(e) => setFormSourceCurrency(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblMarkupPct}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formMarkupPct}
                    onChange={(e) => setFormMarkupPct(Number(e.target.value))}
                    className={CONTROL_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSupplierName}
                  </label>
                  <input
                    type="text"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblBrandModel}
                  </label>
                  <input
                    type="text"
                    value={formBrandModel}
                    onChange={(e) => setFormBrandModel(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblProductUrl}
                  </label>
                  <input
                    type="text"
                    value={formProductUrl}
                    onChange={(e) => setFormProductUrl(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblUnitOfMeasure}
                  </label>
                  <input
                    type="text"
                    value={formUnitOfMeasure}
                    onChange={(e) => setFormUnitOfMeasure(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblPackagingType}
                  </label>
                  <select
                    value={formPackagingType}
                    onChange={(e) =>
                      setFormPackagingType(e.target.value as PackagingUnitType)
                    }
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    <option value="SINGLE_ITEM">SINGLE_ITEM</option>
                    <option value="ATOMIC_SET">ATOMIC_SET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSetPieceCount}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formSetPieceCount}
                    onChange={(e) =>
                      setFormSetPieceCount(Number(e.target.value))
                    }
                    className={CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblMinThreshold}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formMinThreshold}
                    onChange={(e) =>
                      setFormMinThreshold(Number(e.target.value))
                    }
                    className={CONTROL_CLASS}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblLifecycleStatus}
                  </label>
                  <input
                    type="text"
                    value={formLifecycleStatus}
                    onChange={(e) => setFormLifecycleStatus(e.target.value)}
                    className={CONTROL_CLASS}
                  />
                </div>
              </div>

              {/* Compact Inline Toolbar Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsTrackableAsset}
                    onChange={(e) => setFormIsTrackableAsset(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t.lblTrackableAsset}
                  </span>
                </label>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {t.lblRecordStatus}:
                  </span>
                  <select
                    value={formRecordStatus}
                    onChange={(e) => setFormRecordStatus(e.target.value)}
                    className="min-h-[40px] px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {t.lblSpecification}
                </label>
                <textarea
                  rows={2}
                  value={formSpecification}
                  onChange={(e) => setFormSpecification(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                  {t.lblAttributes}
                </label>
                <AttributesEditor
                  key={`${item.item_id}-edit`}
                  value={formAttributes}
                  onChange={setFormAttributes}
                  productDomain={formProductDomain}
                  lang={lang}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setShowConfirmPrompt(false);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {t.btnSaveChanges}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ITEM MOVEMENT & SERIALIZED ASSET HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-6 text-xs">
              {/* Transactions History Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.historyTransactions} ({itemTransactions.length})
                </h3>
                {itemTransactions.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 font-light">
                    {t.noHistoryTx}
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto touch-scroll-x rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400">
                        <tr>
                          <th className="px-3.5 py-2.5">{td.thTxCode}</th>
                          <th className="px-3.5 py-2.5">{td.thTarget}</th>
                          <th className="px-3.5 py-2.5 text-right">
                            {td.lblQuantity}
                          </th>
                          <th className="px-3.5 py-2.5 text-right">
                            {td.thValuedCost}
                          </th>
                          <th className="px-3.5 py-2.5">{td.thDocs}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {itemTransactions.map((tx) => {
                          const isOut =
                            tx.movement_type === 'OUTBOUND_HANDOVER';
                          return (
                            <tr key={tx.transaction_id}>
                              <td className="px-3.5 py-2.5">
                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                  {tx.transaction_code}
                                </div>
                                <div className="text-[10px] font-light text-slate-400">
                                  {tx.created_at
                                    ? new Date(tx.created_at).toLocaleString(
                                        lang === 'tr' ? 'tr-TR' : 'en-US'
                                      )
                                    : '—'}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 font-light text-slate-700 dark:text-slate-300">
                                {isOut
                                  ? `${tx.target_building_id || '—'} ${
                                      tx.target_unit_label
                                        ? `• ${tx.target_unit_label}`
                                        : ''
                                    }`
                                  : tx.supplier_name || tx.depot_id}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-light">
                                <span
                                  className={
                                    isOut
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }
                                >
                                  {isOut ? '-' : '+'}
                                  {tx.quantity} {item.unit_of_measure}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-light text-slate-800 dark:text-slate-200">
                                €
                                {Number(
                                  tx.final_valued_cost_eur || 0
                                ).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-[11px] font-light text-slate-500">
                                {tx.irsaliye_number || td.docMissing} /{' '}
                                {tx.invoice_number || td.docMissing}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Serialized Assets History Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.historyAssets} ({itemAssets.length})
                </h3>
                {itemAssets.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 font-light">
                    {t.noHistoryAssets}
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto touch-scroll-x rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400">
                        <tr>
                          <th className="px-3.5 py-2.5">{td.thAssetTag}</th>
                          <th className="px-3.5 py-2.5">{td.thSerial}</th>
                          <th className="px-3.5 py-2.5">{td.thCustody}</th>
                          <th className="px-3.5 py-2.5">{td.thLocation}</th>
                          <th className="px-3.5 py-2.5">{td.thWarranty}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {itemAssets.map((ast) => (
                          <tr key={ast.asset_id}>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {ast.asset_tag}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-light text-slate-900 dark:text-white">
                              {ast.serial_number}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                              {ast.custody_status}
                            </td>
                            <td className="px-3.5 py-2.5 font-light text-slate-600 dark:text-slate-400">
                              {ast.deployed_building_id
                                ? `${ast.deployed_building_id} ${
                                    ast.deployed_unit_label
                                      ? `• ${ast.deployed_unit_label}`
                                      : ''
                                  }`
                                : ast.current_depot_id}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-light text-slate-500">
                              {ast.warranty_expiry_date || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Modal Footer with Safe-Area Padding */}
        <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] font-mono font-light text-slate-400 truncate">
            {balance?.depot_id || 'DEPOT'} • {item.item_id}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsLightboxOpen(false);
              setIsUploadModalOpen(false);
              onClose();
            }}
            className="min-h-[40px] px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            {tc.close}
          </button>
        </div>
      </div>

      {/* Multi-Source Upload Modal / Bottom Sheet */}
      <ItemMediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        catalogItemId={item.item_id}
        itemTitle={itemDisplayTitle}
        existingCount={albumMedia.length}
        currentRole={currentRole}
        lang={lang}
        onUploaded={(updatedAlbum, primaryUrl) => {
          void handleAlbumUpdated(updatedAlbum, primaryUrl);
        }}
      />

      {/* Fullscreen Click-to-Zoom Lightbox */}
      {isLightboxOpen && displayImageUrl && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in"
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-3">
            <div className="min-w-0 pr-4">
              <span className="text-xs font-mono font-bold text-blue-400 mr-2">
                {item.legacy_code}
              </span>
              <span className="text-sm font-bold truncate">
                {itemDisplayTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer shrink-0"
            >
              ✕ {tc.close}
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[75dvh] flex items-center justify-center"
          >
            <img
              src={displayImageUrl}
              alt={itemDisplayTitle}
              className="max-w-full max-h-[75dvh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          {albumMedia.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full pb-1"
            >
              {albumMedia.map((m) => (
                <button
                  key={`lb-${m.id}`}
                  type="button"
                  onClick={() => setSelectedMediaId(m.id)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeMediaItem?.id === m.id
                      ? 'border-blue-500 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={m.public_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
