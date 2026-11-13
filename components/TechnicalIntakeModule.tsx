'use client';

import React, { useState } from 'react';
import { InventoryCatalogItem, RoleTier } from '@/types/requisition';

interface TechnicalIntakeModuleProps {
  onBack: () => void;
  onSubmitTicket: (payload: {
    location_block_id: string;
    catalog_item_id: string;
    target_volume: number;
    calculated_qty: number;
    tech_approved_budget_eur: number;
    custom_technical_specs: Record<string, unknown>;
  }) => Promise<void>;
  catalogItems: InventoryCatalogItem[];
  userRole: RoleTier;
  lang: 'tr' | 'en';
}

export default function TechnicalIntakeModule({
  onBack,
  onSubmitTicket,
  catalogItems,
  userRole,
  lang,
}: TechnicalIntakeModuleProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [locationBlock, setLocationBlock] = useState<string>('');
  const [targetVolume, setTargetVolume] = useState<number>(100);
  const [brandPreference, setBrandPreference] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const t = {
    back: lang === 'tr' ? '← Genel Bakışa Dön' : '← Back to Workspace',
    title: lang === 'tr' ? 'Teknik Ofis Malzeme ve Bütçe Hesaplama Motoru' : 'Technical Office Material & Budget Intake Engine',
    authority: lang === 'tr' ? 'Yetki Seviyesi:' : 'Authority Tier:',
    section1: lang === 'tr' ? '1. Proje ve Malzeme Tanımı' : '1. Project & Material Definition',
    locLabel: lang === 'tr' ? 'Lokasyon / Blok ID' : 'Location / Block ID',
    locPlaceholder: lang === 'tr' ? 'Örn: ZENO - Kat 3' : 'e.g. ZENO - Floor 3',
    matLabel: lang === 'tr' ? 'Katalog Malzemesi Seçin' : 'Select Catalog Material',
    matPlaceholder: lang === 'tr' ? 'Malzeme Listesinden Seçin...' : 'Select from Catalog...',
    volumeLabel: lang === 'tr' ? 'Hedef İmalat Hacmi / Alanı' : 'Target Execution Volume / Area',
    metricInfo: lang === 'tr' ? 'Hesaplama katsayı metriği:' : 'Consumption calculation metric:',
    brandLabel: lang === 'tr' ? 'Marka Kısıtı / Şartname Tercihi' : 'Brand Preference / Specification',
    brandPlaceholder: lang === 'tr' ? 'Örn: Sika, Knauf veya muadili' : 'e.g. Sika, Knauf or equivalent',
    notesLabel: lang === 'tr' ? 'Satın Alma Ofisine Teknik Notlar' : 'Technical Specifications & Purchasing Notes',
    notesPlaceholder: lang === 'tr' ? 'Tolerans oranları, saha koşulları ve özel lojistik gereksinimler...' : 'Tolerance thresholds, site constraints, delivery notes...',
    section2: lang === 'tr' ? '2. Otomatik Hesaplama & Bütçe Kilidi' : '2. Algorithmic Quota & Budget Lock',
    selMat: lang === 'tr' ? 'Seçilen Malzeme:' : 'Selected Material:',
    stdRate: lang === 'tr' ? 'Standart Tüketim Katsayısı:' : 'Consumption Rate Coefficient:',
    calcQty: lang === 'tr' ? 'Hesaplanan İhtiyaç Miktarı:' : 'Predicted Material Quantity:',
    refCost: lang === 'tr' ? 'Birim Referans Maliyet:' : 'Base Reference Cost:',
    lockTitle: lang === 'tr' ? 'Teknik Onaylı Bütçe Limiti' : 'Technical Approved Budget Ceiling',
    lockDesc: lang === 'tr' ? 'Satın almaya iletilecek tavan bütçe (No-backloop)' : 'Locked ceiling for purchasing (No-backloop)',
    submitBtn: lang === 'tr' ? 'Talebi Resmileştir ve Satın Almaya İlet →' : 'Ratify Requisition & Handover to Sourcing →',
    saving: lang === 'tr' ? 'Talep Kaydediliyor...' : 'Submitting Requisition...',
    alertMissing: lang === 'tr' ? 'Lütfen blok ve malzeme seçimini tamamlayınız.' : 'Please enter block and select a catalog material.',
  };

  const selectedItem = catalogItems.find((i) => i.item_id === selectedItemId);
  const consumptionRate = selectedItem?.consumption_rate ? Number(selectedItem.consumption_rate) : 1;
  const calculatedQty = Number((targetVolume * consumptionRate).toFixed(2));
  const baseCost = selectedItem?.base_cost_eur ? Number(selectedItem.base_cost_eur) : 0;
  const calculatedBudget = Number((calculatedQty * baseCost).toFixed(2));

  const handleGenerateTicket = async () => {
    if (!selectedItemId || !locationBlock) {
      alert(t.alertMissing);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitTicket({
        location_block_id: locationBlock,
        catalog_item_id: selectedItemId,
        target_volume: targetVolume,
        calculated_qty: calculatedQty,
        tech_approved_budget_eur: calculatedBudget,
        custom_technical_specs: {
          brand_preference: brandPreference,
          special_notes: specialNotes,
          consumption_metric: selectedItem?.consumption_metric || 'std_unit',
          unit_of_measure: selectedItem?.unit_of_measure || 'units',
        },
      });
      onBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      alert('Error: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 p-6 font-sans transition-colors">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs transition-colors"
          >
            <span>{t.back}</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {t.title}
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
          <span>{t.authority}</span>
          <span>{userRole}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            {t.section1}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.locLabel}
              </label>
              <input
                type="text"
                placeholder={t.locPlaceholder}
                value={locationBlock}
                onChange={(e) => setLocationBlock(e.target.value)}
                className="w-full text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.matLabel}
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t.matPlaceholder}</option>
                {catalogItems.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.legacy_code ? `[${item.legacy_code}] ` : ''}
                    {lang === 'tr' ? item.item_name_tr : (item.item_name_en || item.item_name_tr)} ({item.unit_of_measure})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.volumeLabel}
              </label>
              <input
                type="number"
                min="1"
                value={targetVolume}
                onChange={(e) => setTargetVolume(Number(e.target.value))}
                className="w-full text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 font-light mt-1 block">
                {t.metricInfo} {selectedItem?.consumption_metric || 'Standard'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.brandLabel}
              </label>
              <input
                type="text"
                placeholder={t.brandPlaceholder}
                value={brandPreference}
                onChange={(e) => setBrandPreference(e.target.value)}
                className="w-full text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.notesLabel}
            </label>
            <textarea
              rows={3}
              placeholder={t.notesPlaceholder}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              {t.section2}
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">{t.selMat}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedItem ? (lang === 'tr' ? selectedItem.item_name_tr : (selectedItem.item_name_en || selectedItem.item_name_tr)) : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">{t.stdRate}</span>
                <span className="text-xs font-light text-slate-900 dark:text-white">
                  {selectedItem?.consumption_rate ? `${selectedItem.consumption_rate} (${selectedItem.consumption_metric})` : '1.00'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">{t.calcQty}</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {calculatedQty.toLocaleString()} {selectedItem?.unit_of_measure || 'units'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">{t.refCost}</span>
                <span className="text-xs font-light text-slate-900 dark:text-white">
                  €{baseCost.toFixed(2)} / {selectedItem?.unit_of_measure || 'unit'}
                </span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    {t.lockTitle}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-light">
                    {t.lockDesc}
                  </span>
                </div>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  €{calculatedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerateTicket}
              disabled={submitting || !selectedItemId || !locationBlock}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              {submitting ? t.saving : t.submitBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
