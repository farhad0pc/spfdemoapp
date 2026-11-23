'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  // Credential Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = {
    title: 'CAESAR OPERATIONS',
    subtitle: lang === 'tr' ? 'Dahili Operasyonlar' : 'Internal Operations',
    badge: 'v2.8.0',
    lblEmail: lang === 'tr' ? 'Kurumsal E-posta Adresi' : 'Corporate Email Address',
    lblPassword: lang === 'tr' ? 'Parola' : 'Password',
    btnLogin: lang === 'tr' ? 'Sisteme Giriş Yap' : 'Sign In to Portal',
    forgotPassword: lang === 'tr' ? 'Şifremi Unuttum?' : 'Forgot Password?',
    forgotTitle: lang === 'tr' ? 'Şifre Sıfırlama Bağlantısı Gönder' : 'Send Password Reset Link',
    forgotDesc:
      lang === 'tr'
        ? 'Kayıtlı e-posta adresinizi giriniz. Şifre sıfırlama bağlantısı iletilecektir.'
        : 'Enter your corporate email to receive a password reset link.',
    btnSendReset: lang === 'tr' ? 'Sıfırlama Bağlantısı Gönder' : 'Send Reset Link',
    btnCancel: lang === 'tr' ? 'İptal' : 'Cancel',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (lang === 'tr'
              ? 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.'
              : 'Authentication failed. Please check your credentials.')
        );
        setLoading(false);
        return;
      }

      // Sync client Supabase session if standard Supabase Auth tokens were issued
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccessMessage(
        lang === 'tr'
          ? 'Kimlik doğrulandı. Yönlendiriliyorsunuz...'
          : 'Authenticated. Redirecting...'
      );

      setTimeout(() => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/';
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/login`,
        }
      );

      if (error) {
        setForgotMessage(error.message);
      } else {
        setForgotMessage(
          lang === 'tr'
            ? 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.'
            : 'Password reset instructions have been sent to your email.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setForgotMessage(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors select-none font-sans">
      {/* Top Bar Language Toggle */}
      <div className="absolute top-5 right-5 flex items-center space-x-2">
        <button
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs hover:border-blue-400 cursor-pointer"
        >
          {lang === 'tr' ? 'English' : 'Türkçe'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-amber-500/40 p-2 shadow-xl mb-3">
          <Image
            src="https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png"
            alt="Caesar Emblem"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
          {t.title}
        </h2>
        <p className="mt-1 text-xs font-light text-slate-500 dark:text-slate-400">
          {t.subtitle}
        </p>
        <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          {t.badge}
        </span>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#0f172a] py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center space-x-2">
              <svg
                className="w-4 h-4 shrink-0 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-2">
              <svg
                className="w-4 h-4 shrink-0 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Single Clean Credential Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                {t.lblEmail}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@caesar-projects.com"
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  {t.lblPassword}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {t.forgotPassword}
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              {loading ? '...' : t.btnLogin}
            </button>
          </form>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
              {t.forgotTitle}
            </h3>
            <p className="text-xs font-light text-slate-500 dark:text-slate-400">
              {t.forgotDesc}
            </p>

            {forgotMessage && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300">
                {forgotMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@caesar-projects.com"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {forgotLoading ? '...' : t.btnSendReset}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
