'use client';

import React from 'react';

interface StickyControlsFABProps {
  lang: 'tr' | 'en';
  onToggleLang: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function StickyControlsFAB({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
}: StickyControlsFABProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[999990] flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-xl font-sans">
      {/* Language Switcher Button */}
      <button
        onClick={onToggleLang}
        title={lang === 'tr' ? 'Switch to English' : 'Türkçe Dilini Seç'}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {lang === 'tr' ? 'TR' : 'EN'}
      </button>

      <div className="w-px h-5 bg-slate-300 dark:bg-slate-700" />

      {/* Dark / Light Mode Switcher */}
      <button
        onClick={onToggleTheme}
        title={theme === 'light' ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
}
