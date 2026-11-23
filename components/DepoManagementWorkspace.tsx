'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  InventoryCatalogItem,
  DepotStockBalance,
  DepotTransaction,
  AssetRegisterItem,
  DepotLocation,
  RoleTier,
  PortfolioProject,
  PortfolioBuilding,
} from '@/types/requisition';
import { canEditDepotStock, canConfirmDepotHandover } from '@/lib/rbac';
import { DICTIONARY } from '@/lib/i18n';
import MobileBarcodeScannerModal from '@/components/MobileBarcodeScannerModal';
import ItemDetailsModal from '@/components/ItemDetailsModal';

interface DepoManagementWorkspaceProps {
  currentRole: RoleTier;
  lang: 'tr' | 'en';
  portfolioProjects?: PortfolioProject[];
  portfolioBuildings?: PortfolioBuilding[];
  catalogItems?: InventoryCatalogItem[];
  onBackToRequisitions?: () => void;
  onItemRegistered?: (item: InventoryCatalogItem) => void;
  onCatalogUpdated?: () => Promise<void> | void;
  onShowToast?: (message: string, subMessage?: string) => void;
}

export default function DepoManagementWorkspace({
  currentRole,
  lang,
  portfolioProjects = [],
  portfolioBuildings = [],
  catalogItems = [],
  onBackToRequisitions,
  onItemRegistered,
  onCatalogUpdated,
  onShowToast,
}: DepoManagementWorkspaceProps) {
  const t = DICTIONARY[lang].depot;
  const tc = DICTIONARY[lang].common;
  const td = DICTIONARY[lang].itemDetails;
  const canEdit = canEditDepotStock(currentRole);
  const canConfirm = canConfirmDepotHandover(currentRole);

  // Core Ledger State
  const [depotLocations, setDepotLocations] = useState<DepotLocation[]>([]);
  const [activeDepotId, setActiveDepotId] = useState<string>('DEPOT-PRJ02-MAIN');
  const [balances, setBalances] = useState<DepotStockBalance[]>([]);
  const [transactions, setTransactions] = useState<DepotTransaction[]>([]);
  const [assets, setAssets] = useState<AssetRegisterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI Navigation & Dynamic Multi-Dimensional Filters
  const [activeTab, setActiveTab] = useState<'BALANCES' | 'MOVEMENTS' | 'ASSETS'>('BALANCES');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterDepot, setFilterDepot] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterText, setFilterText] = useState<string>('');
  const [missingDocsOnly, setMissingDocsOnly] = useState<boolean>(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);

  // Modals & Drawers
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedBalanceForDetails, setSelectedBalanceForDetails] =
    useState<DepotStockBalance | null>(null);
  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState<boolean>(false);
  const [selectedTxForDocs, setSelectedTxForDocs] = useState<DepotTransaction | null>(null);
  const [docDrawerIrsaliye, setDocDrawerIrsaliye] = useState<string>('');
  const [docDrawerInvoice, setDocDrawerInvoice] = useState<string>('');
  const [docDrawerSupplier, setDocDrawerSupplier] = useState<string>('');

  const [isInboundModalOpen, setIsInboundModalOpen] = useState<boolean>(false);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState<boolean>(false);

  // Inbound Form State
  const [inboundCatalogId, setInboundCatalogId] = useState<string>('');
  const [inboundDepotId, setInboundDepotId] = useState<string>('DEPOT-PRJ02-MAIN');
  const [inboundQty, setInboundQty] = useState<number>(1);
  const [inboundCostEur, setInboundCostEur] = useState<number>(0);
  const [inboundIrsaliye, setInboundIrsaliye] = useState<string>('');
  const [inboundInvoice, setInboundInvoice] = useState<string>('');
  const [inboundSupplier, setInboundSupplier] = useState<string>('');
  const [inboundSerials, setInboundSerials] = useState<string>('');

  // Outbound Form State
  const [outboundCatalogId, setOutboundCatalogId] = useState<string>('');
  const [outboundDepotId, setOutboundDepotId] = useState<string>('DEPOT-PRJ02-MAIN');
  const [outboundBuildingId, setOutboundBuildingId] = useState<string>('');
  const [outboundUnitLabel, setOutboundUnitLabel] = useState<string>('');
  const [outboundReqId, setOutboundReqId] = useState<string>('');
  const [outboundQty, setOutboundQty] = useState<number>(1);
  const [outboundIrsaliye, setOutboundIrsaliye] = useState<string>('');

  // 100% Live Supabase Data Fetching
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchLiveDepotData = useCallback(async () => {
    try {
      // 1. Fetch Depot Locations
      const { data: depots } = await supabase
        .from('depot_locations')
        .select('*')
        .order('depot_id', { ascending: true });

      if (depots && depots.length > 0) {
        setDepotLocations(depots as DepotLocation[]);
        setActiveDepotId((prev) => (prev ? prev : depots[0].depot_id));
      } else {
        const defaultDepot: DepotLocation = {
          depot_id: 'DEPOT-PRJ02-MAIN',
          project_id: 'PRJ-02',
          depot_name: 'Caesar Resort & Spa - Main Site Depot',
          depot_category: 'CENTRAL_CONSTRUCTION_DEPOT',
          is_active: true,
        };
        setDepotLocations([defaultDepot]);
        setActiveDepotId(defaultDepot.depot_id);
      }

      // 2. Fetch Live Stock Balances
      const { data: bData } = await supabase
        .from('depot_stock_balances')
        .select('*, catalog_item:inventory_catalog(*)')
        .order('last_scanned_at', { ascending: false });

      if (bData) {
        setBalances(bData as DepotStockBalance[]);
      }

      // 3. Fetch Live Depot Transactions
      const { data: tData } = await supabase
        .from('depot_transactions')
        .select('*, catalog_item:inventory_catalog(*)')
        .order('created_at', { ascending: false });

      if (tData) {
        setTransactions(tData as DepotTransaction[]);
      }

      // 4. Fetch Live Asset Register
      const { data: aData } = await supabase
        .from('asset_register')
        .select('*, catalog_item:inventory_catalog(*)')
        .order('created_at', { ascending: false });

      if (aData) {
        setAssets(aData as AssetRegisterItem[]);
      }
    } catch (err) {
      console.error('[DEPOT DATA HYDRATION ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await fetchLiveDepotData();
      }
    };
    void init();

    const balanceChannel = supabase
      .channel('depot-balances-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'depot_stock_balances' },
        () => {
          void fetchLiveDepotData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'depot_transactions' },
        () => {
          void fetchLiveDepotData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asset_register' },
        () => {
          void fetchLiveDepotData();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      void supabase.removeChannel(balanceChannel);
    };
  }, [fetchLiveDepotData]);

  // Combine parent catalog items with items linked in balances
  const allCatalogItems = useMemo(() => {
    const map = new Map<string, InventoryCatalogItem>();
    catalogItems.forEach((c) => map.set(c.item_id, c));
    balances.forEach((b) => {
      if (b.catalog_item) {
        map.set(b.catalog_item.item_id, b.catalog_item);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.item_name_tr.localeCompare(b.item_name_tr, 'tr')
    );
  }, [catalogItems, balances]);

  // Extract distinct trade categories across active stock items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    balances.forEach((b) => {
      if (b.catalog_item?.category) set.add(b.catalog_item.category);
    });
    allCatalogItems.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [balances, allCatalogItems]);

  // Target Depot Resolver
  const resolveItemDepot = useCallback(
    (itemId: string): string => {
      if (filterDepot !== 'ALL') return filterDepot;
      const item = allCatalogItems.find((c) => c.item_id === itemId);
      if (item?.product_domain === 'CONSTRUCTION_MATERIALS')
        return 'DEPOT-PRJ02-CONST';
      if (item?.product_domain === 'FURNISHING_AND_EQUIPMENT')
        return 'DEPOT-PRJ02-MAIN';
      if (
        item?.category?.includes('Yapı') ||
        item?.category?.includes('Beton') ||
        item?.category?.includes('Demir')
      ) {
        return 'DEPOT-PRJ02-CONST';
      }
      return depotLocations[0]?.depot_id || 'DEPOT-PRJ02-MAIN';
    },
    [filterDepot, allCatalogItems, depotLocations]
  );

  const openInboundModal = (catalogId?: string) => {
    const targetId = catalogId || (allCatalogItems[0]?.item_id ?? '');
    const resolvedDepot = resolveItemDepot(targetId);
    setInboundCatalogId(targetId);
    setInboundDepotId(resolvedDepot);
    const selected = allCatalogItems.find((c) => c.item_id === targetId);
    if (selected?.base_cost_eur) setInboundCostEur(selected.base_cost_eur);
    setIsInboundModalOpen(true);
  };

  const openOutboundModal = (catalogId?: string) => {
    const targetId = catalogId || (balances[0]?.catalog_item_id ?? '');
    const resolvedDepot = resolveItemDepot(targetId);
    setOutboundCatalogId(targetId);
    setOutboundDepotId(resolvedDepot);
    setIsOutboundModalOpen(true);
  };

  const normalizeText = useCallback((text: string) => {
    return text.toLowerCase().trim();
  }, []);

  // Filtered Balances (Multi-Dimensional Scope)
  const filteredBalances = useMemo(() => {
    const query = normalizeText(filterText);
    const allowedDepotIdsForProject =
      filterProject === 'ALL'
        ? null
        : new Set(
            depotLocations
              .filter((d) => d.project_id === filterProject)
              .map((d) => d.depot_id)
          );

    return balances.filter((b) => {
      if (
        allowedDepotIdsForProject &&
        !allowedDepotIdsForProject.has(b.depot_id)
      ) {
        return false;
      }
      if (filterDepot !== 'ALL' && b.depot_id !== filterDepot) {
        return false;
      }
      if (
        filterCategory !== 'ALL' &&
        b.catalog_item?.category !== filterCategory
      ) {
        return false;
      }

      const item = b.catalog_item;
      const nameTr = normalizeText(item?.item_name_tr || '');
      const nameEn = normalizeText(item?.item_name_en || '');
      const code = normalizeText(item?.legacy_code || '');
      const barcode = normalizeText(item?.barcode_ean || '');
      const cat = normalizeText(item?.category || '');
      const brand = normalizeText(item?.brand_model || '');

      return (
        !query ||
        nameTr.includes(query) ||
        nameEn.includes(query) ||
        code.includes(query) ||
        barcode.includes(query) ||
        cat.includes(query) ||
        brand.includes(query)
      );
    });
  }, [
    balances,
    filterText,
    normalizeText,
    filterProject,
    filterDepot,
    filterCategory,
    depotLocations,
  ]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const query = normalizeText(filterText);
    const allowedDepotIdsForProject =
      filterProject === 'ALL'
        ? null
        : new Set(
            depotLocations
              .filter((d) => d.project_id === filterProject)
              .map((d) => d.depot_id)
          );

    return transactions.filter((tItem) => {
      if (
        allowedDepotIdsForProject &&
        !allowedDepotIdsForProject.has(tItem.depot_id)
      ) {
        return false;
      }
      if (filterDepot !== 'ALL' && tItem.depot_id !== filterDepot) {
        return false;
      }
      if (missingDocsOnly && !tItem.has_missing_docs) {
        return false;
      }

      const code = normalizeText(tItem.transaction_code || '');
      const irsaliye = normalizeText(tItem.irsaliye_number || '');
      const invoice = normalizeText(tItem.invoice_number || '');
      const supplier = normalizeText(tItem.supplier_name || '');
      const req = normalizeText(tItem.requisition_id || '');
      const item = tItem.catalog_item;
      const name = normalizeText(
        item?.item_name_tr || item?.item_name_en || ''
      );

      return (
        !query ||
        code.includes(query) ||
        irsaliye.includes(query) ||
        invoice.includes(query) ||
        supplier.includes(query) ||
        req.includes(query) ||
        name.includes(query)
      );
    });
  }, [
    transactions,
    filterText,
    missingDocsOnly,
    normalizeText,
    filterProject,
    filterDepot,
    depotLocations,
  ]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    const query = normalizeText(filterText);
    return assets.filter((a) => {
      if (filterDepot !== 'ALL' && a.current_depot_id !== filterDepot) {
        return false;
      }

      const tag = normalizeText(a.asset_tag || '');
      const sn = normalizeText(a.serial_number || '');
      const item =
        a.catalog_item ||
        balances.find((b) => b.catalog_item_id === a.catalog_item_id)
          ?.catalog_item;
      const name = normalizeText(
        item?.item_name_tr || item?.item_name_en || ''
      );

      return (
        !query ||
        tag.includes(query) ||
        sn.includes(query) ||
        name.includes(query)
      );
    });
  }, [assets, balances, filterText, normalizeText, filterDepot]);

  // Dynamic Category-Aware KPIs
  const kpis = useMemo(() => {
    const activeSkus = filteredBalances.length;
    const distinctCategories = new Set(
      filteredBalances.map((b) => b.catalog_item?.category).filter(Boolean)
    ).size;

    let inStockCount = 0;
    let lowOrZeroStockCount = 0;
    let totalValuedEur = 0;

    filteredBalances.forEach((b) => {
      const minThreshold = b.min_stock_threshold || 10;
      if (b.quantity_on_hand > minThreshold) {
        inStockCount++;
      } else {
        lowOrZeroStockCount++;
      }

      const item = b.catalog_item;
      const cost = item?.base_cost_eur || 0;
      const markup = item?.commercial_markup_pct ?? 15;
      const itemValuedPrice = cost * (1 + markup / 100);
      totalValuedEur += b.quantity_on_hand * itemValuedPrice;
    });

    const missingDocsCount = transactions.filter(
      (tx) => tx.has_missing_docs
    ).length;
    const assetCount = assets.length;

    return {
      activeSkus,
      distinctCategories,
      inStockCount,
      lowOrZeroStockCount,
      totalValuedEur,
      missingDocsCount,
      assetCount,
    };
  }, [filteredBalances, transactions, assets]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterProject !== 'ALL') count++;
    if (filterDepot !== 'ALL') count++;
    if (filterCategory !== 'ALL') count++;
    return count;
  }, [filterProject, filterDepot, filterCategory]);

  const handleResetFilters = () => {
    setFilterProject('ALL');
    setFilterDepot('ALL');
    setFilterCategory('ALL');
    setFilterText('');
  };

  // Handover Delivery Confirmation (1-Tap Sign-Off)
  const handleConfirmDelivery = async (txId: string) => {
    if (!canConfirmDepotHandover(currentRole)) {
      alert(
        lang === 'tr'
          ? 'Yetkisiz İşlem: Yalnızca Depo Müdürü veya Yönetim Kurulu teslimat onaylayabilir.'
          : 'Unauthorized: Only Depot Manager or Executive can confirm delivery.'
      );
      return;
    }
    const tx = transactions.find((tItem) => tItem.transaction_id === txId);
    if (!tx) return;

    const confirmedAt = new Date().toISOString();

    setBalances((prev) =>
      prev.map((b) => {
        if (
          b.catalog_item_id === tx.catalog_item_id &&
          b.depot_id === tx.depot_id
        ) {
          const newOnHand = Math.max(0, b.quantity_on_hand - tx.quantity);
          const newReserved = Math.max(0, b.quantity_reserved - tx.quantity);
          return {
            ...b,
            quantity_on_hand: newOnHand,
            quantity_reserved: newReserved,
          };
        }
        return b;
      })
    );

    setTransactions((prev) =>
      prev.map((tItem) =>
        tItem.transaction_id === txId
          ? { ...tItem, delivery_confirmed: true, confirmed_at: confirmedAt }
          : tItem
      )
    );

    setAssets((prev) =>
      prev.map((a) => {
        if (
          a.catalog_item_id === tx.catalog_item_id &&
          a.current_depot_id === tx.depot_id &&
          a.custody_status === 'IN_DEPOT'
        ) {
          return {
            ...a,
            custody_status: 'HANDED_OVER_TO_AFTERSALES',
            deployed_building_id: tx.target_building_id,
            deployed_unit_label: tx.target_unit_label,
            outbound_transaction_id: tx.transaction_id,
          };
        }
        return a;
      })
    );

    try {
      await supabase
        .from('depot_transactions')
        .update({
          delivery_confirmed: true,
          confirmed_at: confirmedAt,
        })
        .eq('transaction_id', txId);
    } catch (err) {
      console.error('[CONFIRM DELIVERY DB ERROR]', err);
    }
  };

  // Open Missing-Docs Drawer
  const handleOpenDocDrawer = (tx: DepotTransaction) => {
    setSelectedTxForDocs(tx);
    setDocDrawerIrsaliye(tx.irsaliye_number || '');
    setDocDrawerInvoice(tx.invoice_number || '');
    setDocDrawerSupplier(tx.supplier_name || '');
    setIsDocDrawerOpen(true);
  };

  // Save Missing-Docs
  const handleSaveMissingDocs = async () => {
    if (!selectedTxForDocs) return;

    const cleanIrsaliye = docDrawerIrsaliye.trim();
    const cleanInvoice = docDrawerInvoice.trim();
    const cleanSupplier = docDrawerSupplier.trim();
    const isNowMissing = !cleanIrsaliye || !cleanInvoice;

    setTransactions((prev) =>
      prev.map((tItem) => {
        if (tItem.transaction_id === selectedTxForDocs.transaction_id) {
          return {
            ...tItem,
            irsaliye_number: cleanIrsaliye || null,
            invoice_number: cleanInvoice || null,
            supplier_name: cleanSupplier || null,
            has_missing_docs: isNowMissing,
          };
        }
        return tItem;
      })
    );

    setIsDocDrawerOpen(false);

    try {
      await supabase
        .from('depot_transactions')
        .update({
          irsaliye_number: cleanIrsaliye || null,
          invoice_number: cleanInvoice || null,
          supplier_name: cleanSupplier || null,
        })
        .eq('transaction_id', selectedTxForDocs.transaction_id);
    } catch (err) {
      console.error('[UPDATE MISSING DOCS DB ERROR]', err);
    }
  };

  // Dynamic Catalog Item Registration Handler
  const handleItemRegistered = (
    newItem: InventoryCatalogItem,
    newBalance: DepotStockBalance,
    newTx?: DepotTransaction | null,
    newAsset?: AssetRegisterItem | null
  ) => {
    setBalances((prev) => [newBalance, ...prev]);
    if (newTx) {
      setTransactions((prev) => [newTx, ...prev]);
    }
    if (newAsset) {
      setAssets((prev) => [newAsset, ...prev]);
    }
    onItemRegistered?.(newItem);
  };

  // Inbound Form Submit
  const handleCreateInbound = async () => {
    if (!canEdit) {
      alert(
        lang === 'tr'
          ? 'Yetkisiz İşlem: Depoya malzeme girişi yapma yetkiniz bulunmamaktadır.'
          : 'Unauthorized: You do not have permission to record inbound stock.'
      );
      return;
    }
    if (!inboundCatalogId || inboundQty <= 0) return;

    const catalogItem = allCatalogItems.find(
      (c) => c.item_id === inboundCatalogId
    );
    if (!catalogItem) return;

    const targetDepot = inboundDepotId || 'DEPOT-PRJ02-MAIN';
    const txCode = `MOV-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.random()
      .toString(16)
      .substring(2, 6)
      .toUpperCase()}`;
    const cost = Number(inboundCostEur) || catalogItem.base_cost_eur || 0;
    const markup = catalogItem.commercial_markup_pct ?? 15;
    const finalValued = Number((cost * (1 + markup / 100)).toFixed(2));
    const isMissing = !inboundIrsaliye || !inboundInvoice;

    const newTx: DepotTransaction = {
      transaction_id: `tx-${Date.now()}`,
      transaction_code: txCode,
      depot_id: targetDepot,
      catalog_item_id: catalogItem.item_id,
      movement_type: 'INBOUND_RECEIPT',
      quantity: Number(inboundQty),
      irsaliye_number: inboundIrsaliye || null,
      invoice_number: inboundInvoice || null,
      supplier_name: inboundSupplier || null,
      unit_cost_eur: cost,
      final_valued_cost_eur: finalValued,
      has_missing_docs: isMissing,
      delivery_confirmed: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      catalog_item: catalogItem,
    };

    setBalances((prev) => {
      const matchIndex = prev.findIndex(
        (b) =>
          b.catalog_item_id === catalogItem.item_id &&
          b.depot_id === targetDepot
      );
      if (matchIndex >= 0) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          quantity_on_hand:
            updated[matchIndex].quantity_on_hand + Number(inboundQty),
          last_scanned_at: new Date().toISOString(),
        };
        return updated;
      }
      return [
        {
          balance_id: `bal-${Date.now()}`,
          depot_id: targetDepot,
          catalog_item_id: catalogItem.item_id,
          quantity_on_hand: Number(inboundQty),
          quantity_reserved: 0,
          min_stock_threshold: 10,
          last_scanned_at: new Date().toISOString(),
          catalog_item: catalogItem,
        },
        ...prev,
      ];
    });

    setTransactions((prev) => [newTx, ...prev]);

    if (catalogItem.is_trackable_asset && inboundSerials.trim()) {
      const serialList = inboundSerials
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const newAssetItems: AssetRegisterItem[] = serialList.map((sn, idx) => ({
        asset_id: `ast-${Date.now()}-${idx}`,
        asset_tag: `AST-${new Date().getFullYear()}-${Math.random()
          .toString(16)
          .substring(2, 6)
          .toUpperCase()}`,
        catalog_item_id: catalogItem.item_id,
        barcode_ean: catalogItem.barcode_ean || null,
        serial_number: sn,
        current_depot_id: targetDepot,
        custody_status: 'IN_DEPOT',
        inbound_transaction_id: newTx.transaction_id,
        created_at: new Date().toISOString(),
        catalog_item: catalogItem,
      }));
      setAssets((prev) => [...newAssetItems, ...prev]);
    }

    setIsInboundModalOpen(false);
    setInboundCatalogId('');
    setInboundQty(1);
    setInboundCostEur(0);
    setInboundIrsaliye('');
    setInboundInvoice('');
    setInboundSupplier('');
    setInboundSerials('');

    try {
      await supabase.from('depot_transactions').insert([
        {
          transaction_code: txCode,
          depot_id: targetDepot,
          catalog_item_id: catalogItem.item_id,
          movement_type: 'INBOUND_RECEIPT',
          quantity: Number(inboundQty),
          irsaliye_number: inboundIrsaliye || null,
          invoice_number: inboundInvoice || null,
          supplier_name: inboundSupplier || null,
          unit_cost_eur: cost,
          final_valued_cost_eur: finalValued,
          delivery_confirmed: true,
          confirmed_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('[INBOUND DB INSERT ERROR]', err);
    }
  };

  // Outbound Form Submit
  const handleCreateOutbound = async () => {
    if (!canEditDepotStock(currentRole)) {
      alert(
        lang === 'tr'
          ? 'Yetkisiz İşlem: Malzeme çıkışı yapma yetkiniz bulunmamaktadır.'
          : 'Unauthorized: You do not have permission to record outbound handovers.'
      );
      return;
    }
    if (!outboundCatalogId || outboundQty <= 0) return;

    const catalogItem =
      allCatalogItems.find((c) => c.item_id === outboundCatalogId) ||
      balances.find((b) => b.catalog_item_id === outboundCatalogId)
        ?.catalog_item;
    if (!catalogItem) return;

    const targetDepot = outboundDepotId || 'DEPOT-PRJ02-MAIN';
    const txCode = `MOV-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.random()
      .toString(16)
      .substring(2, 6)
      .toUpperCase()}`;
    const cost = catalogItem.base_cost_eur || 0;
    const markup = catalogItem.commercial_markup_pct ?? 15;
    const finalValued = Number((cost * (1 + markup / 100)).toFixed(2));
    const isMissing = !outboundIrsaliye || !outboundReqId;

    const newTx: DepotTransaction = {
      transaction_id: `tx-${Date.now()}`,
      transaction_code: txCode,
      depot_id: targetDepot,
      catalog_item_id: catalogItem.item_id,
      movement_type: 'OUTBOUND_HANDOVER',
      quantity: Number(outboundQty),
      requisition_id: outboundReqId || null,
      target_building_id: outboundBuildingId || null,
      target_unit_label: outboundUnitLabel || null,
      irsaliye_number: outboundIrsaliye || null,
      unit_cost_eur: cost,
      final_valued_cost_eur: finalValued,
      has_missing_docs: isMissing,
      delivery_confirmed: false,
      created_at: new Date().toISOString(),
      catalog_item: catalogItem,
    };

    setBalances((prev) =>
      prev.map((b) => {
        if (
          b.catalog_item_id === catalogItem.item_id &&
          b.depot_id === targetDepot
        ) {
          return {
            ...b,
            quantity_reserved: b.quantity_reserved + Number(outboundQty),
            last_scanned_at: new Date().toISOString(),
          };
        }
        return b;
      })
    );

    setTransactions((prev) => [newTx, ...prev]);

    setIsOutboundModalOpen(false);
    setOutboundCatalogId('');
    setOutboundBuildingId('');
    setOutboundUnitLabel('');
    setOutboundReqId('');
    setOutboundQty(1);
    setOutboundIrsaliye('');

    try {
      await supabase.from('depot_transactions').insert([
        {
          transaction_code: txCode,
          depot_id: targetDepot,
          catalog_item_id: catalogItem.item_id,
          movement_type: 'OUTBOUND_HANDOVER',
          quantity: Number(outboundQty),
          requisition_id: outboundReqId || null,
          target_building_id: outboundBuildingId || null,
          target_unit_label: outboundUnitLabel || null,
          irsaliye_number: outboundIrsaliye || null,
          unit_cost_eur: cost,
          final_valued_cost_eur: finalValued,
          delivery_confirmed: false,
        },
      ]);
    } catch (err) {
      console.error('[OUTBOUND DB INSERT ERROR]', err);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16 select-none font-sans">
      {/* External Top Return Navigation Link */}
      {onBackToRequisitions && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToRequisitions}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <span>
              {t.btnBackToRequisitions ||
                (lang === 'tr' ? '← Talepler' : '← Requisitions')}
            </span>
          </button>
        </div>
      )}

      {/* Clean Master Hero Card */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Clean 1-Line Title & Subtitle */}
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              {t.title}
            </h1>
            <p className="text-xs font-light text-slate-500 dark:text-slate-400">
              {t.subtitle}
            </p>
          </div>

          {/* Right: Stacked Action Container */}
          <div className="flex flex-col gap-2 min-w-[280px] sm:min-w-[320px]">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <span>{t.btnScanBarcode}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openInboundModal()}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span>{t.btnInbound}</span>
              </button>

              <button
                onClick={() => openOutboundModal()}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                <span>{t.btnOutbound}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Category-Aware 4-Stat Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Catalog SKUs & Distinct Categories */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.kpiSkus}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-slate-900 dark:text-white">
              {kpis.activeSkus}
            </span>
            <span className="text-xs font-light text-slate-400">
              • {kpis.distinctCategories}{' '}
              {lang === 'tr' ? 'Kategori' : 'Categories'}
            </span>
          </div>
        </div>

        {/* KPI 2: Stock Health */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.kpiStockHealth}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-emerald-600 dark:text-emerald-400">
              {kpis.inStockCount}
            </span>
            <span className="text-xs font-light text-slate-400">
              {lang === 'tr' ? 'Sağlıklı' : 'In Stock'} •{' '}
              <span
                className={
                  kpis.lowOrZeroStockCount > 0 ? 'text-amber-600 font-bold' : ''
                }
              >
                {kpis.lowOrZeroStockCount}{' '}
                {lang === 'tr' ? 'Kritik/Sıfır' : 'Low/Zero'}
              </span>
            </span>
          </div>
        </div>

        {/* KPI 3: Live Inventory Valuation (€) */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.kpiValuation}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-blue-600 dark:text-blue-400">
              €
              {kpis.totalValuedEur.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs font-light text-slate-400">
              {t.kpiValuationSub}
            </span>
          </div>
        </div>

        {/* KPI 4: Document & Serialized Asset Alerts */}
        <div
          onClick={() => {
            setActiveTab('MOVEMENTS');
            setMissingDocsOnly(true);
          }}
          className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {t.kpiAlerts}
            </span>
            {kpis.missingDocsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-light text-amber-600 dark:text-amber-400">
              {kpis.missingDocsCount}
            </span>
            <span className="text-xs font-light text-slate-400">
              {lang === 'tr' ? 'Eksik Evrak' : 'Missing Docs'} •{' '}
              {kpis.assetCount} {lang === 'tr' ? 'Demirbaş' : 'Assets'}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Tab Ledger Container */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        {/* Tab Headers & Filter Popover Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('BALANCES');
                setMissingDocsOnly(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'BALANCES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabBalances} ({balances.length})
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabMovements} ({transactions.length})
              {kpis.missingDocsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-bold">
                  {kpis.missingDocsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('ASSETS');
                setMissingDocsOnly(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ASSETS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabAssets} ({assets.length})
            </button>
          </div>

          {/* Quick Filters & Unified Filters Popover */}
          <div className="flex items-center space-x-2">
            {activeTab === 'MOVEMENTS' && (
              <button
                onClick={() => setMissingDocsOnly(!missingDocsOnly)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  missingDocsOnly
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ⚠️{' '}
                {lang === 'tr' ? 'Yalnızca Eksik Evraklılar' : 'Missing Docs Only'}
              </button>
            )}

            {/* Unified Filters Popover Trigger Button */}
            <div className="relative">
              <button
                onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all cursor-pointer ${
                  activeFilterCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>{t.filtersButton || 'Filtreler'}</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {isFilterPopoverOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterPopoverOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {t.filtersTitle || 'Filtreler'}
                      </span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          {t.resetFilters || 'Filtreleri Sıfırla'}
                        </button>
                      )}
                    </div>

                    {/* Dimension 1: Project / Location */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t.filterProject || 'Proje / Konum'}
                      </label>
                      <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                      >
                        <option value="ALL">
                          {t.allProjects || 'Tüm Projeler'}
                        </option>
                        {portfolioProjects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>
                            {p.project_name} ({p.project_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dimension 2: Depot / Domain */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t.filterDepot || 'Depo / Ürün Alanı'}
                      </label>
                      <select
                        value={filterDepot}
                        onChange={(e) => setFilterDepot(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                      >
                        <option value="ALL">
                          {t.allDepots || 'Tüm Depolar / Alanlar'}
                        </option>
                        {depotLocations.map((d) => (
                          <option key={d.depot_id} value={d.depot_id}>
                            [{d.depot_id}] {d.depot_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dimension 3: Item Category */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t.filterCategory || 'Malzeme Kategorisi'}
                      </label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                      >
                        <option value="ALL">
                          {t.allCategories || 'Tüm Kategoriler'}
                        </option>
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button
                        onClick={() => setIsFilterPopoverOpen(false)}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {lang === 'tr' ? 'Uygula & Kapat' : 'Apply & Close'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* TAB 1: LIVE STOCK BALANCES TABLE (CLICKABLE ROWS) */}
        {activeTab === 'BALANCES' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t.thBarcode}</th>
                  <th className="px-4 py-3">{t.thMaterial}</th>
                  <th className="px-4 py-3">{t.thPackaging}</th>
                  <th className="px-4 py-3 text-right">{t.thOnHand}</th>
                  <th className="px-4 py-3 text-right">{t.thReserved}</th>
                  <th className="px-4 py-3 text-right">{t.thBaseCost}</th>
                  <th className="px-4 py-3 text-right">{t.thValuedCost}</th>
                  <th className="px-4 py-3 text-center">{t.thAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-400 font-light"
                    >
                      {tc.loading}
                    </td>
                  </tr>
                ) : filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <p className="text-xs font-light text-slate-400">
                          {t.emptyBalances}
                        </p>
                        {canEdit && (
                          <button
                            onClick={() => openInboundModal()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            {t.emptyBalancesCta}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
                    const item = b.catalog_item;
                    const baseCost = item?.base_cost_eur || 0;
                    const markup = item?.commercial_markup_pct ?? 15;
                    const valued = Number(
                      (baseCost * (1 + markup / 100)).toFixed(2)
                    );
                    const isLowStock =
                      b.quantity_on_hand <= b.min_stock_threshold;

                    return (
                      <tr
                        key={b.balance_id}
                        onClick={() => setSelectedBalanceForDetails(b)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                            <span>
                              {item?.barcode_ean ||
                                item?.legacy_code ||
                                b.catalog_item_id}
                            </span>
                            {item?.legacy_code && item?.barcode_ean && (
                              <span className="text-[10px] text-slate-400 font-mono font-light">
                                {item.legacy_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr'
                              ? item?.item_name_tr
                              : item?.item_name_en || item?.item_name_tr}
                          </div>
                          <div className="text-[11px] font-light text-slate-400">
                            {item?.category}{' '}
                            {item?.subcategory ? `• ${item.subcategory}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item?.packaging_unit_type === 'ATOMIC_SET' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                              {t.atomicSet} ({item.set_piece_count || 1}{' '}
                              {lang === 'tr' ? 'parça' : 'pcs'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-light bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {t.singleItem}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isLowStock && (
                              <span
                                className="w-2 h-2 rounded-full bg-rose-500 animate-ping"
                                title={t.lowStock}
                              />
                            )}
                            <span
                              className={`text-sm font-light ${
                                isLowStock
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {b.quantity_on_hand}
                            </span>
                            <span className="text-[11px] font-light text-slate-400">
                              {item?.unit_of_measure}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-light text-slate-500">
                          {b.quantity_reserved} {item?.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 text-right font-light text-slate-600 dark:text-slate-400">
                          €
                          {baseCost.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-light text-emerald-600 dark:text-emerald-400">
                          €
                          {valued.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canEdit) return;
                                setOutboundCatalogId(b.catalog_item_id);
                                setOutboundDepotId(b.depot_id);
                                setIsOutboundModalOpen(true);
                              }}
                              disabled={!canEdit}
                              title={
                                !canEdit
                                  ? lang === 'tr'
                                    ? 'Yetki yetersiz'
                                    : 'Insufficient permission'
                                  : undefined
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                canEdit
                                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-pointer'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              {t.btnFastOutbound}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: TRANSACTION & DISPATCH LEDGER TABLE */}
        {activeTab === 'MOVEMENTS' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t.thTxCode}</th>
                  <th className="px-4 py-3">{t.thMaterial}</th>
                  <th className="px-4 py-3">{t.thTarget}</th>
                  <th className="px-4 py-3 text-right">{t.lblQuantity}</th>
                  <th className="px-4 py-3 text-right">{t.thValuedCost}</th>
                  <th className="px-4 py-3">{t.thDocs}</th>
                  <th className="px-4 py-3 text-center">
                    {t.thDeliveryStatus}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400 font-light"
                    >
                      {tc.loading}
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center font-light text-slate-400"
                    >
                      {t.emptyMovements}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const item = tx.catalog_item;
                    const isOutbound = tx.movement_type === 'OUTBOUND_HANDOVER';

                    return (
                      <tr
                        key={tx.transaction_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {tx.transaction_code}
                          </div>
                          <div className="text-[10px] font-light text-slate-400">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleString(
                                  lang === 'tr' ? 'tr-TR' : 'en-US'
                                )
                              : '—'}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                tx.movement_type === 'INBOUND_RECEIPT'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}
                            >
                              {tx.movement_type === 'INBOUND_RECEIPT'
                                ? t.inboundType
                                : t.outboundType}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr'
                              ? item?.item_name_tr
                              : item?.item_name_en ||
                                item?.item_name_tr ||
                                '—'}
                          </div>
                          <div className="text-[10px] font-mono font-light text-slate-400">
                            {item?.legacy_code || tx.catalog_item_id}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {isOutbound ? (
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {tx.target_building_id || '—'}
                              </div>
                              {tx.target_unit_label && (
                                <div className="text-[11px] font-light text-slate-400">
                                  {lang === 'tr'
                                    ? 'Daire / Mahal:'
                                    : 'Unit / Room:'}{' '}
                                  {tx.target_unit_label}
                                </div>
                              )}
                              {tx.requisition_id ? (
                                <div className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {tx.requisition_id}
                                </div>
                              ) : (
                                <div className="text-[10px] font-mono text-rose-500 font-bold">
                                  {t.reqMissing}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] font-light text-slate-500">
                              {tx.supplier_name || 'Caesar Central Supply'}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-light ${
                              isOutbound
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isOutbound ? '-' : '+'}
                            {tx.quantity}
                          </span>
                          <span className="text-[11px] font-light text-slate-400 ml-1">
                            {item?.unit_of_measure}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-light text-slate-800 dark:text-slate-200">
                          €
                          {Number(
                            tx.final_valued_cost_eur || 0
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col space-y-1">
                            <div className="text-[11px]">
                              <span className="text-[10px] text-slate-400 font-light mr-1">
                                {lang === 'tr' ? 'İrsaliye:' : 'Dispatch:'}
                              </span>
                              {tx.irsaliye_number ? (
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-light">
                                  {tx.irsaliye_number}
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold">
                                  {t.docMissing}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px]">
                              <span className="text-[10px] text-slate-400 font-light mr-1">
                                {lang === 'tr' ? 'Fatura:' : 'Invoice:'}
                              </span>
                              {tx.invoice_number ? (
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-light">
                                  {tx.invoice_number}
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold">
                                  {t.docMissing}
                                </span>
                              )}
                            </div>

                            {tx.has_missing_docs && (
                              <button
                                onClick={() => handleOpenDocDrawer(tx)}
                                className="mt-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-100 transition-colors w-fit cursor-pointer"
                              >
                                ✏️{' '}
                                {lang === 'tr'
                                  ? 'Evrak Tamamla'
                                  : 'Resolve Docs'}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {tx.delivery_confirmed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              ✓ {t.delivered}
                            </span>
                          ) : (
                            <div className="flex flex-col items-center space-y-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                                ⏳ {t.pendingDelivery}
                              </span>
                              <button
                                onClick={() =>
                                  canConfirm &&
                                  handleConfirmDelivery(tx.transaction_id)
                                }
                                disabled={!canConfirm}
                                title={
                                  !canConfirm
                                    ? lang === 'tr'
                                      ? 'Yalnızca Depo Müdürü veya Yönetim Kurulu teslimat onaylayabilir'
                                      : 'Only Depot Manager or Executive can confirm delivery'
                                    : undefined
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-xs ${
                                  canConfirm
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {t.btnConfirmDelivery}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SERIALIZED ASSET REGISTER TABLE */}
        {activeTab === 'ASSETS' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t.thAssetTag}</th>
                  <th className="px-4 py-3">{t.thSerial}</th>
                  <th className="px-4 py-3">{t.thMaterial}</th>
                  <th className="px-4 py-3">{t.thCustody}</th>
                  <th className="px-4 py-3">{t.thLocation}</th>
                  <th className="px-4 py-3">{t.thWarranty}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400 font-light"
                    >
                      {tc.loading}
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center font-light text-slate-400"
                    >
                      {t.emptyAssets}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const item =
                      asset.catalog_item ||
                      balances.find(
                        (b) => b.catalog_item_id === asset.catalog_item_id
                      )?.catalog_item;

                    return (
                      <tr
                        key={asset.asset_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {asset.asset_tag}
                        </td>
                        <td className="px-4 py-3 font-mono font-light text-slate-900 dark:text-slate-100">
                          {asset.serial_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr'
                              ? item?.item_name_tr
                              : item?.item_name_en ||
                                item?.item_name_tr ||
                                '—'}
                          </div>
                          <div className="text-[10px] font-mono font-light text-slate-400">
                            {item?.legacy_code || asset.catalog_item_id}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              asset.custody_status === 'IN_DEPOT'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                : asset.custody_status ===
                                  'HANDED_OVER_TO_AFTERSALES'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {asset.custody_status === 'IN_DEPOT'
                              ? t.custodyInDepot
                              : asset.custody_status ===
                                'HANDED_OVER_TO_AFTERSALES'
                              ? t.custodyHandedOver
                              : t.custodyInstalled}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-light text-slate-700 dark:text-slate-300">
                          {asset.deployed_building_id ? (
                            <div>
                              <span className="font-bold">
                                {asset.deployed_building_id}
                              </span>
                              {asset.deployed_unit_label && (
                                <span> • {asset.deployed_unit_label}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">
                              {asset.current_depot_id}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-light text-[11px] text-slate-500">
                          {asset.warranty_expiry_date || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* MODAL 1: UNIVERSAL BARCODE SCANNER & MANUAL REGISTRY */}
      {/* ================================================= */}
      <MobileBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        lang={lang}
        catalogItems={allCatalogItems}
        stockBalances={balances}
        assetRegister={assets}
        portfolioProjects={portfolioProjects}
        depotLocations={depotLocations}
        currentRole={currentRole}
        activeDepotId={activeDepotId}
        onQuickAction={(
          item: InventoryCatalogItem,
          action: 'INBOUND' | 'OUTBOUND' | 'REGISTER_ASSET'
        ) => {
          setIsScannerOpen(false);
          if (action === 'INBOUND') {
            openInboundModal(item.item_id);
          } else if (action === 'OUTBOUND') {
            openOutboundModal(item.item_id);
          }
        }}
        onItemRegistered={handleItemRegistered}
        onCatalogRefresh={async () => {
          await fetchLiveDepotData();
          await onCatalogUpdated?.();
        }}
        onShowToast={onShowToast}
      />

      {/* ================================================= */}
      {/* MODAL 1B: FULL ITEM DETAILS & TIER 0-2 EDIT MODAL */}
      {/* ================================================= */}
      <ItemDetailsModal
        isOpen={Boolean(selectedBalanceForDetails)}
        onClose={() => setSelectedBalanceForDetails(null)}
        balance={selectedBalanceForDetails}
        item={selectedBalanceForDetails?.catalog_item || null}
        transactions={transactions}
        assets={assets}
        depotLocations={depotLocations}
        availableCategories={availableCategories}
        currentRole={currentRole}
        lang={lang}
        onSaved={async (updatedItem, updatedBalance) => {
          setBalances((prev) =>
            prev.map((b) => {
              if (b.catalog_item_id === updatedItem.item_id) {
                return {
                  ...b,
                  ...(updatedBalance && b.balance_id === updatedBalance.balance_id
                    ? {
                        depot_id: updatedBalance.depot_id,
                        min_stock_threshold: updatedBalance.min_stock_threshold,
                      }
                    : {}),
                  catalog_item: updatedItem,
                };
              }
              return b;
            })
          );
          setSelectedBalanceForDetails((prev) =>
            prev
              ? {
                  ...prev,
                  ...(updatedBalance
                    ? {
                        depot_id: updatedBalance.depot_id,
                        min_stock_threshold: updatedBalance.min_stock_threshold,
                      }
                    : {}),
                  catalog_item: updatedItem,
                }
              : null
          );
          await fetchLiveDepotData();
          await onCatalogUpdated?.();
          onShowToast?.(td.savedToastTitle, td.savedToastSub);
        }}
      />

      {/* ================================================= */}
      {/* MODAL 2: MISSING DOCUMENTS RESOLUTION DRAWER */}
      {/* ================================================= */}
      {isDocDrawerOpen && selectedTxForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md h-full bg-white dark:bg-[#0f172a] shadow-2xl p-6 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                    {t.modalMissingDocsTitle}
                  </h3>
                  <p className="text-xs font-mono font-light text-slate-400">
                    {selectedTxForDocs.transaction_code}
                  </p>
                </div>
                <button
                  onClick={() => setIsDocDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblIrsaliyeNo}
                  </label>
                  <input
                    type="text"
                    value={docDrawerIrsaliye}
                    onChange={(e) => setDocDrawerIrsaliye(e.target.value)}
                    placeholder="IRS-2026-XXXX"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblInvoiceNo}
                  </label>
                  <input
                    type="text"
                    value={docDrawerInvoice}
                    onChange={(e) => setDocDrawerInvoice(e.target.value)}
                    placeholder="FAT-2026-XXXX"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblSupplier}
                  </label>
                  <input
                    type="text"
                    value={docDrawerSupplier}
                    onChange={(e) => setDocDrawerSupplier(e.target.value)}
                    placeholder="Tedarikçi Firma Adı"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsDocDrawerOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {tc.cancel}
              </button>
              <button
                onClick={handleSaveMissingDocs}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.btnSaveDocs}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 3: INBOUND MATERIAL RECEIPT DIALOG */}
      {/* ================================================= */}
      {isInboundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {t.modalInboundTitle}
                </h3>
                <p className="text-xs font-mono font-light text-slate-400">
                  {inboundDepotId}
                </p>
              </div>
              <button
                onClick={() => setIsInboundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.modalSelectDepot ||
                    (lang === 'tr' ? 'Hedef Depo *' : 'Target Depot *')}
                </label>
                <select
                  value={inboundDepotId}
                  onChange={(e) => setInboundDepotId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  {depotLocations.map((d) => (
                    <option key={d.depot_id} value={d.depot_id}>
                      [{d.depot_id}] {d.depot_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.lblSelectMaterial}
                </label>
                <select
                  value={inboundCatalogId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setInboundCatalogId(nextId);
                    const autoDepot = resolveItemDepot(nextId);
                    setInboundDepotId(autoDepot);
                    const selected = allCatalogItems.find(
                      (c) => c.item_id === nextId
                    );
                    if (selected?.base_cost_eur)
                      setInboundCostEur(selected.base_cost_eur);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">
                    {lang === 'tr'
                      ? '-- Malzeme Seçiniz --'
                      : '-- Select Material --'}
                  </option>
                  {allCatalogItems.map((c) => (
                    <option key={c.item_id} value={c.item_id}>
                      {c.legacy_code ? `[${c.legacy_code}] ` : ''}
                      {lang === 'tr'
                        ? c.item_name_tr
                        : c.item_name_en || c.item_name_tr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblQuantity}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inboundQty}
                    onChange={(e) =>
                      setInboundQty(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblUnitCost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inboundCostEur}
                    onChange={(e) => setInboundCostEur(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblIrsaliyeNo}
                  </label>
                  <input
                    type="text"
                    required
                    value={inboundIrsaliye}
                    onChange={(e) => setInboundIrsaliye(e.target.value)}
                    placeholder="IRS-2026-XXXX"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblInvoiceNo}
                  </label>
                  <input
                    type="text"
                    value={inboundInvoice}
                    onChange={(e) => setInboundInvoice(e.target.value)}
                    placeholder="FAT-2026-XXXX"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.lblSupplier}
                </label>
                <input
                  type="text"
                  value={inboundSupplier}
                  onChange={(e) => setInboundSupplier(e.target.value)}
                  placeholder="Daikin / Ege Vitrifiye"
                  className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {allCatalogItems.find((c) => c.item_id === inboundCatalogId)
                ?.is_trackable_asset && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblSerialNumbers}
                  </label>
                  <textarea
                    rows={2}
                    value={inboundSerials}
                    onChange={(e) => setInboundSerials(e.target.value)}
                    placeholder="SN-2026-001, SN-2026-002..."
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsInboundModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {tc.cancel}
              </button>
              <button
                onClick={handleCreateInbound}
                disabled={!inboundCatalogId || inboundQty <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.btnSaveInbound}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 4: OUTBOUND JOBSITE HANDOVER DIALOG */}
      {/* ================================================= */}
      {isOutboundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {t.modalOutboundTitle}
                </h3>
                <p className="text-xs font-mono font-light text-slate-400">
                  {outboundDepotId}
                </p>
              </div>
              <button
                onClick={() => setIsOutboundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.modalSelectDepot ||
                    (lang === 'tr' ? 'Hedef Depo *' : 'Target Depot *')}
                </label>
                <select
                  value={outboundDepotId}
                  onChange={(e) => setOutboundDepotId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  {depotLocations.map((d) => (
                    <option key={d.depot_id} value={d.depot_id}>
                      [{d.depot_id}] {d.depot_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.lblSelectMaterial}
                </label>
                <select
                  value={outboundCatalogId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setOutboundCatalogId(nextId);
                    const matched = balances.find(
                      (b) => b.catalog_item_id === nextId
                    );
                    if (matched) {
                      setOutboundDepotId(matched.depot_id);
                    } else {
                      setOutboundDepotId(resolveItemDepot(nextId));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">
                    {lang === 'tr'
                      ? '-- Stok Seçiniz --'
                      : '-- Select Stock Balance --'}
                  </option>
                  {balances.map((b) => (
                    <option
                      key={`${b.depot_id}-${b.catalog_item_id}`}
                      value={b.catalog_item_id}
                    >
                      {lang === 'tr'
                        ? b.catalog_item?.item_name_tr
                        : b.catalog_item?.item_name_en ||
                          b.catalog_item?.item_name_tr}{' '}
                      ({b.depot_id} • Mevcut: {b.quantity_on_hand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblTargetBuilding}
                  </label>
                  <select
                    value={outboundBuildingId}
                    onChange={(e) => setOutboundBuildingId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">
                      {lang === 'tr'
                        ? '-- Blok Seçin --'
                        : '-- Select Building Block --'}
                    </option>
                    {portfolioBuildings.map((bld) => (
                      <option key={bld.building_id} value={bld.building_id}>
                        {bld.building_name} ({bld.building_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblTargetUnit}
                  </label>
                  <input
                    type="text"
                    value={outboundUnitLabel}
                    onChange={(e) => setOutboundUnitLabel(e.target.value)}
                    placeholder="Daire 104 / 3. Kat"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblQuantity}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={outboundQty}
                    onChange={(e) =>
                      setOutboundQty(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.lblRequisitionId}
                  </label>
                  <input
                    type="text"
                    value={outboundReqId}
                    onChange={(e) => setOutboundReqId(e.target.value)}
                    placeholder="REQ-2026-XXXX"
                    className="w-full px-3 py-2 text-xs font-mono font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.lblIrsaliyeNo}
                </label>
                <input
                  type="text"
                  required
                  value={outboundIrsaliye}
                  onChange={(e) => setOutboundIrsaliye(e.target.value)}
                  placeholder="IRS-2026-XXXX"
                  className="w-full px-3 py-2 text-xs font-light rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsOutboundModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                {tc.cancel}
              </button>
              <button
                onClick={handleCreateOutbound}
                disabled={!outboundCatalogId || outboundQty <= 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.btnSaveOutbound}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
