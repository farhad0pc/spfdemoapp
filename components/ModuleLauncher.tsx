'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { DICTIONARY, Language } from '@/lib/i18n';

export type ActiveModuleKey = 'purchasing' | 'depot' | 'users';
export type RoadmapModuleKey = 'portfolio' | 'catalog' | 'dossiers' | 'devtools';
export type LauncherModuleKey = ActiveModuleKey | RoadmapModuleKey;

export interface LauncherModuleDescriptor {
  key: LauncherModuleKey;
  isActive: boolean;
  accentClass: string;
  iconBgClass: string;
}

export const LAUNCHER_MODULES: LauncherModuleDescriptor[] = [
  {
    key: 'purchasing',
    isActive: true,
    accentClass:
      'hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-blue-500/10',
    iconBgClass:
      'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-500/20',
  },
  {
    key: 'depot',
    isActive: true,
    accentClass:
      'hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-emerald-500/10',
    iconBgClass:
      'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    key: 'users',
    isActive: true,
    accentClass:
      'hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-amber-500/10',
    iconBgClass:
      'bg-amber-600/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/20',
  },
  {
    key: 'portfolio',
    isActive: false,
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
  {
    key: 'catalog',
    isActive: false,
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
  {
    key: 'dossiers',
    isActive: false,
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
  {
    key: 'devtools',
    isActive: false,
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
];

export function isActiveModuleKey(
  val: string | null | undefined
): val is ActiveModuleKey {
  return val === 'purchasing' || val === 'depot' || val === 'users';
}

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
    case 'catalog':
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
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-14 flex flex-col items-center justify-center select-none font-sans animate-fade-in">
      {/* Minimal Top Header: Official Caesar Emblem & CAESAR OPERATIONS Primary Title Only */}
      <div className="flex flex-col items-center text-center mb-8 md:mb-10">
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
          {tl.title}
        </h1>
        <p className="mt-1.5 text-xs font-light text-slate-500 dark:text-slate-400">
          {tl.selectModulePrompt}
        </p>
      </div>

      {/* Responsive Square Geometry:
          Mobile (< md): Centered single-column vertical stack of exact 200x200px square tiles.
          Desktop (md:+): Centered 3-column grid (max-w-3xl mx-auto) of aspect-square max-w-[230px] tiles. */}
      <div className="w-full flex flex-col items-center gap-4 md:grid md:grid-cols-3 md:gap-6 md:max-w-3xl md:mx-auto pb-16">
        {LAUNCHER_MODULES.map((mod) => {
          const title = tl.modules[mod.key];

          if (mod.isActive) {
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => onSelectModule(mod.key as ActiveModuleKey)}
                className={`group relative w-[200px] h-[200px] md:w-full md:h-auto md:aspect-square md:max-w-[230px] md:mx-auto rounded-2xl bg-white dark:bg-[#0f172a] border-2 border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer ${mod.accentClass}`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${mod.iconBgClass}`}
                >
                  {renderLauncherModuleIcon(mod.key)}
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide leading-snug">
                  {title}
                </span>
              </button>
            );
          }

          return (
            <div
              key={mod.key}
              aria-disabled="true"
              className="relative w-[200px] h-[200px] md:w-full md:h-auto md:aspect-square md:max-w-[230px] md:mx-auto rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center opacity-45 cursor-not-allowed"
            >
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                {tl.soon}
              </span>
              <div
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${mod.iconBgClass}`}
              >
                {renderLauncherModuleIcon(mod.key)}
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
