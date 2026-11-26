'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DICTIONARY, useCaesarLanguage } from '@/lib/i18n';
import {
  CaesarSplashHandle,
  createCaesarSplash,
} from '@/lib/caesarSplashEngine';

const SPLASH_SESSION_KEY = 'caesar_splash_seen_v296';
const PRIMARY_EMBLEM_URL =
  'https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png';
const FALLBACK_EMBLEM_URL =
  'https://i.ibb.co/p6CSmYL7/CAESAR-EMBLEM-NO-TEXT.png';

export default function SplashOverlay() {
  const [lang] = useCaesarLanguage();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const splashRef = useRef<CaesarSplashHandle | null>(null);
  const [visible, setVisible] = useState<boolean>(true);
  const [exiting, setExiting] = useState<boolean>(false);
  const [showSkip, setShowSkip] = useState<boolean>(false);

  const markSessionSeen = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
      }
    } catch {
      // Defensive guard against private-mode or quota storage errors
    }
  }, []);

  const dismissOverlay = useCallback(
    (immediate = false) => {
      markSessionSeen();
      if (immediate) {
        setVisible(false);
        return;
      }
      setExiting(true);
      window.setTimeout(() => {
        setVisible(false);
      }, 350);
    },
    [markSessionSeen]
  );

  useEffect(() => {
    let alreadySeen = false;
    try {
      if (
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1'
      ) {
        alreadySeen = true;
      }
    } catch {
      alreadySeen = false;
    }

    if (alreadySeen) {
      const hideTimer = window.setTimeout(() => {
        setVisible(false);
      }, 0);
      return () => window.clearTimeout(hideTimer);
    }

    const hostEl = hostRef.current;
    if (!hostEl) return;

    const subtitleText =
      lang === 'tr'
        ? 'DAHİLİ OPERASYON PORTALI'
        : 'INTERNAL OPERATIONS PORTAL';

    const instance = createCaesarSplash(hostEl, {
      logoSrc: PRIMARY_EMBLEM_URL,
      fallbackLogoSrc: FALLBACK_EMBLEM_URL,
      title: 'CAESAR CENTRAL HUB',
      subtitle: subtitleText,
      overlay: true,
      onComplete: () => {
        dismissOverlay(false);
      },
      onError: () => {
        dismissOverlay(true);
      },
    });

    splashRef.current = instance;

    const skipTimer = window.setTimeout(() => {
      setShowSkip(true);
    }, 1200);

    // Hard 8.5s failsafe auto-unmount timer so splash can NEVER block access to /login or /
    const failsafeTimer = window.setTimeout(() => {
      dismissOverlay(true);
    }, 8500);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(failsafeTimer);
      instance.destroy();
      splashRef.current = null;
    };
  }, [lang, dismissOverlay]);

  if (!visible) return null;

  const ts = DICTIONARY[lang].splash;

  return (
    <div
      role="status"
      aria-label={ts.brand}
      className={`fixed inset-0 z-[999999] transition-opacity duration-350 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div ref={hostRef} className="w-full h-full" />

      {showSkip && (
        <button
          type="button"
          onClick={() => {
            splashRef.current?.finish();
            dismissOverlay(false);
          }}
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[1000000] h-10 px-5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-200 border border-amber-500/35 backdrop-blur-md text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer"
        >
          {ts.skip} →
        </button>
      )}
    </div>
  );
}
