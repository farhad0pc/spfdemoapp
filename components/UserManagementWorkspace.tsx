/* eslint-disable @next/next/no-img-element */
'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  RoleTier,
  CorporateUserProfile,
  UserInvitation,
  PortfolioProject,
  TeamRecord,
} from '@/types/requisition';
import {
  ROLE_METADATA,
  canChangeOperationalStatus,
  canChangeUserRole,
  canInviteRole,
  canSuspendAccount,
  canViewProtectedRoot,
  getAssignableRoles,
  isProtectedRootUser,
} from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';
import {
  compressImageToWebP,
  CompressedImageResult,
  formatBytesLabel,
} from '@/lib/imageCompression';
import WebcamCaptureModal from '@/components/WebcamCaptureModal';
import UserDetailDrawer from '@/components/UserDetailDrawer';
import DevVaultModal from '@/components/DevVaultModal';

interface UserManagementWorkspaceProps {
  currentRole: RoleTier;
  currentUserEmail?: string;
  lang: 'tr' | 'en';
  portfolioProjects?: PortfolioProject[];
  onRolePreviewChange?: (role: RoleTier) => void;
  authenticatedRole?: RoleTier;
  onCurrentUserAvatarUpdated?: (avatarUrl: string | null) => void;
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
  onCurrentUserAvatarUpdated,
}: UserManagementWorkspaceProps) {
  const currentClockSec = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerSnapshot
  );
  const d = DICTIONARY[lang].personnel;
  const common = DICTIONARY[lang].common;

  // Strictly Tiers 0-1 (SYSTEM_ADMIN, EXECUTIVE) can upload/change/delete other users' profile avatars
  const canManageAvatars =
    currentRole === 'SYSTEM_ADMIN' || currentRole === 'EXECUTIVE';

  // Data State
  const [users, setUsers] = useState<CorporateUserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [callerTeamId, setCallerTeamId] = useState<string | null>(null);
  const [isDevElevated, setIsDevElevated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<
    'ROSTER' | 'TEAMS' | 'INVITATIONS'
  >('ROSTER');

  // Governance Drawer & Security Vault State
  const [selectedUserForDrawer, setSelectedUserForDrawer] =
    useState<CorporateUserProfile | null>(null);
  const [isDevVaultOpen, setIsDevVaultOpen] = useState<boolean>(false);

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
  const [editingUser, setEditingUser] = useState<CorporateUserProfile | null>(
    null
  );
  const [editRole, setEditRole] = useState<RoleTier | ''>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Milestone v2.9.4 Profile Avatar Modal State (Tier 0-1 Only)
  const [avatarEditingUser, setAvatarEditingUser] =
    useState<CorporateUserProfile | null>(null);
  const [avatarPreview, setAvatarPreview] =
    useState<CompressedImageResult | null>(null);
  const [avatarCompressing, setAvatarCompressing] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isAvatarCameraOpen, setIsAvatarCameraOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview?.previewUrl) {
        URL.revokeObjectURL(avatarPreview.previewUrl);
      }
    };
  }, [avatarPreview]);

  // Fetch Users, Teams & Invites
  const fetchPersonnelData = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?role=${currentRole}`);
      const data = await res.json();
      if (res.ok) {
        const fetchedUsers = (data.users || []) as CorporateUserProfile[];
        setUsers(fetchedUsers);
        setInvitations((data.invitations || []) as UserInvitation[]);
        setTeams((data.teams || []) as TeamRecord[]);
        setCallerTeamId((data.callerTeamId as string | null) ?? null);
        setIsDevElevated(Boolean(data.isDevElevated));

        setSelectedUserForDrawer((prev) => {
          if (!prev) return null;
          return fetchedUsers.find((u) => u.id === prev.id) || prev;
        });
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
          setUsers((data.users || []) as CorporateUserProfile[]);
          setInvitations((data.invitations || []) as UserInvitation[]);
          setTeams((data.teams || []) as TeamRecord[]);
          setCallerTeamId((data.callerTeamId as string | null) ?? null);
          setIsDevElevated(Boolean(data.isDevElevated));
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

  // Visibility-Filtered Users (Hides Protected Root from Tiers 1–4 even during Role Preview)
  const visibleUsers = useMemo(() => {
    const allowRootView = canViewProtectedRoot(currentRole);
    return users.filter((u) => allowRootView || !isProtectedRootUser(u));
  }, [users, currentRole]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return visibleUsers.filter((u) => {
      const nameMatch =
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.job_title?.toLowerCase().includes(q) ||
        u.team?.name?.toLowerCase().includes(q);
      const roleMatch =
        u.role?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q);
      const deptMatch =
        departmentFilter === 'ALL' || u.department === departmentFilter;
      const tmMatch =
        teamFilter === 'ALL'
          ? true
          : teamFilter === 'UNASSIGNED'
          ? !u.team_id
          : u.team_id === teamFilter;
      return (!q || nameMatch || roleMatch) && deptMatch && tmMatch;
    });
  }, [visibleUsers, searchQuery, departmentFilter, teamFilter]);

  // Grouped Team Roster for Asana/ClickUp-style Team Hierarchy View
  const teamGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      name: string;
      code: string;
      department: string;
      leaderId: string | null;
      members: CorporateUserProfile[];
    }> = teams.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code || 'TEAM',
      department: t.department,
      leaderId: t.leader_user_id || null,
      members: filteredUsers.filter((u) => u.team_id === t.id),
    }));

    const assignedTeamIds = new Set(teams.map((t) => t.id));
    const unassignedMembers = filteredUsers.filter(
      (u) => !u.team_id || !assignedTeamIds.has(u.team_id)
    );

    if (unassignedMembers.length > 0 || teams.length === 0) {
      groups.push({
        id: 'UNASSIGNED',
        name: d.unassignedTeam,
        code: 'HUB-GEN',
        department: 'CENTRAL',
        leaderId: null,
        members: unassignedMembers,
      });
    }

    return groups;
  }, [teams, filteredUsers, d.unassignedTeam]);

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invitations.filter((inv) => {
      const nameMatch =
        inv.full_name?.toLowerCase().includes(q) ||
        inv.email?.toLowerCase().includes(q);
      const roleMatch =
        inv.target_role?.toLowerCase().includes(q) ||
        inv.target_department?.toLowerCase().includes(q);
      const deptMatch =
        departmentFilter === 'ALL' ||
        inv.target_department === departmentFilter;
      return (!q || nameMatch || roleMatch) && deptMatch;
    });
  }, [invitations, searchQuery, departmentFilter]);

  // KPI Computations
  const kpiStats = useMemo(() => {
    const total = visibleUsers.length;
    const active = visibleUsers.filter(
      (u) => u.account_status === 'ACTIVE' && u.operational_status !== 'ON_LEAVE'
    ).length;
    const pendingInvites = invitations.filter(
      (i) => i.status === 'PENDING'
    ).length;
    const depts = new Set(
      visibleUsers.map((u) => u.department).filter(Boolean)
    ).size;
    return { total, active, pendingInvites, depts };
  }, [visibleUsers, invitations]);

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
      <span className="text-[10px] font-mono font-light px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="font-bold">{hours}</span>
        {lang === 'tr' ? 's' : 'h'} <span className="font-bold">{mins}</span>
        {lang === 'tr' ? 'd' : 'm'} {lang === 'tr' ? 'kaldı' : 'left'}
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
        setInviteError(
          data.error ||
            (lang === 'tr'
              ? 'Davet oluşturulamadı.'
              : 'Failed to generate invitation.')
        );
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
        alert(
          lang === 'tr'
            ? 'Davet yenilendi ve 48 saatlik yeni bağlantı panoya kopyalandı!'
            : 'Invite refreshed! New 48-hour link copied to clipboard.'
        );
        void fetchPersonnelData();
      } else {
        alert(
          data.error || (lang === 'tr' ? 'İşlem başarısız.' : 'Action failed.')
        );
      }
    } catch {
      alert(lang === 'tr' ? 'İstek gönderilemedi.' : 'Network error.');
    }
  };

  // Handle Revoke Invite
  const handleRevokeInvite = async (invitationId: string) => {
    if (
      !confirm(
        lang === 'tr'
          ? 'Bu daveti iptal etmek istediğinize emin misiniz?'
          : 'Revoke this invitation?'
      )
    )
      return;
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

  // Handle Account Status Toggle (Active / Suspend — Tier 0 & Tier 1 Only)
  const handleToggleUserStatus = async (user: CorporateUserProfile) => {
    if (isProtectedRootUser(user) || !canSuspendAccount(currentRole, user)) {
      return;
    }
    const nextStatus = user.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          user_id: user.id,
          new_status: nextStatus,
          operational_status: nextStatus,
          actor_role: currentRole,
        }),
      });

      if (res.ok) {
        void fetchPersonnelData();
      } else {
        const data = await res.json();
        alert(
          data.error ||
            (lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.')
        );
      }
    } catch {
      // Ignore
    }
  };

  // Handle Operational Duty Toggle (ACTIVE / ON_LEAVE — Tier 0, Tier 1, or Tier 2 Own-Team Leader)
  const handleToggleOperationalStatus = async (user: CorporateUserProfile) => {
    if (
      isProtectedRootUser(user) ||
      !canChangeOperationalStatus(currentRole, user, callerTeamId)
    ) {
      return;
    }
    const nextOp = user.operational_status === 'ON_LEAVE' ? 'ACTIVE' : 'ON_LEAVE';
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          operational_status: nextOp,
        }),
      });
      if (res.ok) {
        void fetchPersonnelData();
      } else {
        const data = await res.json();
        alert(
          data.error ||
            (lang === 'tr'
              ? 'Operasyonel durum güncellenemedi.'
              : 'Failed to update operational status.')
        );
      }
    } catch {
      // Ignore
    }
  };

  // Handle Role Update
  const handleSaveUserRole = async () => {
    if (!editingUser || !editRole || isProtectedRootUser(editingUser)) return;
    setEditSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
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
        alert(
          data.error ||
            (lang === 'tr' ? 'Rol güncellenemedi.' : 'Failed to update role.')
        );
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // Milestone v2.9.4 Avatar Modal Handlers
  const openAvatarModal = (user: CorporateUserProfile) => {
    if (!canManageAvatars) return;
    if (isProtectedRootUser(user) && currentRole !== 'SYSTEM_ADMIN') return;
    if (avatarPreview?.previewUrl) {
      URL.revokeObjectURL(avatarPreview.previewUrl);
    }
    setAvatarPreview(null);
    setAvatarError(null);
    setAvatarEditingUser(user);
  };

  const closeAvatarModal = () => {
    if (avatarPreview?.previewUrl) {
      URL.revokeObjectURL(avatarPreview.previewUrl);
    }
    setAvatarPreview(null);
    setAvatarError(null);
    setAvatarEditingUser(null);
  };

  const handleAvatarFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setAvatarCompressing(true);
    setAvatarError(null);
    try {
      const compressed = await compressImageToWebP(file, 256, 0.82);
      setAvatarPreview((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return compressed;
      });
    } catch (err: unknown) {
      setAvatarError(
        err instanceof Error
          ? err.message
          : lang === 'tr'
          ? 'Görsel sıkıştırılamadı.'
          : 'Failed to compress image.'
      );
    } finally {
      setAvatarCompressing(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarEditingUser || !avatarPreview) return;
    setAvatarSaving(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append('user_id', avatarEditingUser.id);
      formData.append('actor_role', currentRole);
      formData.append('file', avatarPreview.file);

      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setAvatarError(
          data.error ||
            (lang === 'tr' ? 'Fotoğraf kaydedilemedi.' : 'Failed to save photo.')
        );
        setAvatarSaving(false);
        return;
      }

      const nextUrl = (data.avatar_url as string | null) ?? null;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === avatarEditingUser.id ? { ...u, avatar_url: nextUrl } : u
        )
      );

      if (
        currentUserEmail &&
        avatarEditingUser.email?.toLowerCase() ===
          currentUserEmail.toLowerCase()
      ) {
        onCurrentUserAvatarUpdated?.(nextUrl);
      }

      closeAvatarModal();
    } catch (err: unknown) {
      setAvatarError(
        err instanceof Error
          ? err.message
          : lang === 'tr'
          ? 'Ağ hatası.'
          : 'Network error.'
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarEditingUser) return;
    setAvatarRemoving(true);
    setAvatarError(null);

    try {
      const res = await fetch(
        `/api/users/avatar?user_id=${encodeURIComponent(
          avatarEditingUser.id
        )}&actor_role=${encodeURIComponent(currentRole)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok) {
        setAvatarError(
          data.error ||
            (lang === 'tr'
              ? 'Fotoğraf kaldırılamadı.'
              : 'Failed to remove photo.')
        );
        setAvatarRemoving(false);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === avatarEditingUser.id ? { ...u, avatar_url: null } : u
        )
      );

      if (
        currentUserEmail &&
        avatarEditingUser.email?.toLowerCase() ===
          currentUserEmail.toLowerCase()
      ) {
        onCurrentUserAvatarUpdated?.(null);
      }

      closeAvatarModal();
    } catch (err: unknown) {
      setAvatarError(
        err instanceof Error
          ? err.message
          : lang === 'tr'
          ? 'Ağ hatası.'
          : 'Network error.'
      );
    } finally {
      setAvatarRemoving(false);
    }
  };

  const renderStatusBadges = (u: CorporateUserProfile) => {
    const isRoot = isProtectedRootUser(u);
    const opStatus = u.operational_status || 'ACTIVE';

    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {isRoot && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            🔒 {d.protectedRootBadge}
          </span>
        )}
        {u.account_status === 'SUSPENDED' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            ✕ {d.statusSuspended}
          </span>
        ) : u.account_status === 'INVITED' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            ⏳ {d.statusInvited}
          </span>
        ) : opStatus === 'ON_LEAVE' ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            ◐ {d.statusOnLeave}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            ✓ {d.statusActive}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase break-words">
                {d.title}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800 shrink-0">
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

          <div className="flex flex-wrap items-center gap-2">
            {currentRole === 'SYSTEM_ADMIN' && (
              <button
                type="button"
                onClick={() => setIsDevVaultOpen(true)}
                className={`w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isDevElevated
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                }`}
              >
                <span>{isDevElevated ? '●' : '🔒'}</span>
                <span>
                  {isDevElevated
                    ? lang === 'tr'
                      ? 'Root Kasası Açık'
                      : 'Root Vault Active'
                    : lang === 'tr'
                    ? 'Root Kasası'
                    : 'Root Vault'}
                </span>
              </button>
            )}

            {/* Action: Open Invite Modal (if authorized) */}
            {assignableRoles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setInviteSuccessUrl(null);
                  setInviteError(null);
                  setInviteEmail('');
                  setInviteFullName('');
                  setInviteRole(assignableRoles[0] || '');
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <span>{d.btnInvite}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Developer Role Preview Switcher Bar (Exclusive to SYSTEM_ADMIN Tier 0) */}
      {authenticatedRole === 'SYSTEM_ADMIN' && onRolePreviewChange && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
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
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
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
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={currentRole}
                onChange={(e) =>
                  onRolePreviewChange(e.target.value as RoleTier)
                }
                className="w-full sm:w-auto min-h-[44px] h-11 sm:h-10 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                {(Object.keys(ROLE_METADATA) as RoleTier[]).map((r) => {
                  const m = ROLE_METADATA[r];
                  return (
                    <option key={r} value={r}>
                      [{m.department}] {lang === 'tr' ? m.titleTr : m.titleEn}{' '}
                      (Tier {m.tier})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4-Stat Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {d.kpiTotalUsers}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-light text-slate-900 dark:text-white">
              {kpiStats.total}
            </span>
            <span className="text-xs font-light text-slate-400">
              {d.kpiTotalUsersSub}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {d.kpiActiveUsers}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-light text-emerald-600 dark:text-emerald-400">
              {kpiStats.active}
            </span>
            <span className="text-xs font-light text-slate-400">
              {d.kpiActiveUsersSub}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {d.kpiPendingInvites}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-light text-amber-600 dark:text-amber-400">
              {kpiStats.pendingInvites}
            </span>
            <span className="text-xs font-light text-slate-400">
              {d.kpiPendingInvitesSub}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {d.kpiDepartments}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl sm:text-2xl font-light text-blue-600 dark:text-blue-400">
              {kpiStats.depts} / {teams.length || 1}
            </span>
            <span className="text-xs font-light text-slate-400">
              {d.kpiDepartmentsSub}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Tabs: Roster | Teams | Invitations */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ROSTER')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ROSTER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.tabRoster}{' '}
              <span className="font-light">({visibleUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TEAMS')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TEAMS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.tabTeams}{' '}
              <span className="font-light">({teams.length || 1})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INVITATIONS')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'INVITATIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d.tabInvites}{' '}
              <span className="font-light">({invitations.length})</span>
              {kpiStats.pendingInvites > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                  {kpiStats.pendingInvites}
                </span>
              )}
            </button>
          </div>

          {/* Department & Team Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] h-11 sm:h-10 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">{d.allDepartments}</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="EXECUTIVE">EXECUTIVE</option>
              <option value="TECH_OFFICE">TECH_OFFICE</option>
              <option value="PURCHASING">PURCHASING</option>
              <option value="DEPOT">DEPOT</option>
            </select>

            {activeTab !== 'INVITATIONS' && (
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full sm:w-auto min-h-[44px] h-11 sm:h-10 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">{d.allTeams}</option>
                {teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
                <option value="UNASSIGNED">{d.unassignedTeam}</option>
              </select>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full min-h-[44px] h-11 sm:h-10 pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-light text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* =============================================================== */}
        {/* TAB 1: ACTIVE TEAM ROSTER (MOBILE CARDS < md + DESKTOP TABLE)   */}
        {/* =============================================================== */}
        {activeTab === 'ROSTER' && (
          <>
            {/* Mobile (< md) Roster Cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center text-xs font-light text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                  {common.loading}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs font-light text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                  {d.emptyRoster}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const roleMeta = ROLE_METADATA[u.role];
                  const isRoot = isProtectedRootUser(u);
                  const allowSuspend = canSuspendAccount(currentRole, u);
                  const allowOpToggle = canChangeOperationalStatus(
                    currentRole,
                    u,
                    callerTeamId
                  );
                  const allowRoleEdit = canChangeUserRole(currentRole, u);
                  const initialLetter =
                    u.full_name?.charAt(0).toUpperCase() || 'U';

                  return (
                    <div
                      key={`mob-usr-${u.id}`}
                      className={`rounded-2xl border p-3.5 space-y-3 ${
                        isRoot
                          ? 'border-purple-400/60 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          {canManageAvatars &&
                          (!isRoot || currentRole === 'SYSTEM_ADMIN') ? (
                            <button
                              type="button"
                              onClick={() => openAvatarModal(u)}
                              title={d.updateProfilePhoto}
                              className="group relative w-11 h-11 rounded-full shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.full_name}
                                  className="w-11 h-11 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                                  {initialLetter}
                                </div>
                              )}
                            </button>
                          ) : u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                              {initialLetter}
                            </div>
                          )}

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDrawer(u)}
                              className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left cursor-pointer"
                            >
                              {u.full_name}
                            </button>
                            <div className="text-[11px] font-mono font-light text-slate-400 truncate">
                              {u.email}
                            </div>
                            {u.job_title && (
                              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                {u.job_title}
                              </div>
                            )}
                          </div>
                        </div>

                        {renderStatusBadges(u)}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div>
                          <span className="font-bold text-blue-600 dark:text-blue-400 block">
                            {roleMeta
                              ? lang === 'tr'
                                ? roleMeta.titleTr
                                : roleMeta.titleEn
                              : u.role}
                          </span>
                          <span className="text-[10px] font-mono font-light text-slate-400">
                            {u.department}
                            {u.team?.name ? ` • ${u.team.name}` : ''}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.authority_tier === 0
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300'
                              : u.authority_tier === 1
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'
                              : u.authority_tier === 2
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300'
                              : u.authority_tier === 3
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                          }`}
                        >
                          Tier {u.authority_tier}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDrawer(u)}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          {d.btnInspectUser}
                        </button>

                        {!isRoot &&
                          allowOpToggle &&
                          u.account_status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleToggleOperationalStatus(u)}
                              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                            >
                              {u.operational_status === 'ON_LEAVE'
                                ? d.btnSetActiveDuty
                                : d.btnSetOnLeave}
                            </button>
                          )}

                        {!isRoot && allowSuspend && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              u.account_status === 'ACTIVE'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {u.account_status === 'ACTIVE'
                              ? d.btnSuspend
                              : d.btnActivate}
                          </button>
                        )}

                        {!isRoot && allowRoleEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setEditRole(u.role);
                            }}
                            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            {d.btnChangeRole}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop (md:+) Roster Table */}
            <div className="hidden md:block w-full overflow-x-auto touch-scroll-x rounded-xl border border-slate-200 dark:border-slate-800">
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
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400 font-light"
                      >
                        {common.loading}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400 font-light"
                      >
                        {d.emptyRoster}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleMeta = ROLE_METADATA[u.role];
                      const isRoot = isProtectedRootUser(u);
                      const allowSuspend = canSuspendAccount(currentRole, u);
                      const allowOpToggle = canChangeOperationalStatus(
                        currentRole,
                        u,
                        callerTeamId
                      );
                      const allowRoleEdit = canChangeUserRole(currentRole, u);
                      const initialLetter =
                        u.full_name?.charAt(0).toUpperCase() || 'U';

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isRoot
                              ? 'bg-purple-50/30 dark:bg-purple-950/20 hover:bg-purple-50/60 dark:hover:bg-purple-950/35'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-3">
                              {canManageAvatars &&
                              (!isRoot || currentRole === 'SYSTEM_ADMIN') ? (
                                <button
                                  type="button"
                                  onClick={() => openAvatarModal(u)}
                                  title={d.updateProfilePhoto}
                                  className="group relative w-9 h-9 rounded-full shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                  {u.avatar_url ? (
                                    <img
                                      src={u.avatar_url}
                                      alt={u.full_name}
                                      className="w-9 h-9 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                                      {initialLetter}
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <svg
                                      className="w-4 h-4"
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
                                      <circle
                                        cx="12"
                                        cy="13"
                                        r="3"
                                        strokeWidth="2"
                                      />
                                    </svg>
                                  </div>
                                </button>
                              ) : u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {initialLetter}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForDrawer(u)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                                >
                                  {u.full_name}
                                </button>
                                <div className="text-[11px] font-mono font-light text-slate-400">
                                  {u.email}
                                </div>
                                {u.phone_number && (
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {u.phone_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                              {u.department}
                            </span>
                            {u.team?.name && (
                              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                                {u.team.name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                              {roleMeta
                                ? lang === 'tr'
                                  ? roleMeta.titleTr
                                  : roleMeta.titleEn
                                : u.role}
                            </div>
                            <div className="text-[10px] font-mono font-light text-slate-400">
                              {u.job_title ? `${u.job_title} • ` : ''}
                              {u.role}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.authority_tier === 0
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300'
                                  : u.authority_tier === 1
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'
                                  : u.authority_tier === 2
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300'
                                  : u.authority_tier === 3
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300'
                              }`}
                            >
                              Tier {u.authority_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {renderStatusBadges(u)}
                          </td>
                          <td className="px-4 py-3 font-mono font-light text-[11px] text-slate-500">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleDateString(
                                  lang === 'tr' ? 'tr-TR' : 'en-US'
                                )
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForDrawer(u)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                              >
                                {d.btnInspectUser}
                              </button>

                              {!isRoot &&
                                allowOpToggle &&
                                u.account_status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleOperationalStatus(u)
                                    }
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                                  >
                                    {u.operational_status === 'ON_LEAVE'
                                      ? d.btnSetActiveDuty
                                      : d.btnSetOnLeave}
                                  </button>
                                )}

                              {!isRoot && allowSuspend && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                    u.account_status === 'ACTIVE'
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  }`}
                                >
                                  {u.account_status === 'ACTIVE'
                                    ? d.btnSuspend
                                    : d.btnActivate}
                                </button>
                              )}

                              {!isRoot && allowRoleEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditRole(u.role);
                                  }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  {d.btnChangeRole}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* =============================================================== */}
        {/* TAB 2: ASANA / CLICKUP-STYLE TEAMS & UNIT HIERARCHY VIEW        */}
        {/* =============================================================== */}
        {activeTab === 'TEAMS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamGroups.map((tg) => {
              const leader = tg.leaderId
                ? visibleUsers.find((u) => u.id === tg.leaderId)
                : tg.members.find((u) => u.authority_tier <= 2);

              return (
                <div
                  key={tg.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            {tg.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            {tg.department}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mt-1">
                          {tg.name}
                        </h3>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        {tg.members.length}{' '}
                        {lang === 'tr' ? 'Üye' : 'Members'}
                      </span>
                    </div>

                    {leader && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 text-xs">
                        <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                          {d.teamLeadBadge}:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDrawer(leader)}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                        >
                          {leader.full_name} (Tier {leader.authority_tier})
                        </button>
                      </div>
                    )}

                    {tg.members.length === 0 ? (
                      <div className="py-6 text-center text-xs font-light text-slate-400">
                        {lang === 'tr'
                          ? 'Bu ekipte filtreye uygun personel yok.'
                          : 'No matching members in this team.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tg.members.map((member) => {
                          const rm = ROLE_METADATA[member.role];
                          return (
                            <div
                              key={`tm-mem-${member.id}`}
                              onClick={() => setSelectedUserForDrawer(member)}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {member.avatar_url ? (
                                  <img
                                    src={member.avatar_url}
                                    alt={member.full_name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                                    {(member.full_name || 'U')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                    {member.full_name}
                                  </span>
                                  <span className="text-[10px] font-light text-slate-500 dark:text-slate-400 block truncate">
                                    {member.job_title ||
                                      (lang === 'tr'
                                        ? rm?.titleTr
                                        : rm?.titleEn)}{' '}
                                    • Tier {member.authority_tier}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {renderStatusBadges(member)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 3: INVITATIONS (MOBILE CARDS < md + DESKTOP TABLE)          */}
        {/* =============================================================== */}
        {activeTab === 'INVITATIONS' && (
          <>
            {/* Mobile (< md) Invitation Cards */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center text-xs font-light text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                  {common.loading}
                </div>
              ) : filteredInvitations.length === 0 ? (
                <div className="p-8 text-center text-xs font-light text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800">
                  {d.emptyInvites}
                </div>
              ) : (
                filteredInvitations.map((inv) => {
                  const isManageable = canInviteRole(
                    currentRole,
                    inv.target_role
                  );

                  return (
                    <div
                      key={`mob-inv-${inv.invitation_id}`}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {inv.full_name}
                          </div>
                          <div className="text-[11px] font-mono font-light text-slate-400 truncate">
                            {inv.email}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            inv.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              : inv.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div>
                          <span className="font-bold text-blue-600 dark:text-blue-400 block">
                            {ROLE_METADATA[inv.target_role]?.titleTr ||
                              inv.target_role}
                          </span>
                          <span className="text-[10px] uppercase font-mono font-light text-slate-400">
                            {inv.target_department} • Tier {inv.target_tier}
                          </span>
                        </div>
                        <div>
                          {getRemainingTimeBadge(inv.expires_at, inv.status)}
                        </div>
                      </div>

                      {isManageable && inv.status === 'PENDING' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleResendInvite(inv.invitation_id)
                            }
                            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                          >
                            {d.btnResend}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeInvite(inv.invitation_id)
                            }
                            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                          >
                            {d.btnRevoke}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop (md:+) Invitations Table */}
            <div className="hidden md:block w-full overflow-x-auto touch-scroll-x rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{d.thInvitee}</th>
                    <th className="px-4 py-3">{d.thTargetRole}</th>
                    <th className="px-4 py-3">{d.thExpiresIn}</th>
                    <th className="px-4 py-3 text-center">
                      {d.thInviteStatus}
                    </th>
                    <th className="px-4 py-3 text-center">{d.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400 font-light"
                      >
                        {common.loading}
                      </td>
                    </tr>
                  ) : filteredInvitations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400 font-light"
                      >
                        {d.emptyInvites}
                      </td>
                    </tr>
                  ) : (
                    filteredInvitations.map((inv) => {
                      const isManageable = canInviteRole(
                        currentRole,
                        inv.target_role
                      );

                      return (
                        <tr
                          key={inv.invitation_id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
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
                              {ROLE_METADATA[inv.target_role]?.titleTr ||
                                inv.target_role}
                            </div>
                            <div className="text-[10px] uppercase font-mono font-light text-slate-400">
                              {inv.target_department} • Tier {inv.target_tier}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getRemainingTimeBadge(inv.expires_at, inv.status)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                  : inv.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isManageable && (
                              <div className="flex items-center justify-center space-x-1.5">
                                {inv.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResendInvite(inv.invitation_id)
                                    }
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                                  >
                                    {d.btnResend}
                                  </button>
                                )}
                                {inv.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRevokeInvite(inv.invitation_id)
                                    }
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
          </>
        )}
      </div>

      {/* ================================================= */}
      {/* DRAWER: PERSONNEL GOVERNANCE & TEAM DRAWER         */}
      {/* ================================================= */}
      <UserDetailDrawer
        isOpen={Boolean(selectedUserForDrawer)}
        user={selectedUserForDrawer}
        teams={teams}
        currentRole={currentRole}
        callerTeamId={callerTeamId}
        isDevElevated={isDevElevated}
        lang={lang}
        onClose={() => setSelectedUserForDrawer(null)}
        onRequireDevVault={() => setIsDevVaultOpen(true)}
        onUpdated={() => {
          void fetchPersonnelData();
        }}
        onOpenAvatarModal={(targetUser) => openAvatarModal(targetUser)}
      />

      {/* ================================================= */}
      {/* MODAL: TIER 0 DEVELOPER SECURITY VAULT             */}
      {/* ================================================= */}
      <DevVaultModal
        isOpen={isDevVaultOpen}
        onClose={() => setIsDevVaultOpen(false)}
        onVerified={() => {
          setIsDevElevated(true);
          void fetchPersonnelData();
        }}
        lang={lang}
      />

      {/* ================================================= */}
      {/* MODAL 1: INVITE TEAM MEMBER DIALOG                */}
      {/* ================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-[calc(100vw-1rem)] sm:w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {d.modalInviteTitle}
                </h3>
                <p className="text-xs font-light text-slate-400">
                  {lang === 'tr' ? 'Delegatör:' : 'Delegator:'}{' '}
                  <span className="font-bold">{currentRole}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                  <svg
                    className="w-5 h-5 text-emerald-600 shrink-0"
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
                  <span>{d.inviteSuccessNotice}</span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-mono font-light text-[11px] text-slate-700 dark:text-slate-300 break-all">
                    {inviteSuccessUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteSuccessUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="min-h-[40px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {copiedLink ? d.copySuccess : d.btnCopy}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteSuccessUrl(null);
                    }}
                    className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
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
                    className="w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
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
                    className="w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
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
                    className="w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_METADATA[role]?.titleTr || role} (Tier{' '}
                        {ROLE_METADATA[role]?.tier})
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
                      <label
                        key={p.project_id}
                        className="min-h-[34px] flex items-center space-x-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inviteProjects.includes(p.project_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteProjects((prev) => [
                                ...prev,
                                p.project_id,
                              ]);
                            } else {
                              setInviteProjects((prev) =>
                                prev.filter((id) => id !== p.project_id)
                              );
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.project_name}{' '}
                          <span className="font-light">({p.project_id})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting || !inviteRole}
                    className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {inviteSubmitting
                      ? lang === 'tr'
                        ? 'Oluşturuluyor...'
                        : 'Generating...'
                      : d.btnSendInvite}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 2: EDIT USER ROLE MODAL                     */}
      {/* ================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-[calc(100vw-1rem)] sm:w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase break-words">
              {d.btnChangeRole}: {editingUser.full_name}
            </h3>
            <p className="text-xs font-mono font-light text-slate-400 break-all">
              {editingUser.email}
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {d.lblNewRole}
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as RoleTier)}
                className="w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
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
                className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveUserRole}
                disabled={editSubmitting || !editRole}
                className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {editSubmitting
                  ? lang === 'tr'
                    ? 'Kaydediliyor...'
                    : 'Saving...'
                  : common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 3: MILESTONE v2.9.4 UPDATE USER PHOTO MODAL */}
      {/* ================================================= */}
      {avatarEditingUser && canManageAvatars && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-[calc(100vw-1rem)] sm:w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {d.updateProfilePhoto}
                </h3>
                <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                  {d.avatarModalDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAvatarModal}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {avatarError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400">
                {avatarError}
              </div>
            )}

            {/* User Identity & Circular 112x112 Preview */}
            <div className="flex flex-col items-center space-y-3 py-2">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-blue-500/40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
                {avatarPreview?.previewUrl || avatarEditingUser.avatar_url ? (
                  <img
                    src={
                      avatarPreview?.previewUrl ||
                      avatarEditingUser.avatar_url ||
                      ''
                    }
                    alt={avatarEditingUser.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {avatarEditingUser.full_name?.charAt(0).toUpperCase() ||
                      'U'}
                  </span>
                )}
              </div>

              <div className="text-center">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {avatarEditingUser.full_name}
                </div>
                <div className="text-xs font-mono font-light text-slate-400 break-all">
                  {avatarEditingUser.email}
                </div>
                {avatarPreview && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    WebP • {avatarPreview.width}×{avatarPreview.height}px •{' '}
                    {formatBytesLabel(avatarPreview.sizeBytes)}
                  </span>
                )}
              </div>
            </div>

            {/* Dual Source Buttons: Take Photo (WebcamCaptureModal) & Upload from Device */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={avatarCompressing || avatarSaving || avatarRemoving}
                onClick={() => setIsAvatarCameraOpen(true)}
                className="min-h-[44px] h-11 sm:h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <svg
                  className="w-4 h-4 shrink-0"
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
                  <circle cx="12" cy="13" r="3" strokeWidth="2" />
                </svg>
                <span>{d.takePhoto}</span>
              </button>

              <button
                type="button"
                disabled={avatarCompressing || avatarSaving || avatarRemoving}
                onClick={() => avatarFileInputRef.current?.click()}
                className="min-h-[44px] h-11 sm:h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span>{d.uploadFromDevice}</span>
              </button>

              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/webp,image/jpeg,image/png,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleAvatarFileSelected(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Footer Actions: Remove Photo (if existing) + Cancel + Save Photo */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-2">
              {avatarEditingUser.avatar_url ? (
                <button
                  type="button"
                  disabled={avatarRemoving || avatarSaving}
                  onClick={handleRemoveAvatar}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {avatarRemoving ? common.loading : d.removePhoto}
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={closeAvatarModal}
                  className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {common.cancel}
                </button>
                <button
                  type="button"
                  disabled={
                    !avatarPreview || avatarSaving || avatarCompressing
                  }
                  onClick={handleSaveAvatar}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {avatarSaving ? common.saving : d.savePhoto}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal for Avatar Capture (Re-compressed to 256px WebP) */}
      <WebcamCaptureModal
        isOpen={isAvatarCameraOpen}
        lang={lang}
        onClose={() => setIsAvatarCameraOpen(false)}
        onCaptured={(captured) => {
          setIsAvatarCameraOpen(false);
          void handleAvatarFileSelected(captured.file);
        }}
      />
    </div>
  );
}
