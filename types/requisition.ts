export type RoleTier = 
  | 'TECH_OFFICE_USER' 
  | 'TECH_OFFICE_MANAGER' 
  | 'PURCHASING_AGENT' 
  | 'EXECUTIVE';

export type TicketStatus = 
  | 'DRAFTING' 
  | 'TECH_REVIEW' 
  | 'PURCHASING_SOURCING' 
  | 'EXECUTIVE_RATIFICATION' 
  | 'APPROVED' 
  | 'REJECTED';

export interface InventoryCatalogItem {
  item_id: string;
  legacy_code: string | null;
  item_name_tr: string;
  item_name_en: string | null;
  specification: string | null;
  category: string | null;
  subcategory: string | null;
  unit_of_measure: string | null;
  base_cost_eur: number | null;
  consumption_rate: number | null;
  consumption_metric: string | null;
  record_status: string;
  review_status: string;
}

export interface PurchaseRequisition {
  id: string;
  ticket_id: string;
  location_block_id: string;
  requesting_party_uuid: string;
  handover_recipient_role: RoleTier;
  catalog_item_id: string;
  custom_technical_specs: Record<string, unknown>;
  tech_approved_budget_eur: number;
  purchasing_actual_quota_eur: number | null;
  live_status: TicketStatus;
  created_at: string;
  updated_at: string;
  catalog_item?: InventoryCatalogItem;

  requisition_number?: string;
  block?: { block_name: string };
  block_name?: string;
  block_id?: string;
  item_name?: string;
  item_id?: string;
  material?: unknown;
  foreman?: { name: string };
  requested_quantity?: number;
  requested_qty?: number;
  predicted_quantity?: number;
  estimated_total_eur?: number;
  total_estimated_eur?: number;
  approval_tier?: number;
  status?: string;
  variance_percentage?: number;
  overrun_percentage?: number;
  variance_justification?: string;
  justification?: string;
  architectural_volume?: number;
  unit?: string;
}

export interface RequisitionApprovalLog {
  id: string;
  requisition_id: string;
  actor_uuid: string;
  action: string;
  old_payload: unknown;
  new_payload: unknown;
  created_at: string;
}

export type CorporateRole = 'FOREMAN' | 'PURCHASING_MGR' | 'PROJECT_DIRECTOR' | 'EXECUTIVE';
export type UserRole = CorporateRole;

export interface ConstructionBlock {
  id: string;
  block_name: string;
  project_id?: string;
}
export type CaesarBlock = ConstructionBlock;

export interface MaterialItem {
  id: string;
  item_name_tr: string;
  item_name_en: string;
  unit_of_measure: string;
  category: string;
  base_cost_eur: number;
  consumption_rate?: number;
  consumption_metric?: string;
}

export function getSeedUser(role: string) {
  return { id: 'seed-user-uuid', name: 'Authorized User', role };
}

export function getTierDescriptor(tier?: number) {
  if (tier === 1) return { threshold: '< €2,500' };
  if (tier === 2) return { threshold: '€2,500 - €15,000' };
  return { threshold: '> €15,000' };
}

export function calculatePredictedQuantity(volume: number, rate: number): number {
  return Number((volume * rate).toFixed(2));
}

export function calculateVariance(requested: number, predicted: number): number {
  if (predicted <= 0) return 0;
  return Number((((requested - predicted) / predicted) * 100).toFixed(1));
}

export function determineApprovalTier(totalEur: number): number {
  if (totalEur <= 2500) return 1;
  if (totalEur <= 15000) return 2;
  return 3;
}
