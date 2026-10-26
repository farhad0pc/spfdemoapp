"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Building, Sparkles } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { RequisitionMetrics } from '@/components/dashboard/RequisitionMetrics';
import { RequisitionForm } from '@/components/dashboard/RequisitionForm';
import { RequisitionTable } from '@/components/dashboard/RequisitionTable';
import { RequisitionApprovalDrawer } from '@/components/dashboard/RequisitionApprovalDrawer';
import { FloatingActions } from '@/components/dashboard/FloatingActions';
import {
  MaterialItem,
  ConstructionBlock,
  PurchaseRequisition,
  CorporateRole,
  CaesarBlock
} from '@/types/requisition';
import {
  DICTIONARY,
  toLocaleUpper,
  useCaesarLanguage,
  useCaesarTheme
} from '@/lib/i18n';
import { supabase } from '@/lib/supabaseClient';

// Canonical Caesar Resort Blocks
const SEED_BLOCKS: ConstructionBlock[] = [
  { block_id: 'b_zeno', project_id: 'proj_caesar', block_name: 'ZENO', active_phase: 'Kaba Yapı (28 Kat)' },
  { block_id: 'b_phuket', project_id: 'proj_caesar', block_name: 'PHUKET', active_phase: 'Temel & Radye' },
  { block_id: 'b_pattaya', project_id: 'proj_caesar', block_name: 'PATTAYA', active_phase: 'Duvar & İnce İşler' },
  { block_id: 'b_samui', project_id: 'proj_caesar', block_name: 'KOH SAMUI', active_phase: 'Tesisat & Altyapı' },
];

// Master Material Catalog
const SEED_MATERIALS: MaterialItem[] = [
  {
    item_id: 'mat_concrete_c30',
    item_name_tr: 'C30/37 Hazır Beton',
    item_name_en: 'C30 Ready-Mix Concrete',
    unit_of_measure: 'm³',
    category: 'CONCRETE',
    base_cost_eur: 85.0,
    consumption_rate: 1.05,
    consumption_metric: 'm³ kalıp hacmi',
  },
  {
    item_id: 'mat_steel_b500c',
    item_name_tr: 'B500C Nervürlü Donatı Çeliği',
    item_name_en: 'B500C Reinforcing Steel',
    unit_of_measure: 'ton',
    category: 'STEEL',
    base_cost_eur: 680.0,
    consumption_rate: 0.12,
    consumption_metric: 'm³ beton hacmi',
  },
  {
    item_id: 'mat_bims_25',
    item_name_tr: "25'lik Hafif Bims Blok",
    item_name_en: '25cm Lightweight Pumice Block',
    unit_of_measure: 'pcs',
    category: 'MASONRY',
    base_cost_eur: 1.45,
    consumption_rate: 16.5,
    consumption_metric: 'm² duvar yüzeyi',
  },
  {
    item_id: 'mat_ceramic_60120',
    item_name_tr: '60x120 Porselen Zemin Seramiği',
    item_name_en: '60x120cm Porcelain Floor Tile',
    unit_of_measure: 'm²',
    category: 'FINISHES',
    base_cost_eur: 24.5,
    consumption_rate: 1.1,
    consumption_metric: 'm² zemin alanı',
  },
  {
    item_id: 'mat_pprc_pipe_32',
    item_name_tr: 'Ø32 PN20 PPRC Temiz Su Borusu',
    item_name_en: 'Ø32mm PPRC Pressure Pipe',
    unit_of_measure: 'm',
    category: 'PLUMBING',
    base_cost_eur: 6.8,
    consumption_rate: 2.4,
    consumption_metric: 'daire tesisat şaftı',
  },
];

// Initial Requisitions
const INITIAL_REQUISITIONS: PurchaseRequisition[] = [
  {
    ticket_id: 'req_101',
    requisition_number: 'REQ-202610-0101',
    project_id: 'proj_caesar',
    block_id: 'b_zeno',
    item_id: 'mat_concrete_c30',
    foreman_id: 'user_foreman_01',
    architectural_volume: 150,
    predicted_quantity: 157.5,
    requested_quantity: 160,
    variance_percentage: 1.59,
    estimated_total_eur: 13600.0,
    approval_tier: 2,
    status: 'PENDING_TIER2',
    created_at: '10:15',
    updated_at: '10:15',
    material: SEED_MATERIALS[0],
    block: SEED_BLOCKS[0],
    foreman: {
      user_id: 'user_foreman_01',
      name: 'Ali Yılmaz (Saha Şefi)',
      email: 'ali.yilmaz@afikgroup.com',
      role: 'FOREMAN',
      department: 'Caesar İnşaat Operasyon',
    },
  },
  {
    ticket_id: 'req_102',
    requisition_number: 'REQ-202610-0102',
    project_id: 'proj_caesar',
    block_id: 'b_phuket',
    item_id: 'mat_steel_b500c',
    foreman_id: 'user_foreman_02',
    architectural_volume: 220,
    predicted_quantity: 26.4,
    requested_quantity: 32.0,
    variance_percentage: 21.21,
    variance_justification: 'Zemin sismik ankraj güçlendirmesi revizyon paftası no ST-104 gereği radye temel takviyesi.',
    estimated_total_eur: 21760.0,
    approval_tier: 3,
    status: 'PENDING_TIER3',
    created_at: '09:40',
    updated_at: '09:40',
    material: SEED_MATERIALS[1],
    block: SEED_BLOCKS[1],
    foreman: {
      user_id: 'user_foreman_02',
      name: 'Burak Demir (Saha Şefi)',
      email: 'burak.demir@afikgroup.com',
      role: 'FOREMAN',
      department: 'Caesar İnşaat Operasyon',
    },
  },
  {
    ticket_id: 'req_103',
    requisition_number: 'REQ-202610-0103',
    project_id: 'proj_caesar',
    block_id: 'b_pattaya',
    item_id: 'mat_bims_25',
    foreman_id: 'user_foreman_01',
    architectural_volume: 80,
    predicted_quantity: 1320,
    requested_quantity: 1350,
    variance_percentage: 2.27,
    estimated_total_eur: 1957.5,
    approval_tier: 1,
    status: 'APPROVED',
    created_at: '08:20',
    updated_at: '09:05',
    material: SEED_MATERIALS[2],
    block: SEED_BLOCKS[2],
    foreman: {
      user_id: 'user_foreman_01',
      name: 'Ali Yılmaz (Saha Şefi)',
      email: 'ali.yilmaz@afikgroup.com',
      role: 'FOREMAN',
      department: 'Caesar İnşaat Operasyon',
    },
  },
  {
    ticket_id: 'req_104',
    requisition_number: 'REQ-202610-0104',
    project_id: 'proj_caesar',
    block_id: 'b_samui',
    item_id: 'mat_ceramic_60120',
    foreman_id: 'user_foreman_03',
    architectural_volume: 300,
    predicted_quantity: 330,
    requested_quantity: 390,
    variance_percentage: 18.18,
    variance_justification: 'Havuz ve spa ıslak hacim genişletme kararı doğrultusunda ilave fire ve süpürgelik payı.',
    estimated_total_eur: 9555.0,
    approval_tier: 2,
    status: 'PENDING_TIER2',
    created_at: '07:50',
    updated_at: '07:50',
    material: SEED_MATERIALS[3],
    block: SEED_BLOCKS[3],
    foreman: {
      user_id: 'user_foreman_03',
      name: 'Mehmet Kaya (Saha Şefi)',
      email: 'mehmet.kaya@afikgroup.com',
      role: 'FOREMAN',
      department: 'Caesar İnşaat Operasyon',
    },
  },
];

export default function Home() {
  const [lang, setLang] = useCaesarLanguage();
  const [theme, setTheme] = useCaesarTheme();

  const [currentRole, setCurrentRole] = useState<CorporateRole>('PURCHASING_MGR');
  const [blocks, setBlocks] = useState<ConstructionBlock[]>(SEED_BLOCKS);
  const [materials, setMaterials] = useState<MaterialItem[]>(SEED_MATERIALS);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(INITIAL_REQUISITIONS);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [blockFilter, setBlockFilter] = useState<'all' | CaesarBlock>('all');

  const t = DICTIONARY[lang];

  // Synchronize DOM attributes with current language and theme
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [lang, theme]);

  // Sync Language
  const handleToggleLang = () => {
    setLang(lang === 'tr' ? 'en' : 'tr');
  };

  // Sync Theme
  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Supabase Data Polling with Fallback
  useEffect(() => {
    let active = true;
    const fetchSupabase = async () => {
      try {
        const { data: matData, error: matErr } = await supabase.from('material_catalog').select('*');
        if (active && !matErr && matData && matData.length > 0) {
          setMaterials(matData as MaterialItem[]);
        }

        const { data: blockData, error: blockErr } = await supabase.from('construction_blocks').select('*');
        if (active && !blockErr && blockData && blockData.length > 0) {
          setBlocks(blockData as ConstructionBlock[]);
        }
      } catch {
        // Fallback to seeds
      }
    };
    fetchSupabase();
    return () => {
      active = false;
    };
  }, []);

  // Requisition Handlers
  const handleRequisitionSubmit = (newReq: PurchaseRequisition) => {
    setRequisitions((prev) => [newReq, ...prev]);
  };

  const handleApprove = (ticketId: string) => {
    setRequisitions((prev) =>
      prev.map((req) =>
        req.ticket_id === ticketId
          ? {
              ...req,
              status: 'APPROVED',
              updated_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            }
          : req
      )
    );
  };

  const handleReject = (ticketId: string) => {
    setRequisitions((prev) =>
      prev.map((req) =>
        req.ticket_id === ticketId
          ? {
              ...req,
              status: 'REJECTED',
              updated_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            }
          : req
      )
    );
  };

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 dark:bg-canvas-dark dark:text-slate-100 transition-colors">
      {/* Anchored Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        lang={lang}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
        {/* HERO ACTION SECTION: Resort Identity + Ribbon + Search + Primary Modal Trigger */}
        <section
          aria-label="Caesar Resort Hero"
          className="relative overflow-hidden rounded-2xl border border-amber-600/40 bg-linear-to-r from-amber-500/15 via-amber-600/10 to-yellow-600/15 p-5 md:p-6 backdrop-blur-md shadow-xl"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Site Ribbon & Subtitle */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/40">
                <Sparkles className="h-3 w-3" />
                <span>{t.siteRibbon}</span>
              </div>
              <h2 className="mt-2 text-xl md:text-2xl lg:text-[26px] font-bold uppercase tracking-wider text-white">
                {toLocaleUpper(t.appTitle, lang)}
              </h2>
            </div>

            {/* Primary Action Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-yellow px-5 py-3 text-xs md:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400 active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-3" />
                <span>{t.newRequisition}</span>
              </button>
            </div>
          </div>

          {/* Block Filter Pills & Search Input Row */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-amber-500/20">
            {/* Block Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setBlockFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                  blockFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-elevation-dark/80 text-slate-300 hover:bg-border-dark border border-slate-700/60'
                }`}
              >
                {t.allBlocks}
              </button>
              {(['ZENO', 'PHUKET', 'PATTAYA', 'KOH SAMUI'] as CaesarBlock[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBlockFilter(b)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                    blockFilter === b
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-elevation-dark/80 text-slate-300 hover:bg-border-dark border border-slate-700/60'
                  }`}
                >
                  <Building className="h-3 w-3 opacity-60" />
                  <span>{b}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-slate-700/80 bg-surface-dark/80 py-2 pl-9 pr-3 text-xs font-medium text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </section>

        {/* EXECUTIVE 3-CARD OVERVIEW TELEMETRY */}
        <section aria-label="Executive Overview">
          <RequisitionMetrics requisitions={requisitions} lang={lang} />
        </section>

        {/* DUAL VIEW CONTROLLER (Square Matrix vs Full Sub-Ledger & Mobile Cards) */}
        <section aria-label="Requisition Ledger">
          <RequisitionTable
            requisitions={requisitions}
            onSelectRequisition={setSelectedRequisition}
            selectedTicketId={selectedRequisition?.ticket_id}
            lang={lang}
            blockFilter={blockFilter}
            onBlockFilterChange={setBlockFilter}
            searchQuery={searchQuery}
          />
        </section>
      </main>

      {/* SMART REQUISITION FORM (Slide-over Modal Drawer) */}
      <RequisitionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        materials={materials}
        blocks={blocks}
        currentRole={currentRole}
        onSubmit={handleRequisitionSubmit}
        lang={lang}
      />

      {/* REQUISITION & 3-TIER APPROVAL DRAWER */}
      <RequisitionApprovalDrawer
        requisition={selectedRequisition}
        currentRole={currentRole}
        onClose={() => setSelectedRequisition(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        lang={lang}
      />

      {/* PERSISTENT BOTTOM-LEFT UTILITY CLUSTER & MOBILE FAB */}
      <FloatingActions
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewRequisition={() => setIsFormOpen(true)}
      />
    </div>
  );
}
