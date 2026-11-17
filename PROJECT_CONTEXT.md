# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.5.0 (Phase B Evolution — Step A & Step B Completed)  
**Last Updated:** 2026-11-16  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.5.0 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Purchasing Sub-Ledger & Procurement Ecosystem** is an enterprise procurement, predictive intake calculation, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, and executive capital exposure.
  - Tables: public.inventory_catalog, public.purchase_requisitions, public.requisition_approvals, public.corporate_users, public.portfolio_projects, public.portfolio_buildings.
  - Identifier Taxonomy: REQ-[YYYYMM]-[HEX].
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
   find . -maxdepth 2 -type f -name "*.md" ! -iname "project_context.md" ! -path "*/node_modules/*" -delete && find . -name "._*" -delete && npx tsc --noEmit && npm run lint
   Must achieve Exit Code 0 (0 errors, 0 warnings).

---

## 3. Relational Database Architecture (Supabase PostgreSQL 15)

### A. public.inventory_catalog (24-Column Yapitasi Taxonomy & Step B Parameters)
Houses 105 authoritative construction material definitions, unit metrics, reference base costs in EUR (benchmarked against 1 EUR = 55.74 TRY currency parity), and engineered consumption coefficients sourced from ÇŞİDB (T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı) and KTİMB (Kıbrıs Türk İnşaat Müteahhitleri Birliği) index telemetry:
- item_id (UUID, Primary Key)
- legacy_code (TEXT, Yapitasi resource reference code)
- item_name_tr (TEXT, Authoritative Turkish nomenclature)
- item_name_en (TEXT, English nomenclature)
- specification (TEXT, Technical grade, dimension, formulation)
- category & subcategory (TEXT, Hierarchical trade classification)
- resource_type_code (TEXT: M Materials, L Labor, E Equipment, S Subcontractor)
- parent_item_id (UUID, Foreign key self-reference for parent-child grouping)
- unit_of_measure (TEXT, Standard unit: kg, m2, m3, pcs, ton, etc.)
- base_cost_eur (NUMERIC(12,2), Standardized unit price reference, parity anchored to 55.74 TRY)
- price_basis, price_region, price_source, price_as_of_date (Pricing telemetry, ÇŞİDB/KTİMB indexes)
- consumption_rate (NUMERIC(10,4), Engineering usage multiplier per target unit)
- consumption_metric (TEXT, Calculation formula unit: kg_per_m3, m2_per_m2, etc.)
- consumption_basis, consumption_source, consumption_as_of_date (Consumption telemetry)
- record_status (TEXT: draft, active, inactive)
- review_status (TEXT: pending, pending_specs, approved)
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

### D. public.corporate_users
Stores authenticated users mapped to the 4-tier RBAC matrix (id, name, email, role).

### E. public.portfolio_projects (8 Caesar Group Construction Projects)
Houses authoritative master project definitions across Northern Cyprus:
- project_id (TEXT, Primary Key: PRJ-01 to PRJ-08)
- project_name (TEXT: Caesar Bay, Caesar Resort & Spa, Caesar Blue, Caesar Cliff, Caesar Beach, Caesar Palm Jumeirah, Caesar Zen, Caesar Palace)
- location (TEXT: Tatlısu, İskele, Boğaz, Esentepe, Gaziveren)

### F. public.portfolio_buildings (438 Distinct Blocks & Structures)
Houses fine-grained structural hierarchy partitioned across 6 functional building types:
- building_id (TEXT, Primary Key: PRJ-XX-BLD-XX)
- project_id (TEXT, Foreign Key -> portfolio_projects.project_id)
- building_name (TEXT: e.g. VICTORIUS, CLAUDIUS, Villa A1)
- category_name (TEXT: e.g. Block V, Luxury, Waterfront)
- building_type (TEXT: Villa, Residential Tower, Amenity / Facility, Commercial / Retail, Infrastructure & Admin, Outdoor / Landscaping)
- total_floors & total_units (INTEGER)
- overall_completion_pct (NUMERIC: 0.00 to 100.00%)
- details_notes (TEXT)

---

## 4. Role-Based Access Control (4-Tier Governance)

- TECH_OFFICE_USER: Site Engineer / Architect. Intake calculation, volume modeling, technical and brand specifications. Creates in DRAFTING.
- TECH_OFFICE_MANAGER: Technical Office Manager. Technical audit, tolerance verification, budget ceiling locking, commercial handover. DRAFTING -> PURCHASING_SOURCING.
- PURCHASING_AGENT: Procurement Officer. Vendor RFQs, commercial terms, supplier quota logging, internal overrun containment. PURCHASING_SOURCING -> APPROVED or EXECUTIVE_RATIFICATION.
- EXECUTIVE: Board Director. Fiduciary capital oversight, anomaly evaluation, batch ratification, overrides, cancellations. EXECUTIVE_RATIFICATION -> APPROVED or REJECTED.

---

## 5. Core Architectural Invariants & Business Logic

1. Predictive Calculation Engine: Material quantities and budget ceilings calculated programmatically: Calculated Qty = Target Volume * consumption_rate; Tech Approved Budget = Calculated Qty * base_cost_eur.
2. The No-Backloop Policy: Requisitions handed over to Purchasing never bounce back to Technical Office due to price variances. Overruns are flagged internally (quota_overrun = true) and managed inside Purchasing or escalated to Executive if >15,000 EUR.
3. Executive Telemetry: Gated to EXECUTIVE role. Computes Approved Capital, Preserved Capital, Pending Board Ratification, and Overrun Anomaly Exposure.
4. Batch Operations: Multi-select checkboxes allow atomic batch approvals/rejections with full audit logging.
5. Realtime CDC Sync: Subscribed to PostgreSQL changes via supabase.channel(schema-db-changes) for multi-window live updates.
6. Typography & Styling: Oswald font universally enforced (bold for IDs/headers/badges, light for numbers/descriptions). Light-mode default with dark-mode adaptability. Caesar emblem hosted on Cloudinary.
7. Bilingual Localization: Full pass-through dictionary (tr / en) across all workspace views and sliding history drawers.

---

## 6. Frontend Component Architecture & Directory Map

caesar-purchasing-app/
├── app/
│   ├── layout.tsx              # Root HTML shell, Oswald font binding
│   └── page.tsx                # Master controller: role simulator, Supabase CDC hydration & portfolio routing
├── components/
│   ├── CorporateHeader.tsx     # Brand banner, Caesar emblem, active role switcher, Realtime pulse
│   ├── DesktopSidebar.tsx      # Collapsible left navigation rail & module view router
│   ├── StickyControlsFAB.tsx   # Fixed bottom-right action buttons (TR/EN toggle, Light/Dark theme)
│   ├── Toast.tsx               # Non-intrusive notification toast for module roadmap alerts
│   ├── TechnicalIntakeModule.tsx # Full-screen 3-tier cascading location & predictive volume/budget intake engine
│   ├── RequisitionWorkspace.tsx # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, search/filter, sliding drawer
│   └── ExecutiveTelemetryStrip.tsx # Board-level fiduciary KPI metrics strip (Executive only)
├── types/
│   └── requisition.ts          # Phase B schema interfaces (PortfolioProject, PortfolioBuilding, Requisition)
├── lib/
│   └── supabaseClient.ts       # Initialized Supabase client instance
└── components_archive_v2_4_0/  # Quarantined legacy v2.4.0 components

---

## 7. Current System State & Roadmap

The system compiles with 0 errors and 0 warnings under tsc and eslint.
- **Step A (Portfolio Integration — 8 Projects & 438 Buildings):** COMPLETED.
  - Deployed `public.portfolio_projects` (8 projects) and `public.portfolio_buildings` (438 structures) in Supabase.
  - Exported `PortfolioProject` and `PortfolioBuilding` interfaces in `types/requisition.ts`.
  - Implemented 3-tier cascading selector (`Project` -> `Building Type` -> `Building / Block Name`) with completion % badge in `components/TechnicalIntakeModule.tsx`.
  - Implemented O(1) `buildingLookup` map in `components/RequisitionWorkspace.tsx` displaying canonical `[Project] • [Building]` alongside monospace `building_id`, with full Turkish locale search normalization (`toLocaleLowerCase('tr-TR')`).
- **Step B (Catalog Parameter Refresh — 105 Materials):** COMPLETED.
  - Ingested 105 authoritative catalog materials via SQL UPSERT into `public.inventory_catalog`.
  - Anchored base unit prices in EUR at a fixed currency parity of 1 EUR = 55.74 TRY.
  - Formulated consumption coefficients and pricing metrics against ÇŞİDB (Ministry) and KTİMB (Union) published cost telemetry.
- **Step C (Dedicated Depo / Inventory Management):** Architecting public.depot_inventory and public.depot_stock_movements for warehouse stock checks and depot dispatch requests (Planned).
