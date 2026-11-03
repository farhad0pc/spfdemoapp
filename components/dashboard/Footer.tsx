'use client';

import React from 'react';
import Image from 'next/image';

interface FooterProps {
  lang: 'tr' | 'en';
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const currentYear = 2026;

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/70 dark:border-amber-500/15 dark:bg-elevation-dark/60 backdrop-blur-md transition-colors mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Brand Identity & System Telemetry */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Image
                src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
                alt="Caesar Projects Emblem"
                width={24}
                height={24}
                className="h-6 w-auto object-contain opacity-80"
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-amber-400">
                  Caesar Sub-Ledger
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync (CDC)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-subtext-dark">
                {lang === 'tr' 
                  ? 'Otomatik Satınalma ve Hakediş Kontrol Motoru v2.1.0' 
                  : 'Automated Procurement & Governance Engine v2.1.0'}
              </p>
            </div>
          </div>

          {/* System Details & Copyright */}
          <div className="flex flex-col sm:items-end text-center sm:text-right gap-0.5">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              © {currentYear} Caesar Projects. {lang === 'tr' ? 'Tüm Hakları Saklıdır.' : 'All rights reserved.'}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-subtext-dark tracking-wide font-mono">
              HMAC SHA-256 Stateless Auth • Supabase PostgreSQL Engine
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
