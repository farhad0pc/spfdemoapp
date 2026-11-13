'use client';

import React from 'react';
import Image from 'next/image';

interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView: 'WORKSPACE' | 'TECHNICAL_INTAKE';
  onSelectView: (view: 'WORKSPACE' | 'TECHNICAL_INTAKE') => void;
  onUpcomingClick: (title: string) => void;
  lang: 'tr' | 'en';
}

export default function DesktopSidebar({
  isCollapsed,
  onToggleCollapse,
  currentView,
  onSelectView,
  onUpcomingClick,
  lang,
}: DesktopSidebarProps) {
  const t = {
    subLedger: lang === 'tr' ? 'Satın Alma Alt Defteri' : 'Purchasing Sub-Ledger',
    activeSection: lang === 'tr' ? 'Aktif Modüller' : 'Active Modules',
    roadmapSection: lang === 'tr' ? 'Yol Haritası & Yakında' : 'Roadmap & Upcoming',
    workspace: lang === 'tr' ? 'Satın Alma Masası' : 'Requisition Workspace',
    intake: lang === 'tr' ? 'Teknik İntake Motoru' : 'Technical Intake Engine',
    depot: lang === 'tr' ? 'Depo ve Stok Yönetimi' : 'Depot & Stock Management',
    portfolio: lang === 'tr' ? 'Proje Portföyü & Bloklar' : 'Portfolio & Locations',
    catalog: lang === 'tr' ? 'Malzeme Katalog Yönetimi' : 'Master Catalog Admin',
    personnel: lang === 'tr' ? 'Personel & Yetki Matrisi' : 'Personnel & RBAC',
    reports: lang === 'tr' ? 'Yönetim Kurulu Raporları' : 'Executive Dossiers',
    devTools: lang === 'tr' ? 'Geliştirici & DB Araçları' : 'Database & Dev Tools',
    badgeLocked: lang === 'tr' ? 'YAKINDA' : 'SOON',
    collapseLabel: isCollapsed
      ? (lang === 'tr' ? 'Genişlet' : 'Expand')
      : (lang === 'tr' ? 'Menüyü Daralt' : 'Collapse Sidebar'),
  };

  const upcomingModules = [
    { key: 'DEPOT', title: t.depot },
    { key: 'PORTFOLIO', title: t.portfolio },
    { key: 'CATALOG', title: t.catalog },
    { key: 'PERSONNEL', title: t.personnel },
    { key: 'REPORTS', title: t.reports },
    { key: 'DEV_TOOLS', title: t.devTools },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div>
        {/* Brand Banner Block */}
        <div className="h-20 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="relative w-10 h-10 flex-shrink-0 bg-slate-900 dark:bg-slate-800 rounded-lg p-1 border border-amber-500/30 flex items-center justify-center">
              <Image
                src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
                alt="Caesar Emblem"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-bold tracking-wider text-slate-900 dark:text-white uppercase truncate">
                    CAESAR PROJECTS
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    v2.5.0
                  </span>
                </div>
                <p className="text-[10px] font-light text-slate-500 dark:text-slate-400 truncate">
                  {t.subLedger}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Rail */}
        <div className="p-3 space-y-6">
          {/* Active Modules */}
          <div>
            {!isCollapsed && (
              <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {t.activeSection}
              </span>
            )}
            <div className="space-y-1">
              <button
                onClick={() => onSelectView('WORKSPACE')}
                title={isCollapsed ? t.workspace : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  currentView === 'WORKSPACE'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {!isCollapsed && <span className="truncate">{t.workspace}</span>}
              </button>

              <button
                onClick={() => onSelectView('TECHNICAL_INTAKE')}
                title={isCollapsed ? t.intake : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  currentView === 'TECHNICAL_INTAKE'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {!isCollapsed && <span className="truncate">{t.intake}</span>}
              </button>
            </div>
          </div>

          {/* Roadmap & Upcoming Modules */}
          <div>
            {!isCollapsed && (
              <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {t.roadmapSection}
              </span>
            )}
            <div className="space-y-1">
              {upcomingModules.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onUpcomingClick(item.title)}
                  title={isCollapsed ? item.title : undefined}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-light text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <svg className="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {t.badgeLocked}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Collapse Action */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
          {!isCollapsed && <span>{t.collapseLabel}</span>}
        </button>
      </div>
    </aside>
  );
}
