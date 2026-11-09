'use client';

import React, { useState } from 'react';
import { MaterialItem } from '@/types/requisition';

interface MaterialCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  lang: 'tr' | 'en';
}

export const MaterialCatalogModal: React.FC<MaterialCatalogModalProps> = ({
  isOpen,
  onClose,
  materials,
  lang,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const isTR = lang === 'tr';

  const filtered = materials.filter((m) => {
    const term = search.toLowerCase();
    const name = (isTR ? m.item_name_tr : (m.item_name_en || m.item_name_tr)).toLowerCase();
    const code = (m.item_id || '').toLowerCase();
    const category = (m.category || '').toLowerCase();
    return name.includes(term) || code.includes(term) || category.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-elevation-dark shadow-2xl overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-border-dark bg-slate-50/70 dark:bg-canvas-dark/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">📦</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-amber-400">
                {isTR ? 'Malzeme Kataloğu' : 'Material Catalog'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-subtext-dark">
                {isTR ? 'Sistem Birim Fiyat ve Katsayı Listesi (Salt Okunur)' : 'Standard Unit Cost & Consumption Reference (Read-Only)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-elevation-dark">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTR ? 'Katalogda ara (Kod, İsim, Kategori)...' : 'Search catalog (Code, Name, Category)...'}
            className="w-full rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-canvas-dark px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-border-dark text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-subtext-dark">
                <th className="py-2.5 px-3">{isTR ? 'Kod' : 'Code'}</th>
                <th className="py-2.5 px-3">{isTR ? 'Malzeme Adı' : 'Material Name'}</th>
                <th className="py-2.5 px-3">{isTR ? 'Kategori' : 'Category'}</th>
                <th className="py-2.5 px-3 text-center">{isTR ? 'Birim' : 'Unit'}</th>
                <th className="py-2.5 px-3 text-right">{isTR ? 'Birim Fiyat' : 'Base Cost'}</th>
                <th className="py-2.5 px-3 text-right">{isTR ? 'Tüketim Katsayısı' : 'Consumption Rate'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border-dark/60 font-light tracking-wide">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    {isTR ? 'Sonuç bulunamadı.' : 'No materials found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.item_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors font-sans">
                    <td className="py-3 px-3 font-bold tracking-wide text-amber-600 dark:text-amber-400">
                      {item.item_id}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {isTR ? item.item_name_tr : (item.item_name_en || item.item_name_tr)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {item.category || (isTR ? 'Yapısal' : 'Structural')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-subtext-dark">
                      {item.unit_of_measure}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tracking-wide text-slate-900 dark:text-slate-100">
                      €{Number(item.base_cost_eur).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-light tracking-wide text-slate-600 dark:text-subtext-dark">
                      {item.consumption_rate} {item.consumption_metric || ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-border-dark bg-slate-50/70 dark:bg-canvas-dark/50 flex justify-between items-center text-[11px] text-slate-500">
          <span>{filtered.length} {isTR ? 'kayıt listelendi' : 'items displayed'}</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            {isTR ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialCatalogModal;
