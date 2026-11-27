import {
  RoleTier,
  DepartmentCode,
  AuthorityTier,
  CorporateUserProfile,
} from '@/types/requisition';
import {
  ActiveModuleKey,
  ModuleId,
  PortalView,
  getAllowedTiersForView,
  getModuleById,
} from '@/lib/moduleRegistry';

export const PROTECTED_ROOT_EMAIL = 'farhadmokhtari22@gmail.com';

export interface RoleMetadata {
  role: RoleTier;
  department: DepartmentCode;
  tier: AuthorityTier;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
}

export const ROLE_METADATA: Record<RoleTier, RoleMetadata> = {
  SYSTEM_ADMIN: {
    role: 'SYSTEM_ADMIN',
    department: 'SYSTEM',
    tier: 0,
    titleTr: 'Sistem Yöneticisi (Root / God-Tier)',
    titleEn: 'System Administrator (Root / God-Tier)',
    descriptionTr: 'Tüm yetkileri atama, acil durum kontrolleri ve rol simülasyonu.',
    descriptionEn: 'Full system oversight, emergency controls, and role simulation.',
  },
  EXECUTIVE: {
    role: 'EXECUTIVE',
    department: 'EXECUTIVE',
    tier: 1,
    titleTr: 'Yönetim Kurulu Direktörü (Executive)',
    titleEn: 'Executive Board Member',
    descriptionTr: 'Mali onay, bütçe aşım onayları ve tüm departman delegasyonu.',
    descriptionEn: 'Fiduciary sign-off, budget overrun ratification, and cross-department delegation.',
  },
  TECH_OFFICE_MANAGER: {
    role: 'TECH_OFFICE_MANAGER',
    department: 'TECH_OFFICE',
    tier: 2,
    titleTr: 'Teknik Ofis Müdürü (Tech Mgr)',
    titleEn: 'Technical Office Manager',
    descriptionTr: 'Metraj & bütçe kilitleme, teknik ofis ekip delegasyonu.',
    descriptionEn: 'Intake calculation locking, technical office delegation.',
  },
  PURCHASING_MANAGER: {
    role: 'PURCHASING_MANAGER',
    department: 'PURCHASING',
    tier: 2,
    titleTr: 'Satın Alma Müdürü (Purchasing Mgr)',
    titleEn: 'Procurement Director / Manager',
    descriptionTr: 'Tedarikçi sözleşmeleri, teklif nihayeti ve satın alma delegasyonu.',
    descriptionEn: 'Vendor contracts, quota finalization, and procurement delegation.',
  },
  DEPOT_MANAGER: {
    role: 'DEPOT_MANAGER',
    department: 'DEPOT',
    tier: 2,
    titleTr: 'Ana Depo & Lojistik Müdürü (Depot Mgr)',
    titleEn: 'Depot & Logistics Manager',
    descriptionTr: 'Şantiye teslimat onayı (Handover sign-off), depo ekip delegasyonu.',
    descriptionEn: 'Site handover sign-off authority and depot team delegation.',
  },
  TECH_OFFICE_USER: {
    role: 'TECH_OFFICE_USER',
    department: 'TECH_OFFICE',
    tier: 3,
    titleTr: 'Saha Mühendisi / Mimar (Tech User)',
    titleEn: 'Site Engineer / Architect',
    descriptionTr: 'Talep oluşturma, hacim/metraj hesaplama ve teknik şartname.',
    descriptionEn: 'Requisition drafting, volume modeling, and technical specs.',
  },
  PURCHASING_AGENT: {
    role: 'PURCHASING_AGENT',
    department: 'PURCHASING',
    tier: 3,
    titleTr: 'Satın Alma Sorumlusu (Purchasing Agent)',
    titleEn: 'Purchasing / Procurement Officer',
    descriptionTr: 'Tedarikçi teklif girişi, sapma kontrolü ve satınalma ekibi daveti.',
    descriptionEn: 'Supplier quota logging, overrun checks, and procurement invitations.',
  },
  DEPOT_SENIOR_STAFF: {
    role: 'DEPOT_SENIOR_STAFF',
    department: 'DEPOT',
    tier: 3,
    titleTr: 'Kıdemli Depo Yetkilisi (Senior Depot)',
    titleEn: 'Senior Depot Logistics Officer',
    descriptionTr: 'İrsaliye mal kabulü, stok bakiye güncelleme, seri no atama.',
    descriptionEn: 'Inbound receipt logging, stock balance updates, serialized asset tagging.',
  },
  TECH_OFFICE_JUNIOR: {
    role: 'TECH_OFFICE_JUNIOR',
    department: 'TECH_OFFICE',
    tier: 4,
    titleTr: 'Teknik Ofis Asistanı (Junior Tech)',
    titleEn: 'Junior Technical Assistant',
    descriptionTr: 'Teknik talepleri inceleme ve arama (Yalnızca okuma).',
    descriptionEn: 'Browse and inspect technical requisitions (Read-only).',
  },
  PURCHASING_JUNIOR: {
    role: 'PURCHASING_JUNIOR',
    department: 'PURCHASING',
    tier: 4,
    titleTr: 'Satın Alma Asistanı (Junior Purchasing)',
    titleEn: 'Junior Procurement Clerk',
    descriptionTr: 'Teklif listelerini inceleme ve tedarikçi arama (Yalnızca okuma).',
    descriptionEn: 'Review quotas and vendor registries (Read-only).',
  },
  DEPOT_JUNIOR_STAFF: {
    role: 'DEPOT_JUNIOR_STAFF',
    department: 'DEPOT',
    tier: 4,
    titleTr: 'Saha Depo Görevlisi (Junior Depot)',
    titleEn: 'Junior Depot Logistics Assistant',
    descriptionTr: 'Barkod tarama, stok sorgulama ve raf kontrolü (Yalnızca okuma).',
    descriptionEn: 'Barcode scanning, stock lookup, and rack auditing (Read-only).',
  },
};

/**
 * Checks whether a user record represents the permanently protected root developer account.
 */
export function isProtectedRootUser(
  user?: Pick<CorporateUserProfile, 'email' | 'is_protected_root'> | null
): boolean {
  if (!user) return false;
  if (user.is_protected_root === true) return true;
  return (user.email || '').trim().toLowerCase() === PROTECTED_ROOT_EMAIL;
}

/**
 * Only Tier 0 (SYSTEM_ADMIN) may see the protected root account in user rosters.
 */
export function canViewProtectedRoot(actorRole: RoleTier): boolean {
  return actorRole === 'SYSTEM_ADMIN';
}

/**
 * Option 1: Account Suspension (ACTIVE <-> SUSPENDED) is strictly reserved for
 * Tier 0 (SYSTEM_ADMIN) and Tier 1 (EXECUTIVE), and is permanently forbidden on the protected root account.
 */
export function canSuspendAccount(
  actorRole: RoleTier,
  targetUser: Pick<CorporateUserProfile, 'role' | 'email' | 'is_protected_root'>
): boolean {
  if (isProtectedRootUser(targetUser)) return false;
  if (actorRole === 'SYSTEM_ADMIN') return true;
  if (actorRole === 'EXECUTIVE') {
    const targetMeta = ROLE_METADATA[targetUser.role];
    return Boolean(targetMeta && targetMeta.tier >= 1);
  }
  return false;
}

/**
 * Option 1: Operational Status (ACTIVE <-> ON_LEAVE) can be managed by:
 * - Tier 0 (SYSTEM_ADMIN) and Tier 1 (EXECUTIVE) for any non-root user
 * - Tier 2 Team Leaders / Division Managers for Tier 3 & 4 members within their own team (or own department)
 * Permanently locked to ACTIVE for the protected root account.
 */
export function canChangeOperationalStatus(
  actorRole: RoleTier,
  targetUser: Pick<
    CorporateUserProfile,
    'role' | 'department' | 'team_id' | 'email' | 'is_protected_root'
  >,
  actorTeamId?: string | null
): boolean {
  if (isProtectedRootUser(targetUser)) return false;
  if (actorRole === 'SYSTEM_ADMIN') return true;

  const actorMeta = ROLE_METADATA[actorRole];
  const targetMeta = ROLE_METADATA[targetUser.role];
  if (!actorMeta || !targetMeta) return false;

  if (actorMeta.tier === 1) {
    return targetMeta.tier >= 1;
  }

  if (actorMeta.tier === 2) {
    if (targetMeta.tier !== 3 && targetMeta.tier !== 4) return false;
    if (actorTeamId && targetUser.team_id) {
      return actorTeamId === targetUser.team_id;
    }
    return actorMeta.department === (targetUser.department || targetMeta.department);
  }

  return false;
}

/**
 * Checks whether the actor can change a target user's RoleTier.
 * Protected root account's role is permanently locked at SYSTEM_ADMIN (Tier 0).
 */
export function canChangeUserRole(
  actorRole: RoleTier,
  targetUser: Pick<CorporateUserProfile, 'role' | 'email' | 'is_protected_root'>
): boolean {
  if (isProtectedRootUser(targetUser)) return false;
  if (actorRole === 'SYSTEM_ADMIN') return true;
  if (targetUser.role === 'SYSTEM_ADMIN') return false;

  const actorMeta = ROLE_METADATA[actorRole];
  const targetMeta = ROLE_METADATA[targetUser.role];
  if (!actorMeta || !targetMeta) return false;

  if (actorMeta.tier === 1) {
    return targetMeta.tier >= 1;
  }

  if (actorMeta.tier === 2) {
    return (
      actorMeta.department === targetMeta.department &&
      (targetMeta.tier === 3 || targetMeta.tier === 4)
    );
  }

  return false;
}

/**
 * Checks whether the actor can edit a user's profile details (job_title, phone_number, team_id, etc.)
 * in the UserDetailDrawer.
 * Note: Editing the protected root user's metadata is restricted to SYSTEM_ADMIN with Developer Vault elevation.
 */
export function canEditUserDetails(
  actorRole: RoleTier,
  targetUser: Pick<
    CorporateUserProfile,
    'role' | 'department' | 'team_id' | 'email' | 'is_protected_root'
  >,
  actorTeamId?: string | null
): boolean {
  if (isProtectedRootUser(targetUser)) {
    return actorRole === 'SYSTEM_ADMIN';
  }
  if (actorRole === 'SYSTEM_ADMIN') return true;

  const actorMeta = ROLE_METADATA[actorRole];
  const targetMeta = ROLE_METADATA[targetUser.role];
  if (!actorMeta || !targetMeta) return false;

  if (actorMeta.tier === 1) {
    return targetMeta.tier >= 1;
  }

  if (actorMeta.tier === 2) {
    if (targetMeta.tier !== 3 && targetMeta.tier !== 4) return false;
    if (actorTeamId && targetUser.team_id) {
      return actorTeamId === targetUser.team_id;
    }
    return actorMeta.department === (targetUser.department || targetMeta.department);
  }

  return false;
}

/**
 * Checks if the caller role is authorized to invite/delegate the target role.
 */
export function canInviteRole(actorRole: RoleTier, targetRole: RoleTier): boolean {
  if (actorRole === 'SYSTEM_ADMIN') {
    return true; // God-tier root can invite any role
  }

  const actor = ROLE_METADATA[actorRole];
  const target = ROLE_METADATA[targetRole];
  if (!actor || !target) return false;

  // Executive Tier 1 can invite across all departments for Tiers 1-4 (cannot create Tier 0)
  if (actor.tier === 1) {
    return target.tier >= 1;
  }

  // Division Managers Tier 2 can invite only within their own department at Tiers 3 & 4
  if (actor.tier === 2) {
    return actor.department === target.department && (target.tier === 3 || target.tier === 4);
  }

  // Purchasing Agent Tier 3 has special delegation rights for Purchasing Tiers 3 & 4
  if (actorRole === 'PURCHASING_AGENT') {
    return target.department === 'PURCHASING' && (target.tier === 3 || target.tier === 4);
  }

  // All other roles cannot invite
  return false;
}

/**
 * Checks if the caller role can modify or manage a target user (legacy helper preserved for compatibility).
 */
export function canManageUser(actorRole: RoleTier, targetUserRole: RoleTier): boolean {
  if (actorRole === 'SYSTEM_ADMIN') return true;
  if (targetUserRole === 'SYSTEM_ADMIN') return false; // Non-root cannot manage root

  const actor = ROLE_METADATA[actorRole];
  const target = ROLE_METADATA[targetUserRole];
  if (!actor || !target) return false;

  if (actor.tier === 1) {
    return target.tier >= 1;
  }

  if (actor.tier === 2) {
    return actor.department === target.department && target.tier > actor.tier;
  }

  if (actorRole === 'PURCHASING_AGENT') {
    return target.department === 'PURCHASING' && (target.tier === 3 || target.tier === 4);
  }

  return false;
}

/**
 * Returns all roles that the actor is authorized to assign or invite.
 */
export function getAssignableRoles(actorRole: RoleTier): RoleTier[] {
  const allRoles = Object.keys(ROLE_METADATA) as RoleTier[];
  return allRoles.filter((role) => canInviteRole(actorRole, role));
}

/**
 * Config-driven module clearance check backed by lib/moduleRegistry.ts.
 */
export function hasModuleAccess(role: RoleTier, moduleId: ModuleId): boolean {
  const meta = ROLE_METADATA[role];
  const mod = getModuleById(moduleId);
  if (!meta || !mod) return false;
  return mod.allowedTiers.includes(meta.tier);
}

/**
 * Config-driven sub-section / view clearance check backed by lib/moduleRegistry.ts.
 * - Requisition Workspace ('WORKSPACE'): Tiers 0–3
 * - Intake Engine Calculator ('TECHNICAL_INTAKE'): Tiers 0–4
 * - Inventory & Stock ('DEPOT_WORKSPACE'): Tiers 0–4
 * - User Management & RBAC ('USER_MANAGEMENT'): Tiers 0–2
 * - Database & Dev Tools ('DEV_TOOLS'): Tier 0 only
 */
export function hasViewAccess(role: RoleTier, view: PortalView): boolean {
  const meta = ROLE_METADATA[role];
  if (!meta) return false;
  const allowedTiers = getAllowedTiersForView(view);
  return allowedTiers.includes(meta.tier);
}

/**
 * Resolves the default authorized PortalView for a given active module and user role.
 * For example, in 'purchasing', Tiers 0–3 open 'WORKSPACE' while Tier 4 opens 'TECHNICAL_INTAKE'.
 */
export function getDefaultViewForModule(
  role: RoleTier,
  moduleId: ActiveModuleKey
): PortalView | null {
  if (!hasModuleAccess(role, moduleId)) return null;
  const mod = getModuleById(moduleId);
  if (!mod) return null;

  if (mod.defaultView && hasViewAccess(role, mod.defaultView)) {
    return mod.defaultView;
  }

  if (mod.subSections) {
    const firstAllowedSub = mod.subSections.find(
      (sub) => sub.status === 'ACTIVE' && sub.view && hasViewAccess(role, sub.view)
    );
    if (firstAllowedSub?.view) {
      return firstAllowedSub.view;
    }
  }

  return null;
}

/**
 * Returns all active launcher module keys that the role has clearance to enter.
 */
export function getAuthorizedActiveModules(role: RoleTier): ActiveModuleKey[] {
  const allActive: ActiveModuleKey[] = ['purchasing', 'depot', 'users'];
  return allActive.filter((mod) => hasModuleAccess(role, mod));
}

/**
 * Determines whether a role has access to User Management & RBAC (Tiers 0–2 per lib/moduleRegistry.ts).
 */
export function canAccessUserManagement(role: RoleTier): boolean {
  return hasModuleAccess(role, 'users');
}

/**
 * Determines whether a role has access to Database & Dev Tools (Strictly Tier 0 / SYSTEM_ADMIN only).
 */
export function canAccessDevTools(role: RoleTier): boolean {
  return hasModuleAccess(role, 'devtools');
}

/**
 * ONLY DEPOT_MANAGER and Tiers 0-1 can sign off and confirm site deliveries.
 */
export function canConfirmDepotHandover(role: RoleTier): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'EXECUTIVE' || role === 'DEPOT_MANAGER';
}

/**
 * Tiers 0-3 in Depot (or Executives/Admins) can record stock entries and dispatches.
 * Tier 4 (DEPOT_JUNIOR_STAFF) remains strictly read-only + barcode scanner.
 */
export function canEditDepotStock(role: RoleTier): boolean {
  if (role === 'SYSTEM_ADMIN' || role === 'EXECUTIVE') return true;
  const meta = ROLE_METADATA[role];
  if (!meta) return false;
  return meta.department === 'DEPOT' && meta.tier <= 3;
}
