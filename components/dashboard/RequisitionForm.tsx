"use client";

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Send,
  Info
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

interface RequisitionFormProps {
  materials: MaterialItem[];
  blocks: ConstructionBlock[];
  currentRole: CorporateRole;
  onSubmit: (requisition: PurchaseRequisition) => void;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({
  materials,
  blocks,
  currentRole,
  onSubmit,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.block_id || 'b1');
  const [selectedItemId, setSelectedItemId] = useState<string>(materials[0]?.item_id || 'm1');
  const [architecturalVolume, setArchitecturalVolume] = useState<number>(120);
  const [requestedQuantity, setRequestedQuantity] = useState<number>(126);
  const [varianceJustification, setVarianceJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected Material & Block lookups
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.item_id === selectedItemId) || materials[0],
    [materials, selectedItemId]
  );

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.block_id === selectedBlockId) || blocks[0],
    [blocks, selectedBlockId]
  );

  // Calculation Invariants
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

  // Form validity check
  const isFormValid = useMemo(() => {
    if (architecturalVolume <= 0 || requestedQuantity <= 0) return false;
    if (isAnomaly && varianceJustification.trim().length < 10) return false;
    return true;
  }, [architecturalVolume, requestedQuantity, isAnomaly, varianceJustification]);

  // Preset Loaders
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
      setRequestedQuantity(125); // > 5% overrun
      setVarianceJustification('Zemin kotu sondaj revizyonu nedeniyle radye temel grobeton kalınlığı 10 cm artırılmıştır.');
    } else {
      setSelectedBlockId(blocks.find((b) => b.block_name === 'PATTAYA')?.block_id || blocks[2]?.block_id || blocks[0].block_id);
      setSelectedItemId(materials.find((m) => m.category === 'STEEL')?.item_id || materials[1]?.item_id || materials[0].item_id);
      setArchitecturalVolume(250);
      setRequestedQuantity(38); // > 5% overrun & Tier 3
      setVarianceJustification('Statik proje onay revizyonu no ST-204 uyarınca kolon mantolama donatısı ilave edilmiştir.');
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

      // Reset form slightly
      setArchitecturalVolume(50);
      setRequestedQuantity(52);
      setVarianceJustification('');
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Header and Preset Shortcuts */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Calculator className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Akıllı Malzeme Talep Girişi <span className="text-xs font-normal text-zinc-500">/ Smart Requisition Engine</span>
            </h2>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Oturum: {currentRole}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Mimari hacme dayalı otomatik miktar tahmini, anomali kontrolü ve 3-kademeli yetkilendirme
          </p>
        </div>

        {/* Demo Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-400">Hızlı Senaryo:</span>
          <button
            type="button"
            onClick={() => loadPreset('normal')}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Normal (Tier 1)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('anomaly_tier2')}
            className="rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-1 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Sapmalı Beton (Tier 2)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('bulk_tier3')}
            className="rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px] font-medium text-rose-800 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            Yüksek Tonaj Çelik (Tier 3)
          </button>
        </div>
      </div>

      {/* Main Interactive Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. Block Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Şantiye Bloğu <span className="text-zinc-400">/ Block</span>
            </label>
            <div className="relative mt-1.5">
              <select
                value={selectedBlockId}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3 text-xs font-semibold text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
              >
                {blocks.map((b) => (
                  <option key={b.block_id} value={b.block_id}>
                    Caesar Resort &bull; {b.block_name} {b.active_phase ? `(${b.active_phase})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[10px] text-zinc-400">
              Proje: Caesar Resort &amp; Spa
            </p>
          </div>

          {/* 2. Material Catalog Item */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Malzeme Kataloğu <span className="text-zinc-400">/ Material Item (TR/EN)</span>
            </label>
            <div className="relative mt-1.5">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3 text-xs font-semibold text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
              >
                {materials.map((m) => (
                  <option key={m.item_id} value={m.item_id}>
                    [{m.category}] {m.item_name_tr} ({m.item_name_en}) &bull; €{m.base_cost_eur.toFixed(2)} / {m.unit_of_measure}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[10px] text-zinc-400">
              Katsayı Formülü: {selectedMaterial?.consumption_rate} {selectedMaterial?.unit_of_measure} per {selectedMaterial?.consumption_metric}
            </p>
          </div>

          {/* 3. Architectural Volume Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Mimari İmalat Hacmi <span className="text-zinc-400">/ Volume (m³)</span>
            </label>
            <div className="relative mt-1.5">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={architecturalVolume}
                onChange={(e) => setArchitecturalVolume(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3 text-xs font-semibold text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
                placeholder="Örn: 150"
                required
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-400">
              Statik / mimari metraj kütlesi
            </p>
          </div>
        </div>

        {/* Predictive Calculation Card */}
        <div className="rounded-xl border border-zinc-200/90 bg-linear-to-r from-zinc-50 via-indigo-50/20 to-zinc-50 p-4 dark:border-zinc-800 dark:from-zinc-900/60 dark:via-indigo-950/20 dark:to-zinc-900/60">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
            {/* Auto Predicted Quantity */}
            <div className="border-b sm:border-b-0 sm:border-r border-zinc-200/70 dark:border-zinc-800 pb-3 sm:pb-0 sm:pr-4">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Mühendislik Tahmini <span className="font-normal">(Predicted)</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-indigo-700 dark:text-indigo-400">
                  {predictedQuantity.toLocaleString('tr-TR')}
                </span>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {selectedMaterial?.unit_of_measure}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                {architecturalVolume} m³ &times; {selectedMaterial?.consumption_rate}
              </p>
            </div>

            {/* Requested Quantity Input */}
            <div className="border-b sm:border-b-0 sm:border-r border-zinc-200/70 dark:border-zinc-800 pb-3 sm:pb-0 sm:pr-4">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Talep Edilen Miktar <span className="font-normal">(Requested)</span>
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(parseFloat(e.target.value) || 0)}
                  className="w-28 rounded-lg border border-zinc-300 bg-white py-1 px-2.5 text-sm font-bold text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  required
                />
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {selectedMaterial?.unit_of_measure}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Saha talebi</p>
            </div>

            {/* Live Variance Calculation & Badge */}
            <div className="border-b sm:border-b-0 sm:border-r border-zinc-200/70 dark:border-zinc-800 pb-3 sm:pb-0 sm:pr-4">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Sapma Oranı <span className="font-normal">(Variance %)</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isAnomaly
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {isAnomaly ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {variancePercentage > 0 ? `+${variancePercentage}%` : `${variancePercentage}%`}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                {isAnomaly ? 'Tolerans (+%5) aşıldı! Gerekçe zorunlu.' : 'Tolerans limitleri dahilinde'}
              </p>
            </div>

            {/* Estimated Total EUR & Approval Tier */}
            <div>
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Tahmini Tutar &amp; Onay Kademesi
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  €{estimatedTotalEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  approvalTier === 1
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : approvalTier === 2
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  Tier {approvalTier}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Onay Yetkilisi: <strong className="text-zinc-700 dark:text-zinc-300">{tierInfo.role}</strong> ({tierInfo.threshold})
              </p>
            </div>
          </div>
        </div>

        {/* Conditional Mandatory Variance Justification Textarea */}
        {isAnomaly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 transition-all dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Mühendislik Sapma Toleransı Aşıldı (&gt; +%5.0) &bull; Saha Gerekçesi Zorunludur
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-400/90">
              Talep edilen miktar mimari katsayı tahminini aşmaktadır. Satın alma ve Proje Direktörü onayı için teknik gerekçenizi belirtiniz (örn. zemin şartları, statik pafta revizyonu, döküm fire payı vb.).
            </p>
            <div className="mt-2.5">
              <textarea
                value={varianceJustification}
                onChange={(e) => setVarianceJustification(e.target.value)}
                placeholder="Örn: Radye temel kot düşümü ve ilave donatı bindirme boyu revizyonu nedeniyle..."
                rows={2}
                className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-amber-600 focus:outline-hidden dark:border-amber-800 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </div>
            {varianceJustification.trim().length > 0 && varianceJustification.trim().length < 10 && (
              <span className="mt-1 block text-[10px] font-medium text-rose-600">
                Gerekçe en az 10 karakter uzunluğunda olmalıdır.
              </span>
            )}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            <span>Kayıt doğrudan Afik Group satın alma alt-defterine işlenecektir.</span>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Kaydediliyor...' : 'Talebi Alt-Deftere Gönder / Submit'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
