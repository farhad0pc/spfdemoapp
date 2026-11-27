'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { CorporateUserProfile, RoleTier } from '@/types/requisition';
import { ROLE_METADATA, isProtectedRootUser } from '@/lib/rbac';
import { compressImageToWebP } from '@/lib/imageCompression';
import WebcamCaptureModal from '@/components/WebcamCaptureModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'tr' | 'en';
  currentRole: RoleTier;
  onProfileUpdated?: (patch: {
    fullName?: string;
    avatarUrl?: string | null;
  }) => void;
  onOpenDevVault?: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  lang,
  currentRole,
  onProfileUpdated,
  onOpenDevVault,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<CorporateUserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDevElevated, setIsDevElevated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    const fetchSelf = async () => {
      try {
        const res = await fetch('/api/users/me', { method: 'GET' });
        const data = await res.json();
        if (!ignore && res.ok && data.user) {
          const u = data.user as CorporateUserProfile;
          setProfile(u);
          setFullName(u.full_name || '');
          setPhoneNumber(u.phone_number || '');
          setIsDevElevated(Boolean(data.isDevElevated));
        }
      } catch {
        // Ignore initial load error
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void fetchSelf();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const roleMeta = ROLE_METADATA[profile?.role || currentRole];
  const isRoot = isProtectedRootUser(profile);

  const handleSaveSelfProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr'
              ? 'Profil güncellenemedi.'
              : 'Failed to update profile.'),
        });
        return;
      }

      if (data.user) {
        setProfile(data.user as CorporateUserProfile);
      }
      onProfileUpdated?.({ fullName: fullName.trim() });
      setFeedback({
        type: 'success',
        text:
          lang === 'tr'
            ? 'Kişisel profil bilgileriniz güncellendi.'
            : 'Your personal profile has been updated.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: lang === 'tr' ? 'Sunucu bağlantı hatası.' : 'Network error.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatarFile = async (file: File) => {
    if (!profile) return;
    setAvatarBusy(true);
    setFeedback(null);

    try {
      const compressed = await compressImageToWebP(file, 256, 0.82);
      if (compressed.previewUrl) {
        URL.revokeObjectURL(compressed.previewUrl);
      }
      const formData = new FormData();
      formData.append('user_id', profile.id);
      formData.append('file', compressed.file);

      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr'
              ? 'Profil fotoğrafı yüklenemedi.'
              : 'Failed to upload avatar.'),
        });
        return;
      }

      const nextUrl = (data.avatar_url as string) || null;
      setProfile((prev) => (prev ? { ...prev, avatar_url: nextUrl } : prev));
      onProfileUpdated?.({ avatarUrl: nextUrl });
      setFeedback({
        type: 'success',
        text:
          lang === 'tr'
            ? 'Profil fotoğrafınız güncellendi.'
            : 'Profile photo updated.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text:
          lang === 'tr'
            ? 'Fotoğraf işlenirken hata oluştu.'
            : 'Error processing photo.',
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;
    setAvatarBusy(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/users/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr'
              ? 'Fotoğraf kaldırılamadı.'
              : 'Failed to remove avatar.'),
        });
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      onProfileUpdated?.({ avatarUrl: null });
      setFeedback({
        type: 'success',
        text:
          lang === 'tr'
            ? 'Profil fotoğrafınız kaldırıldı.'
            : 'Profile photo removed.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: lang === 'tr' ? 'Bağlantı hatası.' : 'Network error.',
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 font-sans animate-fade-in">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-[calc(100vw-1rem)] sm:w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                {lang === 'tr'
                  ? 'KİŞİSEL KURUMSAL PROFİL'
                  : 'PERSONAL CORPORATE PROFILE'}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                {lang === 'tr' ? 'Profilim & Hesap Kimliği' : 'My Profile & Identity'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {loading && !profile ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {lang === 'tr' ? 'Profil yükleniyor...' : 'Loading profile...'}
              </div>
            ) : (
              <>
                {/* Avatar & Identity Card */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500/30 bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(profile?.full_name || profile?.email || 'U')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {profile?.full_name || '—'}
                      </h3>
                      {isRoot && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                          {lang === 'tr' ? 'Korumalı Root' : 'Protected Root'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      {profile?.email || '—'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadAvatarFile(f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        disabled={avatarBusy || !profile}
                        onClick={() => setIsWebcamOpen(true)}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {lang === 'tr' ? 'Kamera' : 'Camera'}
                      </button>
                      <button
                        type="button"
                        disabled={avatarBusy || !profile}
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {lang === 'tr' ? 'Cihazdan Yükle' : 'Upload Photo'}
                      </button>
                      {profile?.avatar_url && (
                        <button
                          type="button"
                          disabled={avatarBusy}
                          onClick={handleRemoveAvatar}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          {lang === 'tr' ? 'Kaldır' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Read-Only Governance Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {lang === 'tr' ? 'Kurumsal Rol' : 'Corporate Role'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white block mt-0.5 truncate">
                      {lang === 'tr' ? roleMeta?.titleTr : roleMeta?.titleEn}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {lang === 'tr' ? 'Departman & Kademe' : 'Dept & Tier'}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                      {roleMeta?.department} • Tier {roleMeta?.tier ?? 4}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {lang === 'tr' ? 'Ekip & Durum' : 'Team & Status'}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                      {profile?.team?.name ||
                        (lang === 'tr' ? 'Genel Merkez' : 'Central Hub')}{' '}
                      • {profile?.operational_status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Tier 0 Security Vault Quick Card */}
                {currentRole === 'SYSTEM_ADMIN' && onOpenDevVault && (
                  <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                        {lang === 'tr'
                          ? 'Geliştirici Güvenlik Kasası (Tier 0)'
                          : 'Developer Security Vault (Tier 0)'}
                      </span>
                      <span className="text-[11px] font-light text-purple-700 dark:text-purple-300">
                        {isDevElevated
                          ? lang === 'tr'
                            ? 'Kasa şu anda açık (15 dk yetki aktif).'
                            : 'Vault is currently unlocked (15m elevation active).'
                          : lang === 'tr'
                          ? 'Root işlemleri için PIN doğrulaması gerekir.'
                          : 'PIN verification required for protected root mutations.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenDevVault}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {isDevElevated
                        ? lang === 'tr'
                          ? 'Yenile'
                          : 'Re-Verify'
                        : lang === 'tr'
                        ? 'Kasayı Aç'
                        : 'Unlock Vault'}
                    </button>
                  </div>
                )}

                {/* Self-Service Editable Fields */}
                <form onSubmit={handleSaveSelfProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      {lang === 'tr' ? 'Ad Soyad' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      {lang === 'tr' ? 'Telefon Numarası' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+90 533 000 0000"
                      className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  {feedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold ${
                        feedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {feedback.text}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {lang === 'tr' ? 'Kapat' : 'Close'}
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !profile}
                      className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
                    >
                      {saving
                        ? lang === 'tr'
                          ? 'Kaydediliyor...'
                          : 'Saving...'
                        : lang === 'tr'
                        ? 'Profilimi Güncelle'
                        : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <WebcamCaptureModal
        isOpen={isWebcamOpen}
        lang={lang}
        onClose={() => setIsWebcamOpen(false)}
        onCaptured={(captured) => {
          setIsWebcamOpen(false);
          if (captured.previewUrl) {
            URL.revokeObjectURL(captured.previewUrl);
          }
          void handleUploadAvatarFile(captured.file);
        }}
      />
    </>
  );
}
