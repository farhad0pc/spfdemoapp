"use client";

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Building,
  Check,
  XCircle,
  Truck
} from 'lucide-react';
import {
  PurchaseRequisition,
  RequisitionStatus,
  CaesarBlock,
  ApprovalTier
} from '@/types/requisition';

interface RequisitionTableProps {
  requisitions: PurchaseRequisition[];
  onSelectRequisition: (req: PurchaseRequisition) => void;
  selectedTicketId?: string;
}

export const RequisitionTable: React.FC<RequisitionTableProps> = ({
  requisitions,
  onSelectRequisition,
  selectedTicketId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequisitionStatus>('all');
  const [blockFilter, setBlockFilter] = useState<'all' | CaesarBlock>('all');
  const [tierFilter, setTierFilter] = useState<'all' | ApprovalTier>('all');

  const filteredRequisitions = requisitions.filter((req) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      req.requisition_number.toLowerCase().includes(term) ||
      (req.material?.item_name_tr.toLowerCase().includes(term) ?? false) ||
      (req.material?.item_name_en.toLowerCase().includes(term) ?? false) ||
      (req.block?.block_name.toLowerCase().includes(term) ?? false);

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesBlock = blockFilter === 'all' || req.block?.block_name === blockFilter;
    const matchesTier = tierFilter === 'all' || req.approval_tier === tierFilter;

    return matchesSearch && matchesStatus && matchesBlock && matchesTier;
  });

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Onaylandı / Approved
          </span>
        );
      case 'PENDING_PURCHASING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <Clock className="h-3 w-3 animate-spin" /> Satın Alma Onayı (Tier 1)
          </span>
        );
      case 'PENDING_TIER2':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
            <Clock className="h-3 w-3 animate-spin" /> Proje Direktörü (Tier 2)
          </span>
        );
      case 'PENDING_TIER3':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
            <ShieldAlert className="h-3 w-3" /> Yönetim Kurulu Onayı (Tier 3)
          </span>
        );
      case 'ORDER_PLACED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
            <Truck className="h-3 w-3" /> Sipariş Verildi
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Check className="h-3 w-3" /> Şantiyeye Teslim
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-400">
            <XCircle className="h-3 w-3" /> Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {status}
          </span>
        );
    }
  };

  const getTierBadge = (tier: ApprovalTier) => {
    switch (tier) {
      case 1:
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-950/60 dark:text-blue-400">
            Tier 1 (&lt;€2.5k)
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-950/60 dark:text-purple-400">
            Tier 2 (&lt;€15k)
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-700/10 dark:bg-rose-950/60 dark:text-rose-400">
            Tier 3 (&gt;€15k)
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Title & Filter Bar */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Malzeme Talep &amp; Onay Alt-Defteri <span className="text-xs font-normal text-zinc-500">/ Requisition Sub-Ledger</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Caesar Resort &amp; Spa inşaat blokları canlı sipariş ve hakediş kütüğü
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Talep no, malzeme veya blok ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          {/* Block Filter */}
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value as CaesarBlock | 'all')}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 px-2.5 text-xs text-zinc-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
          >
            <option value="all">Tüm Bloklar</option>
            <option value="ZENO">ZENO (Kule)</option>
            <option value="PHUKET">PHUKET (Villa)</option>
            <option value="PATTAYA">PATTAYA (Daire)</option>
            <option value="KOH SAMUI">KOH SAMUI (Ticari)</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ApprovalTier))}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 px-2.5 text-xs text-zinc-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
          >
            <option value="all">Tüm Kademeler (Tiers)</option>
            <option value="1">Tier 1 (&lt; €2.5k)</option>
            <option value="2">Tier 2 (€2.5k - €15k)</option>
            <option value="3">Tier 3 (&gt; €15k)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | 'all')}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 px-2.5 text-xs text-zinc-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="PENDING_PURCHASING">Satın Alma Onayında</option>
            <option value="PENDING_TIER2">Proje Direktörü Onayında</option>
            <option value="PENDING_TIER3">Yönetim Kurulu Onayında</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="ORDER_PLACED">Sipariş Verildi</option>
            <option value="DELIVERED">Teslim Edildi</option>
            <option value="REJECTED">Reddedildi</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200/80 bg-zinc-50/75 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="py-3 px-4 font-semibold">Talep No / Tarih</th>
              <th className="py-3 px-3 font-semibold">Şantiye Bloğu</th>
              <th className="py-3 px-4 font-semibold">Katalog Malzemesi</th>
              <th className="py-3 px-3 font-semibold">Hacim &amp; Tahmin</th>
              <th className="py-3 px-3 font-semibold">Talep &amp; Sapma</th>
              <th className="py-3 px-3 font-semibold">Tahmini Tutar</th>
              <th className="py-3 px-3 font-semibold">Kademe</th>
              <th className="py-3 px-3 font-semibold">Durum</th>
              <th className="py-3 px-4 text-right font-semibold">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {filteredRequisitions.length > 0 ? (
              filteredRequisitions.map((req) => {
                const isSelected = selectedTicketId === req.ticket_id;
                const isAnomaly = req.requested_quantity > req.predicted_quantity * 1.05;

                return (
                  <tr
                    key={req.ticket_id}
                    onClick={() => onSelectRequisition(req)}
                    className={`group cursor-pointer transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    {/* Ticket & Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                        {req.requisition_number}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {req.created_at}
                      </div>
                    </td>

                    {/* Block */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Building className="h-3 w-3" />
                        {req.block?.block_name || 'Caesar'}
                      </span>
                    </td>

                    {/* Material */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {req.material?.item_name_tr}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {req.material?.item_name_en} &bull; €{req.material?.base_cost_eur.toFixed(2)} / {req.material?.unit_of_measure}
                      </div>
                    </td>

                    {/* Volume & Predicted */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {req.architectural_volume} m³
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Tahmin: {req.predicted_quantity.toLocaleString('tr-TR')} {req.material?.unit_of_measure}
                      </div>
                    </td>

                    {/* Requested & Variance Pill */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-zinc-900 dark:text-zinc-50">
                        {req.requested_quantity.toLocaleString('tr-TR')} {req.material?.unit_of_measure}
                      </div>
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isAnomaly
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isAnomaly && <AlertTriangle className="h-2.5 w-2.5" />}
                          {req.variance_percentage > 0 ? `+${req.variance_percentage}%` : `${req.variance_percentage}%`}
                        </span>
                      </div>
                    </td>

                    {/* Total EUR */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-zinc-900 dark:text-zinc-50">
                        €{req.estimated_total_eur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
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
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                      >
                        <span>İncele &bull; Onay</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Filtre kriterlerine uygun talep kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
