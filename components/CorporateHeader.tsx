'use client';

import React from 'react';
import Link from 'next/link';
import { RoleTier, DepartmentCode } from '@/types/requisition';
import { ROLE_METADATA } from '@/lib/rbac';

interface CorporateHeaderProps {
  currentRole: RoleTier;
  onRoleChange: (role: RoleTier) => void;
  lang: 'tr' | 'en';
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentUserEmail?: string | null;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const DEPT_BADGE_COLORS: Record<DepartmentCode, string> = {
  SYSTEM: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
  EXECUTIVE: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  TECH_OFFICE: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
  PURCHASING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  DEPOT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
};

export default function CorporateHeader({
  currentRole,
  onRoleChange,
  lang,
  onToggleSidebar,
  currentUserEmail,
  isLoggedIn = false,
  onLogout,
}: CorporateHeaderProps) {
  const activeMeta = ROLE_METADATA[currentRole];
  const departmentColor = activeMeta?.department ? DEPT_BADGE_COLORS[activeMeta.department] : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  const isRootAdmin = currentRole === 'SYSTEM_ADMIN';

  return (
    <header className="bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 transition-colors sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Sidebar Toggle & Context Description */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={lang === 'tr' ? 'Menüyü Aç / Kapat' : 'Toggle Sidebar'}
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
                {lang === 'tr' ? 'Caesar İnşaat Grubu Tedarik & Satın Alma Ekosistemi' : 'Caesar Group Procurement & Supply Ecosystem'}
              </p>
            </div>
          </div>

          {/* Right: Role Telemetry, Simulator (Root Only) & Authentication State */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Supabase Realtime Telemetry Pulse */}
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-[10px] font-light text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {lang === 'tr' ? 'Supabase Realtime Canlı' : 'Supabase Realtime Live'}
              </span>
            </div>

            {/* Role Badge or Simulator Switcher */}
            {isRootAdmin ? (
              /* Root Administrator Simulator Switcher (Exclusive to SYSTEM_ADMIN) */
              <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-amber-300/60 dark:border-amber-700/60 shadow-xs">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-2 hidden lg:flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  {lang === 'tr' ? 'Root Simülatör:' : 'Root Simulator:'}
                </span>
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as RoleTier)}
                  className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  {(Object.keys(ROLE_METADATA) as RoleTier[]).map((r) => {
                    const m = ROLE_METADATA[r];
                    return (
                      <option key={r} value={r}>
                        [{m.department}] {lang === 'tr' ? m.titleTr : m.titleEn} (T{m.tier})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              /* Standard Production Role Display Pill (Locked to assigned role) */
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${departmentColor}`}>
                  {activeMeta?.department || 'CORP'} • Tier {activeMeta?.tier ?? 4}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'tr' ? (activeMeta?.titleTr || currentRole) : (activeMeta?.titleEn || currentRole)}
                </span>
              </div>
            )}

            {/* Authentication & User Session Pill */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                  {currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                    {currentUserEmail || 'Aktif Kullanıcı'}
                  </span>
                  <span className="text-[10px] font-light text-slate-400">
                    {lang === 'tr' ? 'Oturum Açık' : 'Logged In'}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title={lang === 'tr' ? 'Oturumu Kapat' : 'Sign Out'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>{lang === 'tr' ? 'Giriş Yap' : 'Sign In'}</span>
              </Link>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
