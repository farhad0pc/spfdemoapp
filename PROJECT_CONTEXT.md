# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.6.0 (Holistic UI Overhaul, Strict EN/TR Locale Separation, Oswald Weight Calibration & Live Supabase Data Hydration)  
**Last Updated:** 2026-11-19  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 15/16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.6.0 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Purchasing Sub-Ledger & Procurement Ecosystem** is an enterprise procurement, predictive intake calculation, warehouse inventory ledger, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, serialized asset custody, 2D RBAC governance, and executive capital exposure.
  - Tables: `public.inventory_catalog`, `public.purchase_requisitions`, `public.requisition_approvals`, `public.corporate_users`, `public.user_invitations`, `public.portfolio_projects`, `public.portfolio_buildings`, `public.depot_locations`, `public.depot_stock_balances`, `public.depot_transactions`, `public.asset_register`.
  - Identifier Taxonomy: `REQ-[YYYYMM]-[HEX]`, `MOV-[YYYYMM]-[HEX]`, `AST-[YYYY]-[HEX]`.
- **Daily Reporting System (Distinct Platform):** Governs daily construction progress, labor headcount shifts, heavy machinery hours, and quality control punch-lists (`master_logs`, `tasks_log`, etc.). Schema, table names, and ticket IDs are strictly partitioned to prevent context bleeding.

---

## 2. Operational Triad & Workspace Hygiene Protocols

Development is governed by a strict operational protocol across three actors: Farhad (Lead Architect) <-> Gemini (System Architect) <-> Antigravity IDE (Execution Agent).

### Operational Modes
- **MODE A: Terminal-First Workspace Execution (Default for Surgical Work):** Used for 1-3 known files, compiler fixes, and deterministic DDL scripts. Executed via single-quoted Zsh heredocs ending in the mandatory verification gate.
- **MODE B: Antigravity IDE Agent Handoff Protocol (Complex / Multi-File Work):** Used for tasks spanning 4+ files, deep AST refactorings, or exploratory diagnostics. Enclosed strictly within a single, uninterrupted four-backtick block with zero outer chatter.

### Workspace Hygiene Invariants
1. **Zero Markdown on Disk:** Physical markdown (`.md`) files are strictly prohibited on disk with the sole exception of `PROJECT_CONTEXT.md`, `README.md`, and `AGENTS.md`. All diagnostic audits, review walkthroughs, and proposals must be output exclusively as interactive UI Artifact panels in the Antigravity chat or managed in external cloud documentation.
2. **Mandatory Verification Gate:** Every workspace modification must conclude with:
   ```zsh
   find . -maxdepth 2 -type f -name "*.md" ! -iname "project_context.md" ! -iname "readme.md" ! -iname "agents.md" ! -path "*/node_modules/*" -delete && \
   find . ! -path "./.git/*" -name "._*" -delete && \
   npx tsc --noEmit && \
   npm run lint
   ```
   Must achieve Exit Code 0 (0 errors, 0 warnings).

---

## 3. Relational Database Architecture (Supabase PostgreSQL 15)

### A. public.inventory_catalog (24-Column Yapitasi Taxonomy & Step C Parameters)
Houses 105 authoritative construction material definitions, unit metrics, reference base costs in EUR (benchmarked against 1 EUR = 55.74 TRY currency parity), engineered consumption coefficients, and warehouse metadata:
- `item_id` (UUID, Primary Key)
- `legacy_code` (TEXT, Yapitasi resource reference code)
- `item_name_tr` (TEXT, Authoritative Turkish nomenclature)
- `item_name_en` (TEXT, English nomenclature)
- `specification` (TEXT, Technical grade, dimension, formulation)
- `category` & `subcategory` (TEXT, Hierarchical trade classification)
- `resource_type_code` (TEXT: M Materials, L Labor, E Equipment, S Subcontractor)
- `parent_item_id` (UUID, Foreign key self-reference for parent-child grouping)
- `unit_of_measure` (TEXT, Standard unit: kg, m2, m3, pcs, ton, set, etc.)
- `base_cost_eur` (NUMERIC(12,2), Standardized unit price reference, parity anchored to 55.74 TRY)
- `price_basis`, `price_region`, `price_source`, `price_as_of_date` (Pricing telemetry, ÇŞİDB/KTİMB indexes)
- `consumption_rate` (NUMERIC(10,4), Engineering usage multiplier per target unit)
- `consumption_metric` (TEXT, Calculation formula unit: kg_per_m3, m2_per_m2, etc.)
- `consumption_basis`, `consumption_source`, `consumption_as_of_date` (Consumption telemetry)
- `record_status` (TEXT: draft, active, inactive)
- `review_status` (TEXT: pending, pending_specs, approved)
- `barcode_ean` (TEXT, Master EAN/UPC barcode)
- `is_trackable_asset` (BOOLEAN, Serialized asset registry tracking flag)
- `packaging_unit_type` (TEXT: SINGLE_ITEM, ATOMIC_SET)
- `set_piece_count` (INTEGER, Piece count for atomic sets)
- `commercial_markup_pct` (NUMERIC, Commercial markup percentage)
- `source_record_id` & `notes` (TEXT)

### B. public.purchase_requisitions (The Requisition Sub-Ledger)
Houses operational requisitions, technical calculations, vendor quotes, and lifecycle status:
- `id` (UUID, Primary Key)
- `ticket_id` (TEXT UNIQUE, `REQ-[YYYYMM]-[HEX]`)
- `location_block_id` (TEXT NOT NULL, Foreign Key reference -> `portfolio_buildings.building_id`: `PRJ-XX-BLD-XX`)
- `requesting_party_uuid` (UUID, Foreign Key -> `corporate_users.id`)
- `handover_recipient_role` (RoleTier, default `PURCHASING_AGENT`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id`)
- `custom_technical_specs` (JSONB, Technical notes, brand constraints, supplier metadata, overrun flags)
- `tech_approved_budget_eur` (NUMERIC(12,2), Locked budget ceiling calculated by Technical Office)
- `purchasing_actual_quota_eur` (NUMERIC(12,2), Actual supplier quotation negotiated by Purchasing)
- `live_status` (TicketStatus: DRAFTING, TECH_REVIEW, PURCHASING_SOURCING, EXECUTIVE_RATIFICATION, APPROVED, REJECTED)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### C. public.requisition_approvals (Immutable Audit Ledger)
Audit trail tracking state transitions, actor signatures, and payload snapshots:
- `id` (UUID, Primary Key)
- `requisition_id` (UUID, Foreign Key -> `purchase_requisitions.id`)
- `actor_uuid` (UUID, Foreign Key -> `corporate_users.id`)
- `action` (TEXT, Audit event tag: BUDGET_LOCKED, SUPPLIER_QUOTA_FINALIZED, BATCH_APPROVED, etc.)
- `old_payload` & `new_payload` (JSONB, State snapshots before and after action)
- `created_at` (TIMESTAMPTZ)

### D. public.depot_locations
Master locations for central and site warehouses:
- `depot_id` (TEXT PK, e.g. `DEPOT-PRJ02-MAIN`)
- `project_id` (TEXT FK -> `portfolio_projects.project_id`)
- `depot_name`, `depot_category`, `is_active`

### E. public.depot_stock_balances
Aggregated on-hand and reserved inventory balances per depot:
- `balance_id` (UUID PK), `depot_id`, `catalog_item_id`, `quantity_on_hand`, `quantity_reserved`, `min_stock_threshold`, `last_scanned_at`

### F. public.depot_transactions
Audit ledger of material movements and unbroken document chains:
- `transaction_id` (UUID/TEXT PK), `transaction_code` (`MOV-[YYYYMM]-[HEX]`), `depot_id`, `catalog_item_id`, `movement_type` (`INBOUND_RECEIPT`, `OUTBOUND_HANDOVER`, `STOCK_ADJUSTMENT`, `AFTERSALES_RETURN`), `quantity`, `requisition_id`, `target_building_id`, `target_unit_label`, `irsaliye_number`, `irsaliye_doc_url`, `invoice_number`, `invoice_doc_url`, `supplier_name`, `unit_cost_eur`, `final_valued_cost_eur`, `has_missing_docs` (**GENERATED ALWAYS BOOLEAN STORED** — excluded from all `INSERT`/`UPDATE` payloads), `delivery_confirmed`, `confirmed_by_uuid`, `confirmed_at`, `notes`

### G. public.asset_register
Serialized individual asset tracking ledger:
- `asset_id` (UUID/TEXT PK), `asset_tag` (`AST-[YYYY]-[HEX]`), `catalog_item_id`, `barcode_ean`, `serial_number`, `current_depot_id`, `deployed_building_id`, `deployed_unit_label`, `custody_status` (`IN_DEPOT`, `HANDED_OVER_TO_AFTERSALES`, `INSTALLED_IN_UNIT`, `UNDER_MAINTENANCE`, `RETIRED`), `inbound_transaction_id`, `outbound_transaction_id`, `warranty_expiry_date`, `notes`

### H. public.portfolio_projects (8 Projects) & public.portfolio_buildings (438 Blocks)
Master Northern Cyprus project and building hierarchy (PRJ-01 to PRJ-08, 438 blocks).

### I. public.corporate_users & public.user_invitations
Enterprise user roster and 48-hour cryptographic invitation ledger:
- `corporate_users`: `id` (UUID PK), `email`, `full_name`, `role` (RoleTier), `department` (DepartmentCode), `authority_tier` (AuthorityTier: 0-4), `account_status` (`ACTIVE`, `INVITED`, `SUSPENDED`), `allowed_projects` (TEXT[]), `last_login_at`, `created_at`, `updated_at`.
- `user_invitations`: `invitation_id` (UUID PK), `email`, `full_name`, `target_role`, `target_department`, `target_tier`, `token_hash` (SHA-256), `status` (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`), `invited_by_uuid` (FK -> `corporate_users.id`), `expires_at` (48h), `created_at`, `accepted_at`, `revoked_at`.

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

## 5. Milestone v2.6.0 Architectural Overhaul & Invariants

1. **Strict EN/TR Locale Separation & Dynamic DOM Sync:**
   - Centralized symmetric dictionary in `lib/i18n.ts` supporting Turkish UTF-8 (`İrsaliye`, `Şantiye`, `İptal`, `Kayıt`, `Açık Davet`, `Süresi Doldu`, `Kaldı`, `Isı Pompası`, `İnce Yapı`) and English clean ASCII.
   - Dynamic synchronization via `document.documentElement.lang = lang` in `app/page.tsx` eliminating browser-level CSS uppercase dotted `İ` in English.
   - Centralized `toLocaleUpper(text, lang)` helper ensuring uppercase text respects the active locale (`text.toUpperCase()` in English vs `text.toLocaleUpperCase('tr-TR')` in Turkish).
2. **Oswald Typography Weight Hierarchy:**
   - `font-light` (300): Strictly applied to all numbers, quantities (`24 set`), currency amounts (`€4,543.00`), dates, emails, countdown clocks, technical specifications, and metadata descriptions.
   - `font-bold` (700): Reserved strictly for section headers, ticket/movement/asset IDs (`REQ-*`, `MOV-*`, `AST-*`), primary KPI counters, action buttons, and compact status badges.
3. **100% Live Supabase Data Hydration & Decluttering:**
   - Purged all mock seed arrays (`SEED_BALANCES`, `SEED_TRANSACTIONS`, `SEED_ASSETS`).
   - Hydrated `DepoManagementWorkspace.tsx` directly from live Supabase tables (`depot_locations`, `depot_stock_balances`, `depot_transactions`, `asset_register`) with Realtime subscriptions and localized empty-state CTAs.
   - Consolidated top action bar into a single-row non-wrapping toolbar (`flex-wrap items-center gap-2`), removed redundant badges, and purged all unbuilt placeholder modules (`PORTFOLIO`, `CATALOG`, `REPORTS`, `DEV_TOOLS`) from `DesktopSidebar.tsx`.
4. **PostgreSQL Generated Column Safety:**
   - `has_missing_docs` in `public.depot_transactions` is a `GENERATED ALWAYS AS (irsaliye_number IS NULL OR invoice_number IS NULL) STORED` column. It is strictly excluded from all client-side `INSERT` and `UPDATE` payloads sent to Supabase.
5. **Universal Cross-Device Barcode Scanner & Quick-Registry Engine:**
   - Employs `barcode-detector` (ZXing-C++ WASM ponyfill) served locally from `/wasm/zxing_reader.wasm` with `fireImmediately: true`.
   - Dual-pass frame detection (raw pass + horizontal un-mirror pass with coordinate reflection) enables instant barcode decoding on both MacBook FaceTime webcams and smartphone cameras.
6. **Self-Service User Onboarding & 48-Hour Cryptographic Invites:**
   - Token generation uses 32-byte crypto randomness hashed via SHA-256. Activation links expire after 48 hours with dynamic live countdown clocks powered by `useSyncExternalStore`.
7. **God-Tier Fail-Safe Root Access & Dual Auth Hydration:**
   - Fallback authentication via PostgreSQL RPC `verify_failsafe_credentials(p_email, p_password)` issuing signed HTTP-only cookies for platform recovery.

---

## 6. Frontend Component Architecture & Directory Map

```
caesar-purchasing-app/
├── app/
│   ├── layout.tsx                     # Root HTML shell, Oswald font binding
│   ├── page.tsx                       # Master controller: DOM lang sync, session hydration, view router (Workspace, Intake, Depot, Users)
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
│   ├── CorporateHeader.tsx            # Clean spacing, i18n synchronized header, Caesar emblem, root simulator (Tier 0 only), session controls
│   ├── DesktopSidebar.tsx             # Collapsible navigation rail (Active: Requisition, Intake, Depot, Personnel - no placeholder clutter)
│   ├── StickyControlsFAB.tsx          # Fixed bottom-right action buttons (TR/EN toggle, Light/Dark theme)
│   ├── Toast.tsx                      # Non-intrusive notification toast for module alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location & predictive volume intake engine (Oswald weight calibrated)
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, drawer (Oswald weight calibrated)
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── MobileBarcodeScannerModal.tsx  # Universal barcode scanner & EAN/SN quick registry modal (ZXing WASM, dual-pass un-mirror)
│   ├── DepoManagementWorkspace.tsx    # 100% Live Supabase hydrated balances, movements ledger, serialized asset custody register
│   └── UserManagementWorkspace.tsx    # Personnel roster, 48h invitation countdown table, invite & role edit modals (Oswald weight calibrated)
├── types/
│   └── requisition.ts                 # Schema interfaces (Portfolio, Requisition, Depot, Assets, 2D RBAC, BarcodeDetector)
├── lib/
│   ├── i18n.ts                        # Centralized symmetric TR/EN dictionary, toLocaleUpper helper
│   ├── supabaseClient.ts              # Client-safe Supabase anon instance
│   ├── supabaseAdmin.ts               # Server-isolated service-role Supabase admin instance
│   ├── rbac.ts                        # 2D RBAC delegation matrix, role metadata, permission helper functions
│   └── emailService.ts                # Transactional email service & invitation email dispatch templates
└── public/
    └── wasm/
        └── zxing_reader.wasm          # Local WebAssembly binary for high-speed offline barcode decoding
```

---

## 7. Current System State & Milestone Verification

Milestone v2.6.0 is completed and verified clean:
- **Strict EN/TR Locale Separation:** COMPLETED. Eliminates uppercase dotted `İ` in English; provides authentic Turkish UTF-8 characters in Turkish.
- **Universal Oswald Typography Calibration:** COMPLETED. `font-light` on quantities, currencies, dates, descriptions; `font-bold` on IDs, codes, headers, and badges.
- **100% Live Supabase Data Hydration:** COMPLETED. All mock seed arrays purged; live CDC subscriptions active on `depot_stock_balances`, `depot_transactions`, and `asset_register`.
- **Generated Column Safety:** COMPLETED. `has_missing_docs` excluded from all client-side write payloads.
- **Workspace Hygiene:** COMPLETED. 0 unauthorized physical markdown files on disk. Compilation clean with 0 errors and 0 warnings.
