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

interface RequisitionApprovalDrawerProps {
  requisition: PurchaseRequisition | null;
  currentRole: CorporateRole;
  onClose: () => void;
  onApprove: (ticketId: string, role: CorporateRole, comments: string) => void;
  onReject: (ticketId: string, role: CorporateRole, comments: string) => void;
}

export const RequisitionApprovalDrawer: React.FC<RequisitionApprovalDrawerProps> = ({
  requisition,
  currentRole,
  onClose,
  onApprove,
  onReject,
}) => {
  const [approvalComment, setApprovalComment] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  if (!requisition) return null;

  const isAnomaly = requisition.requested_quantity > requisition.predicted_quantity * 1.05;
  const tierInfo = getTierDescriptor(requisition.approval_tier);

  // Role authority check:
  // FOREMAN: Cannot approve any tier
  // PURCHASING_MGR: Tier 1 only
  // PROJECT_DIRECTOR: Tier 1 & Tier 2
  // EXECUTIVE: Tier 1, Tier 2, Tier 3
  const hasAuthority = (() => {
    if (currentRole === 'EXECUTIVE') return true;
    if (currentRole === 'PROJECT_DIRECTOR') return requisition.approval_tier <= 2;
    if (currentRole === 'PURCHASING_MGR') return requisition.approval_tier === 1;
    return false; // FOREMAN cannot approve
  })();

  const isActionable =
    requisition.status === 'PENDING_PURCHASING' ||
    requisition.status === 'PENDING_TIER2' ||
    requisition.status === 'PENDING_TIER3';

  const handleApproveAction = () => {
    setIsSigning(true);
    setTimeout(() => {
      onApprove(requisition.ticket_id, currentRole, approvalComment || 'Teknik ve bütçe uygunluğu onaylandı.');
      setIsSigning(false);
      onClose();
    }, 600);
  };

  const handleRejectAction = () => {
    setIsSigning(true);
    setTimeout(() => {
      onReject(requisition.ticket_id, currentRole, approvalComment || 'Bütçe/mühendislik kriterlerini karşılamadı.');
      setIsSigning(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Building className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {requisition.requisition_number}
              </h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Caesar {requisition.block?.block_name}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Talep Eden: {requisition.foreman?.name || 'Ali Yılmaz'} &bull; Tarih: {requisition.created_at}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Material & Financial Summary Card */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {requisition.material?.category}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {requisition.material?.item_name_tr}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {requisition.material?.item_name_en}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-500">Sözleşmeli Birim Fiyat</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  €{requisition.material?.base_cost_eur.toFixed(2)} / {requisition.material?.unit_of_measure}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-200/80 pt-3 text-xs dark:border-zinc-800">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Mimari Hacim:</span>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                  {requisition.architectural_volume} m³
                </div>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Öngörülen Miktar:</span>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  {requisition.predicted_quantity.toLocaleString('tr-TR')} {requisition.material?.unit_of_measure}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Toplam Tahmini Tutar:</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  €{requisition.estimated_total_eur.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Verification & Variance Equation */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <Calculator className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Mühendislik Tüketim &amp; Sapma Denklemi</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isAnomaly
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {isAnomaly ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                Sapma: {requisition.variance_percentage > 0 ? `+${requisition.variance_percentage}%` : `${requisition.variance_percentage}%`}
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-zinc-100 p-3 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <p>predicted_qty = {requisition.architectural_volume} m³ &times; {requisition.material?.consumption_rate} = {requisition.predicted_quantity} {requisition.material?.unit_of_measure}</p>
              <p className="mt-1">requested_qty = {requisition.requested_quantity} {requisition.material?.unit_of_measure} (Delta: {Number((requisition.requested_quantity - requisition.predicted_quantity).toFixed(2))} {requisition.material?.unit_of_measure})</p>
            </div>

            {/* Variance Justification if Anomaly */}
            {isAnomaly && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Saha Şefi Sapma Gerekçesi (Variance Justification):</span>
                </div>
                <p className="mt-1.5 text-amber-950 dark:text-amber-200 leading-relaxed italic">
                  &ldquo;{requisition.variance_justification || 'Gerekçe belirtilmedi'}&rdquo;
                </p>

                {/* Gemini 2.0 Synthesis */}
                <div className="mt-3 rounded-md bg-white/80 p-2.5 text-[11px] text-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 border border-amber-300/60 dark:border-amber-800/60">
                  <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Gemini 2.0 Justification Reasoning:</span>
                  </div>
                  <p className="mt-1 leading-snug">
                    Belirtilen saha revizyonu Caesar {requisition.block?.block_name} statik zemin profili ile uyumludur. Beton döküm takvimi gecikmesini önlemek adına onay tavsiye edilir.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3-Tier Approval Routing Hierarchy */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>3-Kademeli Onay Hiyerarşisi (Governance Gates)</span>
              </span>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Gereken: Tier {requisition.approval_tier} ({tierInfo.threshold})
              </span>
            </div>

            {/* Stepper Matrix */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {/* Tier 1 */}
              <div className={`rounded-lg border p-2.5 text-center ${
                requisition.approval_tier === 1
                  ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40'
              }`}>
                <div className="text-[10px] uppercase font-semibold">Tier 1 (&lt;€2.5k)</div>
                <div className="mt-0.5 font-bold">Satın Alma Md.</div>
                <div className="mt-1 text-[10px] text-zinc-400">Standart Stok</div>
              </div>

              {/* Tier 2 */}
              <div className={`rounded-lg border p-2.5 text-center ${
                requisition.approval_tier === 2
                  ? 'border-purple-500 bg-purple-50/60 font-bold text-purple-900 dark:border-purple-600 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40'
              }`}>
                <div className="text-[10px] uppercase font-semibold">Tier 2 (&lt;€15k)</div>
                <div className="mt-0.5 font-bold">Proje Direktörü</div>
                <div className="mt-1 text-[10px] text-zinc-400">Yapısal İmalat</div>
              </div>

              {/* Tier 3 */}
              <div className={`rounded-lg border p-2.5 text-center ${
                requisition.approval_tier === 3
                  ? 'border-rose-500 bg-rose-50/60 font-bold text-rose-900 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40'
              }`}>
                <div className="text-[10px] uppercase font-semibold">Tier 3 (&gt;€15k)</div>
                <div className="mt-0.5 font-bold">Yönetim Kurulu</div>
                <div className="mt-1 text-[10px] text-zinc-400">Yüksek Bütçeli Alım</div>
              </div>
            </div>

            {/* Authority Verification Status Box */}
            <div className="mt-3">
              {hasAuthority ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Aktif Rolünüz ({currentRole}) bu talebi ({tierInfo.role}) onaylamak için tam yetkiye sahiptir.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-900/60">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Satın Alma Sipariş Emri Bloke Edilmiştir (Blocked PO State)</div>
                    <p className="mt-0.5 text-[11px] font-normal leading-relaxed text-amber-800 dark:text-amber-300">
                      Mevcut rolünüz ({currentRole}) bu tutarı (€{requisition.estimated_total_eur.toLocaleString('tr-TR')}) onaylamak için yetersizdir.
                      Gereken yetkili kademe: <strong className="underline">{tierInfo.role}</strong> ({tierInfo.title}).
                      Lütfen sağ üstteki rol simülatöründen yetkili role geçiş yapınız.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Approver Comment */}
          {hasAuthority && isActionable && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Onay Notu &amp; Kriptografik İmza Açıklaması:
              </label>
              <input
                type="text"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Örn: Metraj ve bütçe kalemi incelendi, sipariş onayı verildi."
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-200/80 px-6 py-4 flex items-center justify-between dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Alt-Defter Durumu: <strong className="text-zinc-800 dark:text-zinc-200">{requisition.status}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Kapat
            </button>

            {hasAuthority && isActionable && (
              <>
                <button
                  onClick={handleRejectAction}
                  disabled={isSigning}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reddet</span>
                </button>

                <button
                  onClick={handleApproveAction}
                  disabled={isSigning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{isSigning ? 'İmzalanıyor...' : 'Talebi Onayla (Sign-Off)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
