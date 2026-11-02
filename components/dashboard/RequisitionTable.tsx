'use client';

import React from 'react';
import { PurchaseRequisition, UserRole, CaesarBlock } from '@/types/requisition';

export interface RequisitionTableProps {
  requisitions: PurchaseRequisition[];
  currentRole?: UserRole;
  lang?: string;
  blockFilter?: string;
  onBlockFilterChange?: (block: CaesarBlock | string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSelectRequisition?: (requisition: PurchaseRequisition) => void;
  onSelectTicket?: (requisition: PurchaseRequisition) => void;
  highlightedTicketId?: string | null;
  [key: string]: unknown;
}

export default function RequisitionTable({
  requisitions = [],
  lang = 'EN',
  blockFilter = 'ALL',
  onBlockFilterChange,
  searchQuery = '',
  onSearchQueryChange,
  onSelectRequisition,
  onSelectTicket,
  highlightedTicketId,
}: RequisitionTableProps) {
  const isTR = lang?.toUpperCase() === 'TR';
  const handleSelect = onSelectTicket || onSelectRequisition || (() => {});

  const filteredRequisitions = requisitions.filter((item) => {
    const blockVal = item.block_name || item.block_id || '';
    const itemVal = item.item_name || item.item_id || '';
    const matchesBlock =
      !blockFilter || blockFilter === 'ALL' || blockFilter === 'all' || blockVal === blockFilter;
    const matchesSearch =
      !searchQuery ||
      (item.requisition_number && item.requisition_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.ticket_id && item.ticket_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      itemVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_name && item.item_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.block_name && item.block_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.justification && item.justification.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.variance_justification && item.variance_justification.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBlock && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {isTR ? 'ONAYLANDI' : 'APPROVED'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {isTR ? 'REDDEDİLDİ' : 'REJECTED'}
          </span>
        );
      case 'PENDING_TIER2':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {isTR ? 'DİREKTÖR ONAYI' : 'PENDING TIER 2'}
          </span>
        );
      case 'PENDING_TIER3':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {isTR ? 'YÖNETİM KURULU' : 'PENDING EXECUTIVE'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {isTR ? 'SATIN ALMA' : 'PENDING PURCHASING'}
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-[#090d16] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange && onSearchQueryChange(e.target.value)}
            placeholder={isTR ? 'Talep No, Kalem veya Gerekçe Ara...' : 'Search Ticket, Item, or Justification...'}
            className="w-full md:w-72 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/50"
          />
          <select
            value={blockFilter}
            onChange={(e) => onBlockFilterChange && onBlockFilterChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
          >
            <option value="ALL" className="bg-[#090d16] text-white">{isTR ? 'Tüm Bloklar' : 'All Blocks'}</option>
            <option value="ZENO" className="bg-[#090d16] text-white">ZENO</option>
            <option value="PHUKET" className="bg-[#090d16] text-white">PHUKET</option>
            <option value="PATTAYA" className="bg-[#090d16] text-white">PATTAYA</option>
            <option value="KOH SAMUI" className="bg-[#090d16] text-white">KOH SAMUI</option>
          </select>
        </div>
        <div className="text-xs text-white/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{isTR ? 'Realtime Sub-Ledger Aktif' : 'Realtime Sub-Ledger Live'}</span>
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs text-white/70">
          <thead className="bg-white/5 uppercase font-medium text-white/50 text-[11px] tracking-wider border-b border-white/10">
            <tr>
              <th className="py-3 px-4">{isTR ? 'TALEP NO' : 'TICKET ID'}</th>
              <th className="py-3 px-4">{isTR ? 'BLOK' : 'BLOCK'}</th>
              <th className="py-3 px-4">{isTR ? 'MALZEME KALEMİ' : 'MATERIAL ITEM'}</th>
              <th className="py-3 px-4 text-right">{isTR ? 'TALEP EDİLEN' : 'REQUESTED'}</th>
              <th className="py-3 px-4 text-right">{isTR ? 'SAPMA %' : 'OVERRUN %'}</th>
              <th className="py-3 px-4 text-right">{isTR ? 'TOPLAM (EUR)' : 'TOTAL (EUR)'}</th>
              <th className="py-3 px-4 text-center">{isTR ? 'DURUM' : 'STATUS'}</th>
              <th className="py-3 px-4 text-center">{isTR ? 'EYLEM' : 'ACTION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRequisitions.map((item) => {
              const itemId = item.id || item.ticket_id;
              const isHighlighted = highlightedTicketId === itemId;
              const highlightClass = isHighlighted
                ? 'ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/20 bg-emerald-500/10 transition-all duration-700 animate-pulse'
                : 'hover:bg-white/[0.02]';
              const overrun = item.overrun_percentage ?? item.variance_percentage ?? 0;
              const qty = item.requested_qty ?? item.requested_quantity ?? 0;

              return (
                <tr key={itemId} className={`transition-colors ${highlightClass}`}>
                  <td className="py-3 px-4 font-mono font-semibold text-amber-400">
    {item.requisition_number || (item.ticket_id.startsWith("req_") ? item.ticket_id.toUpperCase() : "REQ-202610-" + item.ticket_id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase())}
  </td>
                  <td className="py-3 px-4 font-semibold text-white">{item.block_name || item.block_id}</td>
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">{item.item_name || item.item_id}</div>
                    {item.justification && (
                      <div className="text-[10px] text-amber-300/80 truncate max-w-xs">{item.justification}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{qty.toLocaleString()} {item.unit || 'units'}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={overrun > 5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {overrun > 0 ? `+${overrun.toFixed(1)}%` : `${overrun.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-white">
                    €{(item.total_estimated_eur || item.estimated_total_eur || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleSelect(item)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors"
                    >
                      {isTR ? 'Detay' : 'Details'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden p-3 space-y-3">
        {filteredRequisitions.map((item) => {
          const itemId = item.id || item.ticket_id;
          const isHighlighted = highlightedTicketId === itemId;
          const highlightClass = isHighlighted
            ? 'ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/20 bg-emerald-500/10 transition-all duration-700 animate-pulse'
            : 'bg-white/[0.02] border border-white/5';
          const overrun = item.overrun_percentage ?? item.variance_percentage ?? 0;
          const qty = item.requested_qty ?? item.requested_quantity ?? 0;

          return (
            <div key={itemId} className={`p-3 rounded-lg ${highlightClass} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400">{item.ticket_id}</span>
                {getStatusBadge(item.status)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">{item.item_name || item.item_id} ({item.block_name || item.block_id})</span>
                <span className="text-white font-mono font-bold">€{(item.total_estimated_eur || item.estimated_total_eur || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>{qty.toLocaleString()} {item.unit || 'units'}</span>
                <span className={overrun > 5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {overrun > 0 ? `+${overrun.toFixed(1)}%` : `${overrun.toFixed(1)}%`}
                </span>
              </div>
              {item.justification && (
                <div className="text-[10px] text-amber-300/80 italic border-l-2 border-amber-400/30 pl-2">
                  {item.justification}
                </div>
              )}
              <div className="pt-2 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => handleSelect(item)}
                  className="px-3 py-1 rounded bg-white/10 text-white text-xs"
                >
                  {isTR ? 'İncele' : 'Inspect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
