'use client';

import React from 'react';
import Image from 'next/image';
import { RoleTier } from '@/types/requisition';
import { canAccessUserManagement } from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';

interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView:
    | 'WORKSPACE'
    | 'TECHNICAL_INTAKE'
    | 'DEPOT_WORKSPACE'
    | 'USER_MANAGEMENT';
  onSelectView: (
    view:
      | 'WORKSPACE'
      | 'TECHNICAL_INTAKE'
      | 'DEPOT_WORKSPACE'
      | 'USER_MANAGEMENT'
  ) => void;
  onUpcomingClick?: (title: string) => void;
  lang: 'tr' | 'en';
  userRole?: RoleTier;
}

export default function DesktopSidebar({
  isCollapsed,
  onToggleCollapse,
  currentView,
  onSelectView,
  lang,
  userRole = 'TECH_OFFICE_USER',
}: DesktopSidebarProps) {
  const t = DICTIONARY[lang].sidebar;
  const hasAccessPersonnel = canAccessUserManagement(userRole);

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 select-none font-sans ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div>
        {/* Brand Banner Block — Vertically Stacked Text + Version Matching Gold Caesar Emblem Height */}
        <div className="h-20 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="relative w-12 h-12 shrink-0 bg-slate-900 dark:bg-slate-800 rounded-xl p-1.5 border border-amber-500/40 flex items-center justify-center shadow-xs">
              <Image
                src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
                alt="Caesar Emblem"
                width={38}
                height={38}
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 h-12 flex flex-col justify-between py-0.5">
                <span className="text-sm font-bold tracking-wider text-slate-900 dark:text-white uppercase truncate leading-none">
                  {t.brand}
                </span>
                <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 truncate leading-none">
                  {t.subLedger}
                </p>
                <div className="flex items-center">
                  <span className="inline-block text-[9px] font-bold leading-none px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    {t.version}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Rail */}
        <div className="p-3 space-y-4">
          {/* Active Functional Modules */}
          <div>
            {!isCollapsed && (
              <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {t.activeSection}
              </span>
            )}
            <div className="space-y-2">
              {/* GROUP: Purchasing & Orders (Satın Alma & Sipariş) */}
              <div className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-2 pt-1 pb-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-slate-500 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    <span className="truncate">{t.groupPurchasing}</span>
                  </div>
                ) : null}

                <div
                  className={
                    !isCollapsed
                      ? 'pl-3 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-3'
                      : 'space-y-1'
                  }
                >
                  {/* Sub-Item 1: Requisition Workspace */}
                  <button
                    onClick={() => onSelectView('WORKSPACE')}
                    title={isCollapsed ? t.workspace : undefined}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      currentView === 'WORKSPACE'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    {!isCollapsed && (
                      <span className="truncate">{t.workspace}</span>
                    )}
                  </button>

                  {/* Sub-Item 2: Technical Intake Engine */}
                  <button
                    onClick={() => onSelectView('TECHNICAL_INTAKE')}
                    title={isCollapsed ? t.intake : undefined}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      currentView === 'TECHNICAL_INTAKE'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
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
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    {!isCollapsed && (
                      <span className="truncate">{t.intake}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Module 2: Depo ve Stok Yönetimi */}
              <button
                onClick={() => onSelectView('DEPOT_WORKSPACE')}
                title={isCollapsed ? t.depot : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentView === 'DEPOT_WORKSPACE'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  {!isCollapsed && <span className="truncate">{t.depot}</span>}
                </div>
              </button>

              {/* Module 3: Personel & Yetki Matrisi (NEW badge removed per Milestone v2.9.4) */}
              {hasAccessPersonnel && (
                <button
                  onClick={() => onSelectView('USER_MANAGEMENT')}
                  title={isCollapsed ? t.personnel : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    currentView === 'USER_MANAGEMENT'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {!isCollapsed && (
                      <span className="truncate">{t.personnel}</span>
                    )}
                  </div>
                </button>
              )}
            </div>

            {/* Roadmap & Upcoming Segments */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80">
              {!isCollapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
                  {lang === 'tr' ? 'YOL HARİTASI & YAKINDA' : 'ROADMAP & UPCOMING'}
                </div>
              )}
              <div className="space-y-1">
                {[
                  {
                    id: 'PORTFOLIO',
                    en: 'Portfolio & Locations',
                    tr: 'Portföy & Lokasyonlar',
                  },
                  {
                    id: 'CATALOG',
                    en: 'Master Catalog Admin',
                    tr: 'Ana Katalog Yönetimi',
                  },
                  {
                    id: 'REPORTS',
                    en: 'Executive Dossiers',
                    tr: 'Yönetici Raporları',
                  },
                  {
                    id: 'DEV_TOOLS',
                    en: 'Database & Dev Tools',
                    tr: 'Veritabanı & Geliştirici',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    title={lang === 'tr' ? item.tr : item.en}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 dark:text-slate-500 opacity-75 cursor-not-allowed select-none"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                      {!isCollapsed && (
                        <span className="font-light truncate">
                          {lang === 'tr' ? item.tr : item.en}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {lang === 'tr' ? 'YAKINDA' : 'SOON'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Collapse Action */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 mb-14">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            )}
          </svg>
          {!isCollapsed && (
            <span className="font-light">
              {isCollapsed ? t.expand : t.collapse}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
