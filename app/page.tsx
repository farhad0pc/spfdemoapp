'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  InventoryCatalogItem,
  PurchaseRequisition,
  RoleTier,
  PortfolioProject,
  PortfolioBuilding,
} from '@/types/requisition';
import CorporateHeader from '@/components/CorporateHeader';
import DesktopSidebar from '@/components/DesktopSidebar';
import StickyControlsFAB from '@/components/StickyControlsFAB';
import TechnicalIntakeModule from '@/components/TechnicalIntakeModule';
import RequisitionWorkspace from '@/components/RequisitionWorkspace';
import DepoManagementWorkspace from '@/components/DepoManagementWorkspace';
import UserManagementWorkspace from '@/components/UserManagementWorkspace';
import Toast from '@/components/Toast';

export default function PurchasingPortalPage() {
  const [view, setView] = useState<
    'WORKSPACE' | 'TECHNICAL_INTAKE' | 'DEPOT_WORKSPACE' | 'USER_MANAGEMENT'
  >('WORKSPACE');
  const [currentRole, setCurrentRole] = useState<RoleTier>('TECH_OFFICE_USER');
  const [authenticatedRole, setAuthenticatedRole] =
    useState<RoleTier>('TECH_OFFICE_USER');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItem[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<
    PortfolioProject[]
  >([]);
  const [portfolioBuildings, setPortfolioBuildings] = useState<
    PortfolioBuilding[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [toastState, setToastState] = useState<{
    message: string;
    subMessage?: string;
  } | null>(null);

  // Synchronize document DOM language dynamically to prevent CSS uppercase dotted 'İ' in English
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const fetchData = useCallback(async () => {
    const { data: catalog } = await supabase
      .from('inventory_catalog')
      .select('*')
      .order('item_name_tr', { ascending: true });

    const { data: reqs } = await supabase
      .from('purchase_requisitions')
      .select('*, catalog_item:inventory_catalog(*)')
      .order('created_at', { ascending: false });

    const { data: projects } = await supabase
      .from('portfolio_projects')
      .select('*')
      .order('project_id', { ascending: true });

    const { data: buildings } = await supabase
      .from('portfolio_buildings')
      .select('*')
      .order('building_name', { ascending: true });

    if (catalog) setCatalogItems(catalog);
    if (reqs) setRequisitions(reqs as PurchaseRequisition[]);
    if (projects) setPortfolioProjects(projects as PortfolioProject[]);
    if (buildings) setPortfolioBuildings(buildings as PortfolioBuilding[]);
    setLoading(false);
  }, []);

  const checkSession = useCallback(async () => {
    try {
      // 1. Primary server-verified HTTP-only session check
      const res = await fetch('/api/auth/login', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.email) {
          setCurrentUserEmail(data.email);
          setIsLoggedIn(true);
          if (data.role) {
            setCurrentRole(data.role as RoleTier);
            setAuthenticatedRole(data.role as RoleTier);
          }
          return;
        }
      }

      // 2. Fallback client Supabase Auth session check
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
        setIsLoggedIn(true);

        const { data: profile } = await supabase
          .from('corporate_users')
          .select('role')
          .eq('email', session.user.email)
          .maybeSingle();

        if (profile?.role) {
          setCurrentRole(profile.role as RoleTier);
          setAuthenticatedRole(profile.role as RoleTier);
        }
        return;
      }

      // 3. Hard redirect if unauthenticated
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    } catch (err) {
      console.error('Session hydration error:', err);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUserEmail(null);
      setIsLoggedIn(false);
      setCurrentRole('TECH_OFFICE_USER');
      setAuthenticatedRole('TECH_OFFICE_USER');
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      await Promise.all([fetchData(), checkSession()]);
    };
    if (!ignore) {
      void init();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
          setIsLoggedIn(true);
        }
      }
    );

    const channel = supabase
      .channel('public:purchase_requisitions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_requisitions' },
        () => {
          void fetchData();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      authListener?.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [fetchData, checkSession]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'tr' ? 'en' : 'tr'));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleUpcomingClick = (title: string) => {
    setToastState({
      message:
        lang === 'tr'
          ? 'BİLGİ: Modül Geliştirme Aşamasında'
          : 'INFO: Feature Roadmap',
      subMessage: `${title} ${
        lang === 'tr'
          ? 'yakında aktif edilecektir.'
          : 'will be available in the upcoming release.'
      }`,
    });
  };

  const handleShowToast = useCallback((message: string, subMessage?: string) => {
    setToastState({ message, subMessage });
  }, []);

  const handleSubmitTicket = async (newTicket: {
    location_block_id: string;
    catalog_item_id: string;
    target_volume: number;
    calculated_qty: number;
    tech_approved_budget_eur: number;
    custom_technical_specs: Record<string, unknown>;
  }) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const userUuid =
      users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const ticketId = `REQ-${dateStr}-${hex}`;

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert([
        {
          ticket_id: ticketId,
          location_block_id: newTicket.location_block_id,
          requesting_party_uuid: userUuid,
          handover_recipient_role: 'TECH_OFFICE_USER',
          catalog_item_id: newTicket.catalog_item_id,
          custom_technical_specs: newTicket.custom_technical_specs,
          tech_approved_budget_eur: newTicket.tech_approved_budget_eur,
          live_status: 'TECH_REVIEW',
        },
      ])
      .select();

    if (error) {
      alert('Error creating ticket: ' + error.message);
      return;
    }

    if (data && data[0]) {
      await supabase.from('requisition_approvals').insert([
        {
          requisition_id: data[0].id,
          actor_uuid: userUuid,
          action: 'TICKET_CREATED_TECH_OFFICE',
          new_payload: {
            status: 'TECH_REVIEW',
            budget: newTicket.tech_approved_budget_eur,
          },
        },
      ]);
    }

    await fetchData();
    setView('WORKSPACE');
  };

  const handleApproveByTechManager = async (id: string) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const mgrUuid =
      users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

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
        actor_uuid: mgrUuid,
        action: 'TECH_OFFICE_MANAGER_APPROVED',
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
    escalateToExec?: boolean
  ) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const agentUuid =
      users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const currentReq = requisitions.find((r) => r.id === id);
    const existingSpecs = currentReq?.custom_technical_specs || {};
    const nextStatus =
      escalateToExec || quotaEur > 15000
        ? 'EXECUTIVE_RATIFICATION'
        : 'APPROVED';

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        purchasing_actual_quota_eur: quotaEur,
        live_status: nextStatus,
        custom_technical_specs: {
          ...existingSpecs,
          supplier_name: supplierName,
          purchasing_notes: purchasingNotes,
          quota_overrun:
            quotaEur > (currentReq?.tech_approved_budget_eur || 0),
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
        action: escalateToExec
          ? 'ESCALATED_TO_EXECUTIVE'
          : 'SUPPLIER_QUOTA_FINALIZED',
        new_payload: {
          quota_eur: quotaEur,
          supplier: supplierName,
          status: nextStatus,
        },
      },
    ]);

    await fetchData();
  };

  const handleExecutiveAction = async (
    id: string,
    action: 'APPROVED' | 'REJECTED'
  ) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const execUuid =
      users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

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

  const handleBatchAction = async (
    ids: string[],
    action: 'APPROVED' | 'REJECTED'
  ) => {
    const { data: users } = await supabase
      .from('corporate_users')
      .select('id')
      .eq('role', currentRole)
      .limit(1);

    const actorUuid =
      users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

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
        {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex transition-colors font-sans">
      {/* Desktop Left Sidebar Rail */}
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentView={view}
        onSelectView={setView}
        onUpcomingClick={handleUpcomingClick}
        lang={lang}
        userRole={currentRole}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <CorporateHeader
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          lang={lang}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUserEmail={currentUserEmail}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {view === 'TECHNICAL_INTAKE' ? (
            <TechnicalIntakeModule
              onBack={() => setView('WORKSPACE')}
              onSubmitTicket={handleSubmitTicket}
              catalogItems={catalogItems}
              portfolioProjects={portfolioProjects}
              portfolioBuildings={portfolioBuildings}
              userRole={currentRole}
              lang={lang}
            />
          ) : view === 'DEPOT_WORKSPACE' ? (
            <DepoManagementWorkspace
              catalogItems={catalogItems}
              portfolioProjects={portfolioProjects}
              portfolioBuildings={portfolioBuildings}
              currentRole={currentRole}
              lang={lang}
              onBackToRequisitions={() => setView('WORKSPACE')}
              onItemRegistered={(newItem) =>
                setCatalogItems((prev) => [newItem, ...prev])
              }
              onCatalogUpdated={fetchData}
              onShowToast={handleShowToast}
            />
          ) : view === 'USER_MANAGEMENT' ? (
            <UserManagementWorkspace
              currentRole={currentRole}
              authenticatedRole={authenticatedRole}
              onRolePreviewChange={setCurrentRole}
              currentUserEmail={currentUserEmail || undefined}
              lang={lang}
              portfolioProjects={portfolioProjects}
            />
          ) : (
            <RequisitionWorkspace
              requisitions={requisitions}
              portfolioProjects={portfolioProjects}
              portfolioBuildings={portfolioBuildings}
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

      {/* Toast Notification */}
      {toastState && (
        <Toast
          message={toastState.message}
          subMessage={toastState.subMessage}
          onClose={() => setToastState(null)}
        />
      )}

      {/* Fixed Language & Theme Switcher Controls (Bottom-Left) */}
      <StickyControlsFAB
        lang={lang}
        onToggleLang={toggleLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
