# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.5.0 (Phase B Evolution — Steps A, B, C & D Completed)  
**Last Updated:** 2026-11-19  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 15/16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.5.0 Step D Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Purchasing Sub-Ledger & Procurement Ecosystem** is an enterprise procurement, predictive intake calculation, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, 2D RBAC governance, and executive capital exposure.
  - Tables: public.inventory_catalog, public.purchase_requisitions, public.requisition_approvals, public.corporate_users, public.user_invitations, public.portfolio_projects, public.portfolio_buildings, public.depot_locations, public.depot_stock_balances, public.depot_transactions, public.asset_register.
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
   find . -maxdepth 2 -type f -name "*.md" ! -iname "project_context.md" ! -iname "readme.md" ! -iname "agents.md" ! -path "*/node_modules/*" -delete && find . ! -path "./.git/*" -name "._*" -delete && npx tsc --noEmit && npm run lint
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

### I. public.corporate_users & public.user_invitations
Enterprise user roster and 48-hour cryptographic invitation ledger:
- corporate_users: id (UUID PK), email, full_name, role (RoleTier), department (DepartmentCode), authority_tier (AuthorityTier: 0-4), account_status (ACTIVE, INVITED, SUSPENDED), allowed_projects (TEXT[]), last_login_at, created_at, updated_at.
- user_invitations: invitation_id (UUID PK), email, full_name, target_role, target_department, target_tier, token_hash (SHA-256), status (PENDING, ACCEPTED, EXPIRED, REVOKED), invited_by_uuid (FK -> corporate_users.id), expires_at (48h), created_at, accepted_at, revoked_at.

---

## 4. Role-Based Access Control (2D RBAC Governance Matrix)

The system enforces a 2-Dimensional RBAC Matrix spanning 5 Authority Tiers (0 to 4) and 5 Operational Departments:
- **SYSTEM:** Tier 0 (`SYSTEM_ADMIN`) — Root God-Tier, emergency fail-safe access, full role delegation across all tiers (0-4), role simulator switcher.
- **EXECUTIVE:** Tier 1 (`EXECUTIVE`) — Board Director, capital oversight, cross-departmental delegation across Tiers 1-4.
- **TECH_OFFICE:** Tier 2 (`TECH_OFFICE_MANAGER`), Tier 4 (`TECH_OFFICE_USER`, `SITE_ENGINEER`). Division Manager can delegate within TECH_OFFICE at Tiers 3 & 4.
- **PURCHASING:** Tier 2 (`PURCHASING_MANAGER`), Tier 3 (`PURCHASING_AGENT`), Tier 4 (`EXPEDITOR`). Division Manager and Purchasing Agent can delegate in PURCHASING at Tiers 3 & 4.
- **DEPOT:** Tier 2 (`DEPOT_MANAGER`), Tier 4 (`DEPOT_CLERK`, `SITE_RECEIVER`). Division Manager can delegate in DEPOT at Tiers 3 & 4; holds exclusive site handover delivery sign-off authority.

### 2D RBAC Delegation Invariant
A user may never delegate a role with an authority tier equal to or higher than their own (except Tier 0 root), and division managers are strictly scoped to their own operational department.

---

## 5. Core Architectural Invariants & Business Logic

1. **Predictive Calculation Engine:** Material quantities and budget ceilings calculated programmatically.
2. **The No-Backloop Policy:** Requisitions handed over to Purchasing never bounce back to Technical Office due to price variances. Overruns are flagged internally and managed inside Purchasing or escalated to Executive if >15,000 EUR.
3. **Universal Cross-Device Barcode Scanner & Quick-Registry Engine:** Employs `barcode-detector` (ZXing-C++ WASM ponyfill) ensuring 100% universal barcode decoding across all devices with dual-pass un-mirroring, camera selection, and instant Unregistered Item Quick-Registry Form with PostgreSQL generated column safety.
4. **Unbroken Document Chain & Missing-Doc Flagging:** Every stock movement enforces links to Requisition (`REQ-*`), İrsaliye, and Invoice. Rows with missing documentation display prominent warning badges with inline quick-edit drawers.
5. **End-of-Line Outbound Handover:** Site delivery drop-off confirmed exclusively by staff with `canConfirmDepotHandover` (`delivery_confirmed = true`), decrementing balances and transitioning serialized items to `HANDED_OVER_TO_AFTERSALES`.
6. **Atomic Set Integrity:** Packaging unit type `ATOMIC_SET` preserves package integrity based on `set_piece_count`.
7. **Universal Oswald Typography & Dual Theming:** Universal Oswald typography (`font-bold` for IDs/headers/badges, `font-light` for numbers/descriptions). Dual light/dark theme adaptability.
8. **Self-Service User Onboarding & 48-Hour Cryptographic Invites:** Token generation uses 32-byte crypto randomness hashed via SHA-256. Activation links expire after 48 hours with dynamic live countdown clocks powered by `useSyncExternalStore`.
9. **God-Tier Fail-Safe Root Access & Dual Auth Hydration:** When Supabase Auth or email providers are inaccessible, authorized system administrators can authenticate via PostgreSQL `verify_failsafe_credentials(p_email, p_password)` RPC, receiving a signed HTTP-only session cookie for uninterrupted platform recovery.

---

## 6. Frontend Component Architecture & Directory Map

```
caesar-purchasing-app/
├── app/
│   ├── layout.tsx                     # Root HTML shell, Oswald font binding
│   ├── page.tsx                       # Master controller: dual session hydration, view router (Workspace, Intake, Depot, Users)
│   ├── login/
│   │   └── page.tsx                   # Corporate login (Standard Supabase Auth + God-Tier Fail-Safe accordion)
│   ├── auth/
│   │   └── accept-invite/
│   │       └── page.tsx               # Self-service onboarding & password creation (<Suspense> wrapped)
│   └── api/
│       ├── auth/
│       │   ├── invite/route.ts        # 48h invitation generation, SHA-256 token hashing, delegation validation
│       │   ├── accept-invite/route.ts # Token validation & account activation via Supabase Admin
│       │   ├── resend-invite/route.ts # 48h clock reset & token rotation
│       │   ├── revoke-invite/route.ts # Invitation cancellation
│       │   └── failsafe-login/route.ts# God-tier emergency fail-safe RPC authentication
│       ├── users/route.ts             # User roster queries & account management (Suspend/Activate/Change Role)
│       ├── requisition/route.ts       # Purchase requisition intake API
│       └── approve/route.ts           # Requisition approval state engine
├── components/
│   ├── CorporateHeader.tsx            # Header banner, Caesar emblem, root simulator (Tier 0 only), session controls
│   ├── DesktopSidebar.tsx             # Collapsible navigation rail (Active: Requisition, Intake, Depot, Personnel)
│   ├── StickyControlsFAB.tsx          # Fixed bottom-right action buttons (TR/EN toggle, Light/Dark theme)
│   ├── Toast.tsx                      # Non-intrusive notification toast for module alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location & predictive volume intake engine
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, drawer
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── MobileBarcodeScannerModal.tsx  # Universal barcode scanner & EAN/SN quick registry modal
│   ├── DepoManagementWorkspace.tsx    # Depot stock balances, movements ledger, serialized asset custody register
│   └── UserManagementWorkspace.tsx    # Personnel roster, 48h invitation countdown table, invite & role edit modals
├── types/
│   └── requisition.ts                 # Schema interfaces (Portfolio, Requisition, Depot, Assets, 2D RBAC, BarcodeDetector)
├── lib/
│   ├── supabaseClient.ts              # Client-safe Supabase anon instance
│   ├── supabaseAdmin.ts               # Server-isolated service-role Supabase admin instance
│   ├── rbac.ts                        # 2D RBAC delegation matrix, role metadata, permission helper functions
│   └── emailService.ts                # Transactional email service & invitation email dispatch templates
└── components_archive_v2_4_0/         # Quarantined legacy v2.4.0 components
```

---

## 7. Current System State & Roadmap

The system compiles with 0 errors and 0 warnings under tsc and eslint.
- **Step A (Portfolio Integration — 8 Projects & 438 Buildings):** COMPLETED.
- **Step B (Catalog Parameter Refresh — 105 Materials):** COMPLETED.
- **Step C (Dedicated Depo / Inventory Management, Smartphone Barcode Scanner & Asset Custody Register):** COMPLETED.
- **Step D (Self-Service User Management, 2D RBAC Delegation Engine, 48-Hour Email Invitations & God-Tier Fail-Safe Access):** COMPLETED.
  - Expanded `RoleTier` to 11 roles across 5 departments and 5 authority tiers (`types/requisition.ts`, `lib/rbac.ts`).
  - Implemented 48-hour cryptographic invitations with SHA-256 hashing and dynamic live countdown display (`app/api/auth/invite/route.ts`, `app/api/auth/accept-invite/route.ts`, `components/UserManagementWorkspace.tsx`).
  - Deployed God-Tier emergency fail-safe authentication via PostgreSQL RPC `verify_failsafe_credentials` (`app/api/auth/failsafe-login/route.ts`, `app/login/page.tsx`).
  - Enforced 2D RBAC delegation rules: Root (Tier 0) delegates any role; Executive (Tier 1) delegates across Tiers 1-4; Division Managers (Tier 2) delegate within their department at Tiers 3-4; Tier 4 roles are strictly operational read-only.
  - Guarded Depot handover delivery confirmation with `canConfirmDepotHandover` (Depot Manager / Exec / Root only) and stock editing with `canEditDepotStock` in `components/DepoManagementWorkspace.tsx`.
  - Upgraded `components/CorporateHeader.tsx` to restrict the Role Simulator Switcher exclusively to `SYSTEM_ADMIN` (Tier 0) while displaying immutable profile badges and session login/logout for all other roles.
  - Integrated `USER_MANAGEMENT` into `components/DesktopSidebar.tsx` and `app/page.tsx` view router with dual Supabase + fail-safe session hydration.
