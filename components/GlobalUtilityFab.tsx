'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  DICTIONARY,
  useCaesarLanguage,
  useCaesarTheme,
} from '@/lib/i18n';

export default function GlobalUtilityFab() {
  const pathname = usePathname();
  const [lang, setLang] = useCaesarLanguage();
  const [theme, setTheme] = useCaesarTheme();
  const tf = DICTIONARY[lang].fab;

  // Keep DOM<html> attributes synchronized on mount and whenever lang/theme updates
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [lang, theme]);

  const isPreAuthRoute =
    pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  // Context-Aware Anchoring:
  // - Pre-Auth (/login, /auth/*): Bottom-Center on all viewports
  // - Authenticated Dashboard (/): Top-Right safe-area pill on Mobile (< md), Bottom-Left on Desktop (md:+)
  const positionClass = isPreAuthRoute
    ? 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50'
    : 'fixed top-3 right-3 md:top-auto md:right-auto md:bottom-5 md:left-5 z-50';

  return (
    <div
      className={`${positionClass} flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full border border-slate-300/90 dark:border-slate-700/90 shadow-xl font-sans select-none transition-all`}
    >
      {/* Language Switcher Button (EN / TR) */}
      <button
        type="button"
        onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
        title={lang === 'tr' ? tf.switchToEnglish : tf.switchToTurkish}
        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {lang === 'tr' ? 'TR' : 'EN'}
      </button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

      {/* Light / Dark Mode Switcher Button */}
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? tf.switchToLight : tf.switchToDark}
        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
