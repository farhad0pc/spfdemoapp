"use client";

import { formatTicketId } from "@/lib/formatUtils";
import React from 'react';
import { PurchaseRequisition, UserRole, CaesarBlock } from '@/types/requisition';

export interface RequisitionTableProps {
  onExecutiveDelete?: (ticketId: string) => void;
  onExecutiveEdit?: (ticketId: string, updated: { requested_quantity?: number; block_name?: string; justification?: string }) => void;
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
  onExecutiveDelete,
  onExecutiveEdit,
  currentRole = "FOREMAN",
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
  const isTR = lang?.toUpperCase() === "TR";
  const isExecutive = currentRole === "EXECUTIVE";
  const [editingItem, setEditingItem] = React.useState<PurchaseRequisition | null>(null);
  const [editQty, setEditQty] = React.useState<number>(0);
  const [editBlock, setEditBlock] = React.useState<string>("");
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
    <div className="w-full bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange && onSearchQueryChange(e.target.value)}
            placeholder={isTR ? 'Talep No, Kalem veya Gerekçe Ara...' : 'Search Ticket, Item, or Justification...'}
            className="w-full md:w-72 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-amber-400/50"
          />
          <select
            value={blockFilter}
            onChange={(e) => onBlockFilterChange && onBlockFilterChange(e.target.value)}
            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400/50"
          >
            <option value="ALL" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">{isTR ? 'Tüm Bloklar' : 'All Blocks'}</option>
            <option value="ZENO" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">ZENO</option>
            <option value="PHUKET" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">PHUKET</option>
            <option value="PATTAYA" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">PATTAYA</option>
            <option value="KOH SAMUI" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">KOH SAMUI</option>
          </select>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{isTR ? 'Realtime Sub-Ledger Aktif' : 'Realtime Sub-Ledger Live'}</span>
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-white/5 uppercase font-medium text-slate-500 dark:text-slate-400 text-[11px] tracking-wider border-b border-slate-200 dark:border-white/10">
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
                  <td className="py-3 px-4 font-semibold tracking-wide text-amber-400">
    {formatTicketId(item.ticket_id, item.requisition_number)}
  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{item.block_name || item.block_id}</td>
                  <td className="py-3 px-4">
                    <div className="text-slate-900 dark:text-slate-900 dark:text-white font-medium">{item.item_name || item.item_id}</div>
                    {item.justification && (
                      <div className="text-[10px] text-amber-300/80 truncate max-w-xs">{item.justification}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-light tracking-wide">{qty.toLocaleString()} {item.unit || 'units'}</td>
                  <td className="py-3 px-4 text-right font-light tracking-wide">
                    <span className={overrun > 5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {overrun > 0 ? `+${overrun.toFixed(1)}%` : `${overrun.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                    €{(item.total_estimated_eur || item.estimated_total_eur || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleSelect(item)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white text-[11px] transition-colors"
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
            : 'bg-white/[0.02] border border-slate-200 dark:border-slate-800';
          const overrun = item.overrun_percentage ?? item.variance_percentage ?? 0;
          const qty = item.requested_qty ?? item.requested_quantity ?? 0;

          return (
            <div key={itemId} className={`p-3 rounded-lg ${highlightClass} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-light tracking-wide text-xs font-bold text-amber-400">{formatTicketId(item.ticket_id, item.requisition_number)}</span>
                {getStatusBadge(item.status)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-900 dark:text-slate-900 dark:text-white font-medium">{item.item_name || item.item_id} ({item.block_name || item.block_id})</span>
                <span className="text-slate-900 dark:text-slate-900 dark:text-white font-bold tracking-wide">€{(item.total_estimated_eur || item.estimated_total_eur || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
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
              
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSelect(item)}
                  className="px-3 py-1 rounded bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-xs"
                >
                  {isTR ? "İncele" : "Inspect"}
                </button>
                {isExecutive && (
                  <>
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditQty(item.requested_quantity || 0);
                        setEditBlock(item.block_name || item.block_id || "ZENO");
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-semibold border border-amber-500/20"
                    >
                      {isTR ? "Düzenle" : "Edit"}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(isTR ? "Bu talebi silmek istediğinizden emin misiniz?" : "Delete this requisition?")) {
                          if (onExecutiveDelete) onExecutiveDelete(item.ticket_id);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/20"
                    >
                      {isTR ? "Sil" : "Void"}
                    </button>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>
    
      {/* Executive Quick Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-white dark:bg-[#0c111d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                {isTR ? "Yönetim Kurulu Talebi Düzenleme" : "Executive Requisition Revision"}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-light">
                {isTR ? "Talep No:" : "Ticket ID:"} <span className="font-bold text-amber-500">{editingItem.ticket_id}</span>
              </div>
              <div className="text-slate-900 dark:text-white font-medium">
                {editingItem.item_name || editingItem.item_id}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {isTR ? "Revize Talep Miktarı" : "Revised Requested Quantity"}
                </label>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/30 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {isTR ? "Şantiye Bloğu" : "Construction Block"}
                </label>
                <select
                  value={editBlock}
                  onChange={(e) => setEditBlock(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/30 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ZENO">ZENO</option>
                  <option value="PHUKET">PHUKET</option>
                  <option value="PATTAYA">PATTAYA</option>
                  <option value="KOH SAMUI">KOH SAMUI</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {isTR ? "Vazgeç" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  if (onExecutiveEdit && editingItem) {
                    onExecutiveEdit(editingItem.ticket_id, {
                      requested_quantity: editQty,
                      block_name: editBlock,
                    });
                  }
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 uppercase tracking-wider"
              >
                {isTR ? "Değişiklikleri Kaydet" : "Save Revisions"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}