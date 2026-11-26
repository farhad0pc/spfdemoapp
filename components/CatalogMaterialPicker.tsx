'use client';

import React, { useState, useMemo } from 'react';
import { InventoryCatalogItem } from '@/types/requisition';
import { DICTIONARY, Language } from '@/lib/i18n';

export type CatalogDomainFilter =
  | 'CONSTRUCTION_MATERIALS'
  | 'FURNISHING_AND_EQUIPMENT'
  | 'ALL';

interface CatalogMaterialPickerProps {
  items: InventoryCatalogItem[];
  selectedItemId: string;
  onSelect: (item: InventoryCatalogItem) => void;
  onClearSelection?: () => void;
  onOpenDepot?: () => void;
  lang: Language;
  defaultDomain?: CatalogDomainFilter;
}

function normalizeItemDomain(
  item: InventoryCatalogItem
): 'CONSTRUCTION_MATERIALS' | 'FURNISHING_AND_EQUIPMENT' {
  if (item.product_domain === 'FURNISHING_AND_EQUIPMENT') {
    return 'FURNISHING_AND_EQUIPMENT';
  }
  return 'CONSTRUCTION_MATERIALS';
}

function toTurkishLower(val: string | null | undefined): string {
  if (!val) return '';
  return val.toLocaleLowerCase('tr-TR');
}

export default function CatalogMaterialPicker({
  items,
  selectedItemId,
  onSelect,
  onClearSelection,
  onOpenDepot,
  lang,
  defaultDomain = 'CONSTRUCTION_MATERIALS',
}: CatalogMaterialPickerProps) {
  const tc = DICTIONARY[lang].catalogPicker;

  const [activeDomain, setActiveDomain] =
    useState<CatalogDomainFilter>(defaultDomain);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live SKU counts per domain
  const domainCounts = useMemo(() => {
    let construction = 0;
    let furnishing = 0;
    for (const item of items) {
      if (normalizeItemDomain(item) === 'FURNISHING_AND_EQUIPMENT') {
        furnishing += 1;
      } else {
        construction += 1;
      }
    }
    return {
      CONSTRUCTION_MATERIALS: construction,
      FURNISHING_AND_EQUIPMENT: furnishing,
      ALL: items.length,
    };
  }, [items]);

  // Filter items by selected product_domain
  const domainFilteredItems = useMemo(() => {
    if (activeDomain === 'ALL') return items;
    return items.filter((item) => normalizeItemDomain(item) === activeDomain);
  }, [items, activeDomain]);

  // Distinct categories within the active domain with counts
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of domainFilteredItems) {
      const cat = (item.category && item.category.trim()) || tc.uncategorized;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, lang === 'tr' ? 'tr' : 'en'));
  }, [domainFilteredItems, tc.uncategorized, lang]);

  // Ensure selectedCategory remains valid when switching domain
  const effectiveCategory = useMemo(() => {
    if (selectedCategory === 'ALL') return 'ALL';
    const exists = categoryOptions.some((c) => c.name === selectedCategory);
    return exists ? selectedCategory : 'ALL';
  }, [selectedCategory, categoryOptions]);

  // Filter by category and Turkish-locale search query
  const filteredItems = useMemo(() => {
    const normQuery = toTurkishLower(searchQuery.trim());

    return domainFilteredItems.filter((item) => {
      const itemCat =
        (item.category && item.category.trim()) || tc.uncategorized;
      if (effectiveCategory !== 'ALL' && itemCat !== effectiveCategory) {
        return false;
      }

      if (!normQuery) return true;

      const haystack = [
        item.legacy_code,
        item.item_name_tr,
        item.item_name_en,
        item.specification,
        item.brand_model,
        item.barcode_ean,
        item.category,
        item.subcategory,
      ]
        .map((field) => toTurkishLower(field))
        .join(' ');

      return haystack.includes(normQuery);
    });
  }, [domainFilteredItems, effectiveCategory, searchQuery, tc.uncategorized]);

  // Group filtered items by category for sticky header rendering
  const groupedItems = useMemo(() => {
    const groups = new Map<string, InventoryCatalogItem[]>();
    for (const item of filteredItems) {
      const cat = (item.category && item.category.trim()) || tc.uncategorized;
      const list = groups.get(cat);
      if (list) {
        list.push(item);
      } else {
        groups.set(cat, [item]);
      }
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], lang === 'tr' ? 'tr' : 'en')
    );
  }, [filteredItems, tc.uncategorized, lang]);

  const selectedItem = useMemo(
    () => items.find((i) => i.item_id === selectedItemId),
    [items, selectedItemId]
  );

  return (
    <div className="space-y-3">
      {/* 1. Selected Material Summary Card with Inline Clear (✕) Action */}
      <div
        className={`p-3 rounded-xl border transition-colors ${
          selectedItem
            ? 'bg-blue-50/70 dark:bg-blue-950/35 border-blue-300 dark:border-blue-800'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {tc.selectedSummaryLabel}
          </span>
          {selectedItem && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              title={tc.clearSelection}
              aria-label={tc.clearSelection}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <span>✕</span>
              <span>{tc.clearSelection}</span>
            </button>
          )}
        </div>
        {selectedItem ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center flex-wrap gap-2 min-w-0">
              {selectedItem.legacy_code && (
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold tracking-wide shrink-0">
                  {selectedItem.legacy_code}
                </span>
              )}
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words">
                {lang === 'tr'
                  ? selectedItem.item_name_tr
                  : selectedItem.item_name_en || selectedItem.item_name_tr}
              </span>
              {selectedItem.category && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-light bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {selectedItem.category}
                  {selectedItem.subcategory
                    ? ` • ${selectedItem.subcategory}`
                    : ''}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-xs shrink-0">
              <span className="font-light text-slate-600 dark:text-slate-300">
                {tc.unitCostLabel}{' '}
                <strong className="font-bold text-slate-900 dark:text-white">
                  €{Number(selectedItem.base_cost_eur || 0).toFixed(2)}
                </strong>{' '}
                / {selectedItem.unit_of_measure || 'unit'}
              </span>
              <span className="font-light text-slate-500 dark:text-slate-400">
                {tc.rateLabel}{' '}
                <strong className="font-bold text-blue-600 dark:text-blue-400">
                  {Number(selectedItem.consumption_rate || 1).toFixed(2)}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs font-light text-slate-500 dark:text-slate-400">
            {tc.notSelectedYet}
          </p>
        )}
      </div>

      {/* 2. Full-Title Center-Aligned Domain Containers (Zero Truncation in EN & TR) */}
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
        {(
          [
            {
              key: 'CONSTRUCTION_MATERIALS' as const,
              label: tc.domainConstruction,
              count: domainCounts.CONSTRUCTION_MATERIALS,
            },
            {
              key: 'FURNISHING_AND_EQUIPMENT' as const,
              label: tc.domainFurnishing,
              count: domainCounts.FURNISHING_AND_EQUIPMENT,
            },
            {
              key: 'ALL' as const,
              label: tc.domainAll,
              count: domainCounts.ALL,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeDomain === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveDomain(tab.key);
                setSelectedCategory('ALL');
              }}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-center border transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="whitespace-normal leading-tight">
                {tab.label}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Category Dropdown (h-10 + Inline ✕ Reset) & Turkish-Locale Search Bar (h-10 + Inline ✕ Clear) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-5 flex items-center gap-1.5">
          <select
            value={effectiveCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">
              {tc.allCategories} ({domainFilteredItems.length})
            </option>
            {categoryOptions.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
          {effectiveCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              title={tc.clearSelection}
              aria-label={tc.clearSelection}
              className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sm:col-span-7 flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tc.searchPlaceholder}
              className="w-full h-10 pl-3.5 pr-9 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title={tc.clearSearch}
                aria-label={tc.clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-xs font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Result Count Telemetry Bar + Direct Jump Button to Depot & Catalog */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-light text-slate-500 dark:text-slate-400 px-1">
        <span>
          {tc.showingCount(filteredItems.length, domainFilteredItems.length)}
        </span>
        {onOpenDepot && (
          <button
            type="button"
            onClick={onOpenDepot}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span>{tc.openDepotCatalog} →</span>
          </button>
        )}
      </div>

      {/* 5. Categorized Scrollable Selection List (max-h-72 overflow-y-auto) */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 divide-y divide-slate-100 dark:divide-slate-800/70">
        {groupedItems.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs font-light text-slate-500 dark:text-slate-400">
            {tc.emptyNoMatch}
          </div>
        ) : (
          groupedItems.map(([categoryName, catItems]) => (
            <div key={categoryName}>
              {/* Sticky Category Header */}
              <div className="sticky top-0 z-10 px-3.5 py-1.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {categoryName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {catItems.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {catItems.map((item) => {
                  const isSelected = item.item_id === selectedItemId;
                  const displayName =
                    lang === 'tr'
                      ? item.item_name_tr
                      : item.item_name_en || item.item_name_tr;
                  const unitCost = Number(item.base_cost_eur || 0).toFixed(2);
                  const rate = Number(item.consumption_rate || 1).toFixed(2);

                  return (
                    <button
                      key={item.item_id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className={`w-full px-3.5 py-2.5 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center flex-wrap gap-2">
                          {item.legacy_code && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.legacy_code}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {displayName}
                          </span>
                          {item.subcategory && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-light bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                              {item.subcategory}
                            </span>
                          )}
                        </div>
                        {(item.specification || item.brand_model) && (
                          <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 truncate">
                            {[item.brand_model, item.specification]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {item.unit_of_measure || 'unit'}
                        </span>
                        <span className="font-light text-slate-600 dark:text-slate-300">
                          €{unitCost}
                        </span>
                        <span className="font-light text-slate-400 dark:text-slate-500">
                          ×{rate}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
