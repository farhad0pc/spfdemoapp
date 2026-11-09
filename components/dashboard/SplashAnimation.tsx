'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashAnimationProps {
  lang: 'tr' | 'en';
  onComplete?: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ lang, onComplete }) => {
  const [phase, setPhase] = useState<'ingress' | 'fusion' | 'morph' | 'exit' | 'done'>('ingress');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fusion'), 1200);
    const t2 = setTimeout(() => setPhase('morph'), 2500);
    const t3 = setTimeout(() => setPhase('exit'), 3800);
    const t4 = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  const isTR = lang === 'tr';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05080e] transition-all duration-700 ease-out select-none ${
        phase === 'exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Deep immersive background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.25)_0%,rgba(5,8,14,0.99)_75%)]" />

      {/* Main Stage Container */}
      <div className="relative flex flex-col items-center justify-center z-10 w-full max-w-4xl px-4">
        
        {/* Converging Cluster */}
        <div className="relative flex items-center justify-center h-64 w-full">
          
          {/* Caesar Emblem (Left - 180px) */}
          <div
            className={`absolute transition-all duration-1200 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? '-translate-x-64 opacity-0 scale-50'
                : phase === 'fusion'
                ? 'translate-x-[-120px] opacity-100 scale-100'
                : 'translate-x-[-160px] opacity-20 scale-90 blur-xs'
            }`}
          >
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects Emblem"
              width={200}
              height={200}
              priority
              className="h-44 w-auto object-contain drop-shadow-[0_0_45px_rgba(245,158,11,0.7)]"
            />
          </div>

          {/* AI Artifact (Right - 180px) */}
          <div
            className={`absolute transition-all duration-1200 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? 'translate-x-64 opacity-0 scale-50'
                : phase === 'fusion'
                ? 'translate-x-[120px] opacity-100 scale-100'
                : 'translate-x-[160px] opacity-20 scale-90 blur-xs'
            }`}
          >
            <div className="relative flex items-center justify-center h-44 w-44 rounded-3xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 p-1.5 shadow-[0_0_60px_rgba(14,165,233,0.85)]">
              <div className="h-full w-full rounded-3xl bg-[#090d16] flex items-center justify-center">
                <svg className="w-20 h-20 text-cyan-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fusion Flare Spark */}
          <div
            className={`absolute h-80 w-80 rounded-full bg-cyan-400/60 blur-3xl transition-all duration-800 ${
              phase === 'fusion' || phase === 'morph' ? 'scale-150 opacity-100' : 'scale-50 opacity-0'
            }`}
          />

          {/* Morphed AI Crest */}
          <div
            className={`absolute flex items-center gap-4 px-10 py-5 rounded-3xl border border-cyan-400/60 bg-cyan-950/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(6,182,212,0.7)] transition-all duration-800 ${
              phase === 'morph' || phase === 'exit'
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-75 translate-y-6 pointer-events-none'
            }`}
          >
            <span className="text-4xl">✨</span>
            <span className="text-2xl sm:text-3xl font-black tracking-widest uppercase bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              CAESAR AI ENGINE
            </span>
          </div>

        </div>

        {/* Telemetry Status Line */}
        <div
          className={`mt-10 flex flex-col items-center gap-3 transition-all duration-800 ${
            phase === 'morph' || phase === 'exit'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-base font-mono font-black tracking-widest uppercase text-cyan-300">
              {isTR ? 'CAESAR YAPAY ZEKA SİSTEMİ AKTİF' : 'CAESAR AI ENGINE ACTIVE'}
            </span>
          </div>
          <p className="text-sm font-mono tracking-widest text-slate-400 mt-1">
            {isTR ? 'Tahmine Dayalı Malzeme ve İhale Alt-Defteri v2.1.0' : 'Predictive Sub-Ledger & Material Control v2.1.0'}
          </p>
        </div>

      </div>
    </div>
  );
};

export default SplashAnimation;
