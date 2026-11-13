'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { InventoryCatalogItem, PurchaseRequisition, RoleTier } from '@/types/requisition';
import CorporateHeader from '@/components/CorporateHeader';
import DesktopSidebar from '@/components/DesktopSidebar';
import StickyControlsFAB from '@/components/StickyControlsFAB';
import TechnicalIntakeModule from '@/components/TechnicalIntakeModule';
import RequisitionWorkspace from '@/components/RequisitionWorkspace';
import Toast from '@/components/Toast';

export default function PurchasingPortalPage() {
  const [view, setView] = useState<'WORKSPACE' | 'TECHNICAL_INTAKE'>('WORKSPACE');
  const [currentRole, setCurrentRole] = useState<RoleTier>('TECH_OFFICE_USER');
  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItem[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: catalog } = await supabase
      .from('inventory_catalog')
      .select('*')
      .order('item_name_tr', { ascending: true });

    const { data: reqs } = await supabase
      .from('purchase_requisitions')
      .select('*, catalog_item:inventory_catalog(*)')
      .order('created_at', { ascending: false });

    if (catalog) setCatalogItems(catalog);
    if (reqs) setRequisitions(reqs as PurchaseRequisition[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_requisitions',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'tr' ? 'en' : 'tr'));
  };

  const handleUpcomingClick = (title: string) => {
    setToastMessage(title);
  };

  const handleSubmitTicket = async (payload: {
    location_block_id: string;
    catalog_item_id: string;
    target_volume: number;
    calculated_qty: number;
    tech_approved_budget_eur: number;
    custom_technical_specs: Record<string, unknown>;
  }) => {
    const ticketId = `REQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;

    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const requestingPartyUuid = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const initialStatus = currentRole === 'TECH_OFFICE_USER' ? 'DRAFTING' : 'PURCHASING_SOURCING';

    const { error } = await supabase.from('purchase_requisitions').insert([
      {
        ticket_id: ticketId,
        location_block_id: payload.location_block_id,
        requesting_party_uuid: requestingPartyUuid,
        handover_recipient_role: 'PURCHASING_AGENT',
        catalog_item_id: payload.catalog_item_id,
        custom_technical_specs: payload.custom_technical_specs,
        tech_approved_budget_eur: payload.tech_approved_budget_eur,
        live_status: initialStatus,
      },
    ]);

    if (error) throw error;
    await fetchData();
  };

  const handleApproveByTechManager = async (id: string) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const managerUuid = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        live_status: 'PURCHASING_SOURCING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await supabase.from('requisition_approvals').insert([
      {
        requisition_id: id,
        actor_uuid: managerUuid,
        action: 'BUDGET_LOCKED_HANDOVER_TO_PURCHASING',
        new_payload: { status: 'PURCHASING_SOURCING' },
      },
    ]);

    await fetchData();
  };

  const handleUpdateQuota = async (
    id: string, 
    quotaEur: number, 
    supplierName: string, 
    purchasingNotes: string,
    escalateToExec: boolean = false
  ) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const agentUuid = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const currentReq = requisitions.find((r) => r.id === id);
    const existingSpecs = currentReq?.custom_technical_specs || {};
    const nextStatus = escalateToExec || quotaEur > 15000 ? 'EXECUTIVE_RATIFICATION' : 'APPROVED';

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        purchasing_actual_quota_eur: quotaEur,
        live_status: nextStatus,
        custom_technical_specs: {
          ...existingSpecs,
          supplier_name: supplierName,
          purchasing_notes: purchasingNotes,
          quota_overrun: quotaEur > (currentReq?.tech_approved_budget_eur || 0),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await supabase.from('requisition_approvals').insert([
      {
        requisition_id: id,
        actor_uuid: agentUuid,
        action: escalateToExec ? 'ESCALATED_TO_EXECUTIVE' : 'SUPPLIER_QUOTA_FINALIZED',
        new_payload: { 
          quota_eur: quotaEur, 
          supplier: supplierName,
          status: nextStatus 
        },
      },
    ]);

    await fetchData();
  };

  const handleExecutiveAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const execUuid = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        live_status: action,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await supabase.from('requisition_approvals').insert([
      {
        requisition_id: id,
        actor_uuid: execUuid,
        action: `EXECUTIVE_${action}`,
        new_payload: { status: action },
      },
    ]);

    await fetchData();
  };

  const handleBatchAction = async (ids: string[], action: 'APPROVED' | 'REJECTED') => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const actorUuid = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        live_status: action,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    const auditInserts = ids.map((reqId) => ({
      requisition_id: reqId,
      actor_uuid: actorUuid,
      action: `BATCH_${action}`,
      new_payload: { status: action, batch: true },
    }));

    await supabase.from('requisition_approvals').insert(auditInserts);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center font-sans text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex transition-colors">
      {/* Desktop Left Sidebar Rail */}
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentView={view}
        onSelectView={setView}
        onUpcomingClick={handleUpcomingClick}
        lang={lang}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <CorporateHeader
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          lang={lang}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {view === 'TECHNICAL_INTAKE' ? (
            <TechnicalIntakeModule
              onBack={() => setView('WORKSPACE')}
              onSubmitTicket={handleSubmitTicket}
              catalogItems={catalogItems}
              userRole={currentRole}
              lang={lang}
            />
          ) : (
            <RequisitionWorkspace
              requisitions={requisitions}
              currentRole={currentRole}
              lang={lang}
              onOpenIntakeEngine={() => setView('TECHNICAL_INTAKE')}
              onUpdateQuota={handleUpdateQuota}
              onApproveByTechManager={handleApproveByTechManager}
              onExecutiveAction={handleExecutiveAction}
              onBatchAction={handleBatchAction}
            />
          )}
        </main>
      </div>

      {/* Teaser Toast Notification */}
      {toastMessage && (
        <Toast
          message={lang === 'tr' ? 'BİLGİ: Modül Geliştirme Aşamasında' : 'INFO: Feature Roadmap'}
          subMessage={`${toastMessage} ${lang === 'tr' ? 'yakında aktif edilecektir.' : 'will be available in the upcoming release.'}`}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Fixed Language & Theme Switcher Controls */}
      <StickyControlsFAB
        lang={lang}
        onToggleLang={toggleLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
