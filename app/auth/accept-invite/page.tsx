'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROLE_METADATA } from '@/lib/rbac';
import { RoleTier, DepartmentCode, AuthorityTier } from '@/types/requisition';

interface InviteMeta {
  valid: boolean;
  email: string;
  full_name: string;
  target_role: RoleTier;
  target_department: DepartmentCode;
  target_tier: AuthorityTier;
  expires_at: string;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState<boolean>(() => Boolean(token));
  const [inviteMeta, setInviteMeta] = useState<InviteMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    !token ? 'Davet belirteci (token) eksik veya geçersiz.' : null
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let ignore = false;
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/accept-invite?token=${token}`);
        const data = await res.json();

        if (ignore) return;

        if (!res.ok) {
          setErrorMessage(data.error || 'Bu davet geçersiz veya süresi dolmuş.');
          return;
        }

        setInviteMeta(data as InviteMeta);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage('Davet doğrulama hatası: ' + msg);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void verifyToken();
    return () => {
      ignore = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setErrorMessage('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Aktivasyon başarısız oldu.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage('Hesabınız başarıyla aktifleştirildi! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center font-sans text-slate-500 text-xs">
        Davet bağlantısı doğrulanıyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center py-12 sm:px-6 lg:px-8 select-none">
      
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

        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
          HESAP AKTİVASYONU &amp; ŞİFRE BELİRLEME
        </h2>
        <p className="mt-1 text-xs font-light text-slate-500 dark:text-slate-400">
          Caesar Purchasing Sub-Ledger • 2D RBAC Onboarding
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#0f172a] py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-5">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {successMessage}
            </div>
          )}

          {inviteMeta && !successMessage && (
            <>
              {/* Assigned Role & Department Summary Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Davet Edilen Kullanıcı
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    DOĞRULANDI
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {inviteMeta.full_name}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {inviteMeta.email}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Atanan Rol</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {ROLE_METADATA[inviteMeta.target_role]?.titleTr || inviteMeta.target_role}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Departman / Tier</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {inviteMeta.target_department} (Tier {inviteMeta.target_tier})
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Setup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Yeni Parola Belirleyin *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Parolayı Yeniden Girin *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Parolayı onaylayın"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  {submitting ? 'Hesap Aktifleştiriliyor...' : 'Parolayı Kaydet & Hesabı Aç'}
                </button>
              </form>
            </>
          )}

          {!inviteMeta && errorMessage && (
            <div className="text-center pt-2">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Giriş Sayfasına Git
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center font-sans text-slate-500 text-xs">
        Yükleniyor...
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
