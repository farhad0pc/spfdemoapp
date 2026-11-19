import { RoleTier, DepartmentCode, AuthorityTier } from '@/types/requisition';

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
 * Checks if the caller role can modify or revoke a target user.
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
 * Determines whether a role has access to the User Management / Personnel Workspace.
 */
export function canAccessUserManagement(role: RoleTier): boolean {
  const meta = ROLE_METADATA[role];
  if (!meta) return false;
  // Accessible to Tiers 0, 1, 2, and PURCHASING_AGENT
  return meta.tier <= 2 || role === 'PURCHASING_AGENT';
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
