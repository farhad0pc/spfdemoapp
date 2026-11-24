# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.9.4 (Caesar Emblem Restoration, Sidebar `NEW` Badge Cleanup & RBAC-Gated User Profile Avatars)  
**Last Updated:** 2026-11-24  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15 + Supabase Storage `inventory-media`)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.9.4 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **Caesar Operations (Procurement & Inventory Ecosystem)** is an enterprise procurement, predictive intake calculation, warehouse inventory ledger, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

### Scope Boundaries & Anti-Collision Mandate
- **Purchasing & Inventory System (This Repository):** Governs construction material requisitions, predictive volume/consumption calculations, supplier quotation containment, purchasing sub-ledgers, warehouse inventory handovers, serialized asset custody, 2D RBAC governance, universal catalog taxonomy (construction + furnishing/equipment), multi-photo SKU media albums, RBAC-gated user profile avatars, hardened multi-barcode staging, full-schema executive CSV export, intent-driven pre-authentication module launcher, and executive capital exposure.
  - Tables: `public.inventory_catalog`, `public.inventory_item_media`, `public.purchase_requisitions`, `public.requisition_approvals`, `public.corporate_users`, `public.user_invitations`, `public.portfolio_projects`, `public.portfolio_buildings`, `public.depot_locations`, `public.depot_stock_balances`, `public.depot_transactions`, `public.asset_register`.
  - Storage Bucket: `inventory-media` (Public CDN bucket, 5 MB limit for SKU media / 2 MB limit for `avatars/{user_id}/{uuid}.webp`, WebP/JPEG/PNG, 1-year `cacheControl: '31536000'`).
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
- `attributes` (JSONB, Structured snake_case dimensional specifications + locked migration provenance keys)
- `primary_image_url` (TEXT, Denormalized primary album photo URL synced by `/api/depot/media` for zero-N+1 table thumbnail rendering)

### B. public.inventory_item_media (SKU Photo Album — Max 5 Photos/SKU)
- `id` (UUID, Primary Key, `gen_random_uuid()`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id ON DELETE CASCADE`)
- `storage_path` (TEXT, Unique object key inside Supabase Storage `inventory-media` bucket)
- `public_url` (TEXT, Public CDN URL)
- `is_primary` (BOOLEAN, Primary photo flag)
- `display_order` (INTEGER, Ordering index)
- `source_type` (TEXT, `CAMERA`, `LOCAL`, or `GOOGLE_DRIVE`)
- `file_size_bytes` (INTEGER, Compressed payload size in bytes)
- `uploaded_by` (TEXT, Authenticated actor email)
- `created_at` (TIMESTAMPTZ)

### C. public.depot_locations
- `depot_id` (TEXT, Primary Key, e.g. `DEPOT-PRJ02-MAIN`, `DEPOT-PRJ02-CONST`)
- `project_id` (TEXT, Foreign Key -> `portfolio_projects.project_id`)
- `depot_name` (TEXT, Physical site name)
- `depot_category` (TEXT, `CENTRAL_CONSTRUCTION_DEPOT`, etc.)
- `is_active` (BOOLEAN)

### D. public.depot_stock_balances
- `balance_id` (UUID, Primary Key)
- `depot_id` (TEXT, Foreign Key -> `depot_locations.depot_id`)
- `catalog_item_id` (UUID, Foreign Key -> `inventory_catalog.item_id`)
- `quantity_on_hand` (NUMERIC, Physical stock on hand)
- `quantity_reserved` (NUMERIC, Dispatched stock pending receipt confirmation)
- `min_stock_threshold` (NUMERIC, Safety reorder trigger)
- `last_scanned_at` (TIMESTAMPTZ, Timestamp of latest barcode activity)

### E. public.depot_transactions
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

### F. public.asset_register
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

### G. public.corporate_users & public.user_invitations (2D RBAC Governance, Avatars & Hard Auth Gate)
- 2D RBAC architecture: 5 Departments (`SYSTEM`, `EXECUTIVE`, `TECH_OFFICE`, `PURCHASING`, `DEPOT`) across 5 Authority Tiers (0=God, 1=Executive/Director, 2=Manager/Lead, 3=Officer/Specialist, 4=Field/Junior).
- Profile Avatars: `avatar_url` (TEXT) and `avatar_storage_path` (TEXT) on `public.corporate_users`, backed by `inventory-media` Storage under `avatars/{user_id}/{uuid}.webp` and strictly gated to Tiers 0–1 (`SYSTEM_ADMIN`, `EXECUTIVE`) via `/api/users/avatar`.
- 48-Hour Cryptographic Self-Service Invitations with SHA-256 token hashing, token rotation, and strict downward-only delegation limits.
- Hard Route Gate via `proxy.ts` (Next.js 16 native convention) + unified `/api/auth/login` (stealth developer fail-safe + Supabase Auth with signed HTTP-only `caesar_session` cookie) and `/api/auth/logout`.

---

## 4. Component Tree & Directory Structure

```
spfdemoapp/
├── proxy.ts                           # Next.js 16 hard auth gate for / and protected /api/* routes
├── supabase/
│   └── migrations/
│       ├── 20261124_inventory_item_media.sql    # Idempotent DDL for inventory_item_media, primary_image_url & inventory-media bucket
│       └── 20261124_corporate_users_avatar.sql  # Idempotent DDL adding avatar_url & avatar_storage_path to corporate_users
├── app/
│   ├── layout.tsx                     # Global HTML metadata, Oswald font loader & persistent GlobalUtilityFab mount
│   ├── page.tsx                       # Live session binding (including avatar_url), ?module= routing & post-auth RBAC Access Denied screen
│   ├── login/
│   │   └── page.tsx                   # 2-Step intent-driven login: Step 1 ModuleLauncher -> Step 2 Credentials -> /?module=
│   ├── auth/
│   │   └── accept-invite/
│   │       └── page.tsx               # Self-service onboarding & password creation (<Suspense> wrapped)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts         # Unified stealth fail-safe + Supabase Auth login & session hydration (returns avatar_url)
│       │   ├── logout/route.ts        # Strict HTTP-only auth cookie termination
│       │   ├── invite/route.ts        # 48h invitation generation, SHA-256 token hashing, delegation validation
│       │   ├── accept-invite/route.ts # Token validation & account activation via Supabase Admin
│       │   ├── resend-invite/route.ts # 48h clock reset & token rotation
│       │   ├── revoke-invite/route.ts # Invitation cancellation
│       │   └── failsafe-login/route.ts# Legacy fail-safe endpoint
│       ├── depot/
│       │   ├── barcode-lookup/route.ts# Read-only public barcode proxy with URL/non-GTIN guard (UPCitemdb -> Open Products Facts)
│       │   ├── catalog/route.ts       # Authenticated POST (new item + balance) & Tier 0-2 gated PATCH
│       │   └── media/route.ts         # Atomic Storage + DB media API (GET, POST 5-photo cap + Drive mirror, PATCH primary, Tier 0-2 DELETE)
│       ├── users/
│       │   ├── route.ts               # User roster queries (with avatar_url) & account management (Suspend/Activate/Change Role)
│       │   └── avatar/route.ts        # Tier 0-1 gated atomic user avatar upload (POST) & removal (DELETE) in inventory-media
│       ├── requisition/route.ts       # Purchase requisition intake API
│       └── approve/route.ts           # Requisition approval state engine
├── components/
│   ├── AttributesEditor.tsx           # Structured snake_case Key-Value matrix, domain quick-chips & locked provenance pills
│   ├── CorporateHeader.tsx            # CONTROL CENTER / KONTROL MERKEZİ header, circular user avatar / initial fallback, red Sign Out button
│   ├── DesktopSidebar.tsx             # CAESAR OPERATIONS v2.9.4 vertically aligned brand block & grouped navigation (clean Active Modules without NEW badge)
│   ├── GlobalUtilityFab.tsx           # Persistent route/viewport-aware Language (EN/TR) + Light/Dark glassmorphic FAB
│   ├── ModuleLauncher.tsx             # Pre-auth 7-tile primary module launcher with official Caesar Group Emblem
│   ├── StickyControlsFAB.tsx          # Legacy controls component
│   ├── Toast.tsx                      # Non-intrusive notification toast for module & catalog alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location & predictive volume intake engine
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, drawer
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── WebcamCaptureModal.tsx         # Cross-device getUserMedia live camera viewfinder + WebP shutter capture
│   ├── ItemMediaUploadModal.tsx       # Responsive desktop modal / mobile bottom sheet (Live Camera / Local / Google Drive + Preview & Confirm)
│   ├── MobileBarcodeScannerModal.tsx  # Top-mounted 128x128 Reference Photo hero + multi-barcode staging tray + single-barcode guardrail
│   ├── ItemDetailsModal.tsx           # Top-left 180x180 album hero + 5-slot strip + lightbox + split RBAC media controls & Tier 0-2 edit mode
│   ├── DepoManagementWorkspace.tsx    # 40x40px lazy-loaded thumbnails, filter-aware Export CSV button, scanner View Item bridge & 2-tier alert KPI
│   └── UserManagementWorkspace.tsx    # Personnel roster with circular avatars, Tier 0-1 Update User Photo modal, 48h invitation table & dev role preview
├── types/
│   └── requisition.ts                 # Schema interfaces (InventoryCatalogItem, InventoryItemMedia, CorporateUserProfile with avatar_url, 2D RBAC)
├── lib/
│   ├── authSession.ts                 # Server-side HMAC-SHA256 session cookie signing & verification
│   ├── csvExport.ts                   # Client-side RFC-4180 CSV serializer with UTF-8 BOM, formula-injection guard, dynamic attr_* & Tier 0-2 masking
│   ├── imageCompression.ts            # Client-side Canvas WebP compressor (1024px SKU media / 256px user avatars, JPEG fallback)
│   ├── i18n.ts                        # Centralized symmetric TR/EN dictionary (v2.9.4) with clean UTF-8 Turkish diacritics
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

Milestone v2.9.4 is completed and verified clean:
- **Caesar Emblem Restoration on Module Launcher (`components/ModuleLauncher.tsx`):** COMPLETED. Replaced the generic `CO` text box with the official Caesar Group emblem image (`https://i.ibb.co/p6CSmYL7/CAESAR-EMBLEM-NO-TEXT.png` with automatic `onError` fallback to `https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png`), matching the Login card and Desktop Sidebar emblem styling.
- **Sidebar `NEW` Badge Cleanup (`components/DesktopSidebar.tsx`):** COMPLETED. Removed the yellow `NEW` / `YENİ` badge pill next to `Personnel & RBAC` (`Personel & Yetki Matrisi`) while keeping all 4 roadmap `SOON` / `YAKINDA` badges intact.
- **RBAC-Gated User Profile Avatars (`supabase/migrations/20261124_corporate_users_avatar.sql`, `app/api/users/avatar/route.ts`, `components/UserManagementWorkspace.tsx`, `components/CorporateHeader.tsx`, `app/page.tsx`):** COMPLETED. Added `avatar_url` and `avatar_storage_path` to `public.corporate_users`, created atomic `POST`/`DELETE /api/users/avatar` strictly gated to Tiers 0–1 (`SYSTEM_ADMIN`, `EXECUTIVE`), integrated circular `w-9 h-9` avatars with alphabet-initial fallback across `UserManagementWorkspace` and `CorporateHeader`, and added the **Update User Photo (`Fotoğrafı Güncelle`)** modal supporting live camera capture (`WebcamCaptureModal`) and device upload with client-side `256×256px` WebP compression.
- **Workspace Hygiene:** COMPLETED. 0 unauthorized physical markdown files on disk. Compilation clean with 0 errors and 0 warnings.
