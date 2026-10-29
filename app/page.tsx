'use client';

import RequisitionTable from '@/components/dashboard/RequisitionTable';

import React, { useState, useEffect } from 'react';
import { Search, Plus,
  Building,
  Sparkles,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Coins,
  TrendingUp,
  Layers } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { RequisitionMetrics } from '@/components/dashboard/RequisitionMetrics';
import { RequisitionForm } from '@/components/dashboard/RequisitionForm';
import { RequisitionApprovalDrawer } from '@/components/dashboard/RequisitionApprovalDrawer';
import { FloatingActions } from '@/components/dashboard/FloatingActions';
import {
  MaterialItem,
  ConstructionBlock,
  PurchaseRequisition,
  CorporateRole,
  CaesarBlock,
  ApprovalTier,
  RequisitionStatus,
  calculatePredictedQuantity,
  calculateVariance,
  determineApprovalTier,
  getTierDescriptor,
  getSeedUser
} from '@/types/requisition';
import {
  DICTIONARY,
  toLocaleUpper,
  formatCurrency,
  formatNumber,
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
    foreman: getSeedUser('FOREMAN'),
  },
  {
    ticket_id: 'req_102',
    requisition_number: 'REQ-202610-0102',
    project_id: 'proj_caesar',
    block_id: 'b_phuket',
    item_id: 'mat_steel_b500c',
    foreman_id: 'user_foreman_01',
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
    foreman: getSeedUser('FOREMAN'),
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
    foreman: getSeedUser('FOREMAN'),
  },
  {
    ticket_id: 'req_104',
    requisition_number: 'REQ-202610-0104',
    project_id: 'proj_caesar',
    block_id: 'b_samui',
    item_id: 'mat_ceramic_60120',
    foreman_id: 'user_foreman_01',
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
    foreman: getSeedUser('FOREMAN'),
  },
  {
    ticket_id: 'req_105',
    requisition_number: 'REQ-202610-0105',
    project_id: 'proj_caesar',
    block_id: 'b_samui',
    item_id: 'mat_pprc_pipe_32',
    foreman_id: 'user_foreman_01',
    architectural_volume: 120,
    predicted_quantity: 288,
    requested_quantity: 280,
    variance_percentage: -2.78,
    estimated_total_eur: 1904.0,
    approval_tier: 1,
    status: 'PENDING_PURCHASING',
    created_at: '07:15',
    updated_at: '07:15',
    material: SEED_MATERIALS[4],
    block: SEED_BLOCKS[3],
    foreman: getSeedUser('FOREMAN'),
  },
];

let quickTicketCounter = 1000;
function generateQuickTicketId(): string {
  quickTicketCounter += 1;
  return `req_${Date.now()}_${quickTicketCounter}`;
}

function generateQuickRequisitionNumber(): string {
  return `REQ-202610-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getFormattedTimeString(): string {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const [lang, setLang] = useCaesarLanguage();
  const [theme, setTheme] = useCaesarTheme();

  const [currentRole, setCurrentRole] = useState<CorporateRole>('FOREMAN');
  const [statusFilter, setStatusFilter] = useState<'all' | RequisitionStatus>('all');
  const [tierFilter, setTierFilter] = useState<'all' | ApprovalTier>('all');
  const [myRequisitionsOnly, setMyRequisitionsOnly] = useState<boolean>(true);

  const [blocks, setBlocks] = useState<ConstructionBlock[]>(SEED_BLOCKS);
  const [materials, setMaterials] = useState<MaterialItem[]>(SEED_MATERIALS);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(INITIAL_REQUISITIONS);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [blockFilter, setBlockFilter] = useState<'all' | CaesarBlock>('all');

  // Foreman Instant Baseline Calculator State
  const [intakeBlockId, setIntakeBlockId] = useState<string>('b_zeno');
  const [intakeItemId, setIntakeItemId] = useState<string>('mat_concrete_c30');
  const [intakeVolume, setIntakeVolume] = useState<number>(150);
  const [intakeRequested, setIntakeRequested] = useState<number>(160);
  const [intakeJustification, setIntakeJustification] = useState<string>('');
  const [intakeSuccessMsg, setIntakeSuccessMsg] = useState<string | null>(null);

  const t = DICTIONARY[lang];

  // Role Partitioning Switcher
  const handleRoleChange = (newRole: CorporateRole) => {
    setCurrentRole(newRole);
    if (newRole === 'FOREMAN') {
      setStatusFilter('all');
      setTierFilter('all');
      setMyRequisitionsOnly(true);
    } else if (newRole === 'PURCHASING_MGR') {
      setStatusFilter('PENDING_PURCHASING');
      setTierFilter('all');
      setMyRequisitionsOnly(false);
    } else if (newRole === 'PROJECT_DIRECTOR') {
      setStatusFilter('PENDING_TIER2');
      setTierFilter('all');
      setMyRequisitionsOnly(false);
    } else if (newRole === 'EXECUTIVE') {
      setStatusFilter('all');
      setTierFilter(3);
      setMyRequisitionsOnly(false);
    }
  };

  // Instant Baseline Calculations for Foreman Intake
  const activeMaterial = materials.find((m) => m.item_id === intakeItemId) || materials[0] || SEED_MATERIALS[0];
  const activeBlock = blocks.find((b) => b.block_id === intakeBlockId) || blocks[0] || SEED_BLOCKS[0];

  const intakePredicted = calculatePredictedQuantity(intakeVolume, activeMaterial.consumption_rate);
  const { variancePercentage: intakeVariance, isAnomaly: intakeIsAnomaly } = calculateVariance(
    intakeRequested,
    intakePredicted
  );
  const intakeTotalEur = Number((intakeRequested * activeMaterial.base_cost_eur).toFixed(2));
  const intakeTier = determineApprovalTier(intakeTotalEur);
  const intakeTierDescriptor = getTierDescriptor(intakeTier);

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

  // Supabase Realtime Listener (Live Sub-Ledger Push)
  useEffect(() => {
    const channel = supabase
      .channel('subledger-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_requisitions' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as Partial<PurchaseRequisition> & { id?: string; ticket_id?: string };
            setRequisitions((prev) =>
              prev.map((item) =>
                item.id === updated.id || item.ticket_id === updated.ticket_id
                  ? { ...item, ...updated }
                  : item
              )
            );
            setHighlightedTicketId(updated.id || updated.ticket_id || null);
            setTimeout(() => setHighlightedTicketId(null), 4000);
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const inserted = payload.new as PurchaseRequisition & { id?: string; ticket_id?: string };
            setRequisitions((prev) => [inserted, ...prev]);
            setHighlightedTicketId(inserted.id || inserted.ticket_id || null);
            setTimeout(() => setHighlightedTicketId(null), 4000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Quick Requisition Intake Submit (Foreman)
  const handleQuickIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intakeVolume <= 0 || intakeRequested <= 0) return;
    if (intakeIsAnomaly && intakeJustification.trim().length < 10) return;

    const initialStatus: RequisitionStatus =
      intakeTier === 1
        ? 'PENDING_PURCHASING'
        : intakeTier === 2
        ? 'PENDING_TIER2'
        : 'PENDING_TIER3';

    const newReq: PurchaseRequisition = {
      ticket_id: generateQuickTicketId(),
      requisition_number: generateQuickRequisitionNumber(),
      project_id: activeBlock.project_id,
      block_id: activeBlock.block_id,
      item_id: activeMaterial.item_id,
      foreman_id: 'user_foreman_01',
      architectural_volume: intakeVolume,
      predicted_quantity: intakePredicted,
      requested_quantity: intakeRequested,
      variance_percentage: intakeVariance,
      variance_justification: intakeIsAnomaly ? intakeJustification : undefined,
      estimated_total_eur: intakeTotalEur,
      approval_tier: intakeTier,
      status: initialStatus,
      created_at: getFormattedTimeString(),
      updated_at: getFormattedTimeString(),
      material: activeMaterial,
      block: activeBlock,
      foreman: getSeedUser('FOREMAN'),
    };

    handleRequisitionSubmit(newReq);
    setIntakeSuccessMsg(
      lang === 'tr'
        ? `${newReq.requisition_number} nolu talep oluşturuldu ve alt-deftere işlendi.`
        : `Requisition ${newReq.requisition_number} successfully registered into sub-ledger.`
    );
    setIntakeJustification('');
    setTimeout(() => setIntakeSuccessMsg(null), 4000);
  };

  // Requisition Handlers
  const handleRequisitionSubmit = (newReq: PurchaseRequisition) => {
    setRequisitions((prev) => [newReq, ...prev]);
  };

  const handleApprove = (ticketId: string) => {
    const timeStr = getFormattedTimeString();
    setRequisitions((prev) =>
      prev.map((req) =>
        req.ticket_id === ticketId
          ? {
              ...req,
              status: 'APPROVED',
              updated_at: timeStr,
            }
          : req
      )
    );
  };

  const handleReject = (ticketId: string) => {
    const timeStr = getFormattedTimeString();
    setRequisitions((prev) =>
      prev.map((req) =>
        req.ticket_id === ticketId
          ? {
              ...req,
              status: 'REJECTED',
              updated_at: timeStr,
            }
          : req
      )
    );
  };

  // Role Partitioning Telemetry Aggregates
  const triageRoleStatus: RequisitionStatus = currentRole === 'PURCHASING_MGR' ? 'PENDING_PURCHASING' : 'PENDING_TIER2';
  const triageRequisitions = requisitions.filter((r) => r.status === triageRoleStatus);
  const triageTotalEur = triageRequisitions.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);
  const triageAnomalies = triageRequisitions.filter((r) => r.requested_quantity > r.predicted_quantity * 1.05);

  const capexRequisitions = requisitions.filter((r) => r.approval_tier === 3 || r.estimated_total_eur > 15000);
  const capexTotalEur = capexRequisitions.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);
  const totalCommittedEur = requisitions.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);
  const capexBudgetLimit = 250000;
  const budgetBurnPercent = Math.min(100, Number(((totalCommittedEur / capexBudgetLimit) * 100).toFixed(1)));
  const blockedRequisitions = requisitions.filter(
    (r) => r.status === 'PENDING_TIER3' || (r.status.startsWith('PENDING') && r.approval_tier === 3)
  );
  const blockedTotalEur = blockedRequisitions.reduce((acc, curr) => acc + curr.estimated_total_eur, 0);

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 dark:bg-canvas-dark dark:text-slate-100 transition-colors">
      {/* Anchored Header with User Identity Indicator */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
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

        {/* ROLE-TAILORED PRIMARY VIEWPORT PARTITION */}

        {/* 1. FOREMAN VIEWPORT: REQUISITION INTAKE FOCUS CARD & INSTANT BASELINE CALCULATOR */}
        {currentRole === 'FOREMAN' && (
          <section aria-label="Foreman Requisition Intake Focus" className="rounded-2xl border border-amber-500/40 bg-surface-dark/95 p-5 md:p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/40">
                  <Calculator className="h-3.5 w-3.5" />
                  <span>{t.partition.foremanBadge}</span>
                </div>
                <h3 className="mt-1.5 text-lg md:text-xl font-bold uppercase tracking-wider text-white">
                  {t.partition.foremanTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {t.partition.foremanSub}
                </p>
              </div>

              {intakeSuccessMsg && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{intakeSuccessMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleQuickIntakeSubmit} className="mt-5 space-y-4">
              {/* Row 1: Block Selector & Material Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Block Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    {t.form.blockSelect}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {blocks.map((blk) => (
                      <button
                        type="button"
                        key={blk.block_id}
                        onClick={() => setIntakeBlockId(blk.block_id)}
                        className={`rounded-xl p-2.5 text-center text-xs font-bold transition ${
                          intakeBlockId === blk.block_id
                            ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                            : 'bg-elevation-dark border border-slate-700/80 text-slate-300 hover:border-amber-500/50'
                        }`}
                      >
                        <Building className="h-3.5 w-3.5 mx-auto mb-1 opacity-70" />
                        <div>{blk.block_name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Material Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    {t.form.materialSelect}
                  </label>
                  <select
                    value={intakeItemId}
                    onChange={(e) => setIntakeItemId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-elevation-dark p-2.5 text-xs font-semibold text-slate-100 focus:border-amber-500 focus:outline-hidden"
                  >
                    {materials.map((mat) => (
                      <option key={mat.item_id} value={mat.item_id} className="bg-surface-dark text-slate-100">
                        {lang === 'tr' ? mat.item_name_tr : mat.item_name_en} ({formatCurrency(mat.base_cost_eur, lang)} / {mat.unit_of_measure})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    Katsayı / Consumption Factor: <span className="font-bold text-amber-400">{activeMaterial.consumption_rate} {activeMaterial.unit_of_measure}</span> ({activeMaterial.consumption_metric})
                  </div>
                </div>
              </div>

              {/* Row 2: Instant Baseline Calculations & Input Controls */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Volume Input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    {t.form.volumeInput}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={intakeVolume}
                    onChange={(e) => setIntakeVolume(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-elevation-dark px-3 py-2 text-sm font-bold text-slate-100 focus:border-amber-500 focus:outline-hidden tabular-nums"
                  />
                  <div className="mt-1 text-[10px] text-slate-400">
                    Statik mimari metraj birimi (m³)
                  </div>
                </div>

                {/* Algorithmic Baseline Formula Callout */}
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    {t.form.predictedQty}
                  </div>
                  <div className="mt-1 text-lg font-black text-indigo-400 tabular-nums">
                    {formatNumber(intakePredicted, lang)} {activeMaterial.unit_of_measure}
                  </div>
                  <div className="mt-0.5 text-[10px] text-indigo-300/80 font-mono">
                    {intakeVolume} m³ × {activeMaterial.consumption_rate}
                  </div>
                </div>

                {/* Requested Quantity Input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    {t.form.requestedQty}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={intakeRequested}
                    onChange={(e) => setIntakeRequested(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-elevation-dark px-3 py-2 text-sm font-bold text-slate-100 focus:border-amber-500 focus:outline-hidden tabular-nums"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{t.form.varianceBadge}:</span>
                    <span className={`font-black ${intakeIsAnomaly ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {intakeVariance > 0 ? `+${intakeVariance}%` : `${intakeVariance}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* OVERRUN CHECK: > +5% Prominent Warning Indicator */}
              {intakeIsAnomaly ? (
                <div className="rounded-xl border border-rose-500/60 bg-rose-500/10 p-4 text-rose-200 shadow-lg shadow-rose-950/20">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce text-amber-400" />
                    <span>{t.partition.overrunAlertTitle}</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-200/90 leading-relaxed">
                    {t.partition.overrunAlertDesc}
                  </p>
                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-amber-300 uppercase block mb-1">
                      {t.form.justificationPlaceholder.slice(0, 36)}... (Min. 10 Karakter) *
                    </label>
                    <textarea
                      value={intakeJustification}
                      onChange={(e) => setIntakeJustification(e.target.value)}
                      placeholder={t.form.justificationPlaceholder}
                      rows={2}
                      className="w-full rounded-lg border border-rose-500/40 bg-surface-dark p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden"
                    />
                    {intakeJustification.trim().length > 0 && intakeJustification.trim().length < 10 && (
                      <span className="mt-1 text-[10px] text-rose-400 block font-semibold">
                        {t.form.justificationMinNotice} ({intakeJustification.trim().length}/10)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-300 flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{t.form.toleranceOk} ({intakeVariance > 0 ? `+${intakeVariance}%` : `${intakeVariance}%`})</span>
                  </div>
                  <span className="text-[11px] text-emerald-400/80 font-normal">
                    Mühendislik katsayısı limitleri dahilinde
                  </span>
                </div>
              )}

              {/* Action & Cost Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {t.form.estimatedCost}
                    </span>
                    <span className="text-xl font-black text-amber-400 tabular-nums">
                      {formatCurrency(intakeTotalEur, lang)}
                    </span>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {t.form.tierBadge}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Tier {intakeTier} &bull; {intakeTierDescriptor.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(true)}
                    className="rounded-xl border border-slate-700 bg-elevation-dark px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-border-dark cursor-pointer"
                  >
                    {lang === 'tr' ? 'Detaylı Modalı Aç' : 'Open Detailed Form'}
                  </button>
                  <button
                    type="submit"
                    disabled={intakeVolume <= 0 || intakeRequested <= 0 || (intakeIsAnomaly && intakeJustification.trim().length < 10)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-yellow px-5 py-2.5 text-xs md:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 stroke-3" />
                    <span>{t.partition.quickSubmitBtn}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* 2. PURCHASING_MGR & PROJECT_DIRECTOR VIEWPORT: TRIAGE QUEUE FOCUS CARD */}
        {(currentRole === 'PURCHASING_MGR' || currentRole === 'PROJECT_DIRECTOR') && (
          <section aria-label="Triage Queue Focus" className="rounded-2xl border border-amber-500/40 bg-surface-dark/95 p-5 md:p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/40">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t.partition.triageBadge}</span>
                </div>
                <h3 className="mt-1.5 text-lg md:text-xl font-bold uppercase tracking-wider text-white">
                  {currentRole === 'PURCHASING_MGR'
                    ? (lang === 'tr' ? 'Satınalma Müdürü Onay & Triyaj Kuyruğu (Tier 1)' : 'Purchasing Manager Triage Queue (Tier 1)')
                    : (lang === 'tr' ? 'Proje Direktörü Onay & Denetim Kuyruğu (Tier 2)' : 'Project Director Sign-Off Queue (Tier 2)')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t.partition.triageSub}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
                  {triageRequisitions.length} {lang === 'tr' ? 'Talep İncelenmeyi Bekliyor' : 'Tickets Pending Review'}
                </span>
              </div>
            </div>

            {/* 3 Triage Metric Chips */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <span className="text-[10px] font-bold uppercase text-blue-400 block">
                  {lang === 'tr' ? 'Bekleyen Talep Sayısı' : 'Pending Review Count'}
                </span>
                <div className="mt-1 text-2xl font-black text-white tabular-nums">
                  {triageRequisitions.length}
                </div>
                <span className="text-[11px] text-slate-400">
                  {currentRole === 'PURCHASING_MGR' ? 'Tier 1 (< €2.5k)' : 'Tier 2 (€2.5k - €15k)'}
                </span>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <span className="text-[10px] font-bold uppercase text-amber-400 block">
                  {lang === 'tr' ? 'İncelenen Toplam Hacim' : 'Pending Monetary Volume'}
                </span>
                <div className="mt-1 text-2xl font-black text-amber-400 tabular-nums">
                  {formatCurrency(triageTotalEur, lang)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {lang === 'tr' ? 'Yetki limitiniz dahilinde' : 'Within authority envelope'}
                </span>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                <span className="text-[10px] font-bold uppercase text-rose-400 block">
                  {lang === 'tr' ? 'Sapma Gerekçeli Talepler' : 'Overruns With Justification'}
                </span>
                <div className="mt-1 text-2xl font-black text-rose-400 tabular-nums">
                  {triageAnomalies.length}
                </div>
                <span className="text-[11px] text-slate-400">
                  {lang === 'tr' ? 'Teknik inceleme şartı' : 'Mandatory technical audit'}
                </span>
              </div>
            </div>

            {/* Supplier Cost Comparison Banner */}
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-emerald-300 uppercase tracking-wide">
                    {t.partition.supplierIndexTitle}: {t.partition.savingsAdvantage} (-4.0% Piyasa Altı)
                  </span>
                </div>
                <span className="text-emerald-400/90 font-medium">
                  {lang === 'tr' ? 'Caesar çerçeve tedarikçi sözleşmesi aktif • Birim fiyatlar garantilidir' : 'Caesar Master Supplier Agreement active • Contracted rates locked'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 3. EXECUTIVE VIEWPORT: MACRO FINANCIAL TELEMETRY VIEW */}
        {currentRole === 'EXECUTIVE' && (
          <section aria-label="Executive Macro Telemetry Focus" className="rounded-2xl border border-amber-500/40 bg-surface-dark/95 p-5 md:p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/40">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{t.partition.macroBadge}</span>
                </div>
                <h3 className="mt-1.5 text-lg md:text-xl font-bold uppercase tracking-wider text-white">
                  {t.partition.macroTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {t.partition.macroSub}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
                  {t.partition.highCapexTitle}: {capexRequisitions.length} {lang === 'tr' ? 'Büyük Sipariş' : 'Major Orders'}
                </span>
              </div>
            </div>

            {/* 3 High-Impact Macro Financial Telemetry Cards */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: High-ticket CapEx tickets > €15k */}
              <div className="rounded-xl border border-amber-500/30 bg-elevation-dark p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {t.partition.highCapexTitle}
                  </span>
                  <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl md:text-3xl font-black text-white tabular-nums">
                  {formatCurrency(capexTotalEur, lang)}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t.partition.highCapexDesc}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] font-bold text-amber-400 uppercase">
                  {capexRequisitions.length} {lang === 'tr' ? 'adet Tier 3 siparişi' : 'Tier 3 purchase orders'}
                </div>
              </div>

              {/* Card 2: Company-wide committed budget burn */}
              <div className="rounded-xl border border-indigo-500/30 bg-elevation-dark p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {t.partition.budgetBurnTitle}
                  </span>
                  <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-400">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl md:text-3xl font-black text-indigo-300 tabular-nums">
                  {formatCurrency(totalCommittedEur, lang)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>{t.partition.budgetEnvelope}</span>
                  <span className="font-bold text-indigo-400">%{budgetBurnPercent}</span>
                </div>
                {/* Burn Progress Bar */}
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${budgetBurnPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                  {t.partition.budgetRemaining}: <span className="font-bold text-emerald-400">{formatCurrency(capexBudgetLimit - totalCommittedEur, lang)}</span>
                </div>
              </div>

              {/* Card 3: Blocked PO approvals */}
              <div className="rounded-xl border border-rose-500/30 bg-elevation-dark p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    {t.partition.blockedPOsTitle}
                  </span>
                  <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl md:text-3xl font-black text-rose-400 tabular-nums">
                  {formatCurrency(blockedTotalEur, lang)}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t.partition.blockedPOsDesc}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-rose-400 uppercase">
                    {blockedRequisitions.length} {lang === 'tr' ? 'bekletilen sipariş' : 'orders on hold'}
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-rose-400">
                    {lang === 'tr' ? 'PO İmzası Şart' : 'Sign-Off Needed'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3-CARD OVERVIEW TELEMETRY (Requisition Metrics) */}
        <section aria-label="Executive Overview">
          <RequisitionMetrics requisitions={requisitions} lang={lang} />
        </section>

        {/* DUAL VIEW CONTROLLER (Square Matrix vs Full Sub-Ledger & Mobile Cards) */}
        <section aria-label="Requisition Ledger">
          <RequisitionTable
            requisitions={requisitions}
            onSelectRequisition={setSelectedRequisition}
            onSelectTicket={setSelectedRequisition}
            selectedTicketId={selectedRequisition?.ticket_id}
            highlightedTicketId={highlightedTicketId}
            lang={lang}
            blockFilter={blockFilter}
            onBlockFilterChange={(b) => setBlockFilter(b as CaesarBlock | 'all')}
            searchQuery={searchQuery}
            currentRole={currentRole}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
            myRequisitionsOnly={myRequisitionsOnly}
            onMyRequisitionsOnlyChange={setMyRequisitionsOnly}
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
