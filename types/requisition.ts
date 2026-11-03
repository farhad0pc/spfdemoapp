export type MaterialCategory =
  | 'CONCRETE'
  | 'STEEL'
  | 'MASONRY'
  | 'FINISHES'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'HVAC';

export type CaesarBlock = 'ZENO' | 'PHUKET' | 'PATTAYA' | 'KOH SAMUI';

export type CorporateRole = 'FOREMAN' | 'PURCHASING_MGR' | 'PROJECT_DIRECTOR' | 'EXECUTIVE';
export type UserRole = CorporateRole;

export type RequisitionStatus =
  | 'PENDING_PURCHASING'
  | 'PENDING_TIER2'
  | 'PENDING_TIER3'
  | 'APPROVED'
  | 'ORDER_PLACED'
  | 'DELIVERED'
  | 'REJECTED';

export type ApprovalTier = 1 | 2 | 3;

export interface MaterialItem {
  item_id: string;
  item_name_tr: string;
  item_name_en: string;
  unit_of_measure: string;
  category: MaterialCategory;
  base_cost_eur: number;
  consumption_rate: number;
  consumption_metric: string;
}

export interface Project {
  project_id: string;
  name: string;
  location: string;
}

export interface ConstructionBlock {
  block_id: string;
  project_id: string;
  block_name: CaesarBlock | string;
  active_phase?: string;
}

export interface CorporateUser {
  user_id: string;
  name: string;
  email: string;
  role: CorporateRole;
  department: string;
}

export const SEED_USERS: CorporateUser[] = [
  {
    user_id: 'user_foreman_01',
    name: 'Site Foreman',
    email: 'caesarconstructionsystems@gmail.com',
    role: 'FOREMAN',
    department: 'Site Operations',
  },
  {
    user_id: 'user_director_01',
    name: 'Engineer',
    email: 'farhad.mokhtari@afikgroup.com',
    role: 'PROJECT_DIRECTOR',
    department: 'Project Engineering',
  },
  {
    user_id: 'user_executive_01',
    name: 'Farhad Mokhtari',
    email: 'farhadmokhtari22@gmail.com',
    role: 'EXECUTIVE',
    department: 'Executive Board',
  },
  {
    user_id: 'user_purchasing_01',
    name: 'Procurement Officer',
    email: 'farhadmokhtari22@gmail.com',
    role: 'PURCHASING_MGR',
    department: 'Procurement',
  },
];

export function getSeedUser(role: CorporateRole | string): CorporateUser {
  const normalized = String(role).toUpperCase();
  if (normalized === "SITE_FOREMAN" || normalized === "FOREMAN") {
    return SEED_USERS.find((u) => u.role === "FOREMAN") || SEED_USERS[0];
  }
  if (normalized === "PROCUREMENT_OFFICER" || normalized === "PURCHASING_MGR") {
    return SEED_USERS.find((u) => u.role === "PURCHASING_MGR") || SEED_USERS[3] || SEED_USERS[0];
  }
  if (normalized === "PROJECT_DIRECTOR" || normalized === "DIRECTOR") {
    return SEED_USERS.find((u) => u.role === "PROJECT_DIRECTOR") || SEED_USERS[1] || SEED_USERS[0];
  }
  if (normalized === "EXECUTIVE_BOARD" || normalized === "EXECUTIVE") {
    return SEED_USERS.find((u) => u.role === "EXECUTIVE") || SEED_USERS[2] || SEED_USERS[0];
  }
  return SEED_USERS.find((u) => u.role === role) || SEED_USERS[0];
}

export function calculatePredictedQuantity(architecturalVolume: number, consumptionRate: number): number {
  return Number(((architecturalVolume || 0) * (consumptionRate || 0)).toFixed(2));
}

export interface VarianceResult {
  variancePercentage: number;
  isAnomaly: boolean;
}

export function calculateVariance(requested: number, predicted: number): VarianceResult {
  if (!predicted || predicted <= 0) {
    return { variancePercentage: 0, isAnomaly: false };
  }
  const variancePercentage = Number(((((requested - predicted) / predicted) * 100)).toFixed(2));
  const isAnomaly = variancePercentage > 5;
  return { variancePercentage, isAnomaly };
}

export function determineApprovalTier(arg1: number, arg2?: number): ApprovalTier {
  let totalEur = arg1;
  let overrun = arg2 ?? 0;
  if (arg2 !== undefined && arg1 < 100 && arg2 >= 100) {
    overrun = arg1;
    totalEur = arg2;
  }
  if (overrun > 5 || totalEur >= 10000) return 3;
  if (totalEur >= 2500) return 2;
  return 1;
}

export interface TierDescriptor {
  title: string;
  role: string;
  threshold: string;
  description: string;
}

export function getTierDescriptor(tier: ApprovalTier | number | undefined): TierDescriptor {
  switch (tier) {
    case 3:
      return {
        title: 'Executive Board Approval',
        role: 'EXECUTIVE',
        threshold: '> €10,000 or Overrun > +5%',
        description: 'Requires Executive Board Authorization',
      };
    case 2:
      return {
        title: 'Project Director Approval',
        role: 'PROJECT_DIRECTOR',
        threshold: '€2,500 – €10,000',
        description: 'Requires Project Director Authorization',
      };
    default:
      return {
        title: 'Purchasing Manager Standard',
        role: 'PURCHASING_MGR',
        threshold: '< €2,500',
        description: 'Standard Site Procurement Authorization',
      };
  }
}

export interface PurchaseRequisition {
  id?: string;
  ticket_id: string;
  requisition_number?: string;
  project_id?: string;
  block_id?: string;
  block_name?: CaesarBlock | string;
  block?: ConstructionBlock;
  item_id?: string;
  item_name?: string;
  material?: MaterialItem;
  foreman_id?: string;
  foreman?: CorporateUser;
  architectural_volume?: number;
  predicted_volume?: number;
  predicted_quantity: number;
  requested_qty?: number;
  requested_quantity: number;
  unit?: string;
  unit_rate_eur?: number;
  total_estimated_eur?: number;
  estimated_total_eur: number;
  overrun_percentage?: number;
  variance_percentage?: number;
  approval_tier?: ApprovalTier;
  status: RequisitionStatus | string;
  justification?: string;
  variance_justification?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
