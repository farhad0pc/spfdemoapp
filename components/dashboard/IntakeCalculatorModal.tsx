'use client';

import React from 'react';
import { ConstructionBlock, MaterialItem } from '@/types/requisition';

interface IntakeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ConstructionBlock[];
  materials: MaterialItem[];
  intakeBlockId: string;
  setIntakeBlockId: (id: string) => void;
  intakeItemId: string;
  setIntakeItemId: (id: string) => void;
  intakeVolume: number;
  setIntakeVolume: (vol: number) => void;
  intakeRequested: number;
  setIntakeRequested: (qty: number) => void;
  intakeJustification: string;
  setIntakeJustification: (j: string) => void;
  intakePredicted: number;
  intakeVariance: number;
  intakeIsAnomaly: boolean;
  intakeTier: 1 | 2 | 3;
  intakeTotalEur: number;
  onSubmit: () => void;
  lang: 'tr' | 'en';
}

export const IntakeCalculatorModal: React.FC<IntakeCalculatorModalProps> = ({
  isOpen,
  onClose,
  blocks,
  materials,
  intakeBlockId,
  setIntakeBlockId,
  intakeItemId,
  setIntakeItemId,
  intakeVolume,
  setIntakeVolume,
  intakeRequested,
  setIntakeRequested,
  intakeJustification,
  setIntakeJustification,
  intakePredicted,
  intakeVariance,
  intakeIsAnomaly,
  intakeTier,
  intakeTotalEur,
  onSubmit,
  lang,
}) => {
  if (!isOpen) return null;

  const isTR = lang === 'tr';
  const activeMaterial = materials.find((m) => m.item_id === intakeItemId) || materials[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/30 bg-white dark:bg-elevation-dark shadow-2xl overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-border-dark bg-amber-500/5 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-amber-400 uppercase tracking-wide">
                {isTR ? 'Metraj & Katsayı Hesaplayıcı' : 'Intake & Baseline Calculator'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-subtext-dark">
                {isTR ? 'Statik mimari hacim tüketim motoru (+%5 tolerans kontrolü)' : 'Architectural volume consumption engine with +5% overrun guardrails'}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Target Block Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-subtext-dark mb-2">
              {isTR ? '1. İnşaat Blok Seçimi' : '1. Construction Block Target'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {blocks.map((b) => {
                const isSelected = intakeBlockId === b.block_id;
                return (
                  <button
                    key={b.block_id}
                    type="button"
                    onClick={() => setIntakeBlockId(b.block_id)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                        : 'border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-canvas-dark text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="text-xs uppercase font-bold">{b.block_name.split(' ')[0]}</div>
                    <div className="text-[10px] opacity-75">{b.block_name.split('(')[1]?.replace(')', '') || 'Phase'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Material Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-subtext-dark">
                {isTR ? '2. Katalog Malzeme Seçimi' : '2. Catalog Material Selection'}
              </label>
              <span className="text-[11px] font-semibold tracking-wide text-amber-600 dark:text-amber-400">
                {isTR ? 'Katsayı: ' : 'Factor: '}{activeMaterial.consumption_rate} {activeMaterial.consumption_metric || ''}
              </span>
            </div>
            <select
              value={intakeItemId}
              onChange={(e) => setIntakeItemId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-canvas-dark px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-hidden cursor-pointer"
            >
              {materials.map((m) => (
                <option key={m.item_id} value={m.item_id} className="bg-white dark:bg-canvas-dark text-slate-900 dark:text-slate-100">
                  {m.item_id} • {isTR ? m.item_name_tr : (m.item_name_en || m.item_name_tr)} (€{Number(m.base_cost_eur).toFixed(2)} / {m.unit_of_measure})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Volumetric Calculation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* Input Volume */}
            <div className="rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50/50 dark:bg-canvas-dark/40 p-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-subtext-dark mb-1">
                {isTR ? 'Mimari Metraj (m³)' : 'Architectural Volume (m³)'}
              </label>
              <input
                type="number"
                min="1"
                value={intakeVolume}
                onChange={(e) => setIntakeVolume(Math.max(1, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-elevation-dark px-3 py-2 text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
              <span className="block mt-1 text-[10px] text-slate-400">{isTR ? 'Statik proje verisi' : 'Static project unit'}</span>
            </div>

            {/* Calculated Baseline */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20 p-3 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
                {isTR ? 'Hesaplanan Baz Değer' : 'Engineering Baseline'}
              </span>
              <div className="text-lg font-bold tracking-wide text-indigo-700 dark:text-indigo-300">
                {intakePredicted.toFixed(1)} {activeMaterial.unit_of_measure}
              </div>
              <span className="block mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-light tracking-wide">
                {intakeVolume} × {activeMaterial.consumption_rate}
              </span>
            </div>

            {/* Field Requested */}
            <div className="rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50/50 dark:bg-canvas-dark/40 p-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-subtext-dark">
                  {isTR ? 'Talep Miktarı' : 'Requested Qty'}
                </label>
                <span className={`text-[11px] font-bold tracking-wide ${intakeIsAnomaly ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {intakeVariance >= 0 ? `+${intakeVariance.toFixed(1)}%` : `${intakeVariance.toFixed(1)}%`}
                </span>
              </div>
              <input
                type="number"
                min="1"
                value={intakeRequested}
                onChange={(e) => setIntakeRequested(Math.max(1, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-elevation-dark px-3 py-2 text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
              <span className="block mt-1 text-[10px] text-slate-400">{activeMaterial.unit_of_measure}</span>
            </div>
          </div>

          {/* Tolerance Status Banner */}
          <div
            className={`rounded-xl border p-3 flex items-center justify-between text-xs font-semibold ${
              intakeIsAnomaly
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{intakeIsAnomaly ? '⚠️' : '✓'}</span>
              <span>
                {intakeIsAnomaly
                  ? (isTR ? 'Tolerans Üstü Sapma (>+%5)' : 'Overrun Detected (>+5%)')
                  : (isTR ? 'Mühendislik Limitleri Dahilinde (<= +%5)' : 'Within Tolerance (<= +5%)')}
              </span>
            </div>
            <span className="font-light tracking-wide text-[11px]">
              {intakeVariance >= 0 ? `+${intakeVariance.toFixed(2)}%` : `${intakeVariance.toFixed(2)}%`}
            </span>
          </div>

          {/* Justification Input if Anomaly */}
          {intakeIsAnomaly && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                {isTR ? 'Sapma Gerekçesi (Zorunlu)' : 'Variance Justification (Required)'}
              </label>
              <textarea
                value={intakeJustification}
                onChange={(e) => setIntakeJustification(e.target.value)}
                placeholder={isTR ? 'Teknik revizyon veya şantiye sahası gerekçesini yazınız...' : 'Provide architectural or site justification for the overrun...'}
                rows={2}
                className="w-full rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-canvas-dark p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          )}

          {/* Totals & Clearances */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-border-dark">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isTR ? 'Tahmini Sipariş Tutarı' : 'Estimated Total'}
              </span>
              <span className="text-xl font-black font-light tracking-wide text-amber-600 dark:text-amber-400">
                €{intakeTotalEur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isTR ? 'Yetki Kademesi' : 'Approval Tier'}
              </span>
              <span className="inline-block rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 font-light tracking-wide">
                {isTR ? `Kademe ${intakeTier}` : `Tier ${intakeTier}`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-border-dark bg-slate-50/70 dark:bg-canvas-dark/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isTR ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit();
              onClose();
            }}
            disabled={intakeIsAnomaly && !intakeJustification.trim()}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-6 py-2.5 text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            {isTR ? 'Alt-Deftere Kaydet' : 'Submit Intake to Sub-Ledger'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntakeCalculatorModal;
