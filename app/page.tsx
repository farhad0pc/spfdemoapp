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
import {
  ROLE_METADATA,
  getAuthorizedActiveModules,
  getDefaultViewForModule,
  hasModuleAccess,
  hasViewAccess,
} from '@/lib/rbac';
import {
  ActiveModuleKey,
  MODULE_REGISTRY,
  ModuleId,
  PortalView,
  formatTierRangeLabel,
  getAllowedTiersForView,
  getModuleById,
  isActiveModuleKey,
} from '@/lib/moduleRegistry';
import { DICTIONARY, useCaesarLanguage } from '@/lib/i18n';
import { renderLauncherModuleIcon } from '@/components/ModuleLauncher';
import CorporateHeader from '@/components/CorporateHeader';
import DesktopSidebar from '@/components/DesktopSidebar';
import TechnicalIntakeModule from '@/components/TechnicalIntakeModule';
import RequisitionWorkspace from '@/components/RequisitionWorkspace';
import DepoManagementWorkspace from '@/components/DepoManagementWorkspace';
import UserManagementWorkspace from '@/components/UserManagementWorkspace';
import UserProfileModal from '@/components/UserProfileModal';
import DevVaultModal from '@/components/DevVaultModal';
import Toast from '@/components/Toast';

export default function PurchasingPortalPage() {
  const [lang] = useCaesarLanguage();
  const [view, setView] = useState<PortalView>('WORKSPACE');
  const [accessDeniedTarget, setAccessDeniedTarget] = useState<{
    moduleKey: ModuleId;
    requiredTierLabel: string;
  } | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleTier>('TECH_OFFICE_USER');
  const [authenticatedRole, setAuthenticatedRole] =
    useState<RoleTier>('TECH_OFFICE_USER');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<
    string | null
  >(null);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isDevVaultModalOpen, setIsDevVaultModalOpen] =
    useState<boolean>(false);
  const [isDevVaultElevated, setIsDevVaultElevated] = useState<boolean>(false);
  const [toastState, setToastState] = useState<{
    message: string;
    subMessage?: string;
  } | null>(null);

  const applyRequestedModuleRouting = useCallback((resolvedRole: RoleTier) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedMod = params.get('module');

    if (!isActiveModuleKey(requestedMod)) {
      setAccessDeniedTarget(null);
      if (!hasViewAccess(resolvedRole, 'WORKSPACE')) {
        setView('TECHNICAL_INTAKE');
      }
      return;
    }

    const defaultView = getDefaultViewForModule(resolvedRole, requestedMod);
    if (defaultView && hasModuleAccess(resolvedRole, requestedMod)) {
      setAccessDeniedTarget(null);
      setView(defaultView);
    } else {
      // Strictly NO silent auto-redirect: surface explicit Access Denied screen
      const modDef = getModuleById(requestedMod);
      setAccessDeniedTarget({
        moduleKey: requestedMod,
        requiredTierLabel: formatTierRangeLabel(
          modDef?.allowedTiers || [0, 1, 2]
        ),
      });
    }
  }, []);

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
          setCurrentUserAvatarUrl(data.avatar_url || null);
          setIsLoggedIn(true);
          const resolvedRole =
            (data.role as RoleTier | undefined) || 'TECH_OFFICE_USER';
          setCurrentRole(resolvedRole);
          setAuthenticatedRole(resolvedRole);
          applyRequestedModuleRouting(resolvedRole);

          if (resolvedRole === 'SYSTEM_ADMIN') {
            try {
              const vaultRes = await fetch('/api/auth/dev-verify', {
                method: 'GET',
              });
              if (vaultRes.ok) {
                const vaultData = await vaultRes.json();
                setIsDevVaultElevated(Boolean(vaultData.elevated));
              }
            } catch {
              // Ignore vault status check
            }
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
          .select('role, avatar_url')
          .eq('email', session.user.email)
          .maybeSingle();

        const resolvedRole =
          (profile?.role as RoleTier | undefined) || 'TECH_OFFICE_USER';
        setCurrentUserAvatarUrl(
          (profile as { avatar_url?: string | null } | null)?.avatar_url || null
        );
        setCurrentRole(resolvedRole);
        setAuthenticatedRole(resolvedRole);
        applyRequestedModuleRouting(resolvedRole);
        return;
      }

      // 3. Hard redirect if unauthenticated
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    } catch (err) {
      console.error('Session hydration error:', err);
    }
  }, [applyRequestedModuleRouting]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUserEmail(null);
      setCurrentUserAvatarUrl(null);
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

  const handleSelectSidebarView = (nextView: PortalView) => {
    if (!hasViewAccess(currentRole, nextView)) {
      const mappedMod: ModuleId =
        nextView === 'USER_MANAGEMENT'
          ? 'users'
          : nextView === 'DEV_TOOLS'
          ? 'devtools'
          : nextView === 'DEPOT_WORKSPACE'
          ? 'depot'
          : 'purchasing';
      setAccessDeniedTarget({
        moduleKey: mappedMod,
        requiredTierLabel: formatTierRangeLabel(
          getAllowedTiersForView(nextView)
        ),
      });
      return;
    }
    setAccessDeniedTarget(null);
    setView(nextView);
  };

  const handleChooseAuthorizedModule = (modKey: ActiveModuleKey) => {
    const nextView = getDefaultViewForModule(currentRole, modKey) || 'WORKSPACE';
    setAccessDeniedTarget(null);
    setView(nextView);
    if (typeof window !== 'undefined') {
      const nextUrl = `${window.location.pathname}?module=${encodeURIComponent(
        modKey
      )}`;
      window.history.replaceState(null, '', nextUrl);
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
    if (hasViewAccess(currentRole, 'WORKSPACE')) {
      setView('WORKSPACE');
    }
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

  const tl = DICTIONARY[lang].launcher;
  const ts = DICTIONARY[lang].sidebar;
  const td = DICTIONARY[lang].devtools;
  const roleMeta = ROLE_METADATA[currentRole];
  const authorizedModules = getAuthorizedActiveModules(currentRole);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#090d16] flex transition-colors font-sans">
      {/* Desktop Left Sidebar Rail & Mobile Slide-Over Overlay Drawer */}
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        currentView={view}
        onSelectView={handleSelectSidebarView}
        onUpcomingClick={handleUpcomingClick}
        lang={lang}
        userRole={currentRole}
        currentUserEmail={currentUserEmail}
        avatarUrl={currentUserAvatarUrl}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <CorporateHeader
          currentRole={currentRole}
          onRoleChange={(nextRole) => {
            setCurrentRole(nextRole);
            if (
              accessDeniedTarget &&
              isActiveModuleKey(accessDeniedTarget.moduleKey) &&
              hasModuleAccess(nextRole, accessDeniedTarget.moduleKey)
            ) {
              const targetView =
                getDefaultViewForModule(
                  nextRole,
                  accessDeniedTarget.moduleKey
                ) || 'WORKSPACE';
              setView(targetView);
              setAccessDeniedTarget(null);
            } else if (
              view === 'DEV_TOOLS' &&
              !hasViewAccess(nextRole, 'DEV_TOOLS')
            ) {
              setAccessDeniedTarget({
                moduleKey: 'devtools',
                requiredTierLabel: 'Tier 0',
              });
            }
          }}
          lang={lang}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          currentUserEmail={currentUserEmail}
          avatarUrl={currentUserAvatarUrl}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1">
          {/* STRICT POST-AUTH RBAC ACCESS DENIED GATE (NO SILENT AUTO-REDIRECT) */}
          {accessDeniedTarget ? (
            <div className="max-w-2xl mx-auto my-4 sm:my-8 bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-rose-500/40 shadow-xl p-5 sm:p-8 space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    403 RBAC • {tl.accessDeniedTitle}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white uppercase break-words">
                    {tl.accessDeniedTitle} —{' '}
                    {tl.modules[accessDeniedTarget.moduleKey]}
                  </h2>
                  <p className="text-xs font-light text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tl.accessDeniedBody}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {tl.authenticatedAsLabel}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white break-words">
                    {lang === 'tr' ? roleMeta?.titleTr : roleMeta?.titleEn} (Tier{' '}
                    {roleMeta?.tier ?? '—'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {tl.requestedModuleLabel}
                  </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 uppercase break-words">
                    {tl.modules[accessDeniedTarget.moduleKey]} (
                    {accessDeniedTarget.requiredTierLabel})
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {tl.authorizedModulesLabel}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {authorizedModules.map((modKey) => (
                    <button
                      key={modKey}
                      type="button"
                      onClick={() => handleChooseAuthorizedModule(modKey)}
                      className="group min-h-[56px] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <div className="scale-75">
                            {renderLauncherModuleIcon(modKey)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase block truncate">
                            {tl.modules[modKey]}
                          </span>
                          <span className="text-[11px] font-light text-blue-600 dark:text-blue-400">
                            {tl.openAuthorizedModule}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : view === 'TECHNICAL_INTAKE' ? (
            <TechnicalIntakeModule
              onBack={() => handleSelectSidebarView('WORKSPACE')}
              onOpenDepot={() => handleSelectSidebarView('DEPOT_WORKSPACE')}
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
              onBackToRequisitions={() => handleSelectSidebarView('WORKSPACE')}
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
              onCurrentUserAvatarUpdated={setCurrentUserAvatarUrl}
            />
          ) : view === 'DEV_TOOLS' ? (
            /* Tier 0 (SYSTEM_ADMIN) Exclusive Database & Dev Tools Diagnostics Workspace */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-purple-500/30 p-5 sm:p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        {td.badgeTier0} • {ts.version}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDevVaultModalOpen(true)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                          isDevVaultElevated
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        {isDevVaultElevated
                          ? lang === 'tr'
                            ? '● Güvenlik Kasası Açık'
                            : '● Security Vault Unlocked'
                          : lang === 'tr'
                          ? '🔒 Güvenlik Kasasını Doğrula'
                          : '🔒 Verify Security Vault'}
                      </button>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase">
                      {td.title}
                    </h1>
                    <p className="text-xs font-light text-slate-500 dark:text-slate-400 mt-1">
                      {td.subtitle}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-light text-slate-400 block">
                        {td.catalogCountLabel}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {catalogItems.length}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-light text-slate-400 block">
                        {td.requisitionCountLabel}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {requisitions.length}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-light text-slate-400 block">
                        {td.projectCountLabel}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {portfolioProjects.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {td.registryTitle}
                  </h2>
                </div>
                <div className="w-full overflow-x-auto touch-scroll-x">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4">{td.colModule}</th>
                        <th className="py-3 px-4">{td.colStatus}</th>
                        <th className="py-3 px-4">{td.colLauncher}</th>
                        <th className="py-3 px-4">{td.colTiers}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {MODULE_REGISTRY.map((mod) => (
                        <React.Fragment key={mod.id}>
                          <tr className="bg-white dark:bg-[#0f172a]">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {tl.modules[mod.id]}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  mod.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {mod.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-light text-slate-600 dark:text-slate-300">
                              {mod.showOnLauncher
                                ? `#${mod.launcherOrder}`
                                : '— (Footer Only)'}
                            </td>
                            <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                              {formatTierRangeLabel(mod.allowedTiers)}
                            </td>
                          </tr>
                          {mod.subSections?.map((sub) => (
                            <tr
                              key={`${mod.id}-${sub.id}`}
                              className="bg-slate-50/60 dark:bg-slate-900/30"
                            >
                              <td className="py-2 px-4 pl-8 font-light text-slate-600 dark:text-slate-300">
                                ↳ {ts.subSections[sub.id]}
                              </td>
                              <td className="py-2 px-4">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    sub.status === 'ACTIVE'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-2 px-4 font-light text-slate-400">
                                —
                              </td>
                              <td className="py-2 px-4 font-light text-slate-600 dark:text-slate-300">
                                {formatTierRangeLabel(sub.allowedTiers)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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

      {/* Personal Self-Service Profile Modal (Accessible by All Tiers 0–4) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        lang={lang}
        currentRole={currentRole}
        onProfileUpdated={(patch) => {
          if (patch.avatarUrl !== undefined) {
            setCurrentUserAvatarUrl(patch.avatarUrl);
          }
        }}
        onOpenDevVault={() => setIsDevVaultModalOpen(true)}
      />

      {/* Tier 0 Developer Security Vault Modal */}
      <DevVaultModal
        isOpen={isDevVaultModalOpen}
        onClose={() => setIsDevVaultModalOpen(false)}
        onVerified={() => {
          setIsDevVaultElevated(true);
          handleShowToast(
            lang === 'tr'
              ? 'Geliştirici Güvenlik Kasası Açıldı'
              : 'Developer Security Vault Unlocked',
            lang === 'tr'
              ? 'Root yönetişim yetkisi 15 dakika boyunca aktif.'
              : 'Protected Root elevation active for 15 minutes.'
          );
        }}
        lang={lang}
      />

      {/* Toast Notification */}
      {toastState && (
        <Toast
          message={toastState.message}
          subMessage={toastState.subMessage}
          onClose={() => setToastState(null)}
        />
      )}
    </div>
  );
}
