"use client";

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Building,
  Check,
  XCircle,
  Truck,
  LayoutGrid,
  List,
  Flame
} from 'lucide-react';
import {
  PurchaseRequisition,
  RequisitionStatus,
  CaesarBlock,
  ApprovalTier
} from '@/types/requisition';
import {
  Language,
  DICTIONARY,
  formatCurrency,
  formatNumber,
  toLocaleUpper
} from '@/lib/i18n';

interface RequisitionTableProps {
  requisitions: PurchaseRequisition[];
  onSelectRequisition: (req: PurchaseRequisition) => void;
  selectedTicketId?: string;
  lang: Language;
  blockFilter: 'all' | CaesarBlock;
  onBlockFilterChange: (b: 'all' | CaesarBlock) => void;
  searchQuery: string;
}

export const RequisitionTable: React.FC<RequisitionTableProps> = ({
  requisitions,
  onSelectRequisition,
  selectedTicketId,
  lang,
  blockFilter,
  onBlockFilterChange,
  searchQuery,
}) => {
  const t = DICTIONARY[lang];
  const [statusFilter, setStatusFilter] = useState<'all' | RequisitionStatus>('all');
  const [tierFilter, setTierFilter] = useState<'all' | ApprovalTier>('all');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [viewMode, setViewMode] = useState<'subledger' | 'matrix'>('subledger');

  const filteredRequisitions = requisitions.filter((req) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      req.requisition_number.toLowerCase().includes(term) ||
      (req.material?.item_name_tr.toLowerCase().includes(term) ?? false) ||
      (req.material?.item_name_en.toLowerCase().includes(term) ?? false) ||
      (req.block?.block_name.toLowerCase().includes(term) ?? false);

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesBlock = blockFilter === 'all' || req.block?.block_name === blockFilter;
    const matchesTier = tierFilter === 'all' || req.approval_tier === tierFilter;
    const isAnomaly = req.requested_quantity > req.predicted_quantity * 1.05;
    const matchesAnomaly = !onlyAnomalies || isAnomaly;

    return matchesSearch && matchesStatus && matchesBlock && matchesTier && matchesAnomaly;
  });

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {t.statuses.APPROVED}
          </span>
        );
      case 'PENDING_PURCHASING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
            <Clock className="h-3 w-3 animate-spin" /> {t.statuses.PENDING_PURCHASING}
          </span>
        );
      case 'PENDING_TIER2':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
            <Clock className="h-3 w-3 animate-spin" /> {t.statuses.PENDING_TIER2}
          </span>
        );
      case 'PENDING_TIER3':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-3 w-3" /> {t.statuses.PENDING_TIER3}
          </span>
        );
      case 'ORDER_PLACED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">
            <Truck className="h-3 w-3" /> {t.statuses.ORDER_PLACED}
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            <Check className="h-3 w-3" /> {t.statuses.DELIVERED}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3" /> {t.statuses.REJECTED}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getTierBadge = (tier: ApprovalTier) => {
    switch (tier) {
      case 1:
        return (
          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
            Tier 1 (&lt;€2.5k)
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            Tier 2 (&lt;€15k)
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
            Tier 3 (&gt;€15k)
          </span>
        );
    }
  };

  // Matrix Block Stats
  const blockStats = (['ZENO', 'PHUKET', 'PATTAYA', 'KOH SAMUI'] as CaesarBlock[]).map((bKey) => {
    const bReqs = requisitions.filter((r) => r.block?.block_name === bKey);
    const totalBlockEur = bReqs.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);
    const activeCount = bReqs.length;
    const blockMeta = t.blocks[bKey];

    return {
      key: bKey,
      name: blockMeta.name,
      desc: blockMeta.desc,
      progress: blockMeta.progress,
      activeCount,
      totalEur: totalBlockEur,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-border-dark dark:bg-elevation-dark">
      {/* Top Header & Dual View Mode Controller */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 dark:border-border-dark">
        <div>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-amber-400">
            {toLocaleUpper(t.table.title, lang)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-subtext-dark">
            {t.table.subtitle}
          </p>
        </div>

        {/* View Mode Toggle & Filter Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Anomaly Quick Filter Toggle */}
          <button
            onClick={() => setOnlyAnomalies(!onlyAnomalies)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              onlyAnomalies
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-border-dark dark:text-slate-300'
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${onlyAnomalies ? 'text-amber-300 animate-pulse' : 'text-rose-500'}`} />
            <span>{t.table.anomaliesOnly}</span>
          </button>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ApprovalTier))}
            className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-border-dark dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">{t.table.allTiers}</option>
            <option value="1">Tier 1 (&lt; €2.5k)</option>
            <option value="2">Tier 2 (€2.5k - €15k)</option>
            <option value="3">Tier 3 (&gt; €15k)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | 'all')}
            className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-border-dark dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">{t.table.allStatuses}</option>
            <option value="PENDING_PURCHASING">{t.statuses.PENDING_PURCHASING}</option>
            <option value="PENDING_TIER2">{t.statuses.PENDING_TIER2}</option>
            <option value="PENDING_TIER3">{t.statuses.PENDING_TIER3}</option>
            <option value="APPROVED">{t.statuses.APPROVED}</option>
            <option value="ORDER_PLACED">{t.statuses.ORDER_PLACED}</option>
            <option value="DELIVERED">{t.statuses.DELIVERED}</option>
            <option value="REJECTED">{t.statuses.REJECTED}</option>
          </select>

          {/* View Mode Switcher Buttons */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('subledger')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'subledger'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-border-dark dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title={t.viewMode.subledger}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.viewMode.subledger}</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-border-dark dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title={t.viewMode.matrix}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.viewMode.matrix}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX VIEW (4 Square Interactive Cards) */}
      {viewMode === 'matrix' && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {blockStats.map((b) => (
            <div
              key={b.key}
              onClick={() => onBlockFilterChange(blockFilter === b.key ? 'all' : b.key)}
              className={`cursor-pointer rounded-xl border p-4 transition-all hover:scale-[1.02] ${
                blockFilter === b.key
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-border-dark dark:bg-surface-dark/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500 uppercase">
                  {b.name}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                  %{b.progress} İlerleme
                </span>
              </div>

              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                {b.desc}
              </h3>

              <div className="mt-4 flex items-baseline justify-between border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Aktif Talepler
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {b.activeCount} Talep
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Mali Hacim
                  </div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatCurrency(b.totalEur, lang)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${b.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-LEDGER VIEW (Desktop Table vs Mobile Cards) */}
      {viewMode === 'subledger' && (
        <>
          {/* DESKTOP HIGH-DENSITY TABULAR LEDGER (hidden md:block) */}
          <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-border-dark">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-slate-600 dark:border-border-dark dark:bg-surface-dark dark:text-subtext-dark">
                <tr>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">{t.table.colTicket}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colBlock}</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">{t.table.colMaterial}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colVolumePredicted}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colRequestedVariance}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colCost}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colTier}</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">{t.table.colStatus}</th>
                  <th className="py-3 px-4 text-right font-bold uppercase tracking-wider">{t.table.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                {filteredRequisitions.length > 0 ? (
                  filteredRequisitions.map((req) => {
                    const isSelected = selectedTicketId === req.ticket_id;
                    const isAnomaly = req.requested_quantity > req.predicted_quantity * 1.05;

                    return (
                      <tr
                        key={req.ticket_id}
                        onClick={() => onSelectRequisition(req)}
                        className={`group cursor-pointer transition hover:bg-amber-500/5 ${
                          isSelected ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        {/* Ticket & Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 group-hover:text-amber-500 dark:text-slate-100 tabular-nums">
                            {req.requisition_number}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-subtext-dark">
                            {req.created_at}
                          </div>
                        </td>

                        {/* Block */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Building className="h-3 w-3" />
                            {req.block?.block_name || 'Caesar'}
                          </span>
                        </td>

                        {/* Material */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {lang === 'tr' ? req.material?.item_name_tr : req.material?.item_name_en}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-subtext-dark tabular-nums">
                            {formatCurrency(req.material?.base_cost_eur || 0, lang)} / {req.material?.unit_of_measure}
                          </div>
                        </td>

                        {/* Volume & Predicted */}
                        <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {formatNumber(req.architectural_volume, lang)} m³
                          </div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                            {formatNumber(req.predicted_quantity, lang)} {req.material?.unit_of_measure}
                          </div>
                        </td>

                        {/* Requested & Variance Pill */}
                        <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                          <div className="font-bold text-slate-900 dark:text-slate-50">
                            {formatNumber(req.requested_quantity, lang)} {req.material?.unit_of_measure}
                          </div>
                          <div className="mt-0.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isAnomaly
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isAnomaly && <AlertTriangle className="h-2.5 w-2.5" />}
                              {req.variance_percentage > 0 ? `+${req.variance_percentage}%` : `${req.variance_percentage}%`}
                            </span>
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-amber-400 tabular-nums">
                          {formatCurrency(req.estimated_total_eur, lang)}
                        </td>

                        {/* Tier */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getTierBadge(req.approval_tier)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(req.status)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRequisition(req);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95"
                          >
                            <span>{t.table.inspectBtn}</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {t.table.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE ACTIVITY CARDS (block md:hidden) */}
          <div className="mt-4 block md:hidden space-y-3">
            {filteredRequisitions.length > 0 ? (
              filteredRequisitions.map((req) => {
                const isSelected = selectedTicketId === req.ticket_id;
                const isAnomaly = req.requested_quantity > req.predicted_quantity * 1.05;

                return (
                  <div
                    key={req.ticket_id}
                    onClick={() => onSelectRequisition(req)}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-md'
                        : 'border-slate-200 bg-slate-50 dark:border-border-dark dark:bg-surface-dark'
                    }`}
                  >
                    {/* Header Row: Ticket + Block */}
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900 dark:text-amber-400 tabular-nums">
                        {req.requisition_number}
                      </div>
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-500 uppercase">
                        {req.block?.block_name}
                      </span>
                    </div>

                    {/* Material Title */}
                    <div className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                      {lang === 'tr' ? req.material?.item_name_tr : req.material?.item_name_en}
                    </div>

                    {/* 2-Column Metadata Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] border-t border-slate-200/80 dark:border-slate-800 pt-2.5">
                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-semibold">
                          {t.mobileCard.volume} / {t.mobileCard.predicted}:
                        </span>
                        <div className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                          {req.architectural_volume} m³ &bull; {formatNumber(req.predicted_quantity, lang)} {req.material?.unit_of_measure}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-semibold">
                          {t.mobileCard.requested} &amp; {t.mobileCard.variance}:
                        </span>
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatNumber(req.requested_quantity, lang)}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isAnomaly ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'
                          }`}>
                            {req.variance_percentage > 0 ? `+${req.variance_percentage}%` : `${req.variance_percentage}%`}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-semibold">
                          {t.mobileCard.cost}:
                        </span>
                        <div className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatCurrency(req.estimated_total_eur, lang)}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-semibold">
                          {t.mobileCard.status}:
                        </span>
                        <div className="mt-0.5">
                          {getTierBadge(req.approval_tier)}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRequisition(req);
                        }}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500/15 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/25 active:scale-95"
                      >
                        <span>{t.mobileCard.inspectAction}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                {t.table.empty}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
