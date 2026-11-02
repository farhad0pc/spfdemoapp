"use client";

import React from 'react';
import Image from 'next/image';
import { CorporateRole, getSeedUser } from '@/types/requisition';
import { Language, DICTIONARY, toLocaleUpper } from '@/lib/i18n';

interface HeaderProps {
  currentRole: CorporateRole;
  onRoleChange: (role: CorporateRole) => void;
  lang: Language;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  lang,
}) => {
  const t = DICTIONARY[lang];
  const currentUser = getSeedUser(currentRole);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-border-dark dark:bg-elevation-dark/95 px-3 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        {/* Left Slot: Official Caesar Emblem + Title Stack */}
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 min-w-0">
          <div className="relative shrink-0">
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects Emblem"
              width={40}
              height={40}
              priority
              className="h-8 w-auto sm:h-9 md:h-11 object-contain transition-transform hover:opacity-85 active:scale-95"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base md:text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-amber-400 leading-tight truncate">
              {toLocaleUpper(t.appTitle, lang)}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-slate-500 dark:text-subtext-dark tracking-wide truncate">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Slot: User Identity Indicator & Role Switcher */}
        <div className="shrink-0 flex items-center">
          <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-1 sm:px-3 sm:py-1.5 dark:border-amber-500/30 dark:bg-amber-950/40 shadow-xs">
            {/* User Avatar Circle with Status Dot */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-elevation-dark" />
            </div>

            {/* User Details & Selector */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="hidden sm:inline text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {currentUser.name}
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-subtext-dark">&bull;</span>
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as CorporateRole)}
                  className="bg-transparent text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 focus:outline-hidden cursor-pointer hover:underline max-w-[130px] sm:max-w-none truncate"
                  aria-label={t.activeRole}
                >
                  <option value="SITE_FOREMAN" className="bg-canvas-dark text-slate-100">
                    {lang === 'tr' ? 'Şantiye Şefi' : 'Site Foreman'}
                  </option>
                  <option value="PROJECT_DIRECTOR" className="bg-canvas-dark text-slate-100">
                    {lang === 'tr' ? 'Proje Direktörü' : 'Project Director'}
                  </option>
                  <option value="EXECUTIVE_BOARD" className="bg-canvas-dark text-slate-100">
                    {lang === 'tr' ? 'Yönetim Kurulu' : 'Executive Board'}
                  </option>
                  <option value="PROCUREMENT_OFFICER" className="bg-canvas-dark text-slate-100">
                    {lang === 'tr' ? 'Satınalma Sorumlusu' : 'Procurement Officer'}
                  </option>
                </select>
              </div>
              <span className="hidden md:inline text-[10px] text-slate-500 dark:text-subtext-dark truncate">
                {currentUser.email}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
