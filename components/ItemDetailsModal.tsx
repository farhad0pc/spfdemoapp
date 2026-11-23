'use client';

import React, { useState, useMemo } from 'react';
import {
  InventoryCatalogItem,
  DepotStockBalance,
  DepotTransaction,
  AssetRegisterItem,
  DepotLocation,
  RoleTier,
  PackagingUnitType,
} from '@/types/requisition';
import { DICTIONARY } from '@/lib/i18n';

const TIER_0_TO_2_EDIT_ROLES: RoleTier[] = [
  'SYSTEM_ADMIN',
  'EXECUTIVE',
  'TECH_OFFICE_MANAGER',
  'DEPOT_MANAGER',
];

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

  const canEditCatalog = TIER_0_TO_2_EDIT_ROLES.includes(currentRole);

  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const [formAttributesJson, setFormAttributesJson] = useState<string>('');

  const itemTransactions = useMemo(() => {
    if (!item) return [];
    return transactions.filter((tx) => tx.catalog_item_id === item.item_id);
  }, [transactions, item]);

  const itemAssets = useMemo(() => {
    if (!item) return [];
    return assets.filter((a) => a.catalog_item_id === item.item_id);
  }, [assets, item]);

  if (!isOpen || !item) return null;

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
    setFormDepotId(balance?.depot_id || depotLocations[0]?.depot_id || 'DEPOT-PRJ02-MAIN');
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
    setFormAttributesJson(
      item.attributes ? JSON.stringify(item.attributes, null, 2) : ''
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

    let parsedAttributes: Record<string, unknown> | null = null;
    if (formAttributesJson.trim()) {
      try {
        parsedAttributes = JSON.parse(formAttributesJson.trim()) as Record<
          string,
          unknown
        >;
      } catch {
        setErrorMessage(
          lang === 'tr'
            ? 'Ek Nitelikler (JSON) formatı geçersiz.'
            : 'Attributes JSON format is invalid.'
        );
        setSaving(false);
        setShowConfirmPrompt(false);
        return;
      }
    }

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
          attributes: parsedAttributes,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
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
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-1">
              {lang === 'tr'
                ? item.item_name_tr
                : item.item_name_en || item.item_name_tr}
            </h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Strictly Tier 0, 1, or 2 Edit Button */}
            {canEditCatalog && activeTab === 'RECORD' && !isEditing && (
              <button
                type="button"
                onClick={enterEditMode}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                {t.btnCancelEdit}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex space-x-2 bg-white dark:bg-[#0f172a]">
          <button
            type="button"
            onClick={() => setActiveTab('RECORD')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
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
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.tabHistory} ({itemTransactions.length + itemAssets.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
              {errorMessage}
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
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmPrompt(false)}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {tc.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {saving ? tc.saving : t.btnConfirmSave}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: FULL DATABASE RECORD (READ OR EDIT) */}
          {activeTab === 'RECORD' && !isEditing && (
            <div className="space-y-5 text-xs select-text">
              {/* 1. Live Stock Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {t.lblQtyOnHand}
                  </span>
                  <span className="text-lg font-light text-slate-900 dark:text-white">
                    {qtyOnHand}{' '}
                    <span className="text-xs text-slate-400">
                      {item.unit_of_measure}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {t.lblQtyReserved}
                  </span>
                  <span className="text-lg font-light text-amber-600 dark:text-amber-400">
                    {qtyReserved}{' '}
                    <span className="text-xs text-slate-400">
                      {item.unit_of_measure}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {t.lblMinThreshold}
                  </span>
                  <span className="text-lg font-light text-slate-700 dark:text-slate-300">
                    {minThreshold}{' '}
                    <span className="text-xs text-slate-400">
                      {item.unit_of_measure}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {t.lblValuedPriceEur}
                  </span>
                  <span className="text-lg font-light text-emerald-600 dark:text-emerald-400">
                    €
                    {valuedUnitPrice.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
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
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
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
                      <span className="font-bold text-slate-900 dark:text-white">
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

              {/* 3. Specification, Notes & Attributes */}
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      {t.lblAttributes}
                    </span>
                    <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {JSON.stringify(item.attributes, null, 2)}
                    </pre>
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
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-mono font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblSourceCurrency}
                  </label>
                  <select
                    value={formSourceCurrency}
                    onChange={(e) => setFormSourceCurrency(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                    className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {t.lblLifecycleStatus}
                  </label>
                  <input
                    type="text"
                    value={formLifecycleStatus}
                    onChange={(e) => setFormLifecycleStatus(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
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
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  {t.lblAttributes}
                </label>
                <textarea
                  rows={3}
                  value={formAttributesJson}
                  onChange={(e) => setFormAttributesJson(e.target.value)}
                  placeholder='{"dimensions": "120x60cm"}'
                  className="w-full px-3 py-2 font-mono text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setShowConfirmPrompt(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
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
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
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
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
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

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-[10px] font-mono font-light text-slate-400">
            {balance?.depot_id || 'DEPOT'} • {item.item_id}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {tc.close}
          </button>
        </div>
      </div>
    </div>
  );
}
