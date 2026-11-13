'use client';

import React from 'react';
import { PurchaseRequisition } from '@/types/requisition';

interface ExecutiveTelemetryStripProps {
  requisitions: PurchaseRequisition[];
}

export default function ExecutiveTelemetryStrip({ requisitions }: ExecutiveTelemetryStripProps) {
  const approvedTickets = requisitions.filter((r) => r.live_status === 'APPROVED');
  const rejectedTickets = requisitions.filter((r) => r.live_status === 'REJECTED');
  const pendingBoardTickets = requisitions.filter((r) => r.live_status === 'EXECUTIVE_RATIFICATION');

  const approvedCapital = approvedTickets.reduce(
    (acc, r) => acc + Number(r.purchasing_actual_quota_eur || r.tech_approved_budget_eur || 0),
    0
  );

  const preservedCapital = rejectedTickets.reduce(
    (acc, r) => acc + Number(r.purchasing_actual_quota_eur || r.tech_approved_budget_eur || 0),
    0
  );

  const pendingBoardCapital = pendingBoardTickets.reduce(
    (acc, r) => acc + Number(r.purchasing_actual_quota_eur || r.tech_approved_budget_eur || 0),
    0
  );

  const overrunExposure = requisitions.reduce((acc, r) => {
    const actual = Number(r.purchasing_actual_quota_eur || 0);
    const approved = Number(r.tech_approved_budget_eur || 0);
    return actual > approved ? acc + (actual - approved) : acc;
  }, 0);

  const totalClosed = approvedTickets.length + rejectedTickets.length;
  const rejectionRate = totalClosed > 0 ? ((rejectedTickets.length / totalClosed) * 100).toFixed(1) : '0.0';

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Onaylanan Toplam Sermaye
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              €{approvedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            {approvedTickets.length} Talep
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-light mt-2 block">
          Bağlanan kesin satın alma bütçesi
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Korunan Sermaye (Reddedilen)
            </span>
            <span className="text-2xl font-bold text-slate-700 mt-1 block">
              €{preservedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
            %{rejectionRate} Red Oranı
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-light mt-2 block">
          İptal edilerek tasarruf edilen nakit
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Yönetim Kurulu Onayında (Tier 3)
            </span>
            <span className="text-2xl font-bold text-purple-800 mt-1 block">
              €{pendingBoardCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full border border-purple-300">
            {pendingBoardTickets.length} Bekleyen
          </span>
        </div>
        <span className="text-[11px] text-purple-600 font-light mt-2 block">
          Nihai imza gerektiren yüksek tutarlı talepler
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Bütçe Aşımı Maruziyeti
            </span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">
              €{overrunExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300">
            İç Kota Farkı
          </span>
        </div>
        <span className="text-[11px] text-amber-700 font-light mt-2 block">
          Teknik limit üstü tedarikçi teklif toplamı
        </span>
      </div>
    </div>
  );
}
