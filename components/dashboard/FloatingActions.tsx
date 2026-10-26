"use client";

import React from 'react';
import { Globe, Sun, Moon, Plus } from 'lucide-react';
import { Language, Theme } from '@/lib/i18n';

interface FloatingActionsProps {
  lang: Language;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenNewRequisition: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  onOpenNewRequisition,
}) => {
  return (
    <>
      {/* Bottom-Left Utility Stack */}
      <aside
        aria-label="Language and theme preferences"
        className="fixed bottom-5 left-5 z-9999 flex flex-col items-center gap-2.5"
      >
        {/* Language Toggle Button */}
        <button
          onClick={onToggleLang}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-elevation-dark text-amber-400 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 dark:border-slate-700/80 dark:bg-elevation-dark dark:text-amber-400 light:border-slate-300 light:bg-white light:text-slate-800"
          title={lang === 'tr' ? 'Switch to English' : "Türkçe'ye Geç"}
          aria-label={lang === 'tr' ? 'Switch to English' : "Türkçe'ye Geç"}
        >
          <div className="flex flex-col items-center justify-center">
            <Globe className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              {lang === 'tr' ? 'TR' : 'EN'}
            </span>
          </div>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-elevation-dark text-amber-400 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 dark:border-slate-700/80 dark:bg-elevation-dark dark:text-amber-400 light:border-slate-300 light:bg-white light:text-amber-600"
          title={theme === 'dark' ? 'Açık Mod / Light Mode' : 'Karanlık Mod / Dark Mode'}
          aria-label={theme === 'dark' ? 'Açık Mod / Light Mode' : 'Karanlık Mod / Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-400 transition-transform group-hover:rotate-45" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-600 transition-transform group-hover:-rotate-12" />
          )}
        </button>
      </aside>

      {/* Bottom-Right Mobile Quick Requisition FAB */}
      <button
        onClick={onOpenNewRequisition}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-300 bg-accent-yellow text-slate-950 shadow-2xl transition-all hover:scale-110 active:scale-95 md:hidden"
        title="Yeni Talep / New Requisition"
        aria-label="Yeni Malzeme Talebi / New Requisition"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>
    </>
  );
};
