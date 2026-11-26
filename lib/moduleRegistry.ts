import { AuthorityTier } from '@/types/requisition';

export type ActiveModuleKey = 'purchasing' | 'depot' | 'users';
export type RoadmapModuleKey = 'aftersales' | 'portfolio' | 'dossiers';
export type ModuleId = ActiveModuleKey | RoadmapModuleKey | 'devtools';
export type LauncherModuleKey = ModuleId;

export type PortalView =
  | 'WORKSPACE'
  | 'TECHNICAL_INTAKE'
  | 'DEPOT_WORKSPACE'
  | 'USER_MANAGEMENT'
  | 'DEV_TOOLS';

export type ModuleStatus = 'ACTIVE' | 'COMING_SOON';

export type SubSectionKey =
  | 'intake_calculator'
  | 'requisition_workspace'
  | 'accounting'
  | 'inventory_stock'
  | 'monitoring_reports'
  | 'customer_portal'
  | 'catalog_management'
  | 'customer_relations'
  | 'construction_map'
  | 'project_maps';

export interface SubSectionDefinition {
  id: SubSectionKey;
  view?: PortalView;
  status: ModuleStatus;
  allowedTiers: AuthorityTier[];
}

export interface ModuleDefinition {
  id: ModuleId;
  status: ModuleStatus;
  showOnLauncher: boolean;
  launcherOrder: number;
  sidebarOrder: number;
  footerOnly?: boolean;
  view?: PortalView;
  defaultView?: PortalView;
  allowedTiers: AuthorityTier[];
  accentClass: string;
  iconBgClass: string;
  subSections?: SubSectionDefinition[];
}

/**
 * Single-Source-of-Truth Module & Sub-Section Registry (Milestone v2.9.5)
 * - Master Catalog Admin is removed from top-level navigation (shared public.inventory_catalog under Purchasing & Depot).
 * - Database & Dev Tools is strictly Tier 0 (SYSTEM_ADMIN) only, excluded from pre-auth launcher, and isolated to the sidebar bottom footer.
 */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'purchasing',
    status: 'ACTIVE',
    showOnLauncher: true,
    launcherOrder: 1,
    sidebarOrder: 1,
    defaultView: 'WORKSPACE',
    allowedTiers: [0, 1, 2, 3, 4],
    accentClass:
      'hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-blue-500/10',
    iconBgClass:
      'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-500/20',
    subSections: [
      {
        id: 'intake_calculator',
        view: 'TECHNICAL_INTAKE',
        status: 'ACTIVE',
        allowedTiers: [0, 1, 2, 3, 4],
      },
      {
        id: 'requisition_workspace',
        view: 'WORKSPACE',
        status: 'ACTIVE',
        allowedTiers: [0, 1, 2, 3],
      },
      {
        id: 'accounting',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2],
      },
    ],
  },
  {
    id: 'depot',
    status: 'ACTIVE',
    showOnLauncher: true,
    launcherOrder: 2,
    sidebarOrder: 2,
    defaultView: 'DEPOT_WORKSPACE',
    allowedTiers: [0, 1, 2, 3, 4],
    accentClass:
      'hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-emerald-500/10',
    iconBgClass:
      'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/20',
    subSections: [
      {
        id: 'inventory_stock',
        view: 'DEPOT_WORKSPACE',
        status: 'ACTIVE',
        allowedTiers: [0, 1, 2, 3, 4],
      },
      {
        id: 'monitoring_reports',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2],
      },
    ],
  },
  {
    id: 'aftersales',
    status: 'COMING_SOON',
    showOnLauncher: true,
    launcherOrder: 4,
    sidebarOrder: 3,
    allowedTiers: [0, 1, 2, 3, 4],
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    subSections: [
      {
        id: 'customer_portal',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2, 3, 4],
      },
      {
        id: 'catalog_management',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2],
      },
      {
        id: 'customer_relations',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2, 3],
      },
    ],
  },
  {
    id: 'portfolio',
    status: 'COMING_SOON',
    showOnLauncher: true,
    launcherOrder: 5,
    sidebarOrder: 4,
    allowedTiers: [0, 1, 2, 3, 4],
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    subSections: [
      {
        id: 'construction_map',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2, 3],
      },
      {
        id: 'project_maps',
        status: 'COMING_SOON',
        allowedTiers: [0, 1, 2, 3, 4],
      },
    ],
  },
  {
    id: 'users',
    status: 'ACTIVE',
    showOnLauncher: true,
    launcherOrder: 3,
    sidebarOrder: 5,
    view: 'USER_MANAGEMENT',
    defaultView: 'USER_MANAGEMENT',
    allowedTiers: [0, 1, 2],
    accentClass:
      'hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-amber-500/10',
    iconBgClass:
      'bg-amber-600/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'dossiers',
    status: 'COMING_SOON',
    showOnLauncher: true,
    launcherOrder: 6,
    sidebarOrder: 6,
    allowedTiers: [0, 1, 2],
    accentClass: '',
    iconBgClass:
      'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
  {
    id: 'devtools',
    status: 'ACTIVE',
    showOnLauncher: false,
    footerOnly: true,
    launcherOrder: 99,
    sidebarOrder: 7,
    view: 'DEV_TOOLS',
    defaultView: 'DEV_TOOLS',
    allowedTiers: [0],
    accentClass:
      'hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-purple-500/10',
    iconBgClass:
      'bg-purple-600/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border-purple-500/20',
  },
];

export function isActiveModuleKey(
  val: string | null | undefined
): val is ActiveModuleKey {
  return val === 'purchasing' || val === 'depot' || val === 'users';
}

export function getModuleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

/**
 * Returns the 6 prioritized launcher tiles sorted by launcherOrder:
 * Row 1 (ACTIVE): Purchasing & Orders (1), Depot & Stock Management (2), User Management & RBAC (3)
 * Row 2 (COMING SOON): Aftersales (4), Caesar Project Portfolio (5), Executive Dossiers & Reports (6)
 */
export function getLauncherModules(): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => m.showOnLauncher).sort(
    (a, b) => a.launcherOrder - b.launcherOrder
  );
}

/**
 * Returns primary sidebar modules in hierarchical sidebarOrder (excluding footer-only Dev Tools).
 */
export function getSidebarPrimaryModules(): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => !m.footerOnly).sort(
    (a, b) => a.sidebarOrder - b.sidebarOrder
  );
}

/**
 * Returns the Tier 0-only Database & Dev Tools footer module definition.
 */
export function getFooterDevToolsModule(): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === 'devtools' && m.footerOnly);
}

/**
 * Resolves the allowedTiers array for a specific PortalView from MODULE_REGISTRY.
 */
export function getAllowedTiersForView(view: PortalView): AuthorityTier[] {
  for (const mod of MODULE_REGISTRY) {
    if (mod.view === view) {
      return mod.allowedTiers;
    }
    if (mod.subSections) {
      const sub = mod.subSections.find((s) => s.view === view);
      if (sub) {
        return sub.allowedTiers;
      }
    }
  }
  return [0, 1, 2, 3, 4];
}

/**
 * Formats an allowedTiers array into a human-readable badge label (e.g. "Tier 0–2", "Tier 0–3", "Tier 0").
 */
export function formatTierRangeLabel(tiers: AuthorityTier[]): string {
  if (!tiers || tiers.length === 0) return 'Tier 0';
  const sorted = [...tiers].sort((a, b) => a - b);
  if (sorted.length === 1) return `Tier ${sorted[0]}`;
  return `Tier ${sorted[0]}–${sorted[sorted.length - 1]}`;
}
