# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.5.0 (Phase B Evolution — Steps A, B & C Completed)  
**Last Updated:** 2026-11-19  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 15/16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.5.0 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Purchasing Sub-Ledger & Procurement Ecosystem** is an enterprise procurement, predictive intake calculation, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, and executive capital exposure.
  - Tables: public.inventory_catalog, public.purchase_requisitions, public.requisition_approvals, public.corporate_users, public.portfolio_projects, public.portfolio_buildings, public.depot_locations, public.depot_stock_balances, public.depot_transactions, public.asset_register.
  - Identifier Taxonomy: REQ-[YYYYMM]-[HEX], MOV-[YYYYMM]-[HEX], AST-[YYYY]-[HEX].
- **Daily Reporting System (Distinct Platform):** Governs daily construction progress, labor headcount shifts, heavy machinery hours, and quality control punch-lists (master_logs, tasks_log, etc.). Schema, table names, and ticket IDs are strictly partitioned to prevent context bleeding.

---

## 2. Operational Triad & Workspace Hygiene Protocols

Development is governed by a strict operational protocol across three actors: Farhad (Lead Architect) <-> Gemini (System Architect) <-> Antigravity IDE (Execution Agent).

### Operational Modes
- **MODE A: Terminal-First Workspace Execution (Default for Surgical Work):** Used for 1-3 known files, compiler fixes, and deterministic DDL scripts. Executed via single-quoted Zsh heredocs ending in the mandatory verification gate.
- **MODE B: Antigravity IDE Agent Handoff Protocol (Complex / Multi-File Work):** Used for tasks spanning 4+ files, deep AST refactorings, or exploratory diagnostics. Enclosed strictly within a single, uninterrupted four-backtick block with zero outer chatter.

### Workspace Hygiene Invariants
1. **Zero Markdown on Disk:** Physical markdown (.md) files are strictly prohibited on disk with the sole exception of PROJECT_CONTEXT.md. All diagnostic audits, review walkthroughs, and proposals must be output exclusively as interactive UI Artifact panels in the Antigravity chat or managed in external cloud documentation.
2. **Mandatory Verification Gate:** Every workspace modification must conclude with:
   find . -maxdepth 2 -type f -name "*.md" ! -iname "project_context.md" ! -iname "readme.md" ! -iname "agents.md" ! -path "*/node_modules/*" -delete && find . -name "._*" -delete && npx tsc --noEmit && npm run lint
   Must achieve Exit Code 0 (0 errors, 0 warnings).

---

## 3. Relational Database Architecture (Supabase PostgreSQL 15)

### A. public.inventory_catalog (24-Column Yapitasi Taxonomy & Step C Parameters)
Houses 105 authoritative construction material definitions, unit metrics, reference base costs in EUR (benchmarked against 1 EUR = 55.74 TRY currency parity), engineered consumption coefficients, and warehouse metadata:
- item_id (UUID, Primary Key)
- legacy_code (TEXT, Yapitasi resource reference code)
- item_name_tr (TEXT, Authoritative Turkish nomenclature)
- item_name_en (TEXT, English nomenclature)
- specification (TEXT, Technical grade, dimension, formulation)
- category & subcategory (TEXT, Hierarchical trade classification)
- resource_type_code (TEXT: M Materials, L Labor, E Equipment, S Subcontractor)
- parent_item_id (UUID, Foreign key self-reference for parent-child grouping)
- unit_of_measure (TEXT, Standard unit: kg, m2, m3, pcs, ton, set, etc.)
- base_cost_eur (NUMERIC(12,2), Standardized unit price reference, parity anchored to 55.74 TRY)
- price_basis, price_region, price_source, price_as_of_date (Pricing telemetry, ÇŞİDB/KTİMB indexes)
- consumption_rate (NUMERIC(10,4), Engineering usage multiplier per target unit)
- consumption_metric (TEXT, Calculation formula unit: kg_per_m3, m2_per_m2, etc.)
- consumption_basis, consumption_source, consumption_as_of_date (Consumption telemetry)
- record_status (TEXT: draft, active, inactive)
- review_status (TEXT: pending, pending_specs, approved)
- barcode_ean (TEXT, Master EAN/UPC barcode)
- is_trackable_asset (BOOLEAN, Serialized asset registry tracking flag)
- packaging_unit_type (TEXT: SINGLE_ITEM, ATOMIC_SET)
- set_piece_count (INTEGER, Piece count for atomic sets)
- commercial_markup_pct (NUMERIC, Commercial markup percentage)
- source_record_id & notes (TEXT)

### B. public.purchase_requisitions (The Requisition Sub-Ledger)
Houses operational requisitions, technical calculations, vendor quotes, and lifecycle status:
- id (UUID, Primary Key)
- ticket_id (TEXT UNIQUE, REQ-YYYYMM-HEX)
- location_block_id (TEXT NOT NULL, Foreign Key reference -> portfolio_buildings.building_id: PRJ-XX-BLD-XX)
- requesting_party_uuid (UUID, Foreign Key -> corporate_users.id)
- handover_recipient_role (RoleTier, default PURCHASING_AGENT)
- catalog_item_id (UUID, Foreign Key -> inventory_catalog.item_id)
- custom_technical_specs (JSONB, Technical notes, brand constraints, supplier metadata, overrun flags)
- tech_approved_budget_eur (NUMERIC(12,2), Locked budget ceiling calculated by Technical Office)
- purchasing_actual_quota_eur (NUMERIC(12,2), Actual supplier quotation negotiated by Purchasing)
- live_status (TicketStatus: DRAFTING, TECH_REVIEW, PURCHASING_SOURCING, EXECUTIVE_RATIFICATION, APPROVED, REJECTED)
- created_at, updated_at (TIMESTAMPTZ)

### C. public.requisition_approvals (Immutable Audit Ledger)
Audit trail tracking state transitions, actor signatures, and payload snapshots:
- id (UUID, Primary Key)
- requisition_id (UUID, Foreign Key -> purchase_requisitions.id)
- actor_uuid (UUID, Foreign Key -> corporate_users.id)
- action (TEXT, Audit event tag: BUDGET_LOCKED, SUPPLIER_QUOTA_FINALIZED, BATCH_APPROVED, etc.)
- old_payload & new_payload (JSONB, State snapshots before and after action)
- created_at (TIMESTAMPTZ)

### D. public.depot_locations
Master locations for central and site warehouses:
- depot_id (TEXT PK, e.g. DEPOT-PRJ02-MAIN)
- project_id (TEXT FK -> portfolio_projects.project_id)
- depot_name, depot_category, is_active

### E. public.depot_stock_balances
Aggregated on-hand and reserved inventory balances per depot:
- balance_id (UUID PK), depot_id, catalog_item_id, quantity_on_hand, quantity_reserved, min_stock_threshold, last_scanned_at

### F. public.depot_transactions
Audit ledger of material movements and unbroken document chains:
- transaction_id (UUID/TEXT PK), transaction_code (MOV-YYYYMM-HEX), depot_id, catalog_item_id, movement_type (INBOUND_RECEIPT, OUTBOUND_HANDOVER, STOCK_ADJUSTMENT, AFTERSALES_RETURN), quantity, requisition_id, target_building_id, target_unit_label, irsaliye_number, irsaliye_doc_url, invoice_number, invoice_doc_url, supplier_name, unit_cost_eur, final_valued_cost_eur, has_missing_docs (GENERATED ALWAYS BOOLEAN), delivery_confirmed, confirmed_by_uuid, confirmed_at, notes

### G. public.asset_register
Serialized individual asset tracking ledger:
- asset_id (UUID/TEXT PK), asset_tag (AST-YYYY-HEX), catalog_item_id, barcode_ean, serial_number, current_depot_id, deployed_building_id, deployed_unit_label, custody_status (IN_DEPOT, HANDED_OVER_TO_AFTERSALES, INSTALLED_IN_UNIT, UNDER_MAINTENANCE, RETIRED), inbound_transaction_id, outbound_transaction_id, warranty_expiry_date, notes

### H. public.portfolio_projects (8 Projects) & public.portfolio_buildings (438 Blocks)
Master Northern Cyprus project and building hierarchy (PRJ-01 to PRJ-08, 438 blocks).

---

## 4. Role-Based Access Control (4-Tier Governance)

- TECH_OFFICE_USER: Site Engineer / Architect. Intake calculation, volume modeling, technical and brand specifications. Creates in DRAFTING.
- TECH_OFFICE_MANAGER: Technical Office Manager. Technical audit, tolerance verification, budget ceiling locking, commercial handover. DRAFTING -> PURCHASING_SOURCING.
- PURCHASING_AGENT: Procurement Officer. Vendor RFQs, commercial terms, supplier quota logging, internal overrun containment. PURCHASING_SOURCING -> APPROVED or EXECUTIVE_RATIFICATION.
- EXECUTIVE: Board Director. Fiduciary capital oversight, anomaly evaluation, batch ratification, overrides, cancellations. EXECUTIVE_RATIFICATION -> APPROVED or REJECTED.

---

## 5. Core Architectural Invariants & Business Logic

1. Predictive Calculation Engine: Material quantities and budget ceilings calculated programmatically.
2. The No-Backloop Policy: Requisitions handed over to Purchasing never bounce back to Technical Office due to price variances. Overruns are flagged internally and managed inside Purchasing or escalated to Executive if >15,000 EUR.
3. Mobile Camera Barcode Scanning: Supports native browser `BarcodeDetector` (rear camera `facingMode: 'environment'`, EAN-13, Code-128, QR) with manual/USB reader fallback.
4. Unbroken Document Chain & Missing-Doc Flagging: Every stock movement enforces links to Requisition (`REQ-*`), İrsaliye, and Invoice. Rows with missing documentation display prominent warning badges with inline quick-edit drawers.
5. End-of-Line Outbound Handover: Site delivery drop-off confirmed by staff (`delivery_confirmed = true`), decrementing balances and transitioning serialized items to `HANDED_OVER_TO_AFTERSALES`.
6. Atomic Set Integrity: Packaging unit type `ATOMIC_SET` preserves package integrity based on `set_piece_count`.
7. Typography & Styling: Universal Oswald typography (`font-bold` for IDs/headers/badges, `font-light` for numbers/descriptions). Dual light/dark theme adaptability.

---

## 6. Frontend Component Architecture & Directory Map

```
caesar-purchasing-app/
├── app/
│   ├── layout.tsx                     # Root HTML shell, Oswald font binding
│   └── page.tsx                       # Master controller: role simulator, Supabase CDC hydration & view routing
├── components/
│   ├── CorporateHeader.tsx            # Brand banner, Caesar emblem, active role switcher, Realtime pulse
│   ├── DesktopSidebar.tsx             # Collapsible left navigation rail & module view router (Active: Requisition, Intake, Depot)
│   ├── StickyControlsFAB.tsx          # Fixed bottom-right action buttons (TR/EN toggle, Light/Dark theme)
│   ├── Toast.tsx                      # Non-intrusive notification toast for module roadmap alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location & predictive volume/budget intake engine
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, sliding drawer
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── MobileBarcodeScannerModal.tsx  # Mobile-first rear camera barcode scanner & EAN/SN resolver modal
│   └── DepoManagementWorkspace.tsx    # Depot stock balances, movement & irsaliye ledger, serialized asset register
├── types/
│   └── requisition.ts                 # Full schema interfaces (Portfolio, Requisition, Depot, Assets, BarcodeDetector)
├── lib/
│   └── supabaseClient.ts              # Initialized Supabase client instance
└── components_archive_v2_4_0/         # Quarantined legacy v2.4.0 components
```

---

## 7. Current System State & Roadmap

The system compiles with 0 errors and 0 warnings under tsc and eslint.
- **Step A (Portfolio Integration — 8 Projects & 438 Buildings):** COMPLETED.
  - Deployed `public.portfolio_projects` (8 projects) and `public.portfolio_buildings` (438 structures) in Supabase.
  - Implemented 3-tier cascading selector with completion % badge in `components/TechnicalIntakeModule.tsx`.
  - Implemented O(1) `buildingLookup` map in `components/RequisitionWorkspace.tsx`.
- **Step B (Catalog Parameter Refresh — 105 Materials):** COMPLETED.
  - Ingested 105 authoritative catalog materials into `public.inventory_catalog`.
  - Anchored base unit prices in EUR at a fixed currency parity of 1 EUR = 55.74 TRY.
  - Formulated consumption coefficients and pricing metrics against ÇŞİDB and KTİMB published cost telemetry.
- **Step C (Dedicated Depo / Inventory Management, Smartphone Barcode Scanner & Asset Custody Register):** COMPLETED.
  - Extended `public.inventory_catalog` with `barcode_ean`, `is_trackable_asset`, `packaging_unit_type`, `set_piece_count`, and `commercial_markup_pct`.
  - Deployed `DepotLocation`, `DepotStockBalance`, `DepotTransaction`, `AssetRegisterItem` interfaces with PostgreSQL generated column safety (`has_missing_docs`).
  - Created `components/MobileBarcodeScannerModal.tsx`: live rear camera barcode scanner via `BarcodeDetector` API with instant manual/USB input fallback and quick test presets.
  - Created `components/DepoManagementWorkspace.tsx`: 4-stat KPI telemetry strip, 3-tab ledger system (`Live Stock Balances`, `Movement & İrsaliye Ledger`, `Serialized Asset Custody Register`), missing-doc drawer, and 1-tap mobile handover confirmation.
  - Integrated into `components/DesktopSidebar.tsx` (promoted to active module) and `app/page.tsx` view router.
