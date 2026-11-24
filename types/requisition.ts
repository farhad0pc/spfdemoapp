export type RoleTier = 
  | 'SYSTEM_ADMIN'
  | 'EXECUTIVE'
  | 'TECH_OFFICE_MANAGER'
  | 'PURCHASING_MANAGER'
  | 'DEPOT_MANAGER'
  | 'TECH_OFFICE_USER'
  | 'PURCHASING_AGENT'
  | 'DEPOT_SENIOR_STAFF'
  | 'TECH_OFFICE_JUNIOR'
  | 'PURCHASING_JUNIOR'
  | 'DEPOT_JUNIOR_STAFF';

export type TicketStatus = 
  | 'DRAFTING' 
  | 'TECH_REVIEW' 
  | 'PURCHASING_SOURCING' 
  | 'EXECUTIVE_RATIFICATION' 
  | 'APPROVED' 
  | 'REJECTED';

export type PackagingUnitType = 'SINGLE_ITEM' | 'ATOMIC_SET';

export type MediaSourceType = 'CAMERA' | 'LOCAL' | 'GOOGLE_DRIVE';

export interface InventoryItemMedia {
  id: string;
  catalog_item_id: string;
  storage_path: string;
  public_url: string;
  is_primary: boolean;
  display_order: number;
  source_type: MediaSourceType;
  file_size_bytes?: number | null;
  uploaded_by?: string | null;
  created_at: string;
}

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
  // Step C parameters
  barcode_ean?: string | null;
  is_trackable_asset?: boolean | null;
  packaging_unit_type?: PackagingUnitType | null;
  set_piece_count?: number | null;
  commercial_markup_pct?: number | null;
  // Milestone v2.7.0 Universal Inventory Taxonomy parameters
  product_domain?: 'CONSTRUCTION_MATERIALS' | 'FURNISHING_AND_EQUIPMENT' | string | null;
  supplier_name?: string | null;
  brand_model?: string | null;
  manufacturer_article?: string | null;
  source_currency?: string | null;
  source_unit_price?: number | null;
  product_url?: string | null;
  lifecycle_status?: string | null;
  attributes?: Record<string, unknown> | null;
  // Milestone v2.9.0 Media Album pointer
  primary_image_url?: string | null;
}

export interface PortfolioProject {
  project_id: string;
  project_name: string;
  location?: string | null;
}

export interface PortfolioBuilding {
  building_id: string;
  project_id: string;
  building_name: string;
  category_name?: string | null;
  building_type: string;
  total_floors?: number | null;
  total_units?: number | null;
  overall_completion_pct?: number | null;
  details_notes?: string | null;
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

// ==========================================
// STEP C: DEPOT & ASSET CUSTODY DATA MODELS
// ==========================================

export interface DepotLocation {
  depot_id: string; // e.g. 'DEPOT-PRJ02-MAIN', 'DEPOT-PRJ02-CONST'
  project_id: string; // e.g. 'PRJ-02'
  depot_name: string;
  depot_category: string;
  is_active: boolean;
}

export interface DepotStockBalance {
  balance_id: string;
  depot_id: string;
  catalog_item_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  min_stock_threshold: number;
  last_scanned_at?: string | null;
  catalog_item?: InventoryCatalogItem;
}

export type DepotMovementType = 
  | 'INBOUND_RECEIPT' 
  | 'OUTBOUND_HANDOVER' 
  | 'STOCK_ADJUSTMENT' 
  | 'AFTERSALES_RETURN';

export interface DepotTransaction {
  transaction_id: string;
  transaction_code: string; // MOV-[YYYYMM]-[HEX]
  depot_id: string;
  catalog_item_id: string;
  movement_type: DepotMovementType;
  quantity: number;
  requisition_id?: string | null;
  target_building_id?: string | null;
  target_unit_label?: string | null;
  irsaliye_number?: string | null;
  irsaliye_doc_url?: string | null;
  invoice_number?: string | null;
  invoice_doc_url?: string | null;
  supplier_name?: string | null;
  unit_cost_eur: number;
  final_valued_cost_eur: number; // unit_cost_eur * (1 + commercial_markup_pct / 100)
  has_missing_docs: boolean; // PostgreSQL GENERATED ALWAYS column (read-only)
  delivery_confirmed: boolean;
  confirmed_by_uuid?: string | null;
  confirmed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  catalog_item?: InventoryCatalogItem;
}

export type AssetCustodyStatus = 
  | 'IN_DEPOT' 
  | 'HANDED_OVER_TO_AFTERSALES' 
  | 'INSTALLED_IN_UNIT' 
  | 'UNDER_MAINTENANCE' 
  | 'RETIRED';

export interface AssetRegisterItem {
  asset_id: string;
  asset_tag: string; // AST-[YYYY]-[HEX]
  catalog_item_id: string;
  barcode_ean?: string | null;
  serial_number: string;
  current_depot_id?: string | null;
  deployed_building_id?: string | null;
  deployed_unit_label?: string | null;
  custody_status: AssetCustodyStatus;
  inbound_transaction_id?: string | null;
  outbound_transaction_id?: string | null;
  warranty_expiry_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  catalog_item?: InventoryCatalogItem;
}

// ==========================================
// STEP D: 2D RBAC, DELEGATION & USER MANAGEMENT
// ==========================================

export type DepartmentCode = 'SYSTEM' | 'EXECUTIVE' | 'TECH_OFFICE' | 'PURCHASING' | 'DEPOT';
export type AuthorityTier = 0 | 1 | 2 | 3 | 4;
export type UserAccountStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface CorporateUserProfile {
  id: string; // UUID in public.corporate_users
  auth_user_id?: string | null; // UUID in auth.users
  email: string;
  full_name: string;
  role: RoleTier;
  department: DepartmentCode;
  authority_tier: AuthorityTier;
  account_status: UserAccountStatus;
  allowed_project_ids?: string[] | null;
  allowed_depot_ids?: string[] | null;
  failsafe_password_hash?: string | null;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserInvitation {
  invitation_id: string;
  email: string;
  full_name: string;
  target_role: RoleTier;
  target_department: DepartmentCode;
  target_tier: AuthorityTier;
  token_hash: string;
  status: InvitationStatus;
  invited_by_uuid: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  created_at?: string;
  inviter?: {
    full_name: string;
    email: string;
    role: RoleTier;
  };
}

// Native BarcodeDetector API typing
export interface BarcodeDetectorOptions {
  formats: string[];
}

export interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
  format: string;
  rawValue: string;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: BarcodeDetectorOptions): {
        detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
        getSupportedFormats(): Promise<string[]>;
      };
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

// ==========================================
// LEGACY COMPATIBILITY EXPORTS
// ==========================================

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
