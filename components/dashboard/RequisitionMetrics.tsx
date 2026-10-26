"use client";

import React from 'react';
import { ClipboardList, Clock, AlertTriangle, Euro, TrendingUp } from 'lucide-react';
import { PurchaseRequisition } from '@/types/requisition';

interface RequisitionMetricsProps {
  requisitions: PurchaseRequisition[];
}

export const RequisitionMetrics: React.FC<RequisitionMetricsProps> = ({ requisitions }) => {
  const totalCount = requisitions.length;
  
  const pendingTiers = {
    tier1: requisitions.filter((r) => r.status === 'PENDING_PURCHASING').length,
    tier2: requisitions.filter((r) => r.status === 'PENDING_TIER2').length,
    tier3: requisitions.filter((r) => r.status === 'PENDING_TIER3').length,
  };
  const totalPending = pendingTiers.tier1 + pendingTiers.tier2 + pendingTiers.tier3;

  const anomalyCount = requisitions.filter(
    (r) => r.requested_quantity > r.predicted_quantity * 1.05
  ).length;
  const anomalyRate = totalCount > 0 ? (anomalyCount / totalCount) * 100 : 0;

  const totalCommittedEur = requisitions.reduce(
    (acc, curr) => acc + curr.estimated_total_eur,
    0
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Requisitions */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Toplam Talep <span className="text-[10px] lowercase text-zinc-400">/ Total</span>
          </span>
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <ClipboardList className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {totalCount}
          </span>
          <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="mr-0.5 h-3 w-3" /> Canlı Alt-Defter
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          ZENO, PHUKET, PATTAYA, KOH SAMUI blokları
        </p>
      </div>

      {/* Pending Multi-Tier Approvals */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Bekleyen Onaylar <span className="text-[10px] lowercase text-zinc-400">/ Pending</span>
          </span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {totalPending}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            3-Kademe Dağılımı
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
            T1: {pendingTiers.tier1}
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
            T2: {pendingTiers.tier2}
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
            T3: {pendingTiers.tier3}
          </span>
        </div>
      </div>

      {/* Anomaly & Overrun Rate */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Sapma Anomalisi <span className="text-[10px] lowercase text-zinc-400">/ Variance &gt;5%</span>
          </span>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {anomalyCount}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            anomalyRate > 20
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
          }`}>
            %{anomalyRate.toFixed(1)} Oran
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Zorunlu saha gerekçesi doğrulanmış kayıtlar
        </p>
      </div>

      {/* Total Sub-Ledger Value in EUR */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Toplam Taahhüt <span className="text-[10px] lowercase text-zinc-400">/ Committed EUR</span>
          </span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Euro className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            €{totalCommittedEur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Otomatik birim maliyet &times; talep miktarı
        </p>
      </div>
    </div>
  );
};
