'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  InventoryCatalogItem, 
  PortfolioProject, 
  PortfolioBuilding, 
  RoleTier,
  DepotLocation,
  DepotStockBalance,
  DepotTransaction,
  AssetRegisterItem
} from '@/types/requisition';
import MobileBarcodeScannerModal from '@/components/MobileBarcodeScannerModal';
import { canConfirmDepotHandover, canEditDepotStock } from '@/lib/rbac';

interface DepoManagementWorkspaceProps {
  catalogItems: InventoryCatalogItem[];
  portfolioProjects: PortfolioProject[];
  portfolioBuildings: PortfolioBuilding[];
  currentRole: RoleTier;
  lang: 'tr' | 'en';
  onNavigateToRequisitions?: () => void;
  onRegisterCatalogItem?: (newItem: InventoryCatalogItem) => void;
}

// Authoritative fallback seed dataset for DEPOT-PRJ02-MAIN (Caesar Resort & Spa - Main Depot)
const SEED_DEPOT: DepotLocation = {
  depot_id: 'DEPOT-PRJ02-MAIN',
  project_id: 'PRJ-02',
  depot_name: 'Caesar Resort & Spa - Ana Saha Deposu',
  depot_category: 'CENTRAL_CONSTRUCTION_DEPOT',
  is_active: true,
};

const SEED_BALANCES: DepotStockBalance[] = [
  {
    balance_id: 'bal-001',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-01',
    quantity_on_hand: 24,
    quantity_reserved: 4,
    min_stock_threshold: 8,
    last_scanned_at: '2026-11-18T14:30:00Z',
    catalog_item: {
      item_id: 'seed-cat-01',
      legacy_code: 'HVAC-VRF-04',
      item_name_tr: 'VRF Multi-Split Klima Dış & İç Ünite Seti (4 İç Ünite)',
      item_name_en: 'VRF Multi-Split HVAC Outdoor & Indoor Unit Set (4 Indoors)',
      specification: 'Inverter R32, 14kW Heat Pump, 4x Cassette Units',
      category: 'Mekanik & İklimlendirme',
      subcategory: 'VRF Sistemleri',
      unit_of_measure: 'set',
      base_cost_eur: 3850.00,
      consumption_rate: 1.0,
      consumption_metric: 'set_per_unit',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: '8690123456789',
      is_trackable_asset: true,
      packaging_unit_type: 'ATOMIC_SET',
      set_piece_count: 5,
      commercial_markup_pct: 18.0,
    },
  },
  {
    balance_id: 'bal-002',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-02',
    quantity_on_hand: 120,
    quantity_reserved: 30,
    min_stock_threshold: 40,
    last_scanned_at: '2026-11-17T09:15:00Z',
    catalog_item: {
      item_id: 'seed-cat-02',
      legacy_code: 'SAN-BTH-SET',
      item_name_tr: 'Gömme Rezervuar ve Asma Klozet Montaj Seti',
      item_name_en: 'Concealed Cistern and Wall-Hung Toilet Assembly Set',
      specification: 'Dual Flush 3/6L, Vitreous China, Soft-close seat',
      category: 'Sıhhi Tesisat & Vitrifiye',
      subcategory: 'Vitrifiye Takımları',
      unit_of_measure: 'set',
      base_cost_eur: 245.00,
      consumption_rate: 2.0,
      consumption_metric: 'set_per_unit',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: '8690987654321',
      is_trackable_asset: false,
      packaging_unit_type: 'ATOMIC_SET',
      set_piece_count: 3,
      commercial_markup_pct: 15.0,
    },
  },
  {
    balance_id: 'bal-003',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-03',
    quantity_on_hand: 5,
    quantity_reserved: 5,
    min_stock_threshold: 15, // Low stock trigger
    last_scanned_at: '2026-11-16T11:00:00Z',
    catalog_item: {
      item_id: 'seed-cat-03',
      legacy_code: 'ELE-GEN-50K',
      item_name_tr: '50 kVA Dizel Kabinli Jeneratör Güç Ünitesi',
      item_name_en: '50 kVA Diesel Soundproof Generator Power Unit',
      specification: 'Stage V, ATS Transfer Pano Dahil, 400V 50Hz',
      category: 'Elektrik & Altyapı',
      subcategory: 'Jeneratörler',
      unit_of_measure: 'adet',
      base_cost_eur: 9400.00,
      consumption_rate: 1.0,
      consumption_metric: 'pcs_per_building',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: '8690555666777',
      is_trackable_asset: true,
      packaging_unit_type: 'SINGLE_ITEM',
      set_piece_count: 1,
      commercial_markup_pct: 12.0,
    },
  },
  {
    balance_id: 'bal-004',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-04',
    quantity_on_hand: 850,
    quantity_reserved: 200,
    min_stock_threshold: 250,
    last_scanned_at: '2026-11-15T16:45:00Z',
    catalog_item: {
      item_id: 'seed-cat-04',
      legacy_code: 'CER-60120-POR',
      item_name_tr: '60x120 Rektifiye Porselen Seramik (Gri Mermer Doku)',
      item_name_en: '60x120 Rectified Porcelain Ceramic Tile (Grey Marble)',
      specification: 'PEI IV, Donmaya Dayanıklı, Kaymaz R10',
      category: 'İnce Yapı & Kaplama',
      subcategory: 'Seramik & Doğaltaş',
      unit_of_measure: 'm2',
      base_cost_eur: 18.50,
      consumption_rate: 1.08,
      consumption_metric: 'm2_per_m2',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: '8690111222333',
      is_trackable_asset: false,
      packaging_unit_type: 'SINGLE_ITEM',
      set_piece_count: 1,
      commercial_markup_pct: 15.0,
    },
  },
];

const SEED_TRANSACTIONS: DepotTransaction[] = [
  {
    transaction_id: 'tx-001',
    transaction_code: 'MOV-202611-9A21',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-01',
    movement_type: 'INBOUND_RECEIPT',
    quantity: 12,
    requisition_id: 'REQ-202611-74B1',
    irsaliye_number: 'IRS-2026-88410',
    irsaliye_doc_url: 'https://docs.caesar.com/irsaliye/IRS-2026-88410.pdf',
    invoice_number: 'FAT-2026-004921',
    invoice_doc_url: 'https://docs.caesar.com/invoices/FAT-2026-004921.pdf',
    supplier_name: 'Daikin Doğu Akdeniz Ltd.',
    unit_cost_eur: 3850.00,
    final_valued_cost_eur: 4543.00,
    has_missing_docs: false,
    delivery_confirmed: true,
    confirmed_by_uuid: 'seed-user-uuid',
    confirmed_at: '2026-11-18T14:30:00Z',
    notes: 'Ana depoya 12 set VRF teslim alındı, barkodlar ve seri numaraları işlendi.',
    created_at: '2026-11-18T14:30:00Z',
  },
  {
    transaction_id: 'tx-002',
    transaction_code: 'MOV-202611-3C84',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-01',
    movement_type: 'OUTBOUND_HANDOVER',
    quantity: 2,
    requisition_id: 'REQ-202611-88D2',
    target_building_id: 'PRJ-02-BLD-01',
    target_unit_label: 'Villa V-102 & V-103',
    irsaliye_number: 'IRS-2026-88445',
    irsaliye_doc_url: 'https://docs.caesar.com/irsaliye/IRS-2026-88445.pdf',
    invoice_number: 'FAT-2026-004921',
    invoice_doc_url: 'https://docs.caesar.com/invoices/FAT-2026-004921.pdf',
    supplier_name: 'Daikin Doğu Akdeniz Ltd.',
    unit_cost_eur: 3850.00,
    final_valued_cost_eur: 4543.00,
    has_missing_docs: false,
    delivery_confirmed: false, // Pending field delivery confirmation!
    notes: 'Saha montaj ekibine teslim edilecek. Seri numaralı üniteler tahsis edildi.',
    created_at: '2026-11-19T08:00:00Z',
  },
  {
    transaction_id: 'tx-003',
    transaction_code: 'MOV-202611-4E19',
    depot_id: 'DEPOT-PRJ02-MAIN',
    catalog_item_id: 'seed-cat-02',
    movement_type: 'INBOUND_RECEIPT',
    quantity: 60,
    requisition_id: null, // MISSING REQUISITION LINK
    irsaliye_number: 'IRS-2026-89012',
    irsaliye_doc_url: null,
    invoice_number: null, // MISSING INVOICE
    invoice_doc_url: null,
    supplier_name: 'Geberit Kıbrıs Dağıtım A.Ş.',
    unit_cost_eur: 245.00,
    final_valued_cost_eur: 281.75,
    has_missing_docs: true, // FLAG TRIGGERED!
    delivery_confirmed: true,
    confirmed_by_uuid: 'seed-user-uuid',
    confirmed_at: '2026-11-17T09:15:00Z',
    notes: 'Acil irsaliyeli mal kabulü yapıldı. Fatura ve talep eşleştirmesi bekleniyor.',
    created_at: '2026-11-17T09:15:00Z',
  },
];

const SEED_ASSETS: AssetRegisterItem[] = [
  {
    asset_id: 'ast-001',
    asset_tag: 'AST-2026-9A1F',
    catalog_item_id: 'seed-cat-01',
    barcode_ean: '8690123456789',
    serial_number: 'SN-VRF-884920',
    current_depot_id: 'DEPOT-PRJ02-MAIN',
    custody_status: 'IN_DEPOT',
    inbound_transaction_id: 'tx-001',
    warranty_expiry_date: '2029-11-18',
    notes: 'VRF Dış Ünite Ana Kompresör Grubu',
    created_at: '2026-11-18T14:30:00Z',
  },
  {
    asset_id: 'ast-002',
    asset_tag: 'AST-2026-3C8B',
    catalog_item_id: 'seed-cat-01',
    barcode_ean: '8690123456789',
    serial_number: 'SN-VRF-884921',
    current_depot_id: 'DEPOT-PRJ02-MAIN',
    custody_status: 'IN_DEPOT',
    inbound_transaction_id: 'tx-001',
    warranty_expiry_date: '2029-11-18',
    notes: 'VRF Dış Ünite Ana Kompresör Grubu',
    created_at: '2026-11-18T14:30:00Z',
  },
  {
    asset_id: 'ast-003',
    asset_tag: 'AST-2026-7B99',
    catalog_item_id: 'seed-cat-03',
    barcode_ean: '8690555666777',
    serial_number: 'GEN-50K-2026-004',
    current_depot_id: null,
    deployed_building_id: 'PRJ-02-BLD-01',
    deployed_unit_label: 'Teknik Hacim Jeneratör Odası',
    custody_status: 'HANDED_OVER_TO_AFTERSALES',
    inbound_transaction_id: 'tx-001',
    outbound_transaction_id: 'tx-002',
    warranty_expiry_date: '2028-05-10',
    notes: 'Şantiye elektrik grubuna tutanakla zimmetlendi.',
    created_at: '2026-11-10T11:00:00Z',
  },
];

export default function DepoManagementWorkspace({
  catalogItems,
  portfolioProjects,
  portfolioBuildings,
  currentRole,
  lang,
  onNavigateToRequisitions,
  onRegisterCatalogItem,
}: DepoManagementWorkspaceProps) {
  // RBAC Permission Guards
  const canEdit = canEditDepotStock(currentRole);
  const canConfirm = canConfirmDepotHandover(currentRole);

  // State
  const [activeDepotId, setActiveDepotId] = useState<string>(SEED_DEPOT.depot_id);
  const [activeTab, setActiveTab] = useState<'BALANCES' | 'MOVEMENTS' | 'ASSETS'>('BALANCES');
  const [balances, setBalances] = useState<DepotStockBalance[]>(SEED_BALANCES);
  const [transactions, setTransactions] = useState<DepotTransaction[]>(SEED_TRANSACTIONS);
  const [assets, setAssets] = useState<AssetRegisterItem[]>(SEED_ASSETS);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [missingDocsOnly, setMissingDocsOnly] = useState<boolean>(false);
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Local state for registered catalog items to instantly reflect additions
  const [localCatalogItems, setLocalCatalogItems] = useState<InventoryCatalogItem[]>([]);

  // Merged catalog list for all dropdowns, lookups and scanner modals
  const allCatalogItems = useMemo(() => {
    const base = catalogItems.length > 0 ? catalogItems : balances.map((b) => b.catalog_item!).filter(Boolean);
    const map = new Map<string, InventoryCatalogItem>();
    base.forEach((item) => map.set(item.item_id, item));
    localCatalogItems.forEach((item) => map.set(item.item_id, item));
    return Array.from(map.values());
  }, [catalogItems, balances, localCatalogItems]);

  // Modals & Drawers
  const [editingTransaction, setEditingTransaction] = useState<DepotTransaction | null>(null);
  const [docDrawerIrsaliye, setDocDrawerIrsaliye] = useState<string>('');
  const [docDrawerInvoice, setDocDrawerInvoice] = useState<string>('');
  const [docDrawerReq, setDocDrawerReq] = useState<string>('');
  const [docDrawerSupplier, setDocDrawerSupplier] = useState<string>('');

  const [isInboundModalOpen, setIsInboundModalOpen] = useState<boolean>(false);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState<boolean>(false);

  // Form states for Inbound Modal
  const [inboundCatalogId, setInboundCatalogId] = useState<string>('');
  const [inboundQty, setInboundQty] = useState<number>(1);
  const [inboundCostEur, setInboundCostEur] = useState<number>(0);
  const [inboundIrsaliye, setInboundIrsaliye] = useState<string>('');
  const [inboundInvoice, setInboundInvoice] = useState<string>('');
  const [inboundSupplier, setInboundSupplier] = useState<string>('');
  const [inboundSerials, setInboundSerials] = useState<string>('');

  // Form states for Outbound Modal
  const [outboundCatalogId, setOutboundCatalogId] = useState<string>('');
  const [outboundBuildingId, setOutboundBuildingId] = useState<string>('');
  const [outboundUnitLabel, setOutboundUnitLabel] = useState<string>('');
  const [outboundReqId, setOutboundReqId] = useState<string>('');
  const [outboundQty, setOutboundQty] = useState<number>(1);
  const [outboundIrsaliye, setOutboundIrsaliye] = useState<string>('');

  // Translations
  const t = {
    depotTitle: lang === 'tr' ? 'Depo & Stok Yönetim Merkezi' : 'Depot & Stock Management Center',
    depotSubTitle: lang === 'tr' 
      ? 'Caesar Purchasing Sub-Ledger • Şantiye Mal Kabul, Barkod Tarama & Zimmet Defteri' 
      : 'Caesar Purchasing Sub-Ledger • Site Intake, Barcode Scanning & Custody Register',
    selectDepot: lang === 'tr' ? 'Aktif Depo:' : 'Active Depot:',
    activeBadge: lang === 'tr' ? 'AKTİF SAHA DEPOSU' : 'ACTIVE SITE DEPOT',
    btnScanBarcode: lang === 'tr' ? 'Kamera Barkod Okut' : 'Scan Barcode',
    btnInbound: lang === 'tr' ? '+ Malzeme Girişi (İrsaliye)' : '+ Inbound Receipt',
    btnOutbound: lang === 'tr' ? '+ Şantiye Çıkışı (Teslimat)' : '+ Outbound Handover',
    
    // KPI Cards
    kpiSkus: lang === 'tr' ? 'Toplam Aktif Kalem (SKU)' : 'Active SKUs in Depot',
    kpiAssets: lang === 'tr' ? 'Zimmetteki Seri Nolu Varlıklar' : 'Serialized Assets in Custody',
    kpiPending: lang === 'tr' ? 'Teslimat Bekleyen Çıkışlar' : 'Pending Handovers',
    kpiMissing: lang === 'tr' ? 'Eksik Evrak Uyarısı' : 'Missing Doc Alerts',
    
    // Tabs
    tabBalances: lang === 'tr' ? 'Depo Stok Bakiyeleri' : 'Stock Balances',
    tabMovements: lang === 'tr' ? 'Stok Hareket & İrsaliye Defteri' : 'Movement & Dispatch Ledger',
    tabAssets: lang === 'tr' ? 'Seri Nolu Varlık Sicil Defteri' : 'Asset Custody Register',

    // Table Headers
    thCode: lang === 'tr' ? 'Barkod / Kod' : 'Barcode / SKU',
    thMaterial: lang === 'tr' ? 'Malzeme Tanımı' : 'Material Description',
    thPackaging: lang === 'tr' ? 'Ambalaj Tipi' : 'Packaging',
    thOnHand: lang === 'tr' ? 'Eldeki Miktar' : 'On Hand',
    thReserved: lang === 'tr' ? 'Rezerve' : 'Reserved',
    thUnitCost: lang === 'tr' ? 'Birim Maliyet' : 'Unit Cost',
    thValuedCost: lang === 'tr' ? 'Değerlenmiş Fiyat' : 'Valued Cost',
    thLastScan: lang === 'tr' ? 'Son İşlem' : 'Last Activity',
    thAction: lang === 'tr' ? 'İşlem' : 'Action',
    
    // Movement Headers
    thMovCode: lang === 'tr' ? 'Hareket No' : 'Movement ID',
    thMovType: lang === 'tr' ? 'İşlem Türü' : 'Type',
    thReqLink: lang === 'tr' ? 'Talep No (REQ)' : 'Requisition ID',
    thDocs: lang === 'tr' ? 'İrsaliye / Fatura' : 'Dispatch / Invoice',
    thTarget: lang === 'tr' ? 'Hedef Şantiye / Blok' : 'Target Block / Unit',
    thHandoverStatus: lang === 'tr' ? 'Teslim Durumu' : 'Handover Status',

    // Asset Headers
    thAssetTag: lang === 'tr' ? 'Varlık Etiketi' : 'Asset Tag',
    thSerial: lang === 'tr' ? 'Seri No (S/N)' : 'Serial Number',
    thCustody: lang === 'tr' ? 'Zimmet Durumu' : 'Custody Status',
    thLocation: lang === 'tr' ? 'Konum / Blok' : 'Location',
    thWarranty: lang === 'tr' ? 'Garanti Bitiş' : 'Warranty Until',

    // Status Badges
    atomicSet: lang === 'tr' ? 'ATOMIC SET' : 'ATOMIC SET',
    singleItem: lang === 'tr' ? 'TEKİL' : 'SINGLE',
    lowStock: lang === 'tr' ? 'KRİTİK STOK' : 'LOW STOCK',
    inboundType: lang === 'tr' ? 'GİRİŞ (MAL KABUL)' : 'INBOUND RECEIPT',
    outboundType: lang === 'tr' ? 'ÇIKIŞ (ŞANTİYE)' : 'OUTBOUND HANDOVER',
    adjustmentType: lang === 'tr' ? 'SAYIM / DÜZELTME' : 'STOCK ADJUSTMENT',
    returnType: lang === 'tr' ? 'İADE (SATIŞ SONRASI)' : 'AFTERSALES RETURN',
    docsComplete: lang === 'tr' ? 'Evraklar Tamam' : 'Docs Complete',
    docsMissing: lang === 'tr' ? 'Eksik Evrak' : 'Missing Docs',
    delivered: lang === 'tr' ? 'Teslim Edildi' : 'Handover Confirmed',
    pendingDelivery: lang === 'tr' ? 'Şantiyede Teslim Bekliyor' : 'Pending Drop-off',
    btnConfirmDelivery: lang === 'tr' ? 'Teslim Onayla' : 'Confirm Handover',
    btnCompleteDocs: lang === 'tr' ? 'Evrak Tamamla' : 'Complete Docs',
    searchPlaceholder: lang === 'tr' ? 'Barkod, Kod, Malzeme, İrsaliye veya Seri No Ara...' : 'Search Barcode, SKU, Material, Dispatch or S/N...',
  };

  // Hydrate from Supabase if present
  const fetchDepotData = useCallback(async () => {
    try {
      const { data: bData, error: bErr } = await supabase
        .from('depot_stock_balances')
        .select('*, catalog_item:inventory_catalog(*)')
        .eq('depot_id', activeDepotId);

      const { data: tData, error: tErr } = await supabase
        .from('depot_transactions')
        .select('*, catalog_item:inventory_catalog(*)')
        .eq('depot_id', activeDepotId)
        .order('created_at', { ascending: false });

      const { data: aData, error: aErr } = await supabase
        .from('asset_register')
        .select('*, catalog_item:inventory_catalog(*)');

      if (!bErr && bData && bData.length > 0) {
        setBalances(bData as DepotStockBalance[]);
      }
      if (!tErr && tData && tData.length > 0) {
        setTransactions(tData as DepotTransaction[]);
      }
      if (!aErr && aData && aData.length > 0) {
        setAssets(aData as AssetRegisterItem[]);
      }
    } catch {
      // Retain authoritative seed fallback on offline / schema initialization
    }
  }, [activeDepotId]);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      await fetchDepotData();
    };
    if (!ignore) {
      void init();
    }
    return () => {
      ignore = true;
    };
  }, [fetchDepotData]);

  // Turkish locale search normalizer
  const normalizeText = useCallback((str?: string | null): string => {
    if (!str) return '';
    return lang === 'tr' ? str.toLocaleLowerCase('tr-TR') : str.toLowerCase();
  }, [lang]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalSkus = balances.length;
    const assetsInDepot = assets.filter((a) => a.custody_status === 'IN_DEPOT').length;
    const pendingHandovers = transactions.filter(
      (t) => t.movement_type === 'OUTBOUND_HANDOVER' && !t.delivery_confirmed
    ).length;
    const missingDocsCount = transactions.filter((t) => t.has_missing_docs).length;

    return { totalSkus, assetsInDepot, pendingHandovers, missingDocsCount };
  }, [balances, assets, transactions]);

  // Filtered Balances
  const filteredBalances = useMemo(() => {
    const query = normalizeText(filterText);
    return balances.filter((b) => {
      const item = b.catalog_item;
      const name = normalizeText(item?.item_name_tr) + ' ' + normalizeText(item?.item_name_en);
      const code = normalizeText(item?.legacy_code);
      const ean = normalizeText(item?.barcode_ean);

      const matchesText = !query || name.includes(query) || code.includes(query) || ean.includes(query);
      const matchesLowStock = !lowStockOnly || (b.quantity_on_hand <= b.min_stock_threshold);

      return matchesText && matchesLowStock;
    });
  }, [balances, filterText, lowStockOnly, normalizeText]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const query = normalizeText(filterText);
    return transactions.filter((tx) => {
      const item = tx.catalog_item || balances.find((b) => b.catalog_item_id === tx.catalog_item_id)?.catalog_item;
      const name = normalizeText(item?.item_name_tr) + ' ' + normalizeText(item?.item_name_en);
      const txCode = normalizeText(tx.transaction_code);
      const reqId = normalizeText(tx.requisition_id);
      const irs = normalizeText(tx.irsaliye_number);
      const inv = normalizeText(tx.invoice_number);
      const supp = normalizeText(tx.supplier_name);

      const matchesText = !query || 
        name.includes(query) || 
        txCode.includes(query) || 
        reqId.includes(query) || 
        irs.includes(query) || 
        inv.includes(query) || 
        supp.includes(query);

      const matchesType = movementFilter === 'ALL' || tx.movement_type === movementFilter;
      const matchesMissing = !missingDocsOnly || tx.has_missing_docs;

      return matchesText && matchesType && matchesMissing;
    });
  }, [transactions, balances, filterText, movementFilter, missingDocsOnly, normalizeText]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    const query = normalizeText(filterText);
    return assets.filter((ast) => {
      const tag = normalizeText(ast.asset_tag);
      const sn = normalizeText(ast.serial_number);
      const item = ast.catalog_item || balances.find((b) => b.catalog_item_id === ast.catalog_item_id)?.catalog_item;
      const name = normalizeText(item?.item_name_tr) + ' ' + normalizeText(item?.item_name_en);

      return !query || tag.includes(query) || sn.includes(query) || name.includes(query);
    });
  }, [assets, balances, filterText, normalizeText]);

  // 1-Tap Outbound Handover Confirmation
  const handleConfirmDelivery = async (txId: string) => {
    if (!canConfirmDepotHandover(currentRole)) {
      alert(
        lang === 'tr'
          ? 'Yetkisiz İşlem: Yalnızca Depo Müdürü veya Yönetim Kurulu teslimat onaylayabilir.'
          : 'Unauthorized: Only Depot Manager or Executive can confirm delivery.'
      );
      return;
    }
    const tx = transactions.find((t) => t.transaction_id === txId);
    if (!tx) return;

    const confirmedAt = new Date().toISOString();

    // 1. Decrement Stock Balance
    setBalances((prev) =>
      prev.map((b) => {
        if (b.catalog_item_id === tx.catalog_item_id && b.depot_id === tx.depot_id) {
          const newOnHand = Math.max(0, b.quantity_on_hand - tx.quantity);
          const newReserved = Math.max(0, b.quantity_reserved - tx.quantity);
          return { ...b, quantity_on_hand: newOnHand, quantity_reserved: newReserved };
        }
        return b;
      })
    );

    // 2. Mark Transaction Confirmed
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.transaction_id === txId) {
          return {
            ...t,
            delivery_confirmed: true,
            confirmed_at: confirmedAt,
            confirmed_by_uuid: 'seed-user-uuid',
          };
        }
        return t;
      })
    );

    // 3. Transition Serialized Assets to HANDED_OVER_TO_AFTERSALES
    setAssets((prev) =>
      prev.map((a) => {
        if (a.catalog_item_id === tx.catalog_item_id && a.custody_status === 'IN_DEPOT') {
          return {
            ...a,
            custody_status: 'HANDED_OVER_TO_AFTERSALES',
            outbound_transaction_id: tx.transaction_id,
            deployed_building_id: tx.target_building_id || null,
            deployed_unit_label: tx.target_unit_label || null,
            updated_at: confirmedAt,
          };
        }
        return a;
      })
    );

    // Try Supabase sync (omitting GENERATED column has_missing_docs)
    try {
      await supabase
        .from('depot_transactions')
        .update({
          delivery_confirmed: true,
          confirmed_at: confirmedAt,
          confirmed_by_uuid: 'seed-user-uuid',
        })
        .eq('transaction_id', txId);
    } catch {
      // offline safe
    }
  };

  // Missing Doc Drawer Save
  const handleSaveMissingDocs = async () => {
    if (!editingTransaction) return;

    const isComplete = Boolean(docDrawerIrsaliye && docDrawerInvoice && docDrawerReq);

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.transaction_id === editingTransaction.transaction_id) {
          return {
            ...t,
            irsaliye_number: docDrawerIrsaliye || null,
            invoice_number: docDrawerInvoice || null,
            requisition_id: docDrawerReq || null,
            supplier_name: docDrawerSupplier || t.supplier_name,
            has_missing_docs: !isComplete,
          };
        }
        return t;
      })
    );

    // Update Supabase (strictly omitting has_missing_docs)
    try {
      await supabase
        .from('depot_transactions')
        .update({
          irsaliye_number: docDrawerIrsaliye || null,
          invoice_number: docDrawerInvoice || null,
          requisition_id: docDrawerReq || null,
          supplier_name: docDrawerSupplier || editingTransaction.supplier_name,
        })
        .eq('transaction_id', editingTransaction.transaction_id);
    } catch {
      // offline safe
    }

    setEditingTransaction(null);
  };

  // Handle Registered Item from Quick-Registry Form in MobileBarcodeScannerModal
  const handleItemRegistered = useCallback((
    newCatalogItem: InventoryCatalogItem,
    newBalance: DepotStockBalance,
    newTx: DepotTransaction,
    newAsset?: AssetRegisterItem
  ) => {
    setLocalCatalogItems((prev) => [newCatalogItem, ...prev]);
    setBalances((prev) => {
      const exists = prev.some((b) => b.catalog_item_id === newBalance.catalog_item_id && b.depot_id === newBalance.depot_id);
      if (exists) {
        return prev.map((b) => (b.catalog_item_id === newBalance.catalog_item_id && b.depot_id === newBalance.depot_id ? newBalance : b));
      }
      return [newBalance, ...prev];
    });
    setTransactions((prev) => [newTx, ...prev]);
    if (newAsset) {
      setAssets((prev) => [newAsset, ...prev]);
    }
    onRegisterCatalogItem?.(newCatalogItem);
  }, [onRegisterCatalogItem]);

  // Handle Inbound Form Submit
  const handleCreateInbound = async () => {
    if (!canEditDepotStock(currentRole)) {
      alert(
        lang === 'tr'
          ? 'Yetkisiz İşlem: Malzeme girişi yapma yetkiniz bulunmamaktadır.'
          : 'Unauthorized: You do not have permission to record inbound receipts.'
      );
      return;
    }
    if (!inboundCatalogId || inboundQty <= 0) return;

    const catalogItem = allCatalogItems.find((c) => c.item_id === inboundCatalogId) ||
                        balances.find((b) => b.catalog_item_id === inboundCatalogId)?.catalog_item;
    if (!catalogItem) return;

    const txCode = `MOV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const cost = inboundCostEur || catalogItem.base_cost_eur || 0;
    const markup = catalogItem.commercial_markup_pct ?? 15;
    const finalValued = Number((cost * (1 + markup / 100)).toFixed(2));
    const isMissing = !inboundIrsaliye || !inboundInvoice;

    const newTx: DepotTransaction = {
      transaction_id: `tx-${Date.now()}`,
      transaction_code: txCode,
      depot_id: activeDepotId,
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

    // Update balances
    setBalances((prev) => {
      const existing = prev.find((b) => b.catalog_item_id === catalogItem.item_id);
      if (existing) {
        return prev.map((b) =>
          b.catalog_item_id === catalogItem.item_id
            ? { ...b, quantity_on_hand: b.quantity_on_hand + Number(inboundQty), last_scanned_at: new Date().toISOString() }
            : b
        );
      }
      return [
        ...prev,
        {
          balance_id: `bal-${Date.now()}`,
          depot_id: activeDepotId,
          catalog_item_id: catalogItem.item_id,
          quantity_on_hand: Number(inboundQty),
          quantity_reserved: 0,
          min_stock_threshold: 5,
          last_scanned_at: new Date().toISOString(),
          catalog_item: catalogItem,
        },
      ];
    });

    setTransactions((prev) => [newTx, ...prev]);

    // If trackable asset with serial numbers provided
    if (catalogItem.is_trackable_asset && inboundSerials.trim()) {
      const serialList = inboundSerials.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const newAssetItems: AssetRegisterItem[] = serialList.map((sn, idx) => ({
        asset_id: `ast-${Date.now()}-${idx}`,
        asset_tag: `AST-${new Date().getFullYear()}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
        catalog_item_id: catalogItem.item_id,
        barcode_ean: catalogItem.barcode_ean || null,
        serial_number: sn,
        current_depot_id: activeDepotId,
        custody_status: 'IN_DEPOT',
        inbound_transaction_id: newTx.transaction_id,
        created_at: new Date().toISOString(),
        catalog_item: catalogItem,
      }));
      setAssets((prev) => [...newAssetItems, ...prev]);
    }

    // Reset Form
    setIsInboundModalOpen(false);
    setInboundCatalogId('');
    setInboundQty(1);
    setInboundCostEur(0);
    setInboundIrsaliye('');
    setInboundInvoice('');
    setInboundSupplier('');
    setInboundSerials('');
  };

  // Handle Outbound Form Submit
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

    const catalogItem = allCatalogItems.find((c) => c.item_id === outboundCatalogId) ||
                        balances.find((b) => b.catalog_item_id === outboundCatalogId)?.catalog_item;
    if (!catalogItem) return;

    const txCode = `MOV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const cost = catalogItem.base_cost_eur || 0;
    const markup = catalogItem.commercial_markup_pct ?? 15;
    const finalValued = Number((cost * (1 + markup / 100)).toFixed(2));
    const isMissing = !outboundIrsaliye || !outboundReqId;

    const newTx: DepotTransaction = {
      transaction_id: `tx-${Date.now()}`,
      transaction_code: txCode,
      depot_id: activeDepotId,
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
      delivery_confirmed: false, // Must be confirmed on site
      created_at: new Date().toISOString(),
      catalog_item: catalogItem,
    };

    // Increment reserved stock until delivery confirmed
    setBalances((prev) =>
      prev.map((b) =>
        b.catalog_item_id === catalogItem.item_id
          ? { ...b, quantity_reserved: b.quantity_reserved + Number(outboundQty) }
          : b
      )
    );

    setTransactions((prev) => [newTx, ...prev]);

    // Reset Form
    setIsOutboundModalOpen(false);
    setOutboundCatalogId('');
    setOutboundBuildingId('');
    setOutboundUnitLabel('');
    setOutboundReqId('');
    setOutboundQty(1);
    setOutboundIrsaliye('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Depo Master Header */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                {t.depotTitle}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                {t.activeBadge}
              </span>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                [{currentRole}]
              </span>
            </div>
            <p className="text-xs font-light text-slate-500 dark:text-slate-400">
              {t.depotSubTitle}
            </p>
          </div>

          {/* Depot Context Switcher & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-light text-slate-400 mr-2">{t.selectDepot}</span>
              <select
                value={activeDepotId}
                onChange={(e) => setActiveDepotId(e.target.value)}
                className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden"
              >
                <option value={SEED_DEPOT.depot_id}>{SEED_DEPOT.depot_name} ({SEED_DEPOT.project_id})</option>
                {portfolioProjects.filter((p) => p.project_id !== SEED_DEPOT.project_id).map((p) => (
                  <option key={p.project_id} value={`DEPOT-${p.project_id}-MAIN`}>
                    {p.project_name} (Saha Deposu)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>{t.btnScanBarcode}</span>
            </button>

            <button
              onClick={() => canEdit && setIsInboundModalOpen(true)}
              disabled={!canEdit}
              title={!canEdit ? (lang === 'tr' ? 'Yetki yetersiz: Stok girişi yapamazsınız' : 'Insufficient permission: Cannot record inbound') : undefined}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5 ${
                canEdit
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-emerald-600/40 text-white/50 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t.btnInbound}</span>
            </button>

            <button
              onClick={() => canEdit && setIsOutboundModalOpen(true)}
              disabled={!canEdit}
              title={!canEdit ? (lang === 'tr' ? 'Yetki yetersiz: Şantiye çıkışı yapamazsınız' : 'Insufficient permission: Cannot record outbound') : undefined}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-1.5 ${
                canEdit
                  ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                  : 'bg-amber-600/40 text-white/50 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t.btnOutbound}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stat KPI Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active SKUs */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.kpiSkus}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpiStats.totalSkus}
            </span>
            <span className="text-xs font-light text-slate-400">Kalem</span>
          </div>
        </div>

        {/* KPI 2: Serialized Assets */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.kpiAssets}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {kpiStats.assetsInDepot}
            </span>
            <span className="text-xs font-light text-slate-400">Seri No Kayıtlı</span>
          </div>
        </div>

        {/* KPI 3: Pending Handovers */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.kpiPending}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpiStats.pendingHandovers}
            </span>
            <span className="text-xs font-light text-slate-400">Saha Teslim Bekleyen</span>
          </div>
        </div>

        {/* KPI 4: Missing Docs Alerts */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.kpiMissing}
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              kpiStats.missingDocsCount > 0 
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 animate-pulse' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${kpiStats.missingDocsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {kpiStats.missingDocsCount}
            </span>
            <span className="text-xs font-light text-slate-400">İrsaliye / Fatura Eksik</span>
          </div>
        </div>

      </div>

      {/* Workspace Tabs & Filter Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('BALANCES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'BALANCES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabBalances} ({balances.length})
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabMovements} ({transactions.length})
              {kpiStats.missingDocsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white">
                  {kpiStats.missingDocsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ASSETS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ASSETS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.tabAssets} ({assets.length})
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
            {activeTab === 'BALANCES' && (
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  lowStockOnly
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                    : 'text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t.lowStock}
              </button>
            )}

            {activeTab === 'MOVEMENTS' && (
              <>
                <select
                  value={movementFilter}
                  onChange={(e) => setMovementFilter(e.target.value)}
                  className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="ALL">{lang === 'tr' ? 'Tüm Hareketler' : 'All Movements'}</option>
                  <option value="INBOUND_RECEIPT">{t.inboundType}</option>
                  <option value="OUTBOUND_HANDOVER">{t.outboundType}</option>
                </select>

                <button
                  onClick={() => setMissingDocsOnly(!missingDocsOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    missingDocsOnly
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      : 'text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.docsMissing} ({kpiStats.missingDocsCount})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* ================================================= */}
        {/* TAB 1: STOCK BALANCES LEDGER TABLE */}
        {/* ================================================= */}
        {activeTab === 'BALANCES' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t.thCode}</th>
                  <th className="px-4 py-3">{t.thMaterial}</th>
                  <th className="px-4 py-3">{t.thPackaging}</th>
                  <th className="px-4 py-3 text-right">{t.thOnHand}</th>
                  <th className="px-4 py-3 text-right">{t.thReserved}</th>
                  <th className="px-4 py-3 text-right">{t.thUnitCost}</th>
                  <th className="px-4 py-3 text-right">{t.thValuedCost}</th>
                  <th className="px-4 py-3 text-center">{t.thAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-light">
                      {lang === 'tr' ? 'Kriterlere uygun stok kaydı bulunamadı.' : 'No stock balance records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
                    const item = b.catalog_item;
                    const baseCost = item?.base_cost_eur || 0;
                    const markup = item?.commercial_markup_pct ?? 15;
                    const valued = Number((baseCost * (1 + markup / 100)).toFixed(2));
                    const isLowStock = b.quantity_on_hand <= b.min_stock_threshold;

                    return (
                      <tr key={b.balance_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                            <span>{item?.barcode_ean || item?.legacy_code || b.catalog_item_id}</span>
                            {item?.legacy_code && item?.barcode_ean && (
                              <span className="text-[10px] text-slate-400 font-mono">{item.legacy_code}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr' ? item?.item_name_tr : (item?.item_name_en || item?.item_name_tr)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item?.category} {item?.subcategory ? `• ${item.subcategory}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item?.packaging_unit_type === 'ATOMIC_SET' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                              {t.atomicSet} ({item.set_piece_count || 1} parça)
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
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title={t.lowStock} />
                            )}
                            <span className={`font-bold text-sm ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                              {b.quantity_on_hand}
                            </span>
                            <span className="text-[11px] text-slate-400">{item?.unit_of_measure}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-light text-slate-500">
                          {b.quantity_reserved} {item?.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 text-right font-light text-slate-600 dark:text-slate-400">
                          €{baseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          €{valued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => {
                                if (!canEdit) return;
                                setOutboundCatalogId(b.catalog_item_id);
                                setIsOutboundModalOpen(true);
                              }}
                              disabled={!canEdit}
                              title={!canEdit ? (lang === 'tr' ? 'Yetki yetersiz' : 'Insufficient permission') : undefined}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                canEdit
                                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-pointer'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              }`}
                            >
                              {lang === 'tr' ? 'Çıkış Yap' : 'Issue'}
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

        {/* ================================================= */}
        {/* TAB 2: TRANSACTION & İRSALİYE LEDGER TABLE */}
        {/* ================================================= */}
        {activeTab === 'MOVEMENTS' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t.thMovCode}</th>
                  <th className="px-4 py-3">{t.thMovType}</th>
                  <th className="px-4 py-3">{t.thMaterial}</th>
                  <th className="px-4 py-3 text-right">{t.thOnHand}</th>
                  <th className="px-4 py-3">{t.thReqLink}</th>
                  <th className="px-4 py-3">{t.thDocs}</th>
                  <th className="px-4 py-3">{t.thTarget}</th>
                  <th className="px-4 py-3 text-right">{t.thValuedCost}</th>
                  <th className="px-4 py-3 text-center">{t.thHandoverStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-light">
                      {lang === 'tr' ? 'Kriterlere uygun hareket kaydı bulunamadı.' : 'No movement records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const item = tx.catalog_item || balances.find((b) => b.catalog_item_id === tx.catalog_item_id)?.catalog_item;
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {tx.transaction_code}
                          <div className="text-[10px] font-light text-slate-400">
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString('tr-TR') : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[11px]">
                          {tx.movement_type === 'INBOUND_RECEIPT' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t.inboundType}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {t.outboundType}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr' ? item?.item_name_tr : (item?.item_name_en || item?.item_name_tr)}
                          </div>
                          {tx.supplier_name && (
                            <div className="text-[11px] text-slate-400">{tx.supplier_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {tx.quantity} <span className="text-[11px] font-light text-slate-400">{item?.unit_of_measure}</span>
                        </td>
                        <td className="px-4 py-3">
                          {tx.requisition_id ? (
                            <button
                              onClick={() => onNavigateToRequisitions?.()}
                              className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {tx.requisition_id}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                              REQ EKSİK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 font-bold">İrsaliye:</span>
                              <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                {tx.irsaliye_number || (
                                  <span className="text-rose-500 font-bold">EKSİK</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 font-bold">Fatura:</span>
                              <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                {tx.invoice_number || (
                                  <span className="text-rose-500 font-bold">EKSİK</span>
                                )}
                              </span>
                            </div>
                            {tx.has_missing_docs && (
                              <button
                                onClick={() => {
                                  setEditingTransaction(tx);
                                  setDocDrawerIrsaliye(tx.irsaliye_number || '');
                                  setDocDrawerInvoice(tx.invoice_number || '');
                                  setDocDrawerReq(tx.requisition_id || '');
                                  setDocDrawerSupplier(tx.supplier_name || '');
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-200"
                              >
                                {t.btnCompleteDocs}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {tx.target_building_id ? (
                            <div>
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {tx.target_building_id}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {tx.target_unit_label || '-'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          €{(tx.final_valued_cost_eur * tx.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                                onClick={() => canConfirm && handleConfirmDelivery(tx.transaction_id)}
                                disabled={!canConfirm}
                                title={!canConfirm ? (lang === 'tr' ? 'Yalnızca Depo Müdürü veya Yönetim Kurulu teslimat onaylayabilir' : 'Only Depot Manager or Executive can confirm delivery') : undefined}
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

        {/* ================================================= */}
        {/* TAB 3: SERIALIZED ASSET REGISTER TABLE */}
        {/* ================================================= */}
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
                  <th className="px-4 py-3">{lang === 'tr' ? 'Notlar' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light text-slate-700 dark:text-slate-300">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-light">
                      {lang === 'tr' ? 'Kayıtlı seri numaralı varlık bulunamadı.' : 'No serialized assets registered.'}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((ast) => {
                    const item = ast.catalog_item || balances.find((b) => b.catalog_item_id === ast.catalog_item_id)?.catalog_item;
                    return (
                      <tr key={ast.asset_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {ast.asset_tag}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {ast.serial_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {lang === 'tr' ? item?.item_name_tr : (item?.item_name_en || item?.item_name_tr)}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            EAN: {ast.barcode_ean || item?.barcode_ean || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[11px]">
                          {ast.custody_status === 'IN_DEPOT' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                              DEPODA (Zimmete Hazır)
                            </span>
                          )}
                          {ast.custody_status === 'HANDED_OVER_TO_AFTERSALES' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-400">
                              ŞANTİYEYE TESLİM EDİLDİ
                            </span>
                          )}
                          {ast.custody_status === 'INSTALLED_IN_UNIT' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              DAİREYE MONTE EDİLDİ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {ast.deployed_building_id ? (
                            <div>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {ast.deployed_building_id}
                              </span>
                              <div className="text-[11px] text-slate-400">
                                {ast.deployed_unit_label || '-'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono">
                              {ast.current_depot_id || 'Depo'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {ast.warranty_expiry_date || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-light text-[11px]">
                          {ast.notes || '-'}
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
      {/* MODAL 1: SMARTPHONE BARCODE SCANNER */}
      {/* ================================================= */}
      <MobileBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activeDepotId={activeDepotId}
        catalogItems={allCatalogItems}
        stockBalances={balances}
        assetRegister={assets}
        lang={lang}
        onQuickAction={(item, action) => {
          if (action === 'INBOUND') {
            setInboundCatalogId(item.item_id);
            setInboundCostEur(item.base_cost_eur || 0);
            setIsInboundModalOpen(true);
          } else if (action === 'OUTBOUND') {
            setOutboundCatalogId(item.item_id);
            setIsOutboundModalOpen(true);
          }
        }}
        onItemRegistered={handleItemRegistered}
      />

      {/* ================================================= */}
      {/* MODAL 2: INLINE MISSING DOCUMENT COMPLETION DRAWER */}
      {/* ================================================= */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {lang === 'tr' ? 'Eksik Evrak Tamamlama' : 'Complete Missing Documentation'}
                </h3>
                <p className="text-xs font-light text-slate-400">
                  {editingTransaction.transaction_code} • {editingTransaction.catalog_item?.item_name_tr}
                </p>
              </div>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  İrsaliye Numarası (Delivery Note) *
                </label>
                <input
                  type="text"
                  value={docDrawerIrsaliye}
                  onChange={(e) => setDocDrawerIrsaliye(e.target.value)}
                  placeholder="IRS-2026-XXXXX"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Fatura Numarası (Invoice Number) *
                </label>
                <input
                  type="text"
                  value={docDrawerInvoice}
                  onChange={(e) => setDocDrawerInvoice(e.target.value)}
                  placeholder="FAT-2026-XXXXX"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Bağlı Satın Alma Talebi (Requisition ID) *
                </label>
                <input
                  type="text"
                  value={docDrawerReq}
                  onChange={(e) => setDocDrawerReq(e.target.value)}
                  placeholder="REQ-202611-XXXX"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Tedarikçi Firma Adı
                </label>
                <input
                  type="text"
                  value={docDrawerSupplier}
                  onChange={(e) => setDocDrawerSupplier(e.target.value)}
                  placeholder="Tedarikçi Ltd."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                İptal
              </button>
              <button
                onClick={handleSaveMissingDocs}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Evrakları Kaydet & Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 3: INBOUND MAL KABUL DIALOG */}
      {/* ================================================= */}
      {isInboundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {lang === 'tr' ? 'Depoya Malzeme Girişi (İrsaliye Kabulü)' : 'Log Inbound Material Receipt'}
                </h3>
                <p className="text-xs font-light text-slate-400">
                  {activeDepotId}
                </p>
              </div>
              <button onClick={() => setIsInboundModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Malzeme Seçin *
                </label>
                <select
                  value={inboundCatalogId}
                  onChange={(e) => {
                    setInboundCatalogId(e.target.value);
                    const selected = allCatalogItems.find((c) => c.item_id === e.target.value) ||
                                     balances.find((b) => b.catalog_item_id === e.target.value)?.catalog_item;
                    if (selected) {
                      setInboundCostEur(selected.base_cost_eur || 0);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="">{lang === 'tr' ? '-- Malzeme Seçiniz --' : '-- Select Material --'}</option>
                  {allCatalogItems.map((c) => (
                    <option key={c.item_id} value={c.item_id}>
                      {c.item_name_tr} ({c.unit_of_measure}) - {c.legacy_code || c.barcode_ean || 'SKU'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Giriş Miktarı *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inboundQty}
                    onChange={(e) => setInboundQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Birim Maliyet (€) *
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
                    İrsaliye Numarası *
                  </label>
                  <input
                    type="text"
                    value={inboundIrsaliye}
                    onChange={(e) => setInboundIrsaliye(e.target.value)}
                    placeholder="IRS-2026-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Fatura Numarası
                  </label>
                  <input
                    type="text"
                    value={inboundInvoice}
                    onChange={(e) => setInboundInvoice(e.target.value)}
                    placeholder="FAT-2026-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Tedarikçi Adı
                </label>
                <input
                  type="text"
                  value={inboundSupplier}
                  onChange={(e) => setInboundSupplier(e.target.value)}
                  placeholder="Daikin / Geberit / Çimko"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Seri Numaraları (Takip Edilebilir Varlık ise her satıra bir S/N)
                </label>
                <textarea
                  rows={2}
                  value={inboundSerials}
                  onChange={(e) => setInboundSerials(e.target.value)}
                  placeholder="SN-VRF-001&#10;SN-VRF-002"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsInboundModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                İptal
              </button>
              <button
                onClick={handleCreateInbound}
                disabled={!inboundCatalogId || inboundQty <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Girişi Kaydet & Bakiyeyi Artır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 4: OUTBOUND ŞANTİYE ÇIKIŞI DIALOG */}
      {/* ================================================= */}
      {isOutboundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  {lang === 'tr' ? 'Şantiyeye Malzeme Çıkışı (Teslimat Fişi)' : 'Issue Outbound Material Handover'}
                </h3>
                <p className="text-xs font-light text-slate-400">
                  {activeDepotId}
                </p>
              </div>
              <button onClick={() => setIsOutboundModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Çıkış Yapılacak Stok Kalemi *
                </label>
                <select
                  value={outboundCatalogId}
                  onChange={(e) => setOutboundCatalogId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="">{lang === 'tr' ? '-- Stok Seçiniz --' : '-- Select Stock Balance --'}</option>
                  {balances.map((b) => (
                    <option key={b.catalog_item_id} value={b.catalog_item_id}>
                      {b.catalog_item?.item_name_tr} (Mevcut: {b.quantity_on_hand} {b.catalog_item?.unit_of_measure})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Hedef Blok (Şantiye) *
                  </label>
                  <select
                    value={outboundBuildingId}
                    onChange={(e) => setOutboundBuildingId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="">{lang === 'tr' ? '-- Blok Seçin --' : '-- Select Block --'}</option>
                    {portfolioBuildings.slice(0, 30).map((b) => (
                      <option key={b.building_id} value={b.building_id}>
                        {b.building_name} ({b.building_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Hedef Daire / Mahalle
                  </label>
                  <input
                    type="text"
                    value={outboundUnitLabel}
                    onChange={(e) => setOutboundUnitLabel(e.target.value)}
                    placeholder="Daire 402 / Zemin Kat"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Çıkış Miktarı *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={outboundQty}
                    onChange={(e) => setOutboundQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Bağlı Talep No (REQ)
                  </label>
                  <input
                    type="text"
                    value={outboundReqId}
                    onChange={(e) => setOutboundReqId(e.target.value)}
                    placeholder="REQ-202611-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  İrsaliye / Teslim Tutanak No
                </label>
                <input
                  type="text"
                  value={outboundIrsaliye}
                  onChange={(e) => setOutboundIrsaliye(e.target.value)}
                  placeholder="IRS-2026-..."
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsOutboundModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                İptal
              </button>
              <button
                onClick={handleCreateOutbound}
                disabled={!outboundCatalogId || outboundQty <= 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Çıkış Emri Oluştur & Rezerve Et
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
