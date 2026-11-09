"use client";

import React from 'react';
import { Activity, AlertTriangle, Layers, Building } from 'lucide-react';
import { PurchaseRequisition } from '@/types/requisition';
import { Language, DICTIONARY, formatCurrency, formatNumber, toLocaleUpper } from '@/lib/i18n';

interface RequisitionMetricsProps {
  requisitions: PurchaseRequisition[];
  lang: Language;
  currentRole?: string;
}

export const RequisitionMetrics: React.FC<RequisitionMetricsProps> = ({ requisitions, lang, currentRole }) => {
  const t = DICTIONARY[lang];
  const totalCount = requisitions.length;

  // Block Distribution
  const blockCounts = requisitions.reduce<Record<string, number>>((acc, r) => {
    const bName = r.block?.block_name || 'Caesar';
    acc[bName] = (acc[bName] || 0) + 1;
    return acc;
  }, {});

  // Variance Telemetry
  const anomalyCount = requisitions.filter(
    (r) => r.requested_quantity > r.predicted_quantity * 1.05
  ).length;
  const normalCount = totalCount - anomalyCount;

  // Financial Commitment & Tiers
  const totalEur = requisitions.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);

  const tierCounts = {
    tier1: requisitions.filter((r) => r.approval_tier === 1).length,
    tier2: requisitions.filter((r) => r.approval_tier === 2).length,
    tier3: requisitions.filter((r) => r.approval_tier === 3).length,
  };

  const isExecutive = currentRole === "EXECUTIVE";
  const isTR = lang === "tr";

  // Executive Metrics Computations
  const approvedReqs = requisitions.filter((r) => r.status === "APPROVED");
  const rejectedReqs = requisitions.filter((r) => r.status === "REJECTED");
  const pendingTier3Reqs = requisitions.filter(
    (r) => r.status === "PENDING_TIER3" || (r.status?.startsWith("PENDING") && (r.estimated_total_eur || r.total_estimated_eur || 0) >= 15000)
  );
  const anomalyReqs = requisitions.filter(
    (r) => (r.requested_quantity || 0) > (r.predicted_quantity || 0) * 1.05
  );

  const approvedEur = approvedReqs.reduce((acc, r) => acc + (r.estimated_total_eur || r.total_estimated_eur || 0), 0);
  const rejectedEur = rejectedReqs.reduce((acc, r) => acc + (r.estimated_total_eur || r.total_estimated_eur || 0), 0);
  const pendingTier3Eur = pendingTier3Reqs.reduce((acc, r) => acc + (r.estimated_total_eur || r.total_estimated_eur || 0), 0);
  const anomalyEur = anomalyReqs.reduce((acc, r) => acc + (r.estimated_total_eur || r.total_estimated_eur || 0), 0);

  const rejectionRate = totalCount > 0 ? ((rejectedReqs.length / totalCount) * 100).toFixed(1) : "0.0";


  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

      {/* EXCLUSIVE EXECUTIVE MERIT & GOVERNANCE STRIP */}
      {isExecutive && (
        <div className="col-span-1 md:col-span-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/5 p-5 shadow-lg backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-amber-500/20 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-base font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                {isTR ? "Yönetim Kurulu Yetkili Denetim Masası" : "Executive Board Governance & Fiduciary Telemetry"}
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              {isTR ? "Yetki Seviyesi: Seviye 3 (Nihai Onay)" : "Authority Level: Tier 3 (Final Ratification)"}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Approved Capital */}
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#0c121e]/80 border border-emerald-500/30">
              <span className="block text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                {isTR ? "Onaylanan Sermaye" : "Approved Capital"}
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                €{approvedEur.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 block">
                {approvedReqs.length} {isTR ? "talep onaylandı" : "tickets approved"}
              </span>
            </div>

            {/* Preserved Capital / Rejected */}
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#0c121e]/80 border border-rose-500/30">
              <span className="block text-[11px] font-semibold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                {isTR ? "Korunan Sermaye (Red)" : "Preserved Capital (Rejected)"}
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                €{rejectedEur.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 block">
                {rejectedReqs.length} {isTR ? "talep" : "tickets"} ({rejectionRate}% {isTR ? "red oranı" : "rejection rate"})
              </span>
            </div>

            {/* Tier 3 Pending Queue */}
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#0c121e]/80 border border-purple-500/30">
              <span className="block text-[11px] font-semibold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                {isTR ? "Yönetim Onayı Bekleyen" : "Pending Board Ratification"}
              </span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                €{pendingTier3Eur.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 block">
                {pendingTier3Reqs.length} {isTR ? "talep doğrudan imza bekliyor" : "tickets requiring board sign-off"}
              </span>
            </div>

            {/* Anomaly / Overrun Exposure */}
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#0c121e]/80 border border-amber-500/30">
              <span className="block text-[11px] font-semibold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                {isTR ? "Sapmalı / Riskli Talep Riski" : "Overrun Anomaly Exposure"}
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                €{anomalyEur.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 block">
                {anomalyReqs.length} {isTR ? "talepte metraj aşımı (>+%5)" : "tickets exceeding intake standard"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Card 1: Requisition Velocity & Block Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-border-dark dark:bg-elevation-dark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-subtext-dark">
            {toLocaleUpper(t.metrics.card1Title, lang)}
          </span>
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <Activity className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
            {formatNumber(totalCount, lang)}
          </span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {t.metrics.card1ActiveTickets}
          </span>
        </div>

        {/* Block Breakdown Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-border-dark">
          {['ZENO', 'PHUKET', 'PATTAYA', 'KOH SAMUI'].map((block) => (
            <span
              key={block}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-border-dark dark:text-slate-300 tabular-nums"
            >
              <Building className="h-2.5 w-2.5 opacity-60" />
              {block}: {blockCounts[block] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Card 2: Predictive Variance & Anomaly Telemetry */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-border-dark dark:bg-elevation-dark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-subtext-dark">
            {toLocaleUpper(t.metrics.card2Title, lang)}
          </span>
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {formatNumber(anomalyCount, lang)}
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t.metrics.card2Anomalies} (&gt;+%5)
          </span>
        </div>

        {/* Progress Bar of Variance */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-border-dark">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">
              {t.metrics.card2WithinTolerance}: {normalCount}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              Sapma: {anomalyCount}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (normalCount / totalCount) * 100 : 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Card 3: Financial Commitment & 3-Tier Gate Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-border-dark dark:bg-elevation-dark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-subtext-dark">
            {toLocaleUpper(t.metrics.card3Title, lang)}
          </span>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-amber-400 tabular-nums">
            {formatCurrency(totalEur, lang)}
          </span>
        </div>

        {/* 3-Tier Allocation Breakdown */}
        <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-border-dark text-[10px] font-bold">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 tabular-nums">
            T1 (&lt;€2.5k): {tierCounts.tier1}
          </span>
          <span className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 tabular-nums">
            T2 (&lt;€15k): {tierCounts.tier2}
          </span>
          <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 tabular-nums">
            T3 (&gt;€15k): {tierCounts.tier3}
          </span>
        </div>
      </div>
    </div>
  );
};
