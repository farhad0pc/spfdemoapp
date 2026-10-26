"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Send
} from 'lucide-react';
import {
  MaterialItem,
  ConstructionBlock,
  PurchaseRequisition,
  calculatePredictedQuantity,
  calculateVariance,
  determineApprovalTier,
  getTierDescriptor,
  CorporateRole
} from '@/types/requisition';
import {
  Language,
  DICTIONARY,
  formatCurrency,
  formatNumber,
  toLocaleUpper
} from '@/lib/i18n';

interface RequisitionFormProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  blocks: ConstructionBlock[];
  currentRole: CorporateRole;
  onSubmit: (requisition: PurchaseRequisition) => void;
  lang: Language;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({
  isOpen,
  onClose,
  materials,
  blocks,
  currentRole,
  onSubmit,
  lang,
}) => {
  const t = DICTIONARY[lang];
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.block_id || 'b1');
  const [selectedItemId, setSelectedItemId] = useState<string>(materials[0]?.item_id || 'm1');
  const [architecturalVolume, setArchitecturalVolume] = useState<number>(120);
  const [requestedQuantity, setRequestedQuantity] = useState<number>(126);
  const [varianceJustification, setVarianceJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected Material & Block
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.item_id === selectedItemId) || materials[0],
    [materials, selectedItemId]
  );

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.block_id === selectedBlockId) || blocks[0],
    [blocks, selectedBlockId]
  );

  // Predictive Calculation Invariants
  const predictedQuantity = useMemo(() => {
    if (!selectedMaterial || architecturalVolume <= 0) return 0;
    return calculatePredictedQuantity(architecturalVolume, selectedMaterial.consumption_rate);
  }, [selectedMaterial, architecturalVolume]);

  const { variancePercentage, isAnomaly } = useMemo(() => {
    return calculateVariance(requestedQuantity, predictedQuantity);
  }, [requestedQuantity, predictedQuantity]);

  const estimatedTotalEur = useMemo(() => {
    if (!selectedMaterial || requestedQuantity <= 0) return 0;
    return Number((requestedQuantity * selectedMaterial.base_cost_eur).toFixed(2));
  }, [selectedMaterial, requestedQuantity]);

  const approvalTier = useMemo(() => {
    return determineApprovalTier(estimatedTotalEur);
  }, [estimatedTotalEur]);

  const tierInfo = useMemo(() => {
    return getTierDescriptor(approvalTier);
  }, [approvalTier]);

  // Form validity
  const isFormValid = useMemo(() => {
    if (architecturalVolume <= 0 || requestedQuantity <= 0) return false;
    if (isAnomaly && varianceJustification.trim().length < 10) return false;
    return true;
  }, [architecturalVolume, requestedQuantity, isAnomaly, varianceJustification]);

  // Presets
  const loadPreset = (type: 'normal' | 'anomaly_tier2' | 'bulk_tier3') => {
    if (type === 'normal') {
      setSelectedBlockId(blocks.find((b) => b.block_name === 'ZENO')?.block_id || blocks[0].block_id);
      setSelectedItemId(materials.find((m) => m.category === 'CONCRETE')?.item_id || materials[0].item_id);
      setArchitecturalVolume(20);
      setRequestedQuantity(21);
      setVarianceJustification('');
    } else if (type === 'anomaly_tier2') {
      setSelectedBlockId(blocks.find((b) => b.block_name === 'PHUKET')?.block_id || blocks[1]?.block_id || blocks[0].block_id);
      setSelectedItemId(materials.find((m) => m.category === 'CONCRETE')?.item_id || materials[0].item_id);
      setArchitecturalVolume(100);
      setRequestedQuantity(125);
      setVarianceJustification(
        lang === 'tr'
          ? 'Zemin kotu sondaj revizyonu nedeniyle radye temel grobeton kalınlığı 10 cm artırılmıştır.'
          : 'Geotechnical borehole revision required a 10cm thickening of the raft blinding concrete layer.'
      );
    } else {
      setSelectedBlockId(blocks.find((b) => b.block_name === 'PATTAYA')?.block_id || blocks[2]?.block_id || blocks[0].block_id);
      setSelectedItemId(materials.find((m) => m.category === 'STEEL')?.item_id || materials[1]?.item_id || materials[0].item_id);
      setArchitecturalVolume(250);
      setRequestedQuantity(38);
      setVarianceJustification(
        lang === 'tr'
          ? 'Statik proje onay revizyonu no ST-204 uyarınca kolon mantolama donatısı ilave edilmiştir.'
          : 'Structural revision sheet ST-204 mandates additional column rebar jacketing reinforcement.'
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedMaterial || !selectedBlock) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const initialStatus =
        approvalTier === 1
          ? 'PENDING_PURCHASING'
          : approvalTier === 2
          ? 'PENDING_TIER2'
          : 'PENDING_TIER3';

      const newRequisition: PurchaseRequisition = {
        ticket_id: `req_${Date.now()}`,
        requisition_number: `REQ-202610-${Math.floor(1000 + Math.random() * 9000)}`,
        project_id: selectedBlock.project_id,
        block_id: selectedBlock.block_id,
        item_id: selectedMaterial.item_id,
        foreman_id: 'user_foreman_01',
        architectural_volume: architecturalVolume,
        predicted_quantity: predictedQuantity,
        requested_quantity: requestedQuantity,
        variance_percentage: variancePercentage,
        variance_justification: isAnomaly ? varianceJustification : undefined,
        estimated_total_eur: estimatedTotalEur,
        approval_tier: approvalTier,
        status: initialStatus,
        created_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        updated_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        material: selectedMaterial,
        block: selectedBlock,
        foreman: {
          user_id: 'user_foreman_01',
          name: 'Ali Yılmaz (Saha Şefi)',
          email: 'ali.yilmaz@afikgroup.com',
          role: 'FOREMAN',
          department: 'Caesar İnşaat Operasyon',
        },
      };

      onSubmit(newRequisition);
      setIsSubmitting(false);
      onClose();

      // Reset
      setArchitecturalVolume(50);
      setRequestedQuantity(52);
      setVarianceJustification('');
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md transition-opacity">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 dark:border-border-dark dark:bg-surface-dark">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-border-dark px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <Calculator className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-amber-400">
                {toLocaleUpper(t.form.title, lang)}
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {currentRole}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-subtext-dark">
              {t.form.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Presets Shortcuts */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/30">
            <span className="text-[11px] font-bold uppercase text-amber-500">
              {t.form.quickScenarios}:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadPreset('normal')}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-elevation-dark dark:text-slate-300"
              >
                {t.form.presetNormal}
              </button>
              <button
                type="button"
                onClick={() => loadPreset('anomaly_tier2')}
                className="rounded-md border border-amber-400 bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/30"
              >
                {t.form.presetAnomaly}
              </button>
              <button
                type="button"
                onClick={() => loadPreset('bulk_tier3')}
                className="rounded-md border border-rose-400 bg-rose-500/20 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/30"
              >
                {t.form.presetBulk}
              </button>
            </div>
          </div>

          {/* Block & Material Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Block Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t.form.blockSelect}
              </label>
              <select
                value={selectedBlockId}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900 dark:border-border-dark dark:bg-elevation-dark dark:text-slate-100 focus:outline-hidden"
              >
                {blocks.map((b) => (
                  <option key={b.block_id} value={b.block_id}>
                    Caesar Resort &bull; {b.block_name} {b.active_phase ? `(${b.active_phase})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Architectural Volume */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t.form.volumeInput}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={architecturalVolume}
                onChange={(e) => setArchitecturalVolume(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900 dark:border-border-dark dark:bg-elevation-dark dark:text-slate-100 tabular-nums focus:outline-hidden"
                placeholder="Örn: 120"
                required
              />
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {t.form.volumeHelp}
              </span>
            </div>
          </div>

          {/* Material Catalog Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t.form.materialSelect}
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900 dark:border-border-dark dark:bg-elevation-dark dark:text-slate-100 focus:outline-hidden"
            >
              {materials.map((m) => (
                <option key={m.item_id} value={m.item_id}>
                  [{m.category}] {lang === 'tr' ? m.item_name_tr : m.item_name_en} &bull; {formatCurrency(m.base_cost_eur, lang)} / {m.unit_of_measure}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[10px] text-slate-400 tabular-nums">
              Katsayı: {selectedMaterial?.consumption_rate} {selectedMaterial?.unit_of_measure} per {selectedMaterial?.consumption_metric}
            </span>
          </div>

          {/* Predictive Calculation Invariant Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-border-dark dark:bg-elevation-dark">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t.form.predictedQty}
                </div>
                <div className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatNumber(predictedQuantity, lang)} {selectedMaterial?.unit_of_measure}
                </div>
                <span className="text-[10px] text-slate-400">{t.form.formulaDesc}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  {t.form.requestedQty}
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(parseFloat(e.target.value) || 0)}
                    className="w-24 rounded-md border border-slate-300 bg-white py-1 px-2 text-xs font-bold text-slate-900 dark:border-slate-600 dark:bg-surface-dark dark:text-slate-100 tabular-nums focus:outline-hidden"
                    required
                  />
                  <span className="text-[10px] font-bold text-slate-500">
                    {selectedMaterial?.unit_of_measure}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t.form.varianceBadge}
                </div>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                    isAnomaly ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {isAnomaly ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    {variancePercentage > 0 ? `+${variancePercentage}%` : `${variancePercentage}%`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {isAnomaly ? t.form.toleranceAnomaly : t.form.toleranceOk}
                </span>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t.form.estimatedCost}
                </div>
                <div className="mt-1 text-sm font-bold text-amber-500 tabular-nums">
                  {formatCurrency(estimatedTotalEur, lang)}
                </div>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-black text-blue-400">
                  Tier {approvalTier} ({tierInfo.role})
                </span>
              </div>
            </div>
          </div>

          {/* Conditional Mandatory Variance Justification Textarea */}
          {isAnomaly && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 transition-all">
              <div className="flex items-center gap-1.5 font-bold uppercase text-rose-500 text-[11px]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t.form.anomalyAlertTitle}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {t.form.anomalyAlertDesc}
              </p>
              <textarea
                value={varianceJustification}
                onChange={(e) => setVarianceJustification(e.target.value)}
                placeholder={t.form.justificationPlaceholder}
                rows={3}
                className="mt-2.5 w-full rounded-lg border border-rose-400/50 bg-white p-2.5 text-xs text-slate-900 dark:bg-surface-dark dark:text-slate-100 focus:outline-hidden"
                required
              />
              {varianceJustification.trim().length > 0 && varianceJustification.trim().length < 10 && (
                <span className="mt-1 block text-[10px] font-bold text-rose-500">
                  {t.form.justificationMinNotice}
                </span>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="border-t border-slate-200 dark:border-border-dark pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-bold uppercase text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.form.cancelBtn}
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-yellow px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Kaydediliyor...' : t.form.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
