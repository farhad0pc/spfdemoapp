'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import {
  CorporateUserProfile,
  OperationalStatus,
  RoleTier,
  TeamRecord,
} from '@/types/requisition';
import {
  ROLE_METADATA,
  canChangeOperationalStatus,
  canChangeUserRole,
  canEditUserDetails,
  canSuspendAccount,
  isProtectedRootUser,
} from '@/lib/rbac';

interface UserDetailDrawerProps {
  isOpen: boolean;
  user: CorporateUserProfile | null;
  teams: TeamRecord[];
  currentRole: RoleTier;
  callerTeamId?: string | null;
  isDevElevated?: boolean;
  lang: 'tr' | 'en';
  onClose: () => void;
  onRequireDevVault: () => void;
  onUpdated: () => void;
  onOpenAvatarModal?: (user: CorporateUserProfile) => void;
}

const ALL_ROLE_OPTIONS = Object.keys(ROLE_METADATA) as RoleTier[];

function UserDetailDrawerContent({
  user,
  teams,
  currentRole,
  callerTeamId,
  isDevElevated = false,
  lang,
  onClose,
  onRequireDevVault,
  onUpdated,
  onOpenAvatarModal,
}: Omit<UserDetailDrawerProps, 'isOpen' | 'user'> & {
  user: CorporateUserProfile;
}) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [jobTitle, setJobTitle] = useState(user.job_title || '');
  const [teamId, setTeamId] = useState<string>(user.team_id || '');
  const [selectedRole, setSelectedRole] = useState<RoleTier>(user.role);
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus>(
    user.operational_status ||
      (user.account_status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE')
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isRootTarget = isProtectedRootUser(user);
  const meta = ROLE_METADATA[user.role];
  const allowSuspend = canSuspendAccount(currentRole, user);
  const allowOpStatus = canChangeOperationalStatus(
    currentRole,
    user,
    callerTeamId
  );
  const allowRoleChange = canChangeUserRole(currentRole, user);
  const allowDetailsEdit = canEditUserDetails(currentRole, user, callerTeamId);
  const isAccountSuspended = user.account_status === 'SUSPENDED';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRootTarget && !isDevElevated) {
      onRequireDevVault();
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload: Record<string, unknown> = {
        id: user.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        job_title: jobTitle.trim() || null,
        team_id: teamId || null,
      };

      if (allowRoleChange && !isRootTarget && selectedRole !== user.role) {
        payload.role = selectedRole;
      }

      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'DEV_VAULT_REQUIRED') {
          onRequireDevVault();
          return;
        }
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.'),
        });
        return;
      }

      setFeedback({
        type: 'success',
        text:
          lang === 'tr'
            ? 'Personel kartı güncellendi.'
            : 'Personnel record updated.',
      });
      onUpdated();
    } catch {
      setFeedback({
        type: 'error',
        text:
          lang === 'tr'
            ? 'Sunucu bağlantı hatası.'
            : 'Network error while updating user.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOperationalStatusChange = async (nextOp: 'ACTIVE' | 'ON_LEAVE') => {
    if (!allowOpStatus || isAccountSuspended) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          operational_status: nextOp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr'
              ? 'Operasyonel durum güncellenemedi.'
              : 'Failed to update operational status.'),
        });
        return;
      }
      setOperationalStatus(nextOp);
      setFeedback({
        type: 'success',
        text:
          lang === 'tr'
            ? `Operasyonel durum ${nextOp === 'ON_LEAVE' ? 'İzinde' : 'Aktif'} olarak güncellendi.`
            : `Operational status set to ${nextOp}.`,
      });
      onUpdated();
    } catch {
      setFeedback({
        type: 'error',
        text: lang === 'tr' ? 'Bağlantı hatası.' : 'Network error.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccountSuspension = async () => {
    if (!allowSuspend || isRootTarget) return;
    const nextActive = isAccountSuspended;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          is_active: nextActive,
          account_status: nextActive ? 'ACTIVE' : 'SUSPENDED',
          operational_status: nextActive ? 'ACTIVE' : 'SUSPENDED',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            (lang === 'tr'
              ? 'Hesap durumu değiştirilemedi.'
              : 'Failed to change account status.'),
        });
        return;
      }

      setOperationalStatus(nextActive ? 'ACTIVE' : 'SUSPENDED');
      setFeedback({
        type: 'success',
        text: nextActive
          ? lang === 'tr'
            ? 'Hesap yeniden aktifleştirildi.'
            : 'Account reinstated.'
          : lang === 'tr'
          ? 'Hesap askıya alındı.'
          : 'Account suspended.',
      });
      onUpdated();
    } catch {
      setFeedback({
        type: 'error',
        text: lang === 'tr' ? 'Bağlantı hatası.' : 'Network error.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-xs font-sans animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 h-full max-h-[100dvh] flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              {lang === 'tr'
                ? 'PERSONEL YÖNETİŞİM KARTI'
                : 'PERSONNEL GOVERNANCE CARD'}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase truncate">
              {user.full_name}
            </h3>
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Identity Banner */}
          <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <div className="relative shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-14 h-14 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-lg flex items-center justify-center border border-blue-500/20">
                  {(user.full_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {onOpenAvatarModal &&
                (currentRole === 'SYSTEM_ADMIN' ||
                  (currentRole === 'EXECUTIVE' && !isRootTarget)) && (
                  <button
                    type="button"
                    onClick={() => onOpenAvatarModal(user)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md cursor-pointer"
                    title={
                      lang === 'tr' ? 'Fotoğrafı Değiştir' : 'Update Avatar'
                    }
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                  </button>
                )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user.full_name}
                </span>
                {isRootTarget && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                    {lang === 'tr' ? 'Korumalı Root' : 'Protected Root'}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block truncate">
                {user.email}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Tier {meta?.tier ?? user.authority_tier ?? 4} •{' '}
                  {lang === 'tr' ? meta?.titleTr : meta?.titleEn}
                </span>
                {user.team?.name && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {user.team.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Protected Root Security Notice */}
          {isRootTarget && (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase">
                  {lang === 'tr'
                    ? 'Sabit Korumalı Sistem Yöneticisi'
                    : 'Immutable Protected System Root'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isDevElevated
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  }`}
                >
                  {isDevElevated
                    ? lang === 'tr'
                      ? 'Kasa Açık'
                      : 'Vault Unlocked'
                    : lang === 'tr'
                    ? 'Kasa Kilitli'
                    : 'Vault Locked'}
                </span>
              </div>
              <p className="text-[11px] font-light text-purple-800 dark:text-purple-300 leading-relaxed">
                {lang === 'tr'
                  ? 'Bu hesap kalıcı olarak Tier 0 seviyesinde kilitlidir; askıya alınamaz veya yetkisi düşürülemez. Profil bilgilerini düzenlemek için Geliştirici Güvenlik Kasası doğrulaması gerekir.'
                  : 'This account is permanently locked at Tier 0; it cannot be suspended or demoted. Updating metadata requires Developer Security Vault elevation.'}
              </p>
              {!isDevElevated && (
                <button
                  type="button"
                  onClick={onRequireDevVault}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {lang === 'tr'
                    ? 'Geliştirici Güvenlik Kasasını Aç'
                    : 'Unlock Developer Security Vault'}
                </button>
              )}
            </div>
          )}

          {/* Option 1 Operational Status & Account Suspension Controls (Non-Root Only) */}
          {!isRootTarget && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'tr'
                      ? 'Operasyonel Saha Durumu (Aktif / İzinde)'
                      : 'Operational Duty Status (Active / On Leave)'}
                  </span>
                  {!allowOpStatus && (
                    <span className="text-[10px] font-light text-slate-400">
                      {lang === 'tr' ? 'Salt Okunur' : 'Read-only'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!allowOpStatus || isAccountSuspended || saving}
                    onClick={() => handleOperationalStatusChange('ACTIVE')}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                      operationalStatus === 'ACTIVE' && !isAccountSuspended
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {lang === 'tr' ? '● Aktif Görevde' : '● Active Duty'}
                  </button>
                  <button
                    type="button"
                    disabled={!allowOpStatus || isAccountSuspended || saving}
                    onClick={() => handleOperationalStatusChange('ON_LEAVE')}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                      operationalStatus === 'ON_LEAVE' && !isAccountSuspended
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-500'
                    }`}
                  >
                    {lang === 'tr' ? '◐ İzinde (On Leave)' : '◐ On Leave'}
                  </button>
                </div>
              </div>

              {/* Tier 0 & Tier 1 Exclusive Account Suspension */}
              {allowSuspend && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {lang === 'tr'
                        ? 'Kurumsal Hesap Erişimi (Tier 0–1)'
                        : 'Corporate Account Access (Tier 0–1)'}
                    </span>
                    <span className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                      {isAccountSuspended
                        ? lang === 'tr'
                          ? 'Hesap şu anda askıya alınmış durumda.'
                          : 'Account is currently suspended.'
                        : lang === 'tr'
                        ? 'Kullanıcı portala giriş yapabilir.'
                        : 'User is permitted to sign in.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleToggleAccountSuspension}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                      isAccountSuspended
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {isAccountSuspended
                      ? lang === 'tr'
                        ? 'Hesabı Aktifleştir'
                        : 'Reinstate Account'
                      : lang === 'tr'
                      ? 'Hesabı Askıya Al'
                      : 'Suspend Account'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Profile & Team Assignment Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                {lang === 'tr' ? 'Ad Soyad' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                disabled={!allowDetailsEdit}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {lang === 'tr' ? 'Unvan / Görev' : 'Job Title'}
                </label>
                <input
                  type="text"
                  disabled={!allowDetailsEdit}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={
                    lang === 'tr' ? 'Örn: Saha Şefi' : 'e.g. Site Lead'
                  }
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {lang === 'tr' ? 'Telefon Numarası' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  disabled={!allowDetailsEdit}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+90 533 000 0000"
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                {lang === 'tr' ? 'Atanan Ekip / Birim' : 'Assigned Team / Unit'}
              </label>
              <select
                disabled={!allowDetailsEdit}
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-60"
              >
                <option value="">
                  {lang === 'tr'
                    ? '— Ekip Atanmamış (Genel) —'
                    : '— Unassigned (General) —'}
                </option>
                {teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name} ({tm.department})
                  </option>
                ))}
              </select>
            </div>

            {allowRoleChange && !isRootTarget && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {lang === 'tr'
                    ? 'Kurumsal Rol & Yetki Kademesi'
                    : 'Corporate Role & Tier'}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as RoleTier)}
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {ALL_ROLE_OPTIONS.filter((r) =>
                    currentRole === 'SYSTEM_ADMIN'
                      ? true
                      : ROLE_METADATA[r].tier > 0
                  ).map((roleOption) => {
                    const rm = ROLE_METADATA[roleOption];
                    return (
                      <option key={roleOption} value={roleOption}>
                        Tier {rm.tier} —{' '}
                        {lang === 'tr' ? rm.titleTr : rm.titleEn}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

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

            {allowDetailsEdit && (
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'tr' ? 'Kapat' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
                >
                  {saving
                    ? lang === 'tr'
                      ? 'Kaydediliyor...'
                      : 'Saving...'
                    : lang === 'tr'
                    ? 'Değişiklikleri Kaydet'
                    : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </aside>
    </div>
  );
}

export default function UserDetailDrawer(props: UserDetailDrawerProps) {
  if (!props.isOpen || !props.user) return null;
  const targetUser = props.user;
  const keySig = `${targetUser.id}:${targetUser.updated_at || ''}:${targetUser.operational_status || ''}:${targetUser.account_status}:${targetUser.team_id || ''}:${targetUser.role}`;
  return (
    <UserDetailDrawerContent
      key={keySig}
      {...props}
      user={targetUser}
    />
  );
}
