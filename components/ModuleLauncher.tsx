'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { DICTIONARY, Language } from '@/lib/i18n';
import {
  ActiveModuleKey,
  LauncherModuleKey,
  ModuleDefinition,
  getLauncherModules,
  isActiveModuleKey,
} from '@/lib/moduleRegistry';

export type { ActiveModuleKey, LauncherModuleKey };
export { isActiveModuleKey };

export const LAUNCHER_MODULES: ModuleDefinition[] = getLauncherModules();

export function renderLauncherModuleIcon(key: LauncherModuleKey) {
  switch (key) {
    case 'purchasing':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      );
    case 'depot':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      );
    case 'users':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    case 'aftersales':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      );
    case 'portfolio':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'dossiers':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'devtools':
      return (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      );
  }
}

interface ModuleLauncherProps {
  lang: Language;
  onSelectModule: (moduleKey: ActiveModuleKey) => void;
}

export default function ModuleLauncher({
  lang,
  onSelectModule,
}: ModuleLauncherProps) {
  const tl = DICTIONARY[lang].launcher;
  const launcherModules = getLauncherModules();

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 py-4 md:py-12 overflow-x-hidden flex flex-col items-center justify-center select-none font-sans animate-fade-in">
      {/* Top Header: Official Caesar Emblem & CAESAR CENTRAL HUB / INTERNAL OPERATIONS PORTAL Lockup */}
      <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-amber-500/40 p-2 shadow-xl mb-3">
          <img
            src="https://i.ibb.co/p6CSmYL7/CAESAR-EMBLEM-NO-TEXT.png"
            alt="Caesar Group Emblem"
            onError={(e) => {
              const target = e.currentTarget;
              const fallback =
                'https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png';
              if (target.src !== fallback) {
                target.src = fallback;
              }
            }}
            className="w-12 h-12 md:w-13 md:h-13 object-contain"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase break-words">
          {tl.title}
        </h1>
        <p className="mt-1 text-xs font-light tracking-[0.15em] text-amber-600 dark:text-amber-400/90 uppercase break-words">
          {tl.subtitle}
        </p>
        <p className="mt-1.5 text-xs font-light text-slate-500 dark:text-slate-400">
          {tl.selectModulePrompt}
        </p>
      </div>

      {/* Prioritized 6-Tile 3x2 Responsive Grid (Milestone v2.9.6 & v2.9.8):
          Row 1 (ACTIVE, clickable): Purchasing & Orders | Depot & Stock Management | User Management & RBAC
          Row 2 (COMING SOON, greyed-out): Aftersales | Caesar Project Portfolio | Executive Dossiers & Reports
          Mobile (< md): Centered single-column vertical stack of exact 200x200px square tiles.
          Desktop (md:+): Centered 3-column grid (max-w-3xl mx-auto) of aspect-square max-w-[230px] tiles. */}
      <div className="w-full flex flex-col items-center gap-4 md:grid md:grid-cols-3 md:gap-6 md:max-w-3xl md:mx-auto pb-8">
        {launcherModules.map((mod) => {
          const title = tl.modules[mod.id];
          const isActive = mod.status === 'ACTIVE';

          if (isActive) {
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule(mod.id as ActiveModuleKey)}
                className={`group relative w-[200px] h-[200px] md:w-full md:h-auto md:aspect-square md:max-w-[230px] md:mx-auto rounded-2xl bg-white dark:bg-[#0f172a] border-2 border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer ${mod.accentClass}`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${mod.iconBgClass}`}
                >
                  {renderLauncherModuleIcon(mod.id)}
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide leading-snug">
                  {title}
                </span>
              </button>
            );
          }

          return (
            <div
              key={mod.id}
              aria-disabled="true"
              className="relative w-[200px] h-[200px] md:w-full md:h-auto md:aspect-square md:max-w-[230px] md:mx-auto rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center opacity-45 cursor-not-allowed"
            >
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                {tl.soon}
              </span>
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${mod.iconBgClass}`}
              >
                {renderLauncherModuleIcon(mod.id)}
              </div>
              <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide leading-snug">
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
