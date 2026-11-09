"use client";
import SplashAnimation from "@/components/dashboard/SplashAnimation";
/* eslint-disable @typescript-eslint/no-unused-vars */
import Footer from "@/components/dashboard/Footer";
import RequisitionTable from "@/components/dashboard/RequisitionTable";
import { IntakeCalculatorModal } from "@/components/dashboard/IntakeCalculatorModal";
import { MaterialCatalogModal } from "@/components/dashboard/MaterialCatalogModal";

import React, { useState, useEffect } from 'react';

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


const blockNameMap: Record<string, string> = {
  "66666666-6666-6666-6666-666666666660": "b_zeno",
  "66666666-6666-6666-6666-666666666661": "b_phuket",
  "66666666-6666-6666-6666-666666666662": "b_pattaya",
  "66666666-6666-6666-6666-666666666663": "b_samui"
};

const materialNameMap: Record<string, string> = {
  "MAT-001": "mat_concrete_c30",
  "MAT-002": "mat_steel_b500c",
  "MAT-003": "mat_bims_25",
  "MAT-004": "mat_ceramic_60120",
  "MAT-005": "mat_pprc_pipe_32"
};

function mapDbRowToRequisition(raw: Record<string, unknown>): PurchaseRequisition {
  const rawBlockId = String(raw.block_id || "");
  const rawMaterialId = String(raw.material_id || "");
  const blockKey = blockNameMap[rawBlockId] || rawBlockId || "b_zeno";
  const friendlyMatMap: Record<string, string> = {
    "MAT-001": "C30/37 Yapısal Beton",
    "MAT-002": "B500C Donatı Çeliği",
    "MAT-003": "Bims Blok Duvar (25cm)",
    "MAT-004": "Porselen Seramik (60x120)",
    "MAT-005": "PPRC Sıhhi Tesisat Borusu",
    "mat_concrete_c30": "C30/37 Yapısal Beton",
    "mat_steel_b500c": "B500C Donatı Çeliği",
    "mat_bims_25": "Bims Blok Duvar (25cm)",
    "mat_ceramic_60120": "Porselen Seramik (60x120)",
    "mat_pprc_pipe_32": "PPRC Sıhhi Tesisat Borusu"
  };
  const matKey = friendlyMatMap[rawMaterialId] || materialNameMap[rawMaterialId] || rawMaterialId || "C30/37 Yapısal Beton";
  const reqQty = Number(raw.requested_quantity || 0);
  const predQty = Number(raw.predicted_quantity || reqQty || 1);
  const overrun = predQty > 0 ? Number((((reqQty - predQty) / predQty) * 100).toFixed(1)) : 0;

  return {
    id: String(raw.id || raw.ticket_id || Date.now()),
    ticket_id: String(raw.ticket_id || `req_${Date.now()}`),
    requisition_number: String(raw.requisition_number || ("REQ-202610-" + String(raw.ticket_id || Date.now()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase())),
    block_name: blockKey,
    block_id: rawBlockId || blockKey,
    item_name: matKey,
    material_id: rawMaterialId || matKey,
    requested_qty: reqQty,
    requested_quantity: reqQty,
    predicted_quantity: predQty,
    architectural_volume: Number(raw.architectural_volume || 0),
    unit: "units",
    total_estimated_eur: Number(raw.estimated_total_eur || 0),
    estimated_total_eur: Number(raw.estimated_total_eur || 0),
    overrun_percentage: overrun,
    approval_tier: [1, 2, 3].includes(Number(raw.approval_tier)) ? (Number(raw.approval_tier) as 1 | 2 | 3) : 1,
    status: (typeof raw.status === "string" ? raw.status : "PENDING_TIER2") as PurchaseRequisition["status"],
    justification: raw.variance_justification ? String(raw.variance_justification) : "",
    variance_justification: raw.variance_justification ? String(raw.variance_justification) : "",
    created_at: String(raw.created_at || new Date().toISOString())
  };
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
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState<boolean>(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
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
    const roleKey = String(newRole).toUpperCase();

    if (roleKey === "FOREMAN" || roleKey === "SITE_FOREMAN") {
      setStatusFilter("all");
      setTierFilter("all");
      setMyRequisitionsOnly(true);
    } else if (roleKey === "PURCHASING_MGR" || roleKey === "PROCUREMENT_OFFICER") {
      setStatusFilter("PENDING_PURCHASING");
      setTierFilter("all");
      setMyRequisitionsOnly(false);
    } else if (roleKey === "PROJECT_DIRECTOR" || roleKey === "DIRECTOR") {
      setStatusFilter("PENDING_TIER2");
      setTierFilter("all");
      setMyRequisitionsOnly(false);
    } else if (roleKey === "EXECUTIVE" || roleKey === "EXECUTIVE_BOARD") {
      setStatusFilter("all");
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

        const { data: reqData, error: reqErr } = await supabase
          .from('purchase_requisitions')
          .select('*')
          .order('created_at', { ascending: false });
        if (active && !reqErr && reqData && reqData.length > 0) {
          const hydrated = (reqData as Record<string, unknown>[]).map(mapDbRowToRequisition);
          // Database is authoritative; preserve any un-persisted mock fixtures without duplicating
          setRequisitions((prev) => {
            const dbIds = new Set(hydrated.map((h) => h.ticket_id));
            const distinctPrev = prev.filter((p) => !dbIds.has(p.ticket_id) && !p.ticket_id.includes("-"));
            return [...hydrated, ...distinctPrev];
          });
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
            const mapped = mapDbRowToRequisition(payload.new as Record<string, unknown>);
            setRequisitions((prev) => {
              const targetKey = mapped.ticket_id;
              const exists = prev.some((r) => r.ticket_id === targetKey || r.id === targetKey);
              if (exists) {
                return prev.map((r) => (r.ticket_id === targetKey || r.id === targetKey ? { ...r, ...mapped } : r));
              }
              return [mapped, ...prev];
            });
            setHighlightedTicketId(mapped.ticket_id);
            setTimeout(() => setHighlightedTicketId(null), 4000);
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const mapped = mapDbRowToRequisition(payload.new as Record<string, unknown>);
            setRequisitions((prev) => {
              // Deduplicate: match exact ticket_id OR match pending optimistic ticket by block, qty & total
              const existsExact = prev.some((r) => r.ticket_id === mapped.ticket_id || r.id === mapped.ticket_id);
              if (existsExact) {
                return prev.map((r) => (r.ticket_id === mapped.ticket_id || r.id === mapped.ticket_id) ? { ...r, ...mapped } : r);
              }
              const filtered = prev.filter((r) => {
                const isOptimisticDuplicate =
                  (r.block_id === mapped.block_id || r.block_name === mapped.block_name) &&
                  Number(r.requested_quantity || r.requested_qty) === Number(mapped.requested_quantity) &&
                  Math.abs(Number(r.estimated_total_eur || r.total_estimated_eur) - Number(mapped.estimated_total_eur)) < 0.01;
                return !isOptimisticDuplicate;
              });
              return [mapped, ...filtered];
            });
            setHighlightedTicketId(mapped.ticket_id);
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
      ticket_id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : generateQuickTicketId(),
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
  const handleRequisitionSubmit = async (newReq: PurchaseRequisition) => {
    // Rely exclusively on Supabase Realtime CDC to prevent phantom duplicates

    // 2. Persist to PostgreSQL via Supabase
    try {
      const slugToMaterialCodeMap: Record<string, string> = {
        "mat_concrete_c30": "MAT-001",
        "mat_steel_b500c": "MAT-002",
        "mat_bims_25": "MAT-003",
        "mat_ceramic_60120": "MAT-004",
        "mat_pprc_pipe_32": "MAT-005"
      };

      const slugToUuidMap: Record<string, string> = {
        "b_zeno": "66666666-6666-6666-6666-666666666660",
        "b_phuket": "66666666-6666-6666-6666-666666666661",
        "b_pattaya": "66666666-6666-6666-6666-666666666662",
        "b_samui": "66666666-6666-6666-6666-666666666663"
      };

      const blockKey = newReq.block_id || "b_zeno";
      const resolvedBlockId = slugToUuidMap[blockKey] || blockKey;
      const rawMat = String(newReq.item_id || newReq.material_id || "MAT-001");
      const resolvedMaterialId = slugToMaterialCodeMap[rawMat] || (rawMat.startsWith("MAT-") ? rawMat : "MAT-001");

      // Guard against numeric overflow (Postgres NUMERIC precision limits)
      const clampNumeric = (num: number, max = 9999999.99) => Math.min(Math.max(Number(num) || 0, 0), max);

      const clientGeneratedId = newReq.ticket_id;
      const response = await fetch("/api/requisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: newReq.ticket_id,
          block_id: resolvedBlockId,
          material_id: resolvedMaterialId,
          material_name: newReq.material ? (lang === "tr" ? newReq.material.item_name_tr : newReq.material.item_name_en) : (typeof activeMaterial !== "undefined" && activeMaterial ? (lang === "tr" ? activeMaterial.item_name_tr : activeMaterial.item_name_en) : "C30/37 Yapısal Hazır Beton"),
          architectural_volume: clampNumeric(newReq.architectural_volume || 0),
          predicted_quantity: clampNumeric(newReq.predicted_quantity || 0),
          requested_quantity: clampNumeric(newReq.requested_quantity || 0),
          estimated_total_eur: clampNumeric(newReq.estimated_total_eur || 0),
          approval_tier: Number(newReq.approval_tier || 1),
          status: newReq.status,
          variance_justification: newReq.variance_justification || newReq.justification || null,
          variance_pct: Number(newReq.variance_percentage ?? newReq.variance_pct ?? 0)
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.data && resJson.data.ticket_id && resJson.data.ticket_id !== clientGeneratedId) {
          // Reconcile optimistic ID with database authoritative UUID
          setRequisitions((prev) => prev.map((r) => r.ticket_id === clientGeneratedId ? { ...r, ticket_id: resJson.data.ticket_id, id: resJson.data.ticket_id } : r));
        }
      } else {
        const resJson = await response.json();
        console.error("[API Requisition Insert Error]:", resJson.error);
      }
    } catch (err) {
      console.error("[Supabase Network Exception]:", err);
    }
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

  // Executive Direct Administration Handlers
  const handleExecutiveDelete = (ticketId: string) => {
    if (currentRole !== "EXECUTIVE") return;
    setRequisitions((prev) => prev.filter((r) => r.ticket_id !== ticketId));
    if (selectedRequisition?.ticket_id === ticketId) {
      setSelectedRequisition(null);
    }
  };

  const handleExecutiveEdit = (
    ticketId: string,
    updatedData: { requested_quantity?: number; block_name?: string; justification?: string }
  ) => {
    if (currentRole !== "EXECUTIVE") return;
    const timeStr = getFormattedTimeString();
    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.ticket_id !== ticketId) return r;
        const newQty = updatedData.requested_quantity !== undefined ? updatedData.requested_quantity : r.requested_quantity;
        const rawUnitPrice = r.unit_price_eur || (r.estimated_total_eur && r.requested_quantity ? Number(r.estimated_total_eur) / Number(r.requested_quantity) : 0);
        const unitPrice = Number(rawUnitPrice) || 0;
        const newTotalEur = Math.round(Number(newQty) * unitPrice);
        return {
          ...r,
          requested_quantity: newQty,
          block_name: updatedData.block_name || r.block_name,
          block_id: updatedData.block_name || r.block_id,
          justification: updatedData.justification !== undefined ? updatedData.justification : r.justification,
          estimated_total_eur: newTotalEur,
          total_estimated_eur: newTotalEur,
          updated_at: timeStr,
        };
      })
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
    <div className="min-h-screen bg-slate-100 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 transition-colors">
      {/* 0. Full-Screen Root Splash Animation */}
      {showSplash && <SplashAnimation lang={lang} onComplete={() => setShowSplash(false)} />}
      {/* Anchored Header with User Identity Indicator */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        lang={lang}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6 pb-14 sm:pb-16">
      
      {/* 1. HERO FILTER & CENTRAL COMMAND BANNER */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 sm:p-6 transition-colors">
        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Project Scope Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
            <span>✨</span>
            <span>{lang === "tr" ? "CAESAR RESORT & SPA — ETAP 7 & 8" : "CAESAR RESORT & SPA — PHASES 7 & 8"}</span>
          </div>

          {/* Subtitle Stack */}
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900 dark:text-amber-400">
              {lang === "tr" ? "CAESAR SATINALMA VE HAKEDİŞ DEFTERİ" : "CAESAR PURCHASING LEDGER"}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-subtext-dark mt-1">
              {lang === "tr" ? "Statik Metraj ve Gerçek Zamanlı Alt-Defter Kontrol Merkezi" : "Predictive Material Intake & Realtime Sub-Ledger Command"}
            </p>
          </div>

          {/* Primary CTA (Centered, 20% larger with visual dominance) */}
          <div className="pt-2">
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black px-8 py-3.5 text-base sm:text-lg uppercase tracking-wider shadow-xl shadow-amber-500/30 transition-all cursor-pointer"
            >
              <span className="text-xl leading-none">+</span>
              <span>{lang === "tr" ? "YENİ TALEP OLUŞTUR" : "NEW REQUISITION"}</span>
            </button>
          </div>

          {/* Secondary Action Row: Intake Calculator & Material Catalog */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            {/* Intake Calculator (Cyan Glass Aesthetic) */}
            <button
              type="button"
              onClick={() => setIsIntakeModalOpen(true)}
              className="w-64 py-3.5 px-6 inline-flex items-center justify-center gap-3 rounded-xl border border-cyan-600 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-900 dark:text-cyan-300 font-bold text-sm uppercase tracking-wider transition-all cursor-pointer"
            >
              <span className="text-lg leading-none">📐</span>
              <span>{lang === "tr" ? "Metraj & Katsayı Hesaplayıcı" : "Intake Calculator"}</span>
            </button>

            {/* Material Catalog (Emerald Glass Aesthetic) */}
            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="w-64 py-3.5 px-6 inline-flex items-center justify-center gap-3 rounded-xl border border-emerald-600 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 font-bold text-sm uppercase tracking-wider transition-all cursor-pointer"
            >
              <span className="text-lg leading-none">📦</span>
              <span>{lang === "tr" ? "Malzeme Kataloğu" : "Material Catalog"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. OVERVIEW TELEMETRY GRID (Immediately follows Hero) */}
      {/* 3-CARD OVERVIEW TELEMETRY (Requisition Metrics) */}
        <section aria-label="Executive Overview">
          <RequisitionMetrics requisitions={requisitions} lang={lang} currentRole={currentRole} />
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
            onExecutiveDelete={handleExecutiveDelete}
            onExecutiveEdit={handleExecutiveEdit}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
            myRequisitionsOnly={myRequisitionsOnly}
            onMyRequisitionsOnlyChange={setMyRequisitionsOnly}
          />
        </section>
      
      {/* Secondary Action Modals */}
      <IntakeCalculatorModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        blocks={blocks}
        materials={materials}
        intakeBlockId={intakeBlockId}
        setIntakeBlockId={setIntakeBlockId}
        intakeItemId={intakeItemId}
        setIntakeItemId={setIntakeItemId}
        intakeVolume={intakeVolume}
        setIntakeVolume={setIntakeVolume}
        intakeRequested={intakeRequested}
        setIntakeRequested={setIntakeRequested}
        intakeJustification={intakeJustification}
        setIntakeJustification={setIntakeJustification}
        intakePredicted={intakePredicted}
        intakeVariance={intakeVariance}
        intakeIsAnomaly={intakeIsAnomaly}
        intakeTier={intakeTier}
        intakeTotalEur={intakeTotalEur}
        onSubmit={() => {
          handleQuickIntakeSubmit({ preventDefault: () => {} } as React.FormEvent);
          setIsIntakeModalOpen(false);
        }}
        lang={lang}
      />

      <MaterialCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        materials={materials}
        lang={lang}
      />
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

      <Footer lang={lang} />

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
