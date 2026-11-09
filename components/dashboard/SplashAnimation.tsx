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
    // Phase 1 -> 2: Collision & flare trigger at 1.0s
    const t1 = setTimeout(() => setPhase('fusion'), 1000);
    // Phase 2 -> 3: Morph to blue glass AI badge at 1.8s
    const t2 = setTimeout(() => setPhase('morph'), 1800);
    // Phase 3 -> 4: Fade-out transition begins at 2.7s
    const t3 = setTimeout(() => setPhase('exit'), 2700);
    // Phase 4 -> Done: Complete and unmount overlay at 3.0s
    const t4 = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 3050);

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b12] transition-all duration-300 ease-out select-none ${
        phase === 'exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background light field */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.15)_0%,rgba(7,11,18,0.95)_70%)]" />

      {/* Center Stage Animation Cluster */}
      <div className="relative flex flex-col items-center justify-center z-10">
        
        {/* Converging Elements Container */}
        <div className="relative flex items-center justify-center h-28 w-72">
          
          {/* Caesar Emblem (Glides from Left) */}
          <div
            className={`absolute transition-all duration-1000 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? '-translate-x-24 opacity-0 scale-75'
                : phase === 'fusion'
                ? 'translate-x-0 opacity-90 scale-95'
                : 'translate-x-0 opacity-20 scale-90 blur-xs'
            }`}
          >
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects Emblem"
              width={72}
              height={72}
              priority
              className="h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            />
          </div>

          {/* AI Glowing Artifact (Glides from Right) */}
          <div
            className={`absolute transition-all duration-1000 cubic-bezier(0.16,1,0.3,1) ${
              phase === 'ingress'
                ? 'translate-x-24 opacity-0 scale-75'
                : phase === 'fusion'
                ? 'translate-x-0 opacity-100 scale-100'
                : 'translate-x-0 opacity-20 scale-90 blur-xs'
            }`}
          >
            <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 p-0.5 shadow-[0_0_35px_rgba(14,165,233,0.7)]">
              <div className="h-full w-full rounded-2xl bg-[#090d16] flex items-center justify-center">
                <svg className="w-8 h-8 text-cyan-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fusion Flare Spark */}
          <div
            className={`absolute h-28 w-28 rounded-full bg-cyan-400/40 blur-2xl transition-all duration-700 ${
              phase === 'fusion' || phase === 'morph' ? 'scale-150 opacity-100' : 'scale-50 opacity-0'
            }`}
          />

          {/* Morphed Frosted Glass Blue AI Crest */}
          <div
            className={`absolute flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-2xl border border-cyan-400/50 bg-cyan-950/40 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.45)] transition-all duration-700 ${
              phase === 'morph' || phase === 'exit'
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-75 translate-y-2 pointer-events-none'
            }`}
          >
            <span className="text-xl">✨</span>
            <span className="text-sm font-black tracking-widest uppercase bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              CAESAR AI
            </span>
          </div>

        </div>

        {/* Telemetry Status Line */}
        <div
          className={`mt-4 flex flex-col items-center gap-1.5 transition-all duration-700 ${
            phase === 'morph' || phase === 'exit'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-300">
              {isTR ? 'CAESAR YAPAY ZEKA MOTORU AKTİF' : 'CAESAR AI ENGINE ACTIVE'}
            </span>
          </div>
          <p className="text-[10px] tracking-wider font-mono text-slate-400">
            {isTR ? 'Tahmine Dayalı Malzeme ve İhale Alt-Defteri v2.1.0' : 'Predictive Sub-Ledger & Material Control v2.1.0'}
          </p>
        </div>

      </div>
    </div>
  );
};

export default SplashAnimation;
