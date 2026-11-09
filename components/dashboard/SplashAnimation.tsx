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
    // Extended duration for cinematic presence: 3.8 total seconds
    const t1 = setTimeout(() => setPhase('fusion'), 1200);
    const t2 = setTimeout(() => setPhase('morph'), 2400);
    const t3 = setTimeout(() => setPhase('exit'), 3500);
    const t4 = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 3900);

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b12] transition-all duration-500 ease-out select-none ${
        phase === 'exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background light field */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.2)_0%,rgba(7,11,18,0.98)_75%)]" />

      {/* Center Stage Animation Cluster (Scaled to 500px minimum width/height stage) */}
      <div className="relative flex flex-col items-center justify-center z-10 w-[500px] h-[500px]">
        
        {/* Converging Elements Container */}
        <div className="relative flex items-center justify-center h-48 w-full max-w-[500px]">
          
          {/* Caesar Emblem (Glides from Left - 120px Size) */}
          <div
            className={`absolute transition-all duration-1200 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? '-translate-x-48 opacity-0 scale-50'
                : phase === 'fusion'
                ? 'translate-x-[-80px] opacity-100 scale-100'
                : 'translate-x-[-100px] opacity-25 scale-90 blur-xs'
            }`}
          >
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects Emblem"
              width={140}
              height={140}
              priority
              className="h-32 w-auto object-contain drop-shadow-[0_0_35px_rgba(245,158,11,0.6)]"
            />
          </div>

          {/* AI Glowing Artifact (Glides from Right - 120px Size) */}
          <div
            className={`absolute transition-all duration-1200 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? 'translate-x-48 opacity-0 scale-50'
                : phase === 'fusion'
                ? 'translate-x-[80px] opacity-100 scale-100'
                : 'translate-x-[100px] opacity-25 scale-90 blur-xs'
            }`}
          >
            <div className="relative flex items-center justify-center h-32 w-32 rounded-3xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 p-1 shadow-[0_0_50px_rgba(14,165,233,0.8)]">
              <div className="h-full w-full rounded-3xl bg-[#090d16] flex items-center justify-center">
                <svg className="w-16 h-16 text-cyan-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fusion Flare Spark */}
          <div
            className={`absolute h-64 w-64 rounded-full bg-cyan-400/50 blur-3xl transition-all duration-800 ${
              phase === 'fusion' || phase === 'morph' ? 'scale-150 opacity-100' : 'scale-50 opacity-0'
            }`}
          />

          {/* Morphed Frosted Glass Blue AI Crest */}
          <div
            className={`absolute flex items-center justify-center gap-3 px-8 py-4 rounded-3xl border border-cyan-400/60 bg-cyan-950/60 backdrop-blur-xl shadow-[0_0_60px_rgba(6,182,212,0.6)] transition-all duration-800 ${
              phase === 'morph' || phase === 'exit'
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
            }`}
          >
            <span className="text-3xl">✨</span>
            <span className="text-xl sm:text-2xl font-black tracking-widest uppercase bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              CAESAR AI
            </span>
          </div>

        </div>

        {/* Telemetry Status Line */}
        <div
          className={`mt-8 flex flex-col items-center gap-2 transition-all duration-800 ${
            phase === 'morph' || phase === 'exit'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-sm font-mono font-bold tracking-widest uppercase text-cyan-300">
              {isTR ? 'CAESAR YAPAY ZEKA MOTORU AKTİF' : 'CAESAR AI ENGINE ACTIVE'}
            </span>
          </div>
          <p className="text-xs tracking-wider font-mono text-slate-400 mt-1">
            {isTR ? 'Tahmine Dayalı Malzeme ve İhale Alt-Defteri v2.1.0' : 'Predictive Sub-Ledger & Material Control v2.1.0'}
          </p>
        </div>

      </div>
    </div>
  );
};

export default SplashAnimation;
