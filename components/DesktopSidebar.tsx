'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import Image from 'next/image';
import { RoleTier } from '@/types/requisition';
import {
  ROLE_METADATA,
  canAccessDevTools,
  canAccessUserManagement,
  hasViewAccess,
} from '@/lib/rbac';
import {
  ModuleDefinition,
  ModuleId,
  PortalView,
  SubSectionDefinition,
  getFooterDevToolsModule,
  getSidebarPrimaryModules,
} from '@/lib/moduleRegistry';
import { DICTIONARY } from '@/lib/i18n';

interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenProfile?: () => void;
  currentView: PortalView;
  onSelectView: (view: PortalView) => void;
  onUpcomingClick?: (title: string) => void;
  lang: 'tr' | 'en';
  userRole?: RoleTier;
  currentUserEmail?: string | null;
  avatarUrl?: string | null;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

function renderSidebarModuleIcon(id: ModuleId) {
  switch (id) {
    case 'purchasing':
      return (
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
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      );
    case 'depot':
      return (
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
      );
    case 'aftersales':
      return (
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
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      );
    case 'portfolio':
      return (
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'users':
      return (
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
      );
    case 'dossiers':
      return (
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
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'devtools':
      return (
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
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      );
  }
}

export default function DesktopSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onOpenProfile,
  currentView,
  onSelectView,
  onUpcomingClick,
  lang,
  userRole = 'TECH_OFFICE_USER',
  currentUserEmail,
  avatarUrl,
  isLoggedIn = false,
  onLogout,
}: DesktopSidebarProps) {
  const t = DICTIONARY[lang].sidebar;
  const tl = DICTIONARY[lang].launcher;
  const th = DICTIONARY[lang].header;
  const primaryModules = getSidebarPrimaryModules();
  const devToolsModule = getFooterDevToolsModule();

  const hasAccessUsers = canAccessUserManagement(userRole);
  const isTierZeroAdmin = canAccessDevTools(userRole);
  const activeRoleMeta = ROLE_METADATA[userRole];
  const myProfileLabel = lang === 'tr' ? 'Profilim' : 'My Profile';

  // Collapsible parent group expansion map
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    purchasing: true,
    depot: true,
    aftersales: false,
    portfolio: false,
  });

  const toggleGroup = (modId: ModuleId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const isModuleCurrentlySelected = (mod: ModuleDefinition): boolean => {
    if (mod.view && mod.view === currentView) return true;
    if (mod.subSections) {
      return mod.subSections.some((s) => s.view === currentView);
    }
    return false;
  };

  const handleNavigateView = (targetView: PortalView) => {
    onSelectView(targetView);
    onCloseMobile?.();
  };

  const handleNavigateUpcoming = (label: string) => {
    onUpcomingClick?.(label);
    onCloseMobile?.();
  };

  const renderSubSectionItem = (
    sub: SubSectionDefinition,
    collapsedMode: boolean
  ) => {
    const label = t.subSections[sub.id];
    const isSubActive = sub.status === 'ACTIVE' && Boolean(sub.view);
    const isSelected = Boolean(sub.view && currentView === sub.view);

    if (isSubActive && sub.view) {
      const targetView = sub.view;
      const authorized = hasViewAccess(userRole, targetView);
      return (
        <button
          key={sub.id}
          type="button"
          onClick={() => handleNavigateView(targetView)}
          title={collapsedMode ? label : undefined}
          className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            isSelected
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
              : authorized
              ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center space-x-2.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isSelected
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            {!collapsedMode && <span className="truncate">{label}</span>}
          </div>
        </button>
      );
    }

    return (
      <button
        key={sub.id}
        type="button"
        onClick={() => handleNavigateUpcoming(label)}
        title={label}
        className="w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-400 dark:text-slate-500 opacity-75 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors cursor-not-allowed select-none"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
          {!collapsedMode && (
            <span className="font-light truncate">{label}</span>
          )}
        </div>
        {!collapsedMode && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
            {t.badgeSoon}
          </span>
        )}
      </button>
    );
  };

  const renderNavigationModules = (collapsedMode: boolean) => (
    <div className="p-3 space-y-2">
      {!collapsedMode && (
        <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          {t.activeSection}
        </span>
      )}

      {primaryModules.map((mod) => {
        if (mod.id === 'users' && !hasAccessUsers) {
          return null;
        }

        const modTitle = tl.modules[mod.id];
        const hasSubSections = Boolean(
          mod.subSections && mod.subSections.length > 0
        );
        const isExpanded = Boolean(expandedGroups[mod.id]);
        const isGroupSelected = isModuleCurrentlySelected(mod);
        const isComingSoonParent = mod.status === 'COMING_SOON';

        if (hasSubSections && mod.subSections) {
          return (
            <div key={mod.id} className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (collapsedMode && mod.defaultView) {
                    handleNavigateView(mod.defaultView);
                  } else {
                    toggleGroup(mod.id);
                  }
                }}
                title={modTitle}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isGroupSelected
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                    : isComingSoonParent
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  {renderSidebarModuleIcon(mod.id)}
                  {!collapsedMode && (
                    <span
                      className={`truncate ${
                        isComingSoonParent ? 'font-light' : 'font-bold'
                      }`}
                    >
                      {modTitle}
                    </span>
                  )}
                </div>

                {!collapsedMode && (
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isComingSoonParent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {t.badgeSoon}
                      </span>
                    )}
                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {!collapsedMode && isExpanded && (
                <div className="pl-3 space-y-1 border-l-2 border-slate-200/80 dark:border-slate-800 ml-4">
                  {mod.subSections.map((sub) =>
                    renderSubSectionItem(sub, collapsedMode)
                  )}
                </div>
              )}
            </div>
          );
        }

        if (mod.status === 'ACTIVE' && mod.view) {
          const targetView = mod.view;
          const isSelected = currentView === targetView;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleNavigateView(targetView)}
              title={collapsedMode ? modTitle : undefined}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                {renderSidebarModuleIcon(mod.id)}
                {!collapsedMode && <span className="truncate">{modTitle}</span>}
              </div>
            </button>
          );
        }

        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => handleNavigateUpcoming(modTitle)}
            title={modTitle}
            className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-slate-400 dark:text-slate-500 opacity-75 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors cursor-not-allowed select-none"
          >
            <div className="flex items-center space-x-3 truncate">
              {renderSidebarModuleIcon(mod.id)}
              {!collapsedMode && (
                <span className="font-light truncate">{modTitle}</span>
              )}
            </div>
            {!collapsedMode && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                {t.badgeSoon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ================================================================= */}
      {/* MOBILE (< md): FIXED SLIDE-OVER OVERLAY DRAWER & BACKDROP         */}
      {/* ================================================================= */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-xs md:hidden animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          <aside
            className="fixed inset-y-0 left-0 z-[70] w-[285px] max-w-[85vw] flex flex-col justify-between bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 shadow-2xl md:hidden select-none font-sans pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade-in"
            aria-label="Mobile Navigation Drawer"
          >
            <div className="flex-1 overflow-y-auto">
              {/* Mobile Brand Banner + Top-Right ✕ Close Button */}
              <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative w-10 h-10 shrink-0 bg-slate-900 dark:bg-slate-800 rounded-xl p-1.5 border border-amber-500/40 flex items-center justify-center shadow-xs">
                    <Image
                      src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
                      alt="Caesar Emblem"
                      width={32}
                      height={32}
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div className="min-w-0 flex flex-col justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-900 dark:text-white uppercase truncate leading-tight">
                      {t.brand}
                    </span>
                    <p className="text-[9px] font-light tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate leading-tight">
                      {t.subLedger}
                    </p>
                    <div className="flex items-center mt-0.5">
                      <span className="inline-block text-[9px] font-bold leading-none px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                        {t.version}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {renderNavigationModules(false)}
            </div>

            {/* Mobile Drawer Pinned Bottom Footer: Tier 0 DevTools + My Profile + Red Sign Out */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/50">
              {isTierZeroAdmin && devToolsModule && (
                <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
                  <span className="block px-2 mb-1 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    {t.rootUtilitySection}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigateView('DEV_TOOLS')}
                    className={`w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      currentView === 'DEV_TOOLS'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-xs'
                        : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50/70 dark:hover:bg-purple-950/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {renderSidebarModuleIcon('devtools')}
                      <span className="truncate">{tl.modules.devtools}</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shrink-0">
                      T0
                    </span>
                  </button>
                </div>
              )}

              {isLoggedIn && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMobile?.();
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center justify-between space-x-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={currentUserEmail || th.activeUser}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/20 shrink-0">
                          {currentUserEmail
                            ? currentUserEmail.charAt(0).toUpperCase()
                            : 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {currentUserEmail || th.activeUser}
                        </span>
                        <span className="text-[10px] font-light text-slate-500 dark:text-slate-400 block truncate">
                          {lang === 'tr'
                            ? activeRoleMeta?.titleTr || userRole
                            : activeRoleMeta?.titleEn || userRole}{' '}
                          (Tier {activeRoleMeta?.tier ?? 4})
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {myProfileLabel} →
                    </span>
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseMobile?.();
                        onLogout();
                      }}
                      className="w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-800/60 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
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
                      <span>{th.signOut}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ================================================================= */}
      {/* DESKTOP (md:+): COLLAPSIBLE LEFT NAVIGATION RAIL                  */}
      {/* ================================================================= */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-30 select-none font-sans shrink-0 ${
          isCollapsed ? 'w-[72px]' : 'w-[268px]'
        }`}
      >
        <div className="overflow-y-auto">
          {/* Brand Banner Block — CAESAR CENTRAL HUB + INTERNAL OPERATIONS PORTAL + v2.9.9 Stacked to Gold Emblem Height */}
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
                  <p className="text-[10px] font-light tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate leading-none">
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

          {renderNavigationModules(isCollapsed)}
        </div>

        {/* Bottom Utility Footer: Tier 0 Dev Tools + Personal Profile Trigger + Collapse Action */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 mb-14">
          {isTierZeroAdmin && devToolsModule && (
            <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
              {!isCollapsed && (
                <span className="block px-2 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  {t.rootUtilitySection}
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelectView('DEV_TOOLS')}
                title={tl.modules.devtools}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentView === 'DEV_TOOLS'
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-xs'
                    : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50/70 dark:hover:bg-purple-950/30'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  {renderSidebarModuleIcon('devtools')}
                  {!isCollapsed && (
                    <span className="truncate">{tl.modules.devtools}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shrink-0">
                    T0
                  </span>
                )}
              </button>
            </div>
          )}

          {isLoggedIn && onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              title={myProfileLabel}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <svg
                  className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {!isCollapsed && (
                  <span className="truncate">{myProfileLabel}</span>
                )}
              </div>
            </button>
          )}

          <button
            type="button"
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
    </>
  );
}
