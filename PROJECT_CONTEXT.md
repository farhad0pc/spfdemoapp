# Caesar Purchasing Sub-Ledger & Procurement Ecosystem — Project Context
**Version:** v2.9.7 (Technical Intake Catalog Picker & Reset Controls + Depot Hero Action Colors & Light Blue Table Header)  
**Last Updated:** 2026-11-26  
**Lead Systems Architect:** Farhad Mokhtari  
**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL 15 + Supabase Storage `inventory-media`)  
**Status:** Compilation Clean (Exit Code 0: 0 errors, 0 warnings) — Milestone 2.9.7 Production Ready  

---

## 1. Executive Summary & Operational Scope

The **CAESAR CENTRAL HUB (Internal Operations Portal — Procurement & Inventory Ecosystem)** is an enterprise procurement, predictive intake calculation, warehouse inventory ledger, and fiduciary governance platform designed for Caesar Group / Afik Group construction operations.

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
│   ├── layout.tsx                     # Global HTML metadata (CAESAR CENTRAL HUB), Oswald font loader, SplashOverlay & GlobalUtilityFab mount
│   ├── page.tsx                       # Live session binding (including avatar_url), ?module= routing, onOpenDepot bridge & post-auth RBAC Access Denied screen
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
│   ├── CatalogMaterialPicker.tsx      # Full-title centered domain tabs, category-grouped, Turkish-locale searchable material selector with inline ✕ resets & Depot jump
│   ├── CorporateHeader.tsx            # CONTROL CENTER / KONTROL MERKEZİ header, circular user avatar / initial fallback, red Sign Out button
│   ├── DesktopSidebar.tsx             # CAESAR CENTRAL HUB v2.9.7 hierarchical collapsible module groups & Tier 0-only Database & Dev Tools footer
│   ├── GlobalUtilityFab.tsx           # Persistent route/viewport-aware Language (EN/TR) + Light/Dark glassmorphic FAB
│   ├── ModuleLauncher.tsx             # Pre-auth 6-tile prioritized module launcher (3x2 grid) driven by lib/moduleRegistry.ts
│   ├── SplashOverlay.tsx              # Root client wrapper mounting createCaesarSplash (6.5s Canvas 2D atomic orbit splash) with session/skip/failsafe guards
│   ├── StickyControlsFAB.tsx          # Legacy controls component
│   ├── Toast.tsx                      # Non-intrusive notification toast for module & catalog alerts
│   ├── TechnicalIntakeModule.tsx      # Full-screen 3-tier cascading location (h-10 + inline ✕ resets) & CatalogMaterialPicker predictive volume intake engine
│   ├── RequisitionWorkspace.tsx       # Sub-ledger table with O(1) canonical portfolio lookup, batch controls, drawer
│   ├── ExecutiveTelemetryStrip.tsx    # Board-level fiduciary KPI metrics strip (Executive only)
│   ├── WebcamCaptureModal.tsx         # Cross-device getUserMedia live camera viewfinder + WebP shutter capture
│   ├── ItemMediaUploadModal.tsx       # Responsive desktop modal / mobile bottom sheet (Live Camera / Local / Google Drive + Preview & Confirm)
│   ├── MobileBarcodeScannerModal.tsx  # Top-mounted 128x128 Reference Photo hero + multi-barcode staging tray + single-barcode guardrail
│   ├── ItemDetailsModal.tsx           # Top-left 180x180 album hero + 5-slot strip + lightbox + split RBAC media controls & Tier 0-2 edit mode
│   ├── DepoManagementWorkspace.tsx    # 40x40px lazy-loaded thumbnails, dark-orange Inbound / yellow Outbound hero buttons, light-blue table headers & Export CSV
│   └── UserManagementWorkspace.tsx    # Personnel roster with circular avatars, Tier 0-1 Update User Photo modal, 48h invitation table & dev role preview
├── types/
│   └── requisition.ts                 # Schema interfaces (InventoryCatalogItem, InventoryItemMedia, CorporateUserProfile with avatar_url, 2D RBAC)
├── lib/
│   ├── authSession.ts                 # Server-side HMAC-SHA256 session cookie signing & verification
│   ├── caesarSplashEngine.ts          # Dependency-free TypeScript 6.5s Canvas 2D perspective ribbon/electron splash renderer
│   ├── csvExport.ts                   # Client-side RFC-4180 CSV serializer with UTF-8 BOM, formula-injection guard, dynamic attr_* & Tier 0-2 masking
│   ├── imageCompression.ts            # Client-side Canvas WebP compressor (1024px SKU media / 256px user avatars, JPEG fallback)
│   ├── i18n.ts                        # Centralized symmetric TR/EN dictionary (v2.9.7) with clean UTF-8 Turkish diacritics
│   ├── moduleRegistry.ts              # Centralized single-source-of-truth config for modules, sub-sections, launcher order, sidebar hierarchy & RBAC allowedTiers
│   ├── supabaseClient.ts              # Client-safe Supabase anon instance
│   ├── supabaseAdmin.ts               # Server-isolated service-role Supabase admin instance
│   ├── rbac.ts                        # 2D RBAC delegation matrix, role metadata, config-driven module/view clearance helpers
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

Milestone v2.9.5 is completed and verified clean:
- **Centralized Config-Driven Module Registry (`lib/moduleRegistry.ts`, `lib/rbac.ts`):** COMPLETED. Created `lib/moduleRegistry.ts` as the single source of truth for modules, nested sub-sections, `launcherOrder`, `sidebarOrder`, and RBAC `allowedTiers`. Removed `Master Catalog Admin` from top-level navigation, aligned `Requisition Workspace` to Tiers `0–3`, `User Management & RBAC` to Tiers `0–2`, and restricted `Database & Dev Tools` strictly to Tier `0` (`SYSTEM_ADMIN`).
- **Prioritized 6-Tile Pre-Auth Module Launcher (`components/ModuleLauncher.tsx`):** COMPLETED. Refactored to a symmetrical 3×2 desktop grid and centered `200×200px` mobile stack driven by `lib/moduleRegistry.ts` with active clickable modules in Row 1 (`Purchasing & Orders`, `Depot & Stock Management`, `User Management & RBAC`), upcoming modules in Row 2 (`Aftersales`, `Caesar Project Portfolio`, `Executive Dossiers & Reports`), and `Database & Dev Tools` permanently excluded.
- **Hierarchical Collapsible Sidebar & Strict RBAC Routing (`components/DesktopSidebar.tsx`, `app/page.tsx`):** COMPLETED. Refactored `DesktopSidebar.tsx` to render expandable parent module groups (`Purchasing & Orders`, `Depot & Stock Management`, `Aftersales`, `Caesar Project Portfolio`), clean `User Management & RBAC` (Tiers `0–2`), and a dedicated bottom utility footer slot for `Database & Dev Tools` visible exclusively to Tier `0` (`SYSTEM_ADMIN`), while preserving strict post-auth `Access Denied` gating in `app/page.tsx` and 100% zero mutation of Depot operational files.
- **Caesar Operations 4.4s Startup Splash Animation (`components/SplashOverlay.tsx`, `app/globals.css`, `app/layout.tsx`):** COMPLETED. Implemented a pure SVG + CSS/Tailwind v4 4.4s startup splash screen mounted at root DOM (`fixed inset-0 z-[999999]`) featuring dual Caesar Gold/Cobalt sweeping ribbons, radial halo + 5 geometric accents, official Caesar Emblem unveil, responsive horizontal desktop / vertical mobile wordmark clip-path reveal, stepped corner brackets, `sessionStorage` once-per-session persistence (`caesar_splash_seen_v295`), `Skip`/`Atla` pill after `1.2s`, `prefers-reduced-motion` support, and a hard `6.0s` failsafe auto-unmount timer.
- **Localization & Version Sync (`lib/i18n.ts`):** COMPLETED. Bumped version to `v2.9.5` across EN and TR with clean UTF-8 Turkish diacritics for all reorganized modules, sub-sections, and splash controls.

Milestone v2.9.6 is completed and verified clean:
- **Canvas 2D Atomic Orbit Splash Engine (`lib/caesarSplashEngine.ts`, `components/SplashOverlay.tsx`, `app/globals.css`, `app/layout.tsx`):** COMPLETED. Ported the dependency-free 6500ms Canvas 2D perspective ribbon/electron splash renderer (`createCaesarSplash`) with quintic smootherstep easing, 3 corner strands curling into tilted 3D orbits (`tilt = [-0.65, 0.65, 1.57]`), 3 electrons with 28-segment `1px` fine trails, crisp unboxed Caesar emblem emergence (`ctx.shadowBlur = 0`, zero glow/container), complete orbit/electron render pass skip after `5.20s`, React 19 Strict Mode `destroy()` teardown, `sessionStorage` guard (`caesar_splash_seen_v296`), `Skip`/`Atla` pill after `1.2s`, and an `8.5s` hard failsafe auto-unmount timer.
- **Global "CAESAR CENTRAL HUB" Rebrand (`app/layout.tsx`, `components/ModuleLauncher.tsx`, `components/DesktopSidebar.tsx`, `app/login/page.tsx`, `lib/i18n.ts`):** COMPLETED. Rebranded all primary brand headers, metadata, sidebar lockup, and login headers from `CAESAR OPERATIONS` to **`CAESAR CENTRAL HUB`** (`font-bold` 700) and **`INTERNAL OPERATIONS PORTAL`** / **`DAHİLİ OPERASYON PORTALI`** (`font-light` 300) with version badge **`v2.9.6`**.
- **Categorized & Searchable Material Catalog Picker (`components/CatalogMaterialPicker.tsx`, `components/TechnicalIntakeModule.tsx`):** COMPLETED. Created `CatalogMaterialPicker.tsx` with domain segmented filtering (`CONSTRUCTION_MATERIALS`, `FURNISHING_AND_EQUIPMENT`, `ALL` — defaulting to `CONSTRUCTION_MATERIALS` in `TechnicalIntakeModule.tsx` with live SKU counts), dynamic `h-10` category dropdown + sticky category headers, Turkish-locale-aware search (`toLocaleLowerCase('tr-TR')`) across SKU/names/brand/spec/barcode, selected material summary bar, and standardized `h-10` cascading location controls while preserving `item_id` PK binding and `Number()` volume/budget calculations.
- **Depot Protection & Workspace Hygiene:** COMPLETED. Zero modifications to any Depot operational files or database schemas, 0 unauthorized `.md` files on disk, and 100% clean `npx tsc --noEmit && npm run lint` verification.

Milestone v2.9.7 is completed and verified clean:
- **Full-Title Center-Aligned Domain Containers & Inline Reset (`✕`) Controls (`components/CatalogMaterialPicker.tsx`, `components/TechnicalIntakeModule.tsx`, `app/page.tsx`):** COMPLETED. Removed `truncate` on the 3 domain selector buttons (`Construction Materials`, `Furnishing & Equipment`, `All Domains` / `İnşaat Malzemeleri`, `Mobilya ve Ekipman`, `Tüm Alanlar`) so all titles and live SKU counts render centered and 100% visible in both EN and TR; added inline `h-10 w-10` `✕` reset buttons on all 3 cascading location dropdowns (`Project Selection *`, `Building Type *` / `Yapı Türü *`, `Building Block Selection *`), Category `<select>`, search input, and Selected Catalog Material summary card; prevented intake header clipping (`min-w-0 break-words leading-tight`); and wired the **`Open Depot & Catalog` / `Depo ve Kataloğu Aç`** quick jump button directly to `DEPOT_WORKSPACE`.
- **Depot Hero Action Button Colors & Light Blue Table Headers (`components/DepoManagementWorkspace.tsx`):** COMPLETED. Applied strictly CSS-only class updates: updated hero `Inbound` (`Giriş`) button to dark orange (`bg-orange-600 hover:bg-orange-700 text-white`), hero `Outbound` (`Çıkış`) button to yellow with high-contrast dark slate text (`bg-yellow-400 hover:bg-yellow-500 text-slate-950`), and all 3 Depot ledger `<thead>` surfaces to light blue (`bg-blue-50/95 dark:bg-blue-950/45 border-b border-blue-200 dark:border-blue-800/60 text-blue-950 dark:text-blue-100`) while keeping the primary scanner button and 100% of Depot operational logic untouched.
- **Localization & Version Sync (`lib/i18n.ts`):** COMPLETED. Bumped version to `v2.9.7` across EN and TR with clean UTF-8 Turkish diacritics.


Milestone v2.9.8 is completed and verified clean:
- **Global Viewport, Safe-Area & iOS Safari Touch Foundation (`app/layout.tsx`, `app/globals.css`, `app/page.tsx`):** COMPLETED. Exported Next.js `Viewport` (`width: 'device-width'`, `initialScale: 1`, `viewportFit: 'cover'`), enforced `overflow-x: hidden; max-width: 100%` on `html, body`, added `.touch-scroll-x` (`-webkit-overflow-scrolling: touch`), added `@media (max-width: 767px) { input, select, textarea { font-size: 16px; } }` to prevent iOS Safari auto-zoom, and wired `isMobileDrawerOpen` state and `min-w-0 overflow-x-hidden` shell in `app/page.tsx`.
- **Mobile Top Header, Fixed Slide-Over Overlay Drawer & Non-Colliding Utility FAB (`components/CorporateHeader.tsx`, `components/DesktopSidebar.tsx`, `components/GlobalUtilityFab.tsx`):** COMPLETED. Refactored `< md` top header to a crisp single-row `h-14 px-3` bar with `44×44px` hamburger button, compact role/tier badge, inline `EN/TR` & `Theme` toggle, circular avatar, and reachable red **Sign Out (`Oturumu Kapat`)** button; converted `< md` sidebar into a `fixed inset-y-0 left-0 z-[70] w-[285px] max-w-[85vw]` slide-over overlay drawer with translucent backdrop (`z-[65]`), top-right `✕` close button, auto-close on navigation/backdrop tap, and bottom profile + full-width red Sign Out footer; anchored `GlobalUtilityFab` bottom-center with safe-area padding on `/login` (`z-40`) and hid it on `< md` inside authenticated `/` routes.
- **Mobile-Safe `/login`, Module Launcher, Responsive Mobile Cards & Safe-Area Modals (`app/login/page.tsx`, `components/ModuleLauncher.tsx`, `components/RequisitionWorkspace.tsx`, `components/DepoManagementWorkspace.tsx`, `components/TechnicalIntakeModule.tsx`, `components/CatalogMaterialPicker.tsx`, `components/UserManagementWorkspace.tsx`, `components/ItemDetailsModal.tsx`, `components/MobileBarcodeScannerModal.tsx`, `components/ItemMediaUploadModal.tsx`, `components/WebcamCaptureModal.tsx`):** COMPLETED. Added safe-area top/bottom padding and wrapping `← Modül Değiştir` header on `/login`; added dedicated `md:hidden` mobile summary card lists for Requisitions, Live Stock Balances, Personnel Roster, and Invitations alongside `hidden md:block` `.touch-scroll-x` desktop tables; converted the Depot filter popover into a viewport-clamped mobile bottom sheet on `< sm`; and standardized all modals to `max-h-[90dvh]` bottom-sheet / clamped containers with `min-h-[44px]` touch targets and `pb-[max(...,env(safe-area-inset-bottom))]` while preserving 100% of existing business logic, dark-orange Inbound / yellow Outbound buttons, and light-blue table headers.
- **Localization & Version Sync (`lib/i18n.ts`):** COMPLETED. Bumped version to `v2.9.8` across EN and TR with clean UTF-8 Turkish diacritics.


---

## Milestone v2.9.9 — Enterprise User Governance, Root Security Vault, Team Hierarchy & Personal Profile Window
- **Immutable Protected Root (`farhadmokhtari22@gmail.com`)**: Locked permanently at Tier 0 (`SYSTEM_ADMIN`) via database trigger (`trg_protect_root_developer`) and application-layer guardrails (`isProtectedRootUser`, `canViewProtectedRoot`). Hidden from Tiers 1–4 rosters and safeguarded from suspension or demotion.
- **Developer Security Vault (`/api/auth/dev-verify` & `DevVaultModal.tsx`)**: Step-up PIN verification using `crypto.scryptSync` and `crypto.timingSafeEqual` against `DEV_SECURITY_PIN_HASH`, issuing a 15-minute `HttpOnly` `caesar_dev_elevated` cookie with 5-attempt rate limiting and `user_audit_logs` telemetry.
- **Option 1 Status & Suspension Matrix**:
  - Account Access (`account_status`: `'ACTIVE' | 'SUSPENDED'`) is restricted strictly to Tier 0 (`SYSTEM_ADMIN`) and Tier 1 (`EXECUTIVE`).
  - Operational Duty Status (`operational_status`: `'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED'`) allows Tier 2 Team Leaders / Division Managers to toggle `'ACTIVE'` / `'ON_LEAVE'` for Tier 3–4 members within their own team/department.
- **Asana/ClickUp-Style Team Hierarchy & Governance Drawer (`UserManagementWorkspace.tsx` & `UserDetailDrawer.tsx`)**: Added Team Hierarchy view grouping personnel by `public.teams`, team filter controls, operational status badges, and a slide-over governance drawer.
- **Self-Service Personal Profile Window (`UserProfileModal.tsx` & `/api/users/me`)**: Accessible to all tiers (`0–4`) from `CorporateHeader.tsx` and `DesktopSidebar.tsx` to view corporate clearance and update own `full_name`, `phone_number`, and `avatar_url` without privilege escalation.
