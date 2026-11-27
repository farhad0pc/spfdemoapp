'use client';

import React, { useState } from 'react';

interface DevVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (expiresAt?: number) => void;
  lang: 'tr' | 'en';
}

export default function DevVaultModal({
  isOpen,
  onClose,
  onVerified,
  lang,
}: DevVaultModalProps) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/dev-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.elevated) {
        if (res.status === 429) {
          setErrorMessage(
            lang === 'tr'
              ? 'Çok fazla başarısız deneme. Kasa 15 dakika kilitlendi.'
              : 'Too many failed attempts. Vault locked for 15 minutes.'
          );
        } else {
          setErrorMessage(
            lang === 'tr'
              ? 'Geçersiz Geliştirici Güvenlik PIN kodu.'
              : 'Invalid Developer Security PIN.'
          );
        }
        return;
      }

      setPin('');
      onVerified(data.expiresAt);
      onClose();
    } catch {
      setErrorMessage(
        lang === 'tr'
          ? 'Güvenlik kasası doğrulanırken bağlantı hatası oluştu.'
          : 'Network error while verifying developer vault.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 font-sans animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] border-2 border-purple-500/40 rounded-2xl w-[calc(100vw-1rem)] sm:w-full max-w-sm max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-950/10 dark:bg-purple-950/30">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                TIER 0 • ROOT VAULT
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate mt-0.5">
                {lang === 'tr'
                  ? 'Geliştirici Güvenlik Kasası'
                  : 'Developer Security Vault'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs font-light text-slate-600 dark:text-slate-300 leading-relaxed">
            {lang === 'tr'
              ? 'Korumalı Root (Tier 0) işlemlerini gerçekleştirmek için Geliştirici Güvenlik PIN kodunuzu girin. Yetki 15 dakika boyunca aktif kalır.'
              : 'Enter your Developer Security PIN to unlock Protected Root (Tier 0) privileges. Elevation remains active for 15 minutes.'}
          </p>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
              {lang === 'tr' ? 'Güvenlik PIN Kodu' : 'Security PIN'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-center tracking-[0.35em] font-mono text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !pin.trim()}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
            >
              {submitting
                ? lang === 'tr'
                  ? 'Doğrulanıyor...'
                  : 'Verifying...'
                : lang === 'tr'
                ? 'Kasayı Aç'
                : 'Unlock Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
