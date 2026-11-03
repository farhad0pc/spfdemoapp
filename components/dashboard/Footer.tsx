'use client';

import React from 'react';

interface FooterProps {
  lang: 'tr' | 'en';
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="w-full border-t border-slate-200/60 dark:border-amber-500/10 bg-white/40 dark:bg-canvas-dark/80 backdrop-blur-xs py-3 px-4 sm:px-8 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] text-slate-500 dark:text-subtext-dark">
        {/* Left: Version Tag & Live Engine */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-700 dark:text-amber-400/90 tracking-wider">
            CAESAR SPF v2.1.0
          </span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {lang === 'tr' ? 'Gerçek Zamanlı Alt-Defter (CDC)' : 'Realtime Sub-Ledger (CDC)'}
          </span>
        </div>

        {/* Right: Clean Standard Credit */}
        <div className="text-right font-medium">
          © 2026 Caesar Projects. {lang === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
