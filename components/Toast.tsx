'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  subMessage?: string;
  onClose: () => void;
}

export default function Toast({ message, subMessage, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-999999 flex items-center space-x-3 bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md transition-all font-sans">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <div>
        <p className="text-xs font-bold tracking-wide uppercase">{message}</p>
        {subMessage && (
          <p className="text-[11px] font-light text-slate-400">{subMessage}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-3 text-slate-500 hover:text-white text-xs font-bold"
      >
        ✕
      </button>
    </div>
  );
}
