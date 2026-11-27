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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [lang, theme]);

  const isPreAuthRoute =
    pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  const positionClass = isPreAuthRoute
    ? 'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex'
    : 'flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 md:right-auto md:bottom-5 md:left-5 z-40';

  return (
    <div
      className={`${positionClass} items-center space-x-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-full border border-slate-300/90 dark:border-slate-700/90 shadow-xl font-sans select-none transition-all`}
    >
      <button
        type="button"
        onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
        title={lang === 'tr' ? tf.switchToEnglish : tf.switchToTurkish}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {lang === 'tr' ? 'TR' : 'EN'}
      </button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? tf.switchToLight : tf.switchToDark}
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
