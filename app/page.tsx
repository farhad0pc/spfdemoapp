"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { RequisitionMetrics } from '@/components/dashboard/RequisitionMetrics';
import { RequisitionForm } from '@/components/dashboard/RequisitionForm';
import { RequisitionTable } from '@/components/dashboard/RequisitionTable';
import { RequisitionApprovalDrawer } from '@/components/dashboard/RequisitionApprovalDrawer';
import {
  MaterialItem,
  ConstructionBlock,
  PurchaseRequisition,
  CorporateRole
} from '@/types/requisition';
import { supabase } from '@/lib/supabaseClient';

// Seed Initial Caesar Blocks
const SEED_BLOCKS: ConstructionBlock[] = [
  { block_id: 'b_zeno', project_id: 'proj_caesar', block_name: 'ZENO', active_phase: 'Kaba Yapı / Frame' },
  { block_id: 'b_phuket', project_id: 'proj_caesar', block_name: 'PHUKET', active_phase: 'Temel & Bodrum' },
  { block_id: 'b_pattaya', project_id: 'proj_caesar', block_name: 'PATTAYA', active_phase: 'Duvar & İnce İşler' },
  { block_id: 'b_samui', project_id: 'proj_caesar', block_name: 'KOH SAMUI', active_phase: 'Tesisat & Altyapı' },
];

// Seed Initial Material Catalog Items
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
    item_name_tr: "25'lik Bims Blok Duvar Elemanı",
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
      department: 'Caesar İnşaat',
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
      department: 'Caesar İnşaat',
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
      department: 'Caesar İnşaat',
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
      department: 'Caesar İnşaat',
    },
  },
];

export default function Home() {
  const [currentRole, setCurrentRole] = useState<CorporateRole>('PURCHASING_MGR');
  const [blocks, setBlocks] = useState<ConstructionBlock[]>(SEED_BLOCKS);
  const [materials, setMaterials] = useState<MaterialItem[]>(SEED_MATERIALS);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(INITIAL_REQUISITIONS);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(true);

  const fetchSupabaseData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data: matData, error: matErr } = await supabase
        .from('material_catalog')
        .select('*');

      if (!matErr && matData && matData.length > 0) {
        setMaterials(matData as MaterialItem[]);
        setSupabaseConnected(true);
      }

      const { data: blockData, error: blockErr } = await supabase
        .from('construction_blocks')
        .select('*');

      if (!blockErr && blockData && blockData.length > 0) {
        setBlocks(blockData as ConstructionBlock[]);
        setSupabaseConnected(true);
      }
    } catch {
      setSupabaseConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initData = async () => {
      try {
        const { data: matData, error: matErr } = await supabase
          .from('material_catalog')
          .select('*');

        if (active && !matErr && matData && matData.length > 0) {
          setMaterials(matData as MaterialItem[]);
          setSupabaseConnected(true);
        }

        const { data: blockData, error: blockErr } = await supabase
          .from('construction_blocks')
          .select('*');

        if (active && !blockErr && blockData && blockData.length > 0) {
          setBlocks(blockData as ConstructionBlock[]);
          setSupabaseConnected(true);
        }
      } catch {
        if (active) setSupabaseConnected(false);
      }
    };
    initData();
    return () => {
      active = false;
    };
  }, []);

  // Handle New Requisition Creation
  const handleRequisitionSubmit = (newReq: PurchaseRequisition) => {
    setRequisitions((prev) => [newReq, ...prev]);
  };

  // Handle Approval Action
  const handleApprove = (ticketId: string) => {
    setRequisitions((prev) =>
      prev.map((req) => {
        if (req.ticket_id === ticketId) {
          // If approved by required tier or higher
          return {
            ...req,
            status: 'APPROVED',
            updated_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return req;
      })
    );
  };

  // Handle Reject Action
  const handleReject = (ticketId: string) => {
    setRequisitions((prev) =>
      prev.map((req) => {
        if (req.ticket_id === ticketId) {
          return {
            ...req,
            status: 'REJECTED',
            updated_at: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return req;
      })
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 font-sans text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      {/* Header with Active Corporate Role Simulator */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onRefresh={fetchSupabaseData}
        isRefreshing={isRefreshing}
        supabaseConnected={supabaseConnected}
      />

      {/* Main Workspace Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* KPI Requisition Sub-Ledger Metrics */}
        <section aria-label="Alt-Defter Metrikleri">
          <RequisitionMetrics requisitions={requisitions} />
        </section>

        {/* Smart Material Requisition Intake Form */}
        <section aria-label="Akıllı Talep Formu">
          <RequisitionForm
            materials={materials}
            blocks={blocks}
            currentRole={currentRole}
            onSubmit={handleRequisitionSubmit}
          />
        </section>

        {/* Live Requisition Sub-Ledger Repository Table */}
        <section aria-label="Malzeme Alt-Defteri">
          <RequisitionTable
            requisitions={requisitions}
            onSelectRequisition={setSelectedRequisition}
            selectedTicketId={selectedRequisition?.ticket_id}
          />
        </section>
      </main>

      {/* 3-Tier Multi-Role Approval Drawer */}
      <RequisitionApprovalDrawer
        requisition={selectedRequisition}
        currentRole={currentRole}
        onClose={() => setSelectedRequisition(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
