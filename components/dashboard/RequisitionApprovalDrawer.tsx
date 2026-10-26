"use client";

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Building,
  Sparkles,
  Lock,
  KeyRound,
  Calculator
} from 'lucide-react';
import {
  PurchaseRequisition,
  CorporateRole,
  getTierDescriptor
} from '@/types/requisition';
import {
  Language,
  DICTIONARY,
  formatCurrency,
  formatNumber
} from '@/lib/i18n';

interface RequisitionApprovalDrawerProps {
  requisition: PurchaseRequisition | null;
  currentRole: CorporateRole;
  onClose: () => void;
  onApprove: (ticketId: string, comments: string) => void;
  onReject: (ticketId: string, comments: string) => void;
  lang: Language;
}

export const RequisitionApprovalDrawer: React.FC<RequisitionApprovalDrawerProps> = ({
  requisition,
  currentRole,
  onClose,
  onApprove,
  onReject,
  lang,
}) => {
  const t = DICTIONARY[lang];
  const [approvalComment, setApprovalComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  if (!requisition) return null;

  const isAnomaly = requisition.requested_quantity > requisition.predicted_quantity * 1.05;
  const tierInfo = getTierDescriptor(requisition.approval_tier);

  // Authority matrix:
  // EXECUTIVE: Tier 1, 2, 3
  // PROJECT_DIRECTOR: Tier 1, 2
  // PURCHASING_MGR: Tier 1
  // FOREMAN: None
  const hasAuthority = (() => {
    if (currentRole === 'EXECUTIVE') return true;
    if (currentRole === 'PROJECT_DIRECTOR') return requisition.approval_tier <= 2;
    if (currentRole === 'PURCHASING_MGR') return requisition.approval_tier === 1;
    return false;
  })();

  const isActionable =
    requisition.status === 'PENDING_PURCHASING' ||
    requisition.status === 'PENDING_TIER2' ||
    requisition.status === 'PENDING_TIER3';

  const handleApproveAction = () => {
    setIsSigning(true);
    setTimeout(() => {
      onApprove(requisition.ticket_id, approvalComment || 'Teknik ve bütçe uygunluğu onaylandı.');
      setIsSigning(false);
      onClose();
    }, 500);
  };

  const handleRejectAction = () => {
    setIsSigning(true);
    setTimeout(() => {
      onReject(requisition.ticket_id, approvalComment || 'Bütçe/mühendislik kriterlerini karşılamadı.');
      setIsSigning(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md transition-opacity">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 dark:border-border-dark dark:bg-surface-dark">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-border-dark px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <Building className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-amber-400 tabular-nums">
                {requisition.requisition_number}
              </h2>
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500 uppercase">
                {requisition.block?.block_name}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-subtext-dark">
              {requisition.foreman?.name || 'Saha Şefi'} &bull; {requisition.created_at}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Material & Financial Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-border-dark dark:bg-elevation-dark">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {requisition.material?.category}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'tr' ? requisition.material?.item_name_tr : requisition.material?.item_name_en}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">
                  {t.drawer.contractedUnitPrice}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatCurrency(requisition.material?.base_cost_eur || 0, lang)} / {requisition.material?.unit_of_measure}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/80 dark:border-border-dark pt-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">{t.drawer.architecturalVolume}:</span>
                <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatNumber(requisition.architectural_volume, lang)} m³
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">{t.drawer.predictedQuantity}:</span>
                <div className="font-bold text-indigo-500 tabular-nums">
                  {formatNumber(requisition.predicted_quantity, lang)} {requisition.material?.unit_of_measure}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">{t.drawer.estimatedTotal}:</span>
                <div className="font-bold text-amber-500 tabular-nums">
                  {formatCurrency(requisition.estimated_total_eur, lang)}
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Invariant Equation */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold uppercase text-slate-900 dark:text-slate-100">
                <Calculator className="h-4 w-4 text-indigo-500" />
                <span>{t.drawer.equationTitle}</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                isAnomaly ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
              }`}>
                {isAnomaly ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {requisition.variance_percentage > 0 ? `+${requisition.variance_percentage}%` : `${requisition.variance_percentage}%`}
              </span>
            </div>

            <div className="mt-2.5 rounded-lg bg-slate-100 p-3 font-mono text-[11px] text-slate-800 dark:bg-black/60 dark:text-slate-300">
              <p>predicted = {requisition.architectural_volume} m³ &times; {requisition.material?.consumption_rate} = {requisition.predicted_quantity} {requisition.material?.unit_of_measure}</p>
              <p className="mt-1">requested = {requisition.requested_quantity} {requisition.material?.unit_of_measure}</p>
            </div>

            {/* Justification if Anomaly */}
            {isAnomaly && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                <div className="font-bold text-rose-500 uppercase flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{t.drawer.justificationTitle}:</span>
                </div>
                <p className="mt-1 text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  &ldquo;{requisition.variance_justification || 'Belirtilmedi'}&rdquo;
                </p>

                {/* Gemini 2.0 Synthesis */}
                <div className="mt-2.5 rounded-md bg-white/80 p-2.5 dark:bg-elevation-dark border border-amber-500/30">
                  <div className="flex items-center gap-1 font-bold text-amber-500 text-[10px] uppercase">
                    <Sparkles className="h-3 w-3" />
                    <span>{t.drawer.geminiTitle}</span>
                  </div>
                  <p className="mt-1 leading-snug text-slate-700 dark:text-slate-300">
                    {t.drawer.geminiText}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3-Tier Governance Matrix */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>{t.drawer.governanceTitle}</span>
              </span>
              <span className="font-bold text-amber-500">
                Tier {requisition.approval_tier} ({tierInfo.threshold})
              </span>
            </div>

            {/* Matrix Columns */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className={`rounded-lg border p-2 ${
                requisition.approval_tier === 1
                  ? 'border-blue-500 bg-blue-500/20 font-bold text-blue-400'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40'
              }`}>
                <div className="uppercase font-bold">Tier 1 (&lt;€2.5k)</div>
                <div className="mt-0.5 font-bold">Satınalma Md.</div>
              </div>
              <div className={`rounded-lg border p-2 ${
                requisition.approval_tier === 2
                  ? 'border-purple-500 bg-purple-500/20 font-bold text-purple-400'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40'
              }`}>
                <div className="uppercase font-bold">Tier 2 (&lt;€15k)</div>
                <div className="mt-0.5 font-bold">Proje Direktörü</div>
              </div>
              <div className={`rounded-lg border p-2 ${
                requisition.approval_tier === 3
                  ? 'border-rose-500 bg-rose-500/20 font-bold text-rose-400'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40'
              }`}>
                <div className="uppercase font-bold">Tier 3 (&gt;€15k)</div>
                <div className="mt-0.5 font-bold">Yönetim Kurulu</div>
              </div>
            </div>

            {/* Authority Check */}
            <div className="mt-3">
              {hasAuthority ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{t.drawer.authorizedBanner} ({currentRole})</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/40">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-[11px]">
                      {t.drawer.blockedBannerTitle}
                    </div>
                    <p className="mt-0.5 text-[11px] font-normal leading-relaxed">
                      {t.drawer.blockedBannerDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comment Field if Authorized */}
          {hasAuthority && isActionable && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t.drawer.commentLabel}
              </label>
              <input
                type="text"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={t.drawer.commentPlaceholder}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-elevation-dark dark:text-slate-100 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 dark:border-border-dark px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-elevation-dark/50">
          <div className="text-[11px] text-slate-500">
            {t.drawer.ledgerStatus}: <strong className="text-slate-800 dark:text-amber-400">{requisition.status}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-bold uppercase text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.drawer.close}
            </button>

            {hasAuthority && isActionable && (
              <>
                <button
                  onClick={handleRejectAction}
                  disabled={isSigning}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-bold uppercase text-red-600 dark:text-red-400 hover:bg-red-500/20"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{t.drawer.rejectBtn}</span>
                </button>

                <button
                  onClick={handleApproveAction}
                  disabled={isSigning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{isSigning ? 'İmzalanıyor...' : t.drawer.signOffBtn}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
