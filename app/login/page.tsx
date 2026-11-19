'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [activeTab, setActiveTab] = useState<'STANDARD' | 'FAILSAFE'>('STANDARD');

  // Standard Login State
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

  // Fail-Safe State
  const [failsafeEmail, setFailsafeEmail] = useState('');
  const [failsafePassword, setFailsafePassword] = useState('');
  const [failsafeLoading, setFailsafeLoading] = useState(false);
  const [failsafeError, setFailsafeError] = useState<string | null>(null);

  const t = {
    title: 'CAESAR PROJECTS',
    subtitle: lang === 'tr' ? 'Satın Alma & Yönetişim Alt Defteri' : 'Purchasing & Governance Sub-Ledger',
    badge: 'v2.5.0 • Step D',
    tabStandard: lang === 'tr' ? 'Kurumsal Giriş' : 'Corporate Login',
    tabFailsafe: lang === 'tr' ? 'God-Tier Acil Durum' : 'God-Tier Fail-Safe',
    lblEmail: lang === 'tr' ? 'Kurumsal E-posta Adresi' : 'Corporate Email Address',
    lblPassword: lang === 'tr' ? 'Parola' : 'Password',
    lblFailsafeEmail: lang === 'tr' ? 'Root Admin E-posta' : 'Root Admin Email',
    lblFailsafePass: lang === 'tr' ? 'Acil Durum Master Anahtarı (Fail-Safe Key)' : 'Emergency Master Key',
    btnLogin: lang === 'tr' ? 'Sisteme Giriş Yap' : 'Sign In to Portal',
    btnFailsafeLogin: lang === 'tr' ? 'Root Acil Durum Girişi Sağla' : 'Authenticate Root Access',
    forgotPassword: lang === 'tr' ? 'Şifremi Unuttum?' : 'Forgot Password?',
    forgotTitle: lang === 'tr' ? 'Şifre Sıfırlama Bağlantısı Gönder' : 'Send Password Reset Link',
    forgotDesc: lang === 'tr' 
      ? 'Kayıtlı e-posta adresinizi giriniz. Şifre sıfırlama bağlantısı iletilecektir.' 
      : 'Enter your corporate email to receive a password reset link.',
    btnSendReset: lang === 'tr' ? 'Sıfırlama Bağlantısı Gönder' : 'Send Reset Link',
    btnCancel: lang === 'tr' ? 'İptal' : 'Cancel',
    failsafeNotice: lang === 'tr' 
      ? 'Bu modül yalnızca kimlik sağlayıcısı (Supabase Auth/OAuth) arızalarında acil sistem müdahalesi için ayrılmıştır. PostgreSQL pgcrypto bcrypt hash doğrulamasını kullanır.' 
      : 'This emergency bypass is strictly for root disaster recovery via PostgreSQL pgcrypto bcrypt hashes when primary auth is unreachable.',
    backToHome: lang === 'tr' ? '← Portala Geri Dön' : '← Back to Portal',
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.');
        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage(lang === 'tr' ? 'Giriş başarılı! Yönlendiriliyorsunuz...' : 'Sign in successful! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 800);
      }
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
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });

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

  const handleFailsafeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailsafeLoading(true);
    setFailsafeError(null);

    try {
      const res = await fetch('/api/auth/failsafe-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: failsafeEmail.trim().toLowerCase(),
          password: failsafePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFailsafeError(data.error || 'Acil durum kimlik doğrulaması reddedildi.');
        setFailsafeLoading(false);
        return;
      }

      setSuccessMessage(lang === 'tr' ? 'God-Tier oturumu aktifleştirildi! Yönlendiriliyorsunuz...' : 'God-Tier session verified! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFailsafeError(msg);
      setFailsafeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors select-none">
      
      {/* Top Bar Language Toggle */}
      <div className="absolute top-5 right-5 flex items-center space-x-2">
        <button
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs hover:border-blue-400"
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
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 mb-6 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('STANDARD');
                setErrorMessage(null);
                setFailsafeError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'STANDARD'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.tabStandard}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('FAILSAFE');
                setErrorMessage(null);
                setFailsafeError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'FAILSAFE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <span>⚡ {t.tabFailsafe}</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: STANDARD SUPABASE AUTH LOGIN */}
          {activeTab === 'STANDARD' && (
            <form onSubmit={handleStandardLogin} className="space-y-4">
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
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                {loading ? '...' : t.btnLogin}
              </button>
            </form>
          )}

          {/* TAB 2: GOD-TIER EMERGENCY FAIL-SAFE LOGIN */}
          {activeTab === 'FAILSAFE' && (
            <form onSubmit={handleFailsafeLogin} className="space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                {t.failsafeNotice}
              </div>

              {failsafeError && (
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/60 rounded-lg text-xs font-bold text-rose-900 dark:text-rose-200">
                  {failsafeError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {t.lblFailsafeEmail}
                </label>
                <input
                  type="email"
                  required
                  value={failsafeEmail}
                  onChange={(e) => setFailsafeEmail(e.target.value)}
                  placeholder="admin@caesar-projects.com"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {t.lblFailsafePass}
                </label>
                <input
                  type="password"
                  required
                  value={failsafePassword}
                  onChange={(e) => setFailsafePassword(e.target.value)}
                  placeholder="Master Passkey"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={failsafeLoading}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                {failsafeLoading ? 'Doğrulanıyor...' : t.btnFailsafeLogin}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs font-light text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            >
              {t.backToHome}
            </button>
          </div>

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
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
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
