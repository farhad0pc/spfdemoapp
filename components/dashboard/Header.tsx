"use client";

import React from 'react';
import Image from 'next/image';
import { UserCheck } from 'lucide-react';
import { CorporateRole } from '@/types/requisition';
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-border-dark dark:bg-elevation-dark/90 px-4 py-2.5 md:px-8 md:py-3 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left Slot: Official Caesar Emblem + Double-decker Title Stack */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative shrink-0">
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects Emblem"
              width={48}
              height={48}
              priority
              className="h-9 sm:h-10 md:h-11 w-auto object-contain transition-transform hover:opacity-85 active:scale-95"
            />
          </div>

          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-amber-400 leading-tight">
              {toLocaleUpper(t.appTitle, lang)}
            </h1>
            <p className="text-[10px] sm:text-[11px] md:text-xs font-medium text-slate-500 dark:text-subtext-dark tracking-wide">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Slot: Clean Role Switcher Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 dark:border-amber-500/30 dark:bg-amber-950/30">
            <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.activeRole}:
            </span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as CorporateRole)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-amber-300 focus:outline-hidden cursor-pointer"
            >
              {(Object.keys(t.roles) as CorporateRole[]).map((roleKey) => (
                <option
                  key={roleKey}
                  value={roleKey}
                  className="bg-white text-slate-900 dark:bg-elevation-dark dark:text-slate-100"
                >
                  {t.roles[roleKey]} ({t.roleTiers[roleKey]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
