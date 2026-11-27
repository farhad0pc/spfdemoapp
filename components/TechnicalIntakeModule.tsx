'use client';

import React, { useState, useMemo } from 'react';
import {
  InventoryCatalogItem,
  RoleTier,
  PortfolioProject,
  PortfolioBuilding,
} from '@/types/requisition';
import { DICTIONARY } from '@/lib/i18n';
import CatalogMaterialPicker from '@/components/CatalogMaterialPicker';

interface TechnicalIntakeModuleProps {
  onBack: () => void;
  onOpenDepot?: () => void;
  onSubmitTicket: (payload: {
    location_block_id: string;
    catalog_item_id: string;
    target_volume: number;
    calculated_qty: number;
    tech_approved_budget_eur: number;
    custom_technical_specs: Record<string, unknown>;
  }) => Promise<void>;
  catalogItems: InventoryCatalogItem[];
  portfolioProjects: PortfolioProject[];
  portfolioBuildings: PortfolioBuilding[];
  userRole: RoleTier;
  lang: 'tr' | 'en';
}

export default function TechnicalIntakeModule({
  onBack,
  onOpenDepot,
  onSubmitTicket,
  catalogItems,
  portfolioProjects,
  portfolioBuildings,
  userRole,
  lang,
}: TechnicalIntakeModuleProps) {
  const d = DICTIONARY[lang].intake;
  const tc = DICTIONARY[lang].catalogPicker;

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBuildingType, setSelectedBuildingType] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [targetVolume, setTargetVolume] = useState<number>(100);
  const [brandPreference, setBrandPreference] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tier 2: Extract distinct building types for selected project
  const availableBuildingTypes = useMemo(() => {
    if (!selectedProjectId) return [];
    const types = portfolioBuildings
      .filter((b) => b.project_id === selectedProjectId)
      .map((b) => b.building_type)
      .filter((t): t is string => Boolean(t));
    return Array.from(new Set(types)).sort();
  }, [selectedProjectId, portfolioBuildings]);

  // Tier 3: Extract matching buildings under project + building type
  const availableBuildings = useMemo(() => {
    if (!selectedProjectId || !selectedBuildingType) return [];
    return portfolioBuildings
      .filter(
        (b) =>
          b.project_id === selectedProjectId &&
          b.building_type === selectedBuildingType
      )
      .sort((a, b) => a.building_name.localeCompare(b.building_name));
  }, [selectedProjectId, selectedBuildingType, portfolioBuildings]);

  // Cascading changes & inline reset handlers
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBuildingType('');
    setSelectedBuildingId('');
  };

  const handleBuildingTypeChange = (buildingType: string) => {
    setSelectedBuildingType(buildingType);
    setSelectedBuildingId('');
  };

  const selectedProject = portfolioProjects.find(
    (p) => p.project_id === selectedProjectId
  );
  const selectedBuilding = portfolioBuildings.find(
    (b) => b.building_id === selectedBuildingId
  );
  const selectedItem = catalogItems.find((i) => i.item_id === selectedItemId);

  const consumptionRate = selectedItem?.consumption_rate
    ? Number(selectedItem.consumption_rate)
    : 1;
  const calculatedQty = Number((targetVolume * consumptionRate).toFixed(2));
  const baseCost = selectedItem?.base_cost_eur
    ? Number(selectedItem.base_cost_eur)
    : 0;
  const calculatedBudget = Number((calculatedQty * baseCost).toFixed(2));

  const handleGenerateTicket = async () => {
    if (!selectedBuildingId || !selectedItemId) {
      alert(
        lang === 'tr'
          ? 'Lütfen proje, yapı türü, blok ve malzeme seçimini eksiksiz tamamlayınız.'
          : 'Please select project, building type, building/block, and catalog material.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitTicket({
        location_block_id: selectedBuildingId,
        catalog_item_id: selectedItemId,
        target_volume: targetVolume,
        calculated_qty: calculatedQty,
        tech_approved_budget_eur: calculatedBudget,
        custom_technical_specs: {
          brand_preference: brandPreference,
          special_notes: specialNotes,
          consumption_metric: selectedItem?.consumption_metric || 'std_unit',
          unit_of_measure: selectedItem?.unit_of_measure || 'units',
          project_id: selectedProjectId,
          project_name: selectedProject?.project_name,
          building_id: selectedBuildingId,
          building_name: selectedBuilding?.building_name,
          building_type: selectedBuildingType,
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
    <div className="w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 p-2 sm:p-6 font-sans transition-colors pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-5 mb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] h-11 sm:h-10 shrink-0 flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <span>{d.btnBack}</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
          <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase min-w-0 break-words leading-tight">
            {d.title}
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shrink-0">
          <span>{lang === 'tr' ? 'Yetki Seviyesi:' : 'Authority Tier:'}</span>
          <span className="font-mono">{userRole}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-6 min-w-0">
          {/* Section 1: 3-Tier Cascading Location Hierarchy (min-h-[44px] Touch Controls + Inline ✕ Reset Icons) */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              {d.step1Title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tier 1: Project Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {d.lblProject}
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full min-h-[44px] h-11 sm:h-10 text-xs font-bold px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {lang === 'tr' ? 'Proje Seçiniz...' : 'Select Project...'}
                    </option>
                    {portfolioProjects.map((prj) => (
                      <option key={prj.project_id} value={prj.project_id}>
                        {prj.project_id} — {prj.project_name}
                      </option>
                    ))}
                  </select>
                  {selectedProjectId && (
                    <button
                      type="button"
                      onClick={() => handleProjectChange('')}
                      title={tc.clearSelection}
                      aria-label={tc.clearSelection}
                      className="min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tier 2: Building Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {d.lblBuildingType}
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedBuildingType}
                    onChange={(e) => handleBuildingTypeChange(e.target.value)}
                    disabled={!selectedProjectId}
                    className="w-full min-h-[44px] h-11 sm:h-10 text-xs font-bold px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedProjectId
                        ? lang === 'tr'
                          ? 'Yapı Türü Seçiniz...'
                          : 'Select Type...'
                        : lang === 'tr'
                        ? 'Önce Proje Seçiniz...'
                        : 'Select Project First...'}
                    </option>
                    {availableBuildingTypes.map((bType) => (
                      <option key={bType} value={bType}>
                        {bType}
                      </option>
                    ))}
                  </select>
                  {selectedBuildingType && (
                    <button
                      type="button"
                      onClick={() => handleBuildingTypeChange('')}
                      title={tc.clearSelection}
                      aria-label={tc.clearSelection}
                      className="min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tier 3: Building / Block Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {d.lblBuilding}
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    disabled={!selectedBuildingType}
                    className="w-full min-h-[44px] h-11 sm:h-10 text-xs font-bold px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedBuildingType
                        ? lang === 'tr'
                          ? 'Blok / Yapı Seçiniz...'
                          : 'Select Building...'
                        : lang === 'tr'
                        ? 'Önce Yapı Türü Seçiniz...'
                        : 'Select Type First...'}
                    </option>
                    {availableBuildings.map((bld) => (
                      <option key={bld.building_id} value={bld.building_id}>
                        {bld.building_name}
                        {bld.category_name ? ` (${bld.category_name})` : ''}
                        {bld.overall_completion_pct !== null &&
                        bld.overall_completion_pct !== undefined
                          ? ` [${bld.overall_completion_pct}%]`
                          : ''}
                      </option>
                    ))}
                  </select>
                  {selectedBuildingId && (
                    <button
                      type="button"
                      onClick={() => setSelectedBuildingId('')}
                      title={tc.clearSelection}
                      aria-label={tc.clearSelection}
                      className="min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedBuilding && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="font-bold text-blue-700 dark:text-blue-400 break-words">
                    {selectedProject?.project_name} •{' '}
                    {selectedBuilding.building_name}
                  </span>
                  <span className="text-slate-400 font-light">•</span>
                  <span className="text-slate-600 dark:text-slate-400 font-light break-words">
                    {selectedBuilding.building_type}
                    {selectedBuilding.category_name
                      ? ` (${selectedBuilding.category_name})`
                      : ''}
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-bold shrink-0">
                  {selectedBuilding.building_id}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Categorized & Searchable Material Picker + Technical Specs */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              {d.step2Title}
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {d.lblMaterial}
              </label>
              <CatalogMaterialPicker
                items={catalogItems}
                selectedItemId={selectedItemId}
                onSelect={(item) => setSelectedItemId(item.item_id)}
                onClearSelection={() => setSelectedItemId('')}
                onOpenDepot={onOpenDepot}
                lang={lang}
                defaultDomain="CONSTRUCTION_MATERIALS"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {d.lblVolume}
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetVolume}
                  onChange={(e) => setTargetVolume(Number(e.target.value))}
                  className="w-full min-h-[44px] h-11 sm:h-10 text-xs font-light px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 font-light mt-1 block">
                  {lang === 'tr'
                    ? 'Hesaplama katsayı metriği:'
                    : 'Consumption calculation metric:'}{' '}
                  <span className="font-mono">
                    {selectedItem?.consumption_metric || 'Standard'}
                  </span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {d.lblBrand}
                </label>
                <input
                  type="text"
                  placeholder={
                    lang === 'tr'
                      ? 'Örn: Sika, Knauf veya muadili'
                      : 'e.g. Sika, Knauf or equivalent'
                  }
                  value={brandPreference}
                  onChange={(e) => setBrandPreference(e.target.value)}
                  className="w-full min-h-[44px] h-11 sm:h-10 text-xs font-light px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {d.lblNotes}
              </label>
              <textarea
                rows={3}
                placeholder={
                  lang === 'tr'
                    ? 'Tolerans oranları, saha koşulları ve özel lojistik gereksinimler...'
                    : 'Tolerance thresholds, site constraints, delivery notes...'
                }
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full text-xs font-light px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Summary & Algorithmic Lock Card */}
        <div className="lg:col-span-5 flex flex-col space-y-6 min-w-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              {d.step3Title}
            </h2>

            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-2 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">
                  {lang === 'tr' ? 'Seçilen Lokasyon:' : 'Selected Location:'}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white text-right break-words">
                  {selectedBuilding ? (
                    <>
                      <span>
                        {selectedProject?.project_name} •{' '}
                        {selectedBuilding.building_name}
                      </span>
                      <span className="block text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {selectedBuilding.building_id}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">
                  {lang === 'tr' ? 'Seçilen Malzeme:' : 'Selected Material:'}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white text-right break-words">
                  {selectedItem
                    ? lang === 'tr'
                      ? selectedItem.item_name_tr
                      : selectedItem.item_name_en || selectedItem.item_name_tr
                    : '—'}
                </span>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">
                  {lang === 'tr'
                    ? 'Standart Tüketim Katsayısı:'
                    : 'Consumption Rate:'}
                </span>
                <span className="text-xs font-light text-slate-900 dark:text-white">
                  {selectedItem?.consumption_rate
                    ? `${selectedItem.consumption_rate} (${selectedItem.consumption_metric})`
                    : '1.00'}
                </span>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">
                  {d.calculatedQty}
                </span>
                <span className="text-sm font-light text-blue-600 dark:text-blue-400">
                  <span className="font-bold">
                    {calculatedQty.toLocaleString('en-US')}
                  </span>{' '}
                  {selectedItem?.unit_of_measure || 'units'}
                </span>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-light text-slate-500 dark:text-slate-400">
                  {d.refUnitPrice}
                </span>
                <span className="text-xs font-light text-slate-900 dark:text-white">
                  €{baseCost.toFixed(2)} /{' '}
                  {selectedItem?.unit_of_measure || 'unit'}
                </span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    {d.lockedCeiling}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-light">
                    {d.lockedCeilingDesc}
                  </span>
                </div>
                <span className="text-xl font-light text-emerald-700 dark:text-emerald-400">
                  €
                  <span className="font-bold">
                    {calculatedBudget.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateTicket}
              disabled={submitting || !selectedItemId || !selectedBuildingId}
              className="w-full min-h-[44px] h-11 sm:h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? d.submitting : d.submitBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
