'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { 
  RoleTier, 
  CorporateUserProfile, 
  UserInvitation, 
  PortfolioProject 
} from '@/types/requisition';
import { 
  ROLE_METADATA, 
  canInviteRole, 
  canManageUser, 
  getAssignableRoles 
} from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';

interface UserManagementWorkspaceProps {
  currentRole: RoleTier;
  currentUserEmail?: string;
  lang: 'tr' | 'en';
  portfolioProjects?: PortfolioProject[];
  onRolePreviewChange?: (role: RoleTier) => void;
  authenticatedRole?: RoleTier;
}

function subscribeToClock(callback: () => void) {
  const id = setInterval(callback, 15000);
  return () => clearInterval(id);
}

function getClockSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot() {
  return 0;
}

export default function UserManagementWorkspace({
  currentRole,
  currentUserEmail,
  lang,
  portfolioProjects = [],
  onRolePreviewChange,
  authenticatedRole,
}: UserManagementWorkspaceProps) {
  const currentClockSec = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerSnapshot);
  const d = DICTIONARY[lang].personnel;
  const common = DICTIONARY[lang].common;

  // Data State
  const [users, setUsers] = useState<CorporateUserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'INVITATIONS'>('ROSTER');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleTier | ''>('');
  const [inviteProjects, setInviteProjects] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccessUrl, setInviteSuccessUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Role Edit Modal State
  const [editingUser, setEditingUser] = useState<CorporateUserProfile | null>(null);
  const [editRole, setEditRole] = useState<RoleTier | ''>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fetch Users & Invites
  const fetchPersonnelData = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?role=${currentRole}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setInvitations(data.invitations || []);
      }
    } catch {
      // Offline fallback state
    } finally {
      setLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/users?role=${currentRole}`);
        const data = await res.json();
        if (!ignore && res.ok) {
          setUsers(data.users || []);
          setInvitations(data.invitations || []);
        }
      } catch {
        // Offline fallback
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [currentRole]);

  // Roles permitted for caller to delegate
  const assignableRoles = useMemo(() => {
    return getAssignableRoles(currentRole);
  }, [currentRole]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const nameMatch = u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const roleMatch = u.role?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q);
      const deptMatch = departmentFilter === 'ALL' || u.department === departmentFilter;
      return (nameMatch || roleMatch) && deptMatch;
    });
  }, [users, searchQuery, departmentFilter]);

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invitations.filter((inv) => {
      const nameMatch = inv.full_name?.toLowerCase().includes(q) || inv.email?.toLowerCase().includes(q);
      const roleMatch = inv.target_role?.toLowerCase().includes(q) || inv.target_department?.toLowerCase().includes(q);
      const deptMatch = departmentFilter === 'ALL' || inv.target_department === departmentFilter;
      return (nameMatch || roleMatch) && deptMatch;
    });
  }, [invitations, searchQuery, departmentFilter]);

  // KPI Computations
  const kpiStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.account_status === 'ACTIVE').length;
    const pendingInvites = invitations.filter((i) => i.status === 'PENDING').length;
    const depts = new Set(users.map((u) => u.department).filter(Boolean)).size;
    return { total, active, pendingInvites, depts };
  }, [users, invitations]);

  // Calculate live countdown for 48h expiration using external clock store
  const getRemainingTimeBadge = (expiresAtStr: string, status: string) => {
    if (status !== 'PENDING') {
      return status === 'ACCEPTED' ? (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
          {d.statusAccepted}
        </span>
      ) : (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {d.statusRevoked}
        </span>
      );
    }

    if (!currentClockSec) {
      return (
        <span className="text-[10px] font-light px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          {common.loading}
        </span>
      );
    }

    const expSec = Math.floor(new Date(expiresAtStr).getTime() / 1000);
    const diffSec = expSec - currentClockSec;

    if (diffSec <= 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
          {d.statusExpired}
        </span>
      );
    }

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);

    return (
      <span className="text-[10px] font-mono font-light px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="font-bold">{hours}</span>{lang === 'tr' ? 's' : 'h'} <span className="font-bold">{mins}</span>{lang === 'tr' ? 'd' : 'm'} {lang === 'tr' ? 'kaldı' : 'left'}
      </span>
    );
  };

  // Handle Invite Submit
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName || !inviteRole) return;

    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSuccessUrl(null);

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          full_name: inviteFullName.trim(),
          target_role: inviteRole,
          actor_role: currentRole,
          actor_name: currentUserEmail || currentRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || (lang === 'tr' ? 'Davet oluşturulamadı.' : 'Failed to generate invitation.'));
        setInviteSubmitting(false);
        return;
      }

      setInviteSuccessUrl(data.invite_url);
      setInviteSubmitting(false);
      void fetchPersonnelData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInviteError(msg);
      setInviteSubmitting(false);
    }
  };

  // Handle Resend Invite
  const handleResendInvite = async (invitationId: string) => {
    try {
      const res = await fetch('/api/auth/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: invitationId,
          actor_role: currentRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.invite_url) {
        await navigator.clipboard.writeText(data.invite_url);
        alert(lang === 'tr' ? 'Davet yenilendi ve 48 saatlik yeni bağlantı panoya kopyalandı!' : 'Invite refreshed! New 48-hour link copied to clipboard.');
        void fetchPersonnelData();
      } else {
        alert(data.error || (lang === 'tr' ? 'İşlem başarısız.' : 'Action failed.'));
      }
    } catch {
      alert(lang === 'tr' ? 'İstek gönderilemedi.' : 'Network error.');
    }
  };

  // Handle Revoke Invite
  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm(lang === 'tr' ? 'Bu daveti iptal etmek istediğinize emin misiniz?' : 'Revoke this invitation?')) return;
    try {
      const res = await fetch('/api/auth/revoke-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: invitationId,
          actor_role: currentRole,
        }),
      });

      if (res.ok) {
        void fetchPersonnelData();
      }
    } catch {
      // Ignore
    }
  };

  // Handle Status Toggle (Active / Suspend)
  const handleToggleUserStatus = async (user: CorporateUserProfile) => {
    const nextStatus = user.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          new_status: nextStatus,
          actor_role: currentRole,
        }),
      });

      if (res.ok) {
        void fetchPersonnelData();
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.'));
      }
    } catch {
      // Ignore
    }
  };

  // Handle Role Update
  const handleSaveUserRole = async () => {
    if (!editingUser || !editRole) return;
    setEditSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editingUser.id,
          new_role: editRole,
          actor_role: currentRole,
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        void fetchPersonnelData();
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'tr' ? 'Rol güncellenemedi.' : 'Failed to update role.'));
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                {d.title}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                2D RBAC
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 hidden sm:inline">
                [{currentRole}]
              </span>
            </div>
            <p className="text-xs font-light text-slate-500 dark:text-slate-400">
              {d.subtitle}
            </p>
          </div>

          {/* Action: Open Invite Modal (if authorized) */}
          {assignableRoles.length > 0 && (
            <button
              onClick={() => {
                setIsInviteModalOpen(true);
                setInviteSuccessUrl(null);
                setInviteError(null);
                setInviteEmail('');
                setInviteFullName('');
                setInviteRole(assignableRoles[0] || '');
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>{d.btnInvite}</span>
            </button>
          )}
        </div>
      </div>

      {/* Developer Role Preview Switcher Bar (Exclusive to SYSTEM_ADMIN Tier 0) */}
      {authenticatedRole === 'SYSTEM_ADMIN' && onRolePreviewChange && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  {d.devPreviewTitle}
                </h2>
                <p className="text-[11px] font-light text-amber-700 dark:text-amber-400">
                  {d.devPreviewDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <select
                value={currentRole}
                onChange={(e) => onRolePreviewChange(e.target.value as RoleTier)}
                className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                {(Object.keys(ROLE_METADATA) as RoleTier[]).map((r) => {
                  const m = ROLE_METADATA[r];
                  return (
                    <option key={r} value={r}>
                      [{m.department}] {lang === 'tr' ? m.titleTr : m.titleEn} (Tier {m.tier})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4-Stat Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Users */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {d.kpiTotalUsers}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-slate-900 dark:text-white">
              {kpiStats.total}
            </span>
            <span className="text-xs font-light text-slate-400">{d.kpiTotalUsersSub}</span>
          </div>
        </div>

        {/* KPI 2: Active Accounts */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {d.kpiActiveUsers}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-emerald-600 dark:text-emerald-400">
              {kpiStats.active}
            </span>
            <span className="text-xs font-light text-slate-400">{d.kpiActiveUsersSub}</span>
          </div>
        </div>

        {/* KPI 3: Pending Invites */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {d.kpiPendingInvites}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-amber-600 dark:text-amber-400">
              {kpiStats.pendingInvites}
            </span>
            <span className="text-xs font-light text-slate-400">{d.kpiPendingInvitesSub}</span>
          </div>
        </div>

        {/* KPI 4: Active Departments */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {d.kpiDepartments}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-blue-600 dark:text-blue-400">
              {kpiStats.depts}
            </span>
            <span className="text-xs font-light text-slate-400">{d.kpiDepartmentsSub}</span>
          </div>
        </div>

      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ROSTER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.tabRoster} <span className="font-light">({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('INVITATIONS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'INVITATIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.tabInvites} <span className="font-light">({invitations.length})</span>
              {kpiStats.pendingInvites > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                  {kpiStats.pendingInvites}
                </span>
              )}
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">{d.allDepartments}</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="EXECUTIVE">EXECUTIVE</option>
              <option value="TECH_OFFICE">TECH_OFFICE</option>
              <option value="PURCHASING">PURCHASING</option>
              <option value="DEPOT">DEPOT</option>
            </select>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-light text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* TAB 1: ACTIVE TEAM ROSTER TABLE */}
        {activeTab === 'ROSTER' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{d.thUser}</th>
                  <th className="px-4 py-3">{d.thDepartment}</th>
                  <th className="px-4 py-3">{d.thRole}</th>
                  <th className="px-4 py-3 text-center">{d.thTier}</th>
                  <th className="px-4 py-3 text-center">{d.thStatus}</th>
                  <th className="px-4 py-3">{d.thLastLogin}</th>
                  <th className="px-4 py-3 text-center">{d.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-light">
                      {common.loading}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-light">
                      {lang === 'tr' ? 'Kriterlere uygun personel bulunamadı.' : 'No personnel matching filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleMeta = ROLE_METADATA[u.role];
                    const isManageable = canManageUser(currentRole, u.role);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                              {u.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {u.full_name}
                              </div>
                              <div className="text-[11px] font-mono font-light text-slate-400">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 uppercase">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {u.department}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {roleMeta ? (lang === 'tr' ? roleMeta.titleTr : roleMeta.titleEn) : u.role}
                          </div>
                          <div className="text-[10px] font-mono font-light text-slate-400">
                            {u.role}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.authority_tier === 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300' :
                            u.authority_tier === 1 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300' :
                            u.authority_tier === 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300' :
                            u.authority_tier === 3 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                          }`}>
                            Tier {u.authority_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.account_status === 'ACTIVE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              ✓ {d.statusActive}
                            </span>
                          )}
                          {u.account_status === 'INVITED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                              ⏳ {d.statusInvited}
                            </span>
                          )}
                          {u.account_status === 'SUSPENDED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                              ✕ {d.statusSuspended}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-light text-[11px] text-slate-500">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isManageable ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                  u.account_status === 'ACTIVE'
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400'
                                }`}
                              >
                                {u.account_status === 'ACTIVE' ? d.btnSuspend : d.btnActivate}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditRole(u.role);
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                {d.btnChangeRole}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-light">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: INVITATIONS TABLE */}
        {activeTab === 'INVITATIONS' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{d.thInvitee}</th>
                  <th className="px-4 py-3">{d.thTargetRole}</th>
                  <th className="px-4 py-3">{d.thExpiresIn}</th>
                  <th className="px-4 py-3 text-center">{d.thInviteStatus}</th>
                  <th className="px-4 py-3 text-center">{d.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-light">
                      {common.loading}
                    </td>
                  </tr>
                ) : filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-light">
                      {lang === 'tr' ? 'Kayıtlı davet bulunamadı.' : 'No invitations found.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => {
                    const isManageable = canInviteRole(currentRole, inv.target_role);

                    return (
                      <tr key={inv.invitation_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {inv.full_name}
                          </div>
                          <div className="text-[11px] font-mono font-light text-slate-400">
                            {inv.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {ROLE_METADATA[inv.target_role]?.titleTr || inv.target_role}
                          </div>
                          <div className="text-[10px] uppercase font-mono font-light text-slate-400">
                            {inv.target_department} • Tier {inv.target_tier}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getRemainingTimeBadge(inv.expires_at, inv.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' :
                            inv.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isManageable && (
                            <div className="flex items-center justify-center space-x-1.5">
                              {inv.status === 'PENDING' && (
                                <button
                                  onClick={() => handleResendInvite(inv.invitation_id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                                  title={lang === 'tr' ? '48 saatlik süreyi sıfırla ve yeni link üret' : 'Reset 48h clock and generate new link'}
                                >
                                  {d.btnResend}
                                </button>
                              )}
                              {inv.status === 'PENDING' && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.invitation_id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                                >
                                  {d.btnRevoke}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ================================================= */}
      {/* MODAL 1: INVITE TEAM MEMBER DIALOG */}
      {/* ================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {d.modalInviteTitle}
                </h3>
                <p className="text-xs font-light text-slate-400">
                  {lang === 'tr' ? 'Delegatör:' : 'Delegator:'} <span className="font-bold">{currentRole}</span>
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400">
                {inviteError}
              </div>
            )}

            {inviteSuccessUrl ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{lang === 'tr' ? 'Davet oluşturuldu ve 48 saatlik aktivasyon bağlantısı hazır!' : 'Invitation generated and 48-hour secure link is ready!'}</span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-2">
                  <span className="font-mono font-light text-[11px] text-slate-700 dark:text-slate-300 truncate">
                    {inviteSuccessUrl}
                  </span>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteSuccessUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    {copiedLink ? d.copySuccess : d.btnCopy}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteSuccessUrl(null);
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {common.close}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblFullName}
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="Ahmet Yılmaz"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblEmail}
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="ahmet@caesar-projects.com"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblTargetRole}
                  </label>
                  <select
                    required
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as RoleTier)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_METADATA[role]?.titleTr || role} (Tier {ROLE_METADATA[role]?.tier})
                      </option>
                    ))}
                  </select>
                </div>

                {inviteRole && (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {d.lblDepartmentAuto}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {ROLE_METADATA[inviteRole as RoleTier]?.department}
                    </span>
                    <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 mt-1">
                      {ROLE_METADATA[inviteRole as RoleTier]?.descriptionTr}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblAllowedProjects}
                  </label>
                  <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 space-y-1">
                    {portfolioProjects.map((p) => (
                      <label key={p.project_id} className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteProjects.includes(p.project_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteProjects((prev) => [...prev, p.project_id]);
                            } else {
                              setInviteProjects((prev) => prev.filter((id) => id !== p.project_id));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.project_name} <span className="font-light">({p.project_id})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting || !inviteRole}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {inviteSubmitting ? (lang === 'tr' ? 'Oluşturuluyor...' : 'Generating...') : d.btnSendInvite}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 2: EDIT USER ROLE MODAL */}
      {/* ================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
              {d.btnChangeRole}: {editingUser.full_name}
            </h3>
            <p className="text-xs font-mono font-light text-slate-400">
              {editingUser.email}
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {d.lblNewRole}
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as RoleTier)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_METADATA[role]?.titleTr || role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveUserRole}
                disabled={editSubmitting || !editRole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editSubmitting ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : common.save}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
