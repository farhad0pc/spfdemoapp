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

export interface PurchaseRequisition {
  ticket_id: string;
  requisition_number: string;
  project_id: string;
  block_id: string;
  item_id: string;
  foreman_id: string;
  architectural_volume: number;
  predicted_quantity: number;
  requested_quantity: number;
  variance_percentage: number;
  variance_justification?: string;
  estimated_total_eur: number;
  approval_tier: ApprovalTier;
  status: RequisitionStatus;
  created_at: string;
  updated_at: string;
  // Relational joins
  material?: MaterialItem;
  block?: ConstructionBlock;
  foreman?: CorporateUser;
}

export interface RequisitionApproval {
  approval_id: string;
  ticket_id: string;
  approver_id: string;
  approver_role: CorporateRole;
  action: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  tier: ApprovalTier;
  comments?: string;
  timestamp: string;
}

/**
 * Baseline Prediction: predicted_quantity = architectural_volume * consumption_rate
 */
export function calculatePredictedQuantity(
  architecturalVolume: number,
  consumptionRate: number
): number {
  return Number((architecturalVolume * consumptionRate).toFixed(3));
}

/**
 * Variance Trigger: Flags anomaly when requested > predicted * 1.05 (> 5% overrun)
 */
export function calculateVariance(
  requestedQuantity: number,
  predictedQuantity: number
): { variancePercentage: number; isAnomaly: boolean } {
  if (predictedQuantity <= 0) {
    return { variancePercentage: 0, isAnomaly: false };
  }
  const variancePercentage = Number(
    (((requestedQuantity - predictedQuantity) / predictedQuantity) * 100).toFixed(2)
  );
  const isAnomaly = requestedQuantity > predictedQuantity * 1.05;
  return { variancePercentage, isAnomaly };
}

/**
 * 3-Tier Approval Gates:
 * - Tier 1: < €2,500 (Purchasing Manager)
 * - Tier 2: €2,500 – €15,000 (Project Director)
 * - Tier 3: > €15,000 (Executive Board)
 */
export function determineApprovalTier(estimatedTotalEur: number): ApprovalTier {
  if (estimatedTotalEur < 2500) {
    return 1;
  }
  if (estimatedTotalEur <= 15000) {
    return 2;
  }
  return 3;
}

export function getTierDescriptor(tier: ApprovalTier): {
  threshold: string;
  role: CorporateRole;
  title: string;
} {
  switch (tier) {
    case 1:
      return {
        threshold: '< €2,500',
        role: 'PURCHASING_MGR',
        title: 'Purchasing Manager Approval',
      };
    case 2:
      return {
        threshold: '€2,500 – €15,000',
        role: 'PROJECT_DIRECTOR',
        title: 'Project Director Sign-Off',
      };
    case 3:
      return {
        threshold: '> €15,000',
        role: 'EXECUTIVE',
        title: 'Executive / Board Authorization',
      };
  }
}
