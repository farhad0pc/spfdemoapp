'use client';

import React from 'react';
import { RoleTier } from '@/types/requisition';

interface CorporateHeaderProps {
  currentRole: RoleTier;
  onRoleChange: (role: RoleTier) => void;
  lang: 'tr' | 'en';
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function CorporateHeader({
  currentRole,
  onRoleChange,
  lang,
  onToggleSidebar,
}: CorporateHeaderProps) {
  const roleLabels: Record<RoleTier, { tr: string; en: string }> = {
    TECH_OFFICE_USER: { tr: 'Mühendis / Taslak (Tech User)', en: 'Site Engineer / Draft' },
    TECH_OFFICE_MANAGER: { tr: 'Teknik Ofis Müdürü (Tech Mgr)', en: 'Tech Office Manager' },
    PURCHASING_AGENT: { tr: 'Satın Alma Sorumlusu (Purchasing)', en: 'Procurement Officer' },
    EXECUTIVE: { tr: 'Yönetim Kurulu Direktörü (Executive)', en: 'Executive Board Member' },
  };

  return (
    <header className="bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Sidebar Toggle & Context Description */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Menüyü Aç / Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {lang === 'tr' ? 'Operasyonel Kontrol Merkezi' : 'Operational Control Center'}
              </span>
              <p className="text-[11px] font-light text-slate-400">
                {lang === 'tr' ? 'Caesar İnşaat Grubu Tedarik Yönetimi' : 'Caesar Group Procurement Management'}
              </p>
            </div>
          </div>

          {/* Right: Role Switching & Telemetry Pill */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                {roleLabels[currentRole][lang]}
              </span>
              <span className="text-[10px] font-light text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {lang === 'tr' ? 'Supabase Realtime Bağlı' : 'Supabase Realtime Live'}
              </span>
            </div>

            <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-light text-slate-500 dark:text-slate-400 px-2 hidden md:inline">
                {lang === 'tr' ? 'Aktif Rol:' : 'Active Role:'}
              </span>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as RoleTier)}
                className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-hidden"
              >
                <option value="TECH_OFFICE_USER">TECH_OFFICE_USER</option>
                <option value="TECH_OFFICE_MANAGER">TECH_OFFICE_MANAGER</option>
                <option value="PURCHASING_AGENT">PURCHASING_AGENT</option>
                <option value="EXECUTIVE">EXECUTIVE</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
