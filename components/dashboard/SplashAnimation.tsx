'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashAnimationProps {
  lang: 'tr' | 'en';
  onComplete?: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ lang, onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [isMorphComplete, setIsMorphComplete] = useState<boolean>(false);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 3000;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(frame);
      } else {
        setIsMorphComplete(true);
        setTimeout(() => setIsWiping(true), 750);
        setTimeout(() => {
          setIsDone(true);
          if (onComplete) onComplete();
        }, 1600);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [onComplete]);

  if (isDone) return null;

  const isTR = lang === 'tr';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05080f] select-none overflow-hidden transition-transform duration-800 ease-in-out ${
        isWiping ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Background ambient field */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.18)_0%,rgba(5,8,15,1)_80%)] pointer-events-none" />

      {/* Main 1000px Stage Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-[1000px] max-w-5xl px-4 overflow-visible">
        
        {/* Convergence & Morphing Zone */}
        <div className="relative flex items-center justify-center w-full h-[520px] overflow-visible">
          
          {/* Caesar Emblem Group (Left -> Center) */}
          <div
            className={`absolute flex items-center justify-center overflow-visible transition-all duration-300 ease-out ${
              isMorphComplete ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
            }`}
            style={{
              transform: `translate3d(${-(180 - progress * 1.6)}px, 0, 0)`,
              willChange: 'transform',
            }}
          >
            {/* Unconstrained 360-Degree Radial Glow (No Square Clipping) */}
            <div className="absolute -inset-24 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.45)_0%,rgba(245,158,11,0.15)_45%,transparent_75%)] blur-3xl pointer-events-none" />
            
            <Image
              src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
              alt="Caesar Projects"
              width={340}
              height={340}
              priority
              className="relative z-10 h-64 sm:h-80 w-auto object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            />
          </div>

          {/* Google Gemini AI 4-Tipped Star Group (Right -> Center) */}
          <div
            className={`absolute flex items-center justify-center overflow-visible transition-all duration-300 ease-out ${
              isMorphComplete ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
            }`}
            style={{
              transform: `translate3d(${180 - progress * 1.6}px, 0, 0)`,
              willChange: 'transform',
            }}
          >
            {/* Unconstrained 360-Degree AI Glow Halo */}
            <div className="absolute -inset-24 rounded-full bg-[radial-gradient(circle,rgba(66,133,244,0.45)_0%,rgba(156,39,176,0.25)_45%,transparent_75%)] blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(66,133,244,0.4)]">
              <svg
                className="w-56 h-56 sm:w-72 sm:h-72 animate-pulse overflow-visible"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
                  fill="url(#gemini_splash_star_clean)"
                />
                <defs>
                  <linearGradient id="gemini_splash_star_clean" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4285F4" />
                    <stop offset="0.45" stopColor="#9C27B0" />
                    <stop offset="0.8" stopColor="#EA4335" />
                    <stop offset="1" stopColor="#FBBC05" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Morph Transformation Badge: CAESAR AI ENGINE */}
          <div
            className={`absolute z-20 flex items-center gap-4 px-12 py-6 rounded-2xl border border-cyan-400/80 bg-cyan-950/90 shadow-[0_0_80px_rgba(6,182,212,0.8)] backdrop-blur-2xl transition-all duration-600 ease-out ${
              isMorphComplete
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-75 translate-y-8 pointer-events-none'
            }`}
          >
            <span className="text-4xl text-cyan-400">⚡</span>
            <span className="text-3xl sm:text-4xl font-black tracking-widest text-white uppercase font-sans">
              CAESAR AI ENGINE
            </span>
          </div>

        </div>

        {/* 3-Second Loading Bar */}
        <div className="w-80 sm:w-96 mt-4 flex flex-col items-center gap-2.5">
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-700/80 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-300 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            <span>{isTR ? 'BAŞLATILIYOR...' : 'INITIALIZING SYSTEM...'}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SplashAnimation;
