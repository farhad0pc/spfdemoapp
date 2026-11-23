# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.8.0 (Hard Auth Gate & Stealth Fail-Safe, Depot Manual Registry & Barcode Auto-Fill, Full Item Details/Edit Modal & Brand/Header Polish)  
**Last Updated:** 2026-11-20  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.8.0 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Operations (Procurement & Inventory Ecosystem)** is an enterprise procurement, predictive intake calculation, warehouse inventory ledger, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing & Inventory System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, serialized asset custody, 2D RBAC governance, universal catalog taxonomy (construction + furnishing/equipment), and executive capital exposure.
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

### A. public.inventory_catalog (Universal Multi-Domain Taxonomy)
Houses authoritative construction material definitions (`DEPOT-PRJ02-CONST`), furnishing/equipment assets (`DEPOT-PRJ02-MAIN`), reference base costs in EUR (benchmarked against 1 EUR = 55.74 TRY currency parity), engineered consumption coefficients, and warehouse metadata:
- `item_id` (UUID, Primary Key)
- `legacy_code` (TEXT, Deterministic SKU code: `MAT-XXXX` / `WH-XXXX` / `DEP-XXXX`)
- `item_name_tr` (TEXT, Authoritative Turkish nomenclature)
- `item_name_en` (TEXT, English nomenclature)
- `specification` (TEXT, Technical standard / physical spec)
- `category` (TEXT, Trade classification)
- `subcategory` (TEXT, Sub-trade classification)
- `unit_of_measure` (TEXT, `m3`, `kg`, `ton`, `adet`, `set`, `m2`, `m`)
- `base_cost_eur` (NUMERIC, Reference unit cost in EUR)
- `consumption_rate` (NUMERIC, Rate per architectural volume)
- `consumption_metric` (TEXT, Unit ratio)
- `record_status` (TEXT, `active` / `archived`)
- `review_status` (TEXT, `approved` / `pending`)
- `barcode_ean` (TEXT, 8-14 digit global standard or internal barcode)
- `is_trackable_asset` (BOOLEAN, Flag for serialized asset registration)
- `packaging_unit_type` (TEXT, `SINGLE_ITEM` or `ATOMIC_SET`)
- `set_piece_count` (INTEGER, Pieces per set)
- `commercial_markup_pct` (NUMERIC, Commercial markup percentage, default 15%)
- `product_domain` (TEXT, `CONSTRUCTION_MATERIALS` or `FURNISHING_AND_EQUIPMENT`)
- `supplier_name` (TEXT, Primary supplier or manufacturer)
- `brand_model` (TEXT, Brand and model designation)
- `manufacturer_article` (TEXT, Manufacturer article / part number)
- `source_currency` (TEXT, Original currency: EUR, USD, TRY, etc.)
- `source_unit_price` (NUMERIC, Original quoted price in source currency)
- `product_url` (TEXT, Supplier / manufacturer reference link)
- `lifecycle_status` (TEXT, Product lifecycle stage)
- `attributes` (JSONB, Flexible dimensional specifications)

### B. public.depot_locations
- `depot_id` (TEXT, Primary Key, e.g. `DEPOT-PRJ02-MAIN`, `DEPOT-PRJ02-CONST`)
- `project_id` (TEXT, Foreign Key -> `portfolio_projects.project_id`)
- `depot_name` (TEXT, Physical site name)
- `depot_category` (TEXT, `CENTRAL_CONSTRUCTION_DEPOT`, etc.)
- `is_active` (BOOLEAN)

### C. public.depot_stock_balances
- `balance_id` (UUID, Primary Key)
- `depot_id` (TEXT, Foreign Key -> `depot_locations.depot_id`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id`)
- `quantity_on_hand` (NUMERIC, Physical stock on hand)
- `quantity_reserved` (NUMERIC, Dispatched stock pending receipt confirmation)
- `min_stock_threshold` (NUMERIC, Safety reorder trigger)
- `last_scanned_at` (TIMESTAMPTZ, Timestamp of latest barcode activity)

### D. public.depot_transactions
- `transaction_id` (UUID, Primary Key)
- `transaction_code` (TEXT, Format: `MOV-[YYYYMM]-[HEX]`)
- `depot_id` (TEXT, Foreign Key -> `depot_locations.depot_id`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id`)
- `movement_type` (TEXT, `INBOUND_RECEIPT`, `OUTBOUND_HANDOVER`, `STOCK_ADJUSTMENT`, `AFTERSALES_RETURN`)
- `quantity` (NUMERIC)
- `requisition_id` (TEXT, Optional FK)
- `target_building_id` (TEXT, Optional Block)
- `target_unit_label` (TEXT, Unit/Room designator)
- `irsaliye_number` (TEXT, Dispatch note number)
- `invoice_number` (TEXT, Invoice number)
- `supplier_name` (TEXT)
- `unit_cost_eur` (NUMERIC)
- `final_valued_cost_eur` (NUMERIC)
- `has_missing_docs` (BOOLEAN, GENERATED ALWAYS AS `(irsaliye_number IS NULL OR invoice_number IS NULL)` STORED)
- `delivery_confirmed` (BOOLEAN)
- `confirmed_by_uuid` (UUID)
- `confirmed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

### E. public.asset_register
- `asset_id` (UUID, Primary Key)
- `asset_tag` (TEXT, Format: `AST-[YYYY]-[HEX]`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id`)
- `barcode_ean` (TEXT)
- `serial_number` (TEXT, Unique manufacturer S/N)
- `current_depot_id` (TEXT)
- `deployed_building_id` (TEXT)
- `deployed_unit_label` (TEXT)
- `custody_status` (TEXT, `IN_DEPOT`, `HANDED_OVER_TO_AFTERSALES`, `INSTALLED_IN_UNIT`, `UNDER_MAINTENANCE`, `RETIRED`)
- `inbound_transaction_id` (UUID)
- `outbound_transaction_id` (UUID)
- `warranty_expiry_date` (DATE)
- `created_at` (TIMESTAMPTZ)

### F. public.corporate_users & public.user_invitations (2D RBAC Governance & Hard Auth Gate)
- 2D RBAC architecture: 5 Departments (`SYSTEM`, `EXECUTIVE`, `TECH_OFFICE`, `PURCHASING`, `DEPOT`) across 5 Authority Tiers (0=God, 1=Executive/Director, 2=Manager/Lead, 3=Officer/Specialist, 4=Field/Junior).
- 48-Hour Cryptographic Self-Service Invitations with SHA-256 token hashing, token rotation, and strict downward-only delegation limits.
- Hard Route Gate via `proxy.ts` (Next.js 16 native convention) + unified `/api/auth/login` (stealth developer fail-safe + Supabase Auth with signed HTTP-only `caesar_session` cookie) and `/api/auth/logout`.

---

## 4. Component Tree & Directory Structure

```
spfdemoapp/
├── proxy.ts                           # Next.js 16 hard auth gate for / and protected /api/* routes
├── app/
│   ├── layout.tsx                     # Global HTML metadata, Oswald font loader
│   ├── page.tsx                       # Live authenticated session binding, hard sign-out navigation
│   ├── login/
│   │   └── page.tsx                   # Clean single-form production login (CAESAR OPERATIONS v2.8.0)
│   ├── auth/
│   │   └── accept-invite/
│   │       └── page.tsx               # Self-service onboarding & password creation (<Suspense> wrapped)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts         # Unified stealth fail-safe + Supabase Auth login & session hydration
│       │   ├── logout/route.ts        # Strict HTTP-only auth cookie termination
│       │   ├── invite/route.ts        # 48h invitation generation, SHA-256 token hashing, delegation validation
│       │   ├── accept-invite/route.ts # Token validation & account activation via Supabase Admin
│       │   ├── resend-invite/route.ts # 48h clock reset & token rotation
│       │   ├── revoke-invite/route.ts # Invitation cancellation
│       │   └── failsafe-login/route.ts# Legacy fail-safe endpoint
│       ├── depot/
│       │   ├── barcode-lookup/route.ts# Read-only public barcode proxy (UPCitemdb -> Open Products Facts)
│       │   └── catalog/route.ts       # Authenticated POST (new item + balance) & Tier 0-2 gated PATCH
│       ├── users/route.ts             # User roster queries & account management (Suspend/Activate/Change Role)
│       ├── requisition/route.ts       # Purchase requisition intake API
│       └── approve/route.ts           # Requisition approval state engine
├── components/
│   ├── CorporateHeader.tsx            # CONTROL CENTER / KONTROL MERKEZİ header, role badge, red Sign Out button
│   ├── DesktopSidebar.tsx             # CAESAR OPERATIONS v2.8.0 vertically aligned brand block & grouped navigation
│   ├── StickyControlsFAB.tsx          # Fixed bottom-left action buttons (bottom-4 left-4 z-40)
│   ├── Toast.tsx                      # Non-intrusive notification toast for module & catalog alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location & predictive volume intake engine
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, drawer
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── MobileBarcodeScannerModal.tsx  # Dual-mode (Scan/Lookup & Manual Add) ZXing WASM scanner + external auto-fill
│   ├── ItemDetailsModal.tsx           # Full 30+ column item inspection, movement/asset history & Tier 0-2 edit mode
│   ├── DepoManagementWorkspace.tsx    # Clickable stock rows, unified filters popover, category-aware KPIs
│   └── UserManagementWorkspace.tsx    # Personnel roster, 48h invitation countdown table, developer role preview switcher (Tier 0 only)
├── types/
│   └── requisition.ts                 # Schema interfaces (InventoryCatalogItem extended, Portfolio, Requisition, Depot, Assets, 2D RBAC)
├── lib/
│   ├── authSession.ts                 # Server-side HMAC-SHA256 session cookie signing & verification
│   ├── i18n.ts                        # Centralized symmetric TR/EN dictionary with clean UTF-8 Turkish diacritics
│   ├── supabaseClient.ts              # Client-safe Supabase anon instance
│   ├── supabaseAdmin.ts               # Server-isolated service-role Supabase admin instance
│   ├── rbac.ts                        # 2D RBAC delegation matrix, role metadata, permission helper functions
│   └── emailService.ts                # Transactional email service & invitation email dispatch templates
└── public/
    └── wasm/
        └── zxing_reader.wasm          # Local WebAssembly binary for high-speed offline barcode decoding
```

---

## 5. Current System State & Milestone Verification

Milestone v2.8.0 is completed and verified clean:
- **Hard Auth Gate & Stealth Fail-Safe (`proxy.ts`, `/api/auth/login`, `/api/auth/logout`, `app/login/page.tsx`):** COMPLETED. Unauthenticated requests to `/` and protected `/api/*` routes are strictly gated. Bypass button (`← Portala Geri Dön`) and `God-Tier` UI tabs/toasts removed from `/login`. Stealth fail-safe credentials silently authenticate as `SYSTEM_ADMIN` via HTTP-only signed session cookie.
- **Public Barcode Auto-Fill Proxy (`/api/depot/barcode-lookup`):** COMPLETED. Read-only server proxy queries UPCitemdb with a 3-second timeout fallback to Open Products Facts, suggesting `name`, `brand_model`, and `specification` (badged as `"External Suggestion"`) without mutating Supabase.
- **Dual-Mode Scanner & Manual Item Registry (`MobileBarcodeScannerModal.tsx`, `POST /api/depot/catalog`):** COMPLETED. Hardcoded test barcodes removed. Mode switcher (`Scan / Lookup` vs. `Manual Add`) checks live Supabase first, falls back to external suggestion on miss, and persists new catalog items + initial depot stock balances with deterministic `MAT-XXX` / `WH-XXX` / `DEP-XXX` codes.
- **Clickable Stock Rows & Tier 0–2 Details/Edit Modal (`ItemDetailsModal.tsx`, `PATCH /api/depot/catalog`, `DepoManagementWorkspace.tsx`):** COMPLETED. Every row in `Live Stock Balances` opens the full database record + item transaction/asset history modal (`Issue` button isolated with `e.stopPropagation()`). Edit mode is strictly gated to Tiers 0–2 (`SYSTEM_ADMIN`, `EXECUTIVE`, `TECH_OFFICE_MANAGER`, `DEPOT_MANAGER`) on both UI and server (`403 Forbidden` for Tiers 3–4), with explicit save confirmation.
- **Header, Sidebar & Sticky FAB Visual Polish:** COMPLETED. Removed green `Supabase Realtime Live` indicator; updated header to `CONTROL CENTER` / `Procurement & Inventory` (`KONTROL MERKEZİ` / `Satın Alma & Envanter`) with red Sign Out button; updated sidebar lockup to `CAESAR OPERATIONS` / `Internal Operations` (`Dahili Operasyonlar`) with vertically stacked `v2.8.0` badge matching the emblem height; relocated Sticky FAB to `bottom-4 left-4 z-40`.
- **Workspace Hygiene:** COMPLETED. 0 unauthorized physical markdown files on disk. Compilation clean with 0 errors and 0 warnings.
