'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Link from 'next/link';
import { RoleTier, DepartmentCode } from '@/types/requisition';
import { ROLE_METADATA } from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';

interface CorporateHeaderProps {
  currentRole: RoleTier;
  onRoleChange?: (role: RoleTier) => void;
  lang: 'tr' | 'en';
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentUserEmail?: string | null;
  avatarUrl?: string | null;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const DEPT_BADGE_COLORS: Record<DepartmentCode, string> = {
  SYSTEM:
    'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
  EXECUTIVE:
    'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  TECH_OFFICE:
    'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
  PURCHASING:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  DEPOT:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
};

export default function CorporateHeader({
  currentRole,
  lang,
  onToggleSidebar,
  currentUserEmail,
  avatarUrl,
  isLoggedIn = false,
  onLogout,
}: CorporateHeaderProps) {
  const t = DICTIONARY[lang].header;
  const activeMeta = ROLE_METADATA[currentRole];
  const departmentColor = activeMeta?.department
    ? DEPT_BADGE_COLORS[activeMeta.department]
    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';

  return (
    <header className="bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 transition-colors sticky top-0 z-20 select-none font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Sidebar Toggle & Concise Bilingual Context Header */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t.toggleSidebar}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide block leading-tight">
                {t.controlCenter}
              </span>
              <p className="text-xs font-light text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {t.ecosystemSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Immutable Production Session Role Badge & Red Sign Out Control */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Immutable Production Session Role Badge */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${departmentColor}`}
              >
                {activeMeta?.department || 'CORP'} • Tier{' '}
                {activeMeta?.tier ?? 4}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lang === 'tr'
                  ? activeMeta?.titleTr || currentRole
                  : activeMeta?.titleEn || currentRole}
              </span>
            </div>

            {/* User Session & Red Sign Out Button */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={currentUserEmail || t.activeUser}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/20 shrink-0">
                    {currentUserEmail
                      ? currentUserEmail.charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                    {currentUserEmail || t.activeUser}
                  </span>
                  <span className="text-[10px] font-light text-slate-400">
                    {t.loggedIn}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title={t.signOut}
                    className="px-2.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="hidden sm:inline">{t.signOut}</span>
                  </button>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>{t.signIn}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
