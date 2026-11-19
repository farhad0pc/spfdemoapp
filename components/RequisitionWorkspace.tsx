'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  PurchaseRequisition, 
  RoleTier, 
  RequisitionApprovalLog,
  PortfolioProject,
  PortfolioBuilding
} from '@/types/requisition';
import ExecutiveTelemetryStrip from '@/components/ExecutiveTelemetryStrip';
import { DICTIONARY } from '@/lib/i18n';

interface RequisitionWorkspaceProps {
  requisitions: PurchaseRequisition[];
  portfolioProjects?: PortfolioProject[];
  portfolioBuildings?: PortfolioBuilding[];
  currentRole: RoleTier;
  lang: 'tr' | 'en';
  onOpenIntakeEngine: () => void;
  onUpdateQuota: (
    ticketId: string, 
    quotaEur: number, 
    supplierName: string, 
    purchasingNotes: string,
    escalateToExec?: boolean
  ) => Promise<void>;
  onApproveByTechManager: (ticketId: string) => Promise<void>;
  onExecutiveAction?: (ticketId: string, action: 'APPROVED' | 'REJECTED') => Promise<void>;
  onBatchAction?: (ticketIds: string[], action: 'APPROVED' | 'REJECTED') => Promise<void>;
}

export default function RequisitionWorkspace({
  requisitions,
  portfolioProjects = [],
  portfolioBuildings = [],
  currentRole,
  lang,
  onOpenIntakeEngine,
  onUpdateQuota,
  onApproveByTechManager,
  onExecutiveAction,
  onBatchAction,
}: RequisitionWorkspaceProps) {
  const d = DICTIONARY[lang].requisitions;
  const common = DICTIONARY[lang].common;

  const [selectedTicket, setSelectedTicket] = useState<PurchaseRequisition | null>(null);
  const [quotaInput, setQuotaInput] = useState<string>('');
  const [supplierInput, setSupplierInput] = useState<string>('');
  const [purchasingNotesInput, setPurchasingNotesInput] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<RequisitionApprovalLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // Build O(1) Portfolio Lookup Map
  const buildingLookup = useMemo(() => {
    const bMap = new Map<string, { building: PortfolioBuilding; project?: PortfolioProject }>();
    const pMap = new Map<string, PortfolioProject>();
    portfolioProjects.forEach((p) => pMap.set(p.project_id, p));
    portfolioBuildings.forEach((b) => {
      bMap.set(b.building_id, {
        building: b,
        project: pMap.get(b.project_id),
      });
    });
    return bMap;
  }, [portfolioProjects, portfolioBuildings]);

  const normalizeLocaleText = (text: string, currentLang: 'tr' | 'en'): string => {
    if (!text) return '';
    return currentLang === 'tr' ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();
  };

  const normalizedFilter = normalizeLocaleText(filterText, lang);

  const filteredTickets = requisitions.filter((req) => {
    const rawItemName = lang === 'tr'
      ? (req.catalog_item?.item_name_tr || '')
      : (req.catalog_item?.item_name_en || req.catalog_item?.item_name_tr || '');

    const resolved = buildingLookup.get(req.location_block_id);
    const projectName = resolved?.project?.project_name || '';
    const buildingName = resolved?.building?.building_name || '';

    const normalizedTicketId = normalizeLocaleText(req.ticket_id, lang);
    const normalizedBlock = normalizeLocaleText(req.location_block_id, lang);
    const normalizedName = normalizeLocaleText(rawItemName, lang);
    const normalizedProj = normalizeLocaleText(projectName, lang);
    const normalizedBld = normalizeLocaleText(buildingName, lang);

    const matchesText =
      normalizedTicketId.includes(normalizedFilter) ||
      normalizedBlock.includes(normalizedFilter) ||
      normalizedName.includes(normalizedFilter) ||
      normalizedProj.includes(normalizedFilter) ||
      normalizedBld.includes(normalizedFilter);

    const matchesStatus = statusFilter === 'ALL' || req.live_status === statusFilter;
    return matchesText && matchesStatus;
  });

  const fetchAuditLogs = useCallback(async (requisitionId: string) => {
    setLogsLoading(true);
    const { data } = await supabase
      .from('requisition_approvals')
      .select('*')
      .eq('requisition_id', requisitionId)
      .order('created_at', { ascending: false });

    if (data) {
      setAuditLogs(data as RequisitionApprovalLog[]);
    }
    setLogsLoading(false);
  }, []);

  const handleSelectTicket = (ticket: PurchaseRequisition) => {
    setSelectedTicket(ticket);
    setQuotaInput(ticket.purchasing_actual_quota_eur?.toString() || '');
    setSupplierInput((ticket.custom_technical_specs?.supplier_name as string) || '');
    setPurchasingNotesInput((ticket.custom_technical_specs?.purchasing_notes as string) || '');
    void fetchAuditLogs(ticket.id);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map((t) => t.id));
    }
  };

  const handleExecuteBatch = async (action: 'APPROVED' | 'REJECTED') => {
    if (!onBatchAction || selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await onBatchAction(selectedIds, action);
      setSelectedIds([]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveQuota = async (escalateToExec: boolean = false) => {
    if (!selectedTicket || !quotaInput) return;
    setActionLoading(true);
    try {
      await onUpdateQuota(
        selectedTicket.id, 
        Number(quotaInput), 
        supplierInput, 
        purchasingNotesInput, 
        escalateToExec
      );
      setSelectedTicket(null);
      setQuotaInput('');
      setSupplierInput('');
      setPurchasingNotesInput('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTechApproval = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await onApproveByTechManager(ticketId);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="font-sans text-slate-800 dark:text-slate-100 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            {d.title}
          </h1>
          <p className="text-xs font-light text-slate-500 dark:text-slate-400 mt-1">
            {d.subtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {(currentRole === 'TECH_OFFICE_USER' || currentRole === 'TECH_OFFICE_MANAGER' || currentRole === 'SYSTEM_ADMIN') && (
            <button
              onClick={onOpenIntakeEngine}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>{d.btnNewReq}</span>
            </button>
          )}
        </div>
      </div>

      {currentRole === 'EXECUTIVE' && (
        <ExecutiveTelemetryStrip requisitions={requisitions} />
      )}

      {/* Batch Controls Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3 text-xs font-light">
            <span className="font-bold bg-blue-600 px-2 py-0.5 rounded-md font-mono">
              {selectedIds.length}
            </span>
            <span>{d.batchSelected}</span>
          </div>
          <div className="flex items-center space-x-2">
            {currentRole === 'EXECUTIVE' && onBatchAction && (
              <>
                <button
                  onClick={() => handleExecuteBatch('APPROVED')}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  {d.batchApprove}
                </button>
                <button
                  onClick={() => handleExecuteBatch('REJECTED')}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  {d.batchReject}
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs font-light px-2 cursor-pointer"
            >
              {d.batchClear}
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <input
            type="text"
            placeholder={d.searchPlaceholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="text-xs font-light px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-full md:w-80 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{d.allStatuses}</option>
            <option value="DRAFTING">DRAFTING</option>
            <option value="TECH_REVIEW">TECH_REVIEW</option>
            <option value="PURCHASING_SOURCING">PURCHASING_SOURCING</option>
            <option value="EXECUTIVE_RATIFICATION">EXECUTIVE_RATIFICATION</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="text-xs font-light text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{filteredTickets.length}</span> {lang === 'tr' ? 'kayıt listeleniyor' : 'records found'}
        </div>
      </div>

      {/* Requisition Sub-Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredTickets.length}
                    onChange={handleSelectAll}
                    className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4">{d.thTicketId}</th>
                <th className="py-3 px-4">{d.thLocation}</th>
                <th className="py-3 px-4">{d.thMaterial}</th>
                <th className="py-3 px-4 text-right">{d.thBudget}</th>
                <th className="py-3 px-4 text-right">{d.thQuote}</th>
                <th className="py-3 px-4">{d.thStatus}</th>
                <th className="py-3 px-4 text-center">{d.thActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-light text-slate-700 dark:text-slate-300">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500 font-light">
                    {d.noRecords}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const isOverrun =
                    ticket.purchasing_actual_quota_eur !== null &&
                    ticket.purchasing_actual_quota_eur > ticket.tech_approved_budget_eur;

                  const resolved = buildingLookup.get(ticket.location_block_id);

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ticket.id)}
                          onChange={() => handleToggleSelect(ticket.id)}
                          className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">{ticket.ticket_id}</td>
                      <td className="py-3 px-4">
                        {resolved ? (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {resolved.project?.project_name ? `${resolved.project.project_name} • ` : ''}
                              {resolved.building.building_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60 font-bold">
                                {ticket.location_block_id}
                              </span>
                              {resolved.building.building_type && (
                                <span className="text-[10px] text-slate-400 font-light truncate max-w-[140px]">
                                  {resolved.building.building_type}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {ticket.location_block_id}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {lang === 'tr' ? (ticket.catalog_item?.item_name_tr || '—') : (ticket.catalog_item?.item_name_en || ticket.catalog_item?.item_name_tr || '—')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-light">
                          {ticket.catalog_item?.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-light text-slate-900 dark:text-white">
                        €{Number(ticket.tech_approved_budget_eur).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ticket.purchasing_actual_quota_eur !== null ? (
                          <span className={`font-light ${isOverrun ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            €{Number(ticket.purchasing_actual_quota_eur).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            {isOverrun && <span className="block text-[10px] text-red-500 font-light">{d.overrunBadge}</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-light">{d.awaitingQuote}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {ticket.live_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        {currentRole === 'TECH_OFFICE_MANAGER' && (ticket.live_status === 'DRAFTING' || ticket.live_status === 'TECH_REVIEW') && (
                          <button
                            onClick={() => handleTechApproval(ticket.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                          >
                            {lang === 'tr' ? 'Bütçeyi Onayla' : 'Approve Budget'}
                          </button>
                        )}
                        <button
                          onClick={() => handleSelectTicket(ticket)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-md transition-colors border border-blue-200 dark:border-blue-900 cursor-pointer"
                        >
                          {d.btnInspect}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliding History Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedTicket.ticket_id}</h3>
                  <p className="text-xs font-light text-slate-500 dark:text-slate-400">
                    {lang === 'tr' ? 'Talep Detay ve Süreç Günlüğü' : 'Requisition Dossier & Process History'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs font-light">
                {/* Location dossier card */}
                {(() => {
                  const resolved = buildingLookup.get(selectedTicket.location_block_id);
                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {lang === 'tr' ? 'Lokasyon / Proje & Blok:' : 'Location / Project & Block:'}
                        </span>
                        <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/60 font-bold">
                          {selectedTicket.location_block_id}
                        </span>
                      </div>
                      {resolved ? (
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {resolved.project?.project_name} • {resolved.building.building_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-light mt-0.5 flex flex-wrap gap-2">
                            <span><b>{lang === 'tr' ? 'Yapı Tipi:' : 'Type:'}</b> {resolved.building.building_type}</span>
                            {resolved.building.category_name && (
                              <span><b>{lang === 'tr' ? 'Kategori:' : 'Category:'}</b> {resolved.building.category_name}</span>
                            )}
                            {resolved.building.overall_completion_pct !== null && resolved.building.overall_completion_pct !== undefined && (
                              <span><b>{lang === 'tr' ? 'İlerleme:' : 'Progress:'}</b> <span className="font-mono">{resolved.building.overall_completion_pct}%</span></span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {selectedTicket.location_block_id}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Technical specs card */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {lang === 'tr' ? 'Teknik Şartname & Notlar:' : 'Technical Specifications & Notes:'}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300">
                    {(selectedTicket.custom_technical_specs?.special_notes as string) || (lang === 'tr' ? 'Özel not girilmemiş.' : 'No notes recorded.')}
                  </p>
                  <div className="mt-2 text-slate-500 dark:text-slate-400">
                    <b>{lang === 'tr' ? 'Marka Tercihi:' : 'Brand Preference:'}</b> {(selectedTicket.custom_technical_specs?.brand_preference as string) || 'Standard'}
                  </div>
                  <div className="mt-2 text-slate-500 dark:text-slate-400">
                    <b>{lang === 'tr' ? 'Onaylı Bütçe Limiti:' : 'Approved Budget Ceiling:'}</b> €{Number(selectedTicket.tech_approved_budget_eur).toFixed(2)}
                  </div>
                </div>

                {currentRole === 'TECH_OFFICE_MANAGER' && (selectedTicket.live_status === 'DRAFTING' || selectedTicket.live_status === 'TECH_REVIEW') && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                      {lang === 'tr' ? 'Teknik Ofis Bütçe Kilidi ve Devir Onayı' : 'Technical Office Budget Lock & Handover'}
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {lang === 'tr' 
                        ? `Onaylı bütçeyi (€${Number(selectedTicket.tech_approved_budget_eur).toFixed(2)}) kilitler ve Satın Alma birimine devreder.`
                        : `Locks approved ceiling (€${Number(selectedTicket.tech_approved_budget_eur).toFixed(2)}) and hands over to Purchasing.`}
                    </p>
                    <button
                      onClick={() => handleTechApproval(selectedTicket.id)}
                      disabled={actionLoading}
                      className="w-full bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      {actionLoading ? '...' : (lang === 'tr' ? 'Bütçeyi Kilitle ve Devret →' : 'Lock Budget & Handover →')}
                    </button>
                  </div>
                )}

                {(currentRole === 'PURCHASING_AGENT' || currentRole === 'SYSTEM_ADMIN') && (
                  <div className="bg-blue-50/50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                      {lang === 'tr' ? 'Satın Alma Kotası & Tedarikçi Yönetimi' : 'Supplier Sourcing & Quota Entry'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {lang === 'tr' ? 'Tedarikçi teklifini giriniz. Bütçe aşılsa dahi teknik ofise geri dönmez.' : 'Enter supplier quote. Budget overruns remain contained in Purchasing.'}
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'tr' ? 'Tedarikçi Firma Adı:' : 'Supplier Vendor Name:'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sika Akdeniz Ltd."
                        value={supplierInput}
                        onChange={(e) => setSupplierInput(e.target.value)}
                        className="w-full text-xs font-light px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'tr' ? 'Tedarikçi Teklifi (Toplam EUR):' : 'Supplier Quota (Total EUR):'}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 2450.00"
                        value={quotaInput}
                        onChange={(e) => setQuotaInput(e.target.value)}
                        className="w-full text-xs font-light px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'tr' ? 'Satın Alma Notu & Gerekçe:' : 'Purchasing Variance Justification:'}
                      </label>
                      <textarea
                        rows={2}
                        value={purchasingNotesInput}
                        onChange={(e) => setPurchasingNotesInput(e.target.value)}
                        className="w-full text-xs font-light px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {Number(quotaInput) > selectedTicket.tech_approved_budget_eur && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
                        <b>{lang === 'tr' ? 'Bütçe Aşımı:' : 'Budget Overrun:'}</b> <span className="font-light">+€{(Number(quotaInput) - selectedTicket.tech_approved_budget_eur).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleSaveQuota(false)}
                        disabled={actionLoading || !quotaInput}
                        className="flex-1 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer"
                      >
                        {actionLoading ? '...' : (lang === 'tr' ? 'Kotayı Kaydet' : 'Lock Quota')}
                      </button>

                      {Number(quotaInput) > 15000 && (
                        <button
                          onClick={() => handleSaveQuota(true)}
                          disabled={actionLoading || !quotaInput}
                          className="bg-purple-600 text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-purple-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer"
                        >
                          {lang === 'tr' ? 'Yönetim Onayına İlet' : 'Escalate to Board'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {currentRole === 'EXECUTIVE' && selectedTicket.live_status === 'EXECUTIVE_RATIFICATION' && onExecutiveAction && (
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
                    <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase">
                      {lang === 'tr' ? 'Yönetim Kurulu Nihai Onay Masası' : 'Executive Board Fiduciary Ratification'}
                    </h4>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      {lang === 'tr' 
                        ? `Yüksek tutarlı (€${Number(selectedTicket.purchasing_actual_quota_eur).toFixed(2)}) satın alma talebini onaylayın veya iptal ediniz.`
                        : `Ratify or void high-exposure (€${Number(selectedTicket.purchasing_actual_quota_eur).toFixed(2)}) material requisition.`}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onExecutiveAction(selectedTicket.id, 'APPROVED')}
                        disabled={actionLoading}
                        className="flex-1 bg-emerald-600 text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        {lang === 'tr' ? 'Nihai Onay Ver' : 'Ratify Purchase'}
                      </button>
                      <button
                        onClick={() => onExecutiveAction(selectedTicket.id, 'REJECTED')}
                        disabled={actionLoading}
                        className="flex-1 bg-red-600 text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        {lang === 'tr' ? 'Talebi Reddet' : 'Void Requisition'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {lang === 'tr' ? 'Tarihçe ve Denetim Kayıtları' : 'Immutable Audit History'}
                  </h4>
                  {logsLoading ? (
                    <div className="text-[11px] text-slate-400 py-2 font-light">{common.loading}</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-2 font-light">
                      {lang === 'tr' ? 'Henüz denetim kaydı bulunmuyor.' : 'No audit entries recorded yet.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                            <span className="font-mono font-light">{new Date(log.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                          </div>
                          <div className="text-slate-400 font-light truncate">
                            Actor: {log.actor_uuid}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-light font-mono">
                {new Date(selectedTicket.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
