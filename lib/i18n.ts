import { useSyncExternalStore } from 'react';

export type Language = 'tr' | 'en';
export type Theme = 'dark' | 'light';

export const DICTIONARY = {
  tr: {
    common: {
      appName: 'CAESAR PROJELERİ',
      appSubtitle: 'Satın Alma Alt Defteri & Tedarik Ekosistemi',
      save: 'Kaydet',
      saving: 'Kaydediliyor...',
      cancel: 'İptal',
      close: 'Kapat',
      search: 'Ara...',
      all: 'Tümü',
      loading: 'Yükleniyor...',
      actions: 'İşlemler',
      status: 'Durum',
      delete: 'Sil',
      edit: 'Düzenle',
      confirm: 'Onayla',
      date: 'Tarih',
      unit: 'Birim',
      quantity: 'Miktar',
      cost: 'Maliyet',
      total: 'Toplam',
      notes: 'Notlar',
      warning: 'Uyarı',
      error: 'Hata',
      success: 'Başarılı',
      required: 'Zorunlu Alan',
      active: 'Aktif',
      passive: 'Pasif',
    },
    header: {
      controlCenter: 'Operasyonel Kontrol Merkezi',
      ecosystemSubtitle: 'Caesar İnşaat Grubu Tedarik & Satın Alma Ekosistemi',
      realtimeLive: 'Supabase Realtime Canlı',
      rootSimulator: 'Root Simülatör:',
      activeUser: 'Aktif Kullanıcı',
      loggedIn: 'Oturum Açık',
      signOut: 'Oturumu Kapat',
      signIn: 'Giriş Yap',
      toggleSidebar: 'Menüyü Aç / Kapat',
    },
    sidebar: {
      brand: 'CAESAR PROJECTS',
      version: 'v2.6.0',
      subLedger: 'Satın Alma Alt Defteri',
      activeSection: 'Aktif Modüller',
      workspace: 'Satın Alma Masası',
      intake: 'Teknik İntake Motoru',
      depot: 'Depo ve Stok Yönetimi',
      personnel: 'Personel & Yetki Matrisi',
      badgeNew: 'YENİ',
      collapse: 'Menüyü Daralt',
      expand: 'Genişlet',
    },
    depot: {
      title: 'Depo ve Stok Yönetim Masası',
      subtitle: 'Merkezi Şantiye Deposu • Gerçek Zamanlı Stok Bakiyesi, İrsaliye & Seri No Takibi',
      selectDepot: 'Aktif Depo:',
      btnScanBarcode: 'Barkod Tara',
      btnInbound: '+ Malzeme Girişi (İrsaliye)',
      btnOutbound: '+ Şantiye Çıkışı (Teslimat)',
      btnFastOutbound: 'Çıkış Yap',
      btnConfirmDelivery: 'Teslim Alındı Onayla',

      // KPI Telemetry
      kpiSkus: 'Aktif Stok Kalemi',
      kpiSkusSub: 'Katalog Eşleşmesi',
      kpiTotalOnHand: 'Toplam Depo Mevcudu',
      kpiTotalOnHandSub: 'Fiziki Stok',
      kpiValuation: 'Toplam Stok Değeri',
      kpiValuationSub: 'Değerlenmiş (€)',
      kpiMissingDocs: 'Eksik Evrak Uyarısı',
      kpiMissingDocsSub: 'İrsaliye / Fatura Eksik',

      // Tabs
      tabBalances: 'Canlı Stok Bakiyeleri',
      tabMovements: 'Stok Hareket & İrsaliye Defteri',
      tabAssets: 'Seri Numaralı Varlık Kütüğü',

      // Table Headers - Balances
      thBarcode: 'Barkod / Malzeme Kodu',
      thMaterial: 'Malzeme Tanımı & Kategori',
      thPackaging: 'Ambalaj Tipi',
      thOnHand: 'Mevcut Stok',
      thReserved: 'Rezerve',
      thBaseCost: 'Birim Maliyet',
      thValuedCost: 'Değerlenmiş Fiyat',
      thAction: 'İşlem',

      // Table Headers - Movements
      thTxCode: 'Hareket Kodu & Tarih',
      thTarget: 'Şantiye / Blok / Daire',
      thDocs: 'İrsaliye / Fatura',
      thDeliveryStatus: 'Teslimat Durumu',

      // Table Headers - Assets
      thAssetTag: 'Varlık Etiketi',
      thSerial: 'Seri No (S/N)',
      thCustody: 'Zimmet Durumu',
      thLocation: 'Konum / Blok',
      thWarranty: 'Garanti',

      // Status Badges
      singleItem: 'TEKİL',
      atomicSet: 'ATOMIC SET',
      lowStock: 'KRİTİK STOK',
      inboundType: 'GİRİŞ (MAL KABUL)',
      outboundType: 'ÇIKIŞ (ŞANTİYE)',
      adjustmentType: 'STOK DÜZELTME',
      returnType: 'İADE (SATIŞ SONRASI)',
      delivered: 'TESLİM EDİLDİ',
      pendingDelivery: 'TESLİMAT BEKLİYOR',
      reqMissing: 'REQ EKSİK',
      docMissing: 'EKSİK',
      docsOk: 'EVRAK TAMAM',

      // Asset Custody
      custodyInDepot: 'DEPODA',
      custodyHandedOver: 'ŞANTİYEYE TESLİM EDİLDİ',
      custodyInstalled: 'DAİREYE MONTE EDİLDİ',
      custodyMaintenance: 'BAKIMDA',
      custodyRetired: 'HURDAYA AYRILDI',

      // Search & Filters
      searchPlaceholder: 'Barkod, Kod, Malzeme, İrsaliye veya Seri No Ara...',
      allProjects: 'Tüm Projeler',

      // Empty States
      emptyBalances: 'Henüz kayıtlı stok bakiyesi bulunmuyor.',
      emptyBalancesCta: 'İlk Stok Girişini Yapın',
      emptyMovements: 'Henüz kaydedilmiş malzeme hareketi bulunmuyor.',
      emptyAssets: 'Henüz seri numaralı varlık kaydı bulunmuyor.',

      // Modals
      modalInboundTitle: 'Depoya Malzeme Girişi (İrsaliye Kabulü)',
      modalOutboundTitle: 'Şantiyeye Malzeme Çıkışı (Teslimat Tutanağı)',
      modalMissingDocsTitle: 'Eksik Evrak Tamamlama Çekmecesi',
      lblSelectMaterial: 'Malzeme Seçimi *',
      lblQuantity: 'Miktar *',
      lblUnitCost: 'Birim Maliyet (€)',
      lblIrsaliyeNo: 'İrsaliye Numarası *',
      lblInvoiceNo: 'Fatura Numarası (Varsa)',
      lblSupplier: 'Tedarikçi Firma Adı',
      lblSerialNumbers: 'Seri Numaraları (Virgülle veya satırla ayırın)',
      lblTargetBuilding: 'Hedef Blok / Yapı *',
      lblTargetUnit: 'Daire / Mahal Etiketi',
      lblRequisitionId: 'İlgili Satın Alma Talep No (REQ-*)',
      btnSaveInbound: 'Girişi Kaydet & Bakiyeye Ekle',
      btnSaveOutbound: 'Çıkışı Tamamla & Stoktan Düş',
      btnSaveDocs: 'Evrakları Güncelle & Kapat',
    },
    scanner: {
      title: 'Mobil ve Masaüstü Universal Barkod Tarayıcı',
      subtitle: 'ZXing WebAssembly Motoru • Çift-Yönlü Ayna Çözümleyici & Doğrudan Veri Tabanı Kaydı',
      cameraSelect: 'Kamera Seç:',
      cameraUnavailable: 'Kamera erişimi sağlanamadı. Lütfen manuel barkod girişini kullanınız.',
      manualPlaceholder: 'Barkod EAN, Seri No (S/N) veya Kod girin...',
      btnSearch: 'Sorgula',
      detectedInFrame: 'Kamerada Algılanan Barkodlar:',
      dualDetected: 'İkili Barkod Eşleşmesi (Ürün EAN + Seri No S/N)',
      itemFound: 'Malzeme / Varlık Eşleşti',
      sku: 'Malzeme Kodu',
      packaging: 'Ambalaj Tipi',
      atomicSet: 'ATOMIC SET',
      singleItem: 'TEKİL ÜRÜN',
      pieceCount: 'Parça',
      stockOnHand: 'Depodaki Stok',
      baseCost: 'Birim Maliyet',
      valuedCost: 'Değerlenmiş Fiyat',
      assetTag: 'Varlık Etiketi',
      serialNo: 'Seri Numarası',
      custody: 'Zimmet Durumu',
      location: 'Konum',
      btnInbound: '+ Malzeme Girişi Yap',
      btnOutbound: '+ Şantiyeye Çıkış Yap',
      btnRegisterAsset: '+ Seri No Kaydı Aç',
      quickPresets: 'Hızlı Test Kodları:',

      // Unregistered Item Prompt
      unregisteredTitle: 'Kayıtsız Barkod Algılandı',
      unregisteredDesc: (code: string) => `"${code}" barkodu sistemde kayıtlı değil. Bu malzemeyi veri tabanına ekleyip şantiye mal kabulünü hemen yapabilirsiniz.`,
      btnOpenRegistry: '+ Yeni Malzeme / Varlık Kaydı Aç',

      // Registry Form
      formTitle: 'Yeni Malzeme / Varlık Veri Tabanı Kaydı',
      lblBarcode: 'Barkod (EAN / UPC / QR) *',
      lblLegacyCode: 'Malzeme Referans Kodu *',
      lblNameTr: 'Malzeme Adı (Türkçe) *',
      lblNameEn: 'Malzeme Adı (İngilizce)',
      lblCategory: 'Ticari Kategori *',
      lblSubcategory: 'Alt Kategori',
      lblSpecification: 'Teknik Özellik / Standart',
      lblUnit: 'Birim *',
      lblPackaging: 'Ambalaj Tipi *',
      lblPieces: 'Set Parça Sayısı',
      lblTrackable: 'Seri Numaralı Varlık Takibi (Asset Register)',
      lblSerial: 'Üretici Seri Numarası (S/N)',
      lblWarranty: 'Garanti Bitiş Tarihi',
      lblCost: 'Birim Maliyet (€) *',
      lblMarkup: 'Ticari Kâr Marjı (%)',
      lblInitialQty: 'Depoya Giriş Miktarı *',
      lblIrsaliye: 'İrsaliye Numarası (Boş ise eksik evrak uyarısı verir)',
      lblSupplier: 'Tedarikçi Firma',
      btnSaveAndIntake: 'Kaydet & Mal Kabulünü Tamamla',
      placeholderSubcategory: 'Örn: Isı Pompası / Seramik',
      placeholderSpec: 'Örn: R32 Inverter, 14kW, 4 Kaset Ünite',
      alignHelp: 'HER TÜRLÜ AÇIDAN BARKOD HİZALAYIN',

      categories: [
        'Mekanik & İklimlendirme',
        'Sıhhi Tesisat & Vitrifiye',
        'Elektrik & Altyapı',
        'İnce Yapı & Kaplama',
        'Kaba Yapı & Betonarme',
        'Peyzaj & Dış Saha',
        'Genel Hırdavat & Sarf',
      ],
      units: ['adet', 'set', 'm2', 'm3', 'kg', 'ton', 'metre'],
    },
    personnel: {
      title: 'Personel & 2D RBAC Yetki Yönetim Merkezi',
      subtitle: 'Caesar Purchasing Sub-Ledger • 48 Saatlik Kriptografik Davetler & Hiyerarşik Delegasyon',
      btnInvite: '+ Yeni Ekip Üyesi Davet Et',
      tabRoster: 'Aktif Kurumsal Kadro',
      tabInvites: 'Bekleyen & Geçmiş Davetler',
      searchPlaceholder: 'İsim, e-posta, rol veya departman ara...',
      kpiTotalUsers: 'Toplam Kayıtlı Kullanıcı',
      kpiTotalUsersSub: 'Kayıtlı Personel',
      kpiActiveUsers: 'Aktif Hesaplar',
      kpiActiveUsersSub: 'Yetkili Hesap',
      kpiPendingInvites: 'Bekleyen Davetler (48s)',
      kpiPendingInvitesSub: 'Açık Davet',
      kpiDepartments: 'Aktif Departman Sayısı',
      kpiDepartmentsSub: 'Operasyonel Bölüm',

      // Table Headers
      thUser: 'Kullanıcı / Personel',
      thDepartment: 'Departman',
      thRole: 'Rol & Hiyerarşi',
      thTier: 'Yetki Seviyesi',
      thStatus: 'Durum',
      thLastLogin: 'Son Giriş',
      thActions: 'İşlemler',
      thInvitee: 'Davet Edilen',
      thTargetRole: 'Hedef Rol & Departman',
      thExpiresIn: 'Kalan Süre (48 Saatlik Sayaç)',
      thInviteStatus: 'Davet Durumu',

      // Status Badges
      statusActive: 'AKTİF',
      statusInvited: 'DAVET EDİLDİ',
      statusSuspended: 'ASKIYA ALINDI',
      statusAccepted: 'KULLANILDI',
      statusRevoked: 'İPTAL EDİLDİ',
      statusExpired: 'SÜRESİ DOLDU',
      calculating: 'Hesaplanıyor...',
      timeLeft: (h: number, m: number) => `${h}s ${m}d kaldı`,

      // Actions
      btnSuspend: 'Askıya Al',
      btnActivate: 'Aktifleştir',
      btnChangeRole: 'Rol Düzenle',
      btnResend: 'Yenile (48s)',
      btnRevoke: 'İptal Et',
      btnCopy: 'Linki Kopyala',
      copySuccess: 'Bağlantı Panoya Kopyalandı!',

      // Modals
      modalInviteTitle: 'Yeni Ekip Üyesi Daveti Oluştur',
      lblDelegator: 'Delegatör:',
      lblFullName: 'Adı Soyadı *',
      lblEmail: 'Kurumsal E-posta Adresi *',
      lblTargetRole: 'Atanacak Rol (Delegasyon Kapsamında) *',
      lblDepartmentAuto: 'Departman (Otomatik Eşleşir)',
      lblAllowedProjects: 'Erişim İzni Verilen Şantiyeler (Opsiyonel)',
      btnSendInvite: 'Davet Bağlantısı Oluştur & Gönder',
      inviteSuccessNotice: 'Davet oluşturuldu ve 48 saatlik aktivasyon bağlantısı hazır!',
      modalRoleTitle: 'Rol Düzenle',
      lblNewRole: 'Yeni Rol',
      btnSaveRole: 'Rolü Güncelle',
      allDepartments: 'Tüm Departmanlar',
      emptyRoster: 'Kriterlere uygun personel bulunamadı.',
      emptyInvites: 'Kayıtlı davet bulunamadı.',
    },
    requisitions: {
      title: 'Satın Alma Masası & Alt Defter',
      subtitle: 'Proje Talepleri, Tedarikçi Fiyatlandırması & Çok Kademeli Onay Süreci',
      btnNewReq: '+ Yeni Talep Oluştur',
      thTicketId: 'Talep No',
      thLocation: 'Lokasyon / Proje / Blok',
      thMaterial: 'Malzeme Tanımı',
      thBudget: 'Teknik Bütçe (Tavan)',
      thQuote: 'Satın Alma Kotası',
      thStatus: 'Durum',
      thActions: 'İşlemler',
      searchPlaceholder: 'Talep No, Malzeme veya Proje Ara...',
      allProjects: 'Tüm Projeler',
      allStatuses: 'Tüm Durumlar',
      awaitingQuote: 'Tedarikçi Kotası Bekleniyor',
      overrunBadge: 'Kota Aşıldı (İç Yönetim)',
      btnInspect: 'İncele & İşlem Yap',
      batchSelected: 'talep seçildi',
      batchApprove: 'Toplu Onayla',
      batchReject: 'Toplu Reddet',
      batchClear: 'Seçimi Temizle',
      noRecords: 'Filtre kriterlerine uygun talep bulunamadı.',
    },
    intake: {
      title: 'Teknik İntake & Hacimsel Talep Motoru',
      subtitle: 'BIM / Hacim Bazlı Otomatik Tüketim Hesaplaması & Tavan Bütçe Kilitleme',
      btnBack: '← Satın Alma Masasına Dön',
      step1Title: '1. Şantiye ve Blok Lokasyonu',
      step2Title: '2. Malzeme & Hacim Parametreleri',
      step3Title: '3. Mühendislik Doğrulaması & Bütçe Kilidi',
      lblProject: 'Proje Seçimi *',
      lblBuilding: 'Blok / Yapı Seçimi *',
      lblCategory: 'Kategori Filtresi',
      lblMaterial: 'Katalog Malzemesi *',
      lblVolume: 'Hedef İmalat Hacmi / Alanı *',
      lblBrand: 'Marka Tercihi / Kısıtı',
      lblNotes: 'Teknik Şartname Notları',
      calculatedQty: 'Hesaplanan İhtiyaç Miktarı:',
      refUnitPrice: 'Referans Birim Fiyat:',
      lockedCeiling: 'Kilitli Bütçe Tavanı:',
      lockedCeilingDesc: 'Bu bütçe teknik ofis tarafından onaylanıp satın almaya aktarılacaktır.',
      submitBtn: 'Talebi Resmileştir ve Satın Almaya İlet →',
      submitting: 'Talep Oluşturuluyor...',
    },
  },
  en: {
    common: {
      appName: 'CAESAR PROJECTS',
      appSubtitle: 'Purchasing Sub-Ledger & Supply Ecosystem',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      close: 'Close',
      search: 'Search...',
      all: 'All',
      loading: 'Loading...',
      actions: 'Actions',
      status: 'Status',
      delete: 'Delete',
      edit: 'Edit',
      confirm: 'Confirm',
      date: 'Date',
      unit: 'Unit',
      quantity: 'Quantity',
      cost: 'Cost',
      total: 'Total',
      notes: 'Notes',
      warning: 'Warning',
      error: 'Error',
      success: 'Success',
      required: 'Required Field',
      active: 'Active',
      passive: 'Inactive',
    },
    header: {
      controlCenter: 'Operational Control Center',
      ecosystemSubtitle: 'Caesar Group Procurement & Supply Ecosystem',
      realtimeLive: 'Supabase Realtime Live',
      rootSimulator: 'Root Simulator:',
      activeUser: 'Active User',
      loggedIn: 'Logged In',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      toggleSidebar: 'Toggle Sidebar',
    },
    sidebar: {
      brand: 'CAESAR PROJECTS',
      version: 'v2.6.0',
      subLedger: 'Purchasing Sub-Ledger',
      activeSection: 'Active Modules',
      workspace: 'Requisition Workspace',
      intake: 'Technical Intake Engine',
      depot: 'Depot & Stock Management',
      personnel: 'Personnel & RBAC',
      badgeNew: 'NEW',
      collapse: 'Collapse Sidebar',
      expand: 'Expand Sidebar',
    },
    depot: {
      title: 'Depot & Stock Management Workspace',
      subtitle: 'Central Jobsite Depot • Live Stock Balances, Dispatch Notes & Serialized Assets',
      selectDepot: 'Active Depot:',
      btnScanBarcode: 'Scan Barcode',
      btnInbound: '+ Inbound Receipt',
      btnOutbound: '+ Outbound Handover',
      btnFastOutbound: 'Issue',
      btnConfirmDelivery: 'Confirm Handover Delivery',

      // KPI Telemetry
      kpiSkus: 'Active SKUs',
      kpiSkusSub: 'Catalog Matches',
      kpiTotalOnHand: 'Total On-Hand',
      kpiTotalOnHandSub: 'Physical Inventory',
      kpiValuation: 'Inventory Valuation',
      kpiValuationSub: 'Valued Cost (€)',
      kpiMissingDocs: 'Missing Doc Alerts',
      kpiMissingDocsSub: 'Dispatch / Invoice Missing',

      // Tabs
      tabBalances: 'Live Stock Balances',
      tabMovements: 'Movement & Dispatch Ledger',
      tabAssets: 'Serialized Asset Register',

      // Table Headers - Balances
      thBarcode: 'Barcode / SKU Code',
      thMaterial: 'Material Description & Trade',
      thPackaging: 'Packaging Type',
      thOnHand: 'On Hand',
      thReserved: 'Reserved',
      thBaseCost: 'Base Cost',
      thValuedCost: 'Valued Price',
      thAction: 'Action',

      // Table Headers - Movements
      thTxCode: 'Movement Code & Date',
      thTarget: 'Jobsite / Block / Unit',
      thDocs: 'Dispatch / Invoice',
      thDeliveryStatus: 'Delivery Status',

      // Table Headers - Assets
      thAssetTag: 'Asset Tag',
      thSerial: 'Serial No (S/N)',
      thCustody: 'Custody Status',
      thLocation: 'Location / Block',
      thWarranty: 'Warranty',

      // Status Badges
      singleItem: 'SINGLE ITEM',
      atomicSet: 'ATOMIC SET',
      lowStock: 'LOW STOCK',
      inboundType: 'INBOUND RECEIPT',
      outboundType: 'OUTBOUND HANDOVER',
      adjustmentType: 'STOCK ADJUSTMENT',
      returnType: 'AFTERSALES RETURN',
      delivered: 'DELIVERED',
      pendingDelivery: 'PENDING DELIVERY',
      reqMissing: 'REQ MISSING',
      docMissing: 'MISSING',
      docsOk: 'DOCS VERIFIED',

      // Asset Custody
      custodyInDepot: 'IN DEPOT',
      custodyHandedOver: 'HANDED OVER TO JOBSITE',
      custodyInstalled: 'INSTALLED IN UNIT',
      custodyMaintenance: 'UNDER MAINTENANCE',
      custodyRetired: 'RETIRED / SCRAPPED',

      // Search & Filters
      searchPlaceholder: 'Search Barcode, SKU, Material, Dispatch or S/N...',
      allProjects: 'All Projects',

      // Empty States
      emptyBalances: 'No stock balances recorded in this depot yet.',
      emptyBalancesCta: 'Log First Inbound Receipt',
      emptyMovements: 'No inventory movements recorded yet.',
      emptyAssets: 'No serialized assets registered yet.',

      // Modals
      modalInboundTitle: 'Log Inbound Material Receipt (Delivery Note)',
      modalOutboundTitle: 'Issue Outbound Handover to Jobsite',
      modalMissingDocsTitle: 'Missing Documentation Resolution Drawer',
      lblSelectMaterial: 'Material Selection *',
      lblQuantity: 'Quantity *',
      lblUnitCost: 'Unit Cost (€)',
      lblIrsaliyeNo: 'Dispatch / Delivery Note No *',
      lblInvoiceNo: 'Invoice Number (Optional)',
      lblSupplier: 'Supplier Organization Name',
      lblSerialNumbers: 'Serial Numbers (Separate by commas or lines)',
      lblTargetBuilding: 'Target Building / Block *',
      lblTargetUnit: 'Unit / Floor Label',
      lblRequisitionId: 'Associated Requisition No (REQ-*)',
      btnSaveInbound: 'Record Inbound & Add to Stock',
      btnSaveOutbound: 'Complete Handover & Decrement Stock',
      btnSaveDocs: 'Update Documents & Resolve',
    },
    scanner: {
      title: 'Universal Mobile & Desktop Barcode Scanner',
      subtitle: 'ZXing WebAssembly Engine • Dual-Pass Mirror Resolver & Direct Database Registry',
      cameraSelect: 'Select Camera:',
      cameraUnavailable: 'Camera access is unavailable. Please use manual barcode entry.',
      manualPlaceholder: 'Enter Barcode EAN, Serial No (S/N) or SKU...',
      btnSearch: 'Lookup',
      detectedInFrame: 'Barcodes in Camera View:',
      dualDetected: 'Dual Barcodes Paired (Product EAN + Serial S/N)',
      itemFound: 'Material / Asset Matched',
      sku: 'SKU Code',
      packaging: 'Packaging Unit',
      atomicSet: 'ATOMIC SET',
      singleItem: 'SINGLE ITEM',
      pieceCount: 'Pcs',
      stockOnHand: 'Stock On Hand',
      baseCost: 'Unit Cost',
      valuedCost: 'Valued Price',
      assetTag: 'Asset Tag',
      serialNo: 'Serial Number',
      custody: 'Custody Status',
      location: 'Location',
      btnInbound: '+ Log Inbound Receipt',
      btnOutbound: '+ Issue Outbound Handover',
      btnRegisterAsset: '+ Register Serialized Asset',
      quickPresets: 'Quick Test Barcodes:',

      // Unregistered Item Prompt
      unregisteredTitle: 'Unregistered Barcode Detected',
      unregisteredDesc: (code: string) => `Barcode "${code}" is not registered in the database. You can register it now to immediately log its jobsite receipt.`,
      btnOpenRegistry: '+ Register New Material / Asset',

      // Registry Form
      formTitle: 'Register New Material / Asset in Database',
      lblBarcode: 'Barcode (EAN / UPC / QR) *',
      lblLegacyCode: 'Material Reference Code (SKU) *',
      lblNameTr: 'Material Name (Turkish) *',
      lblNameEn: 'Material Name (English)',
      lblCategory: 'Trade Category *',
      lblSubcategory: 'Subcategory',
      lblSpecification: 'Technical Specification',
      lblUnit: 'Unit of Measure *',
      lblPackaging: 'Packaging Type *',
      lblPieces: 'Set Piece Count',
      lblTrackable: 'Track as Serialized Asset',
      lblSerial: 'Manufacturer Serial Number (S/N)',
      lblWarranty: 'Warranty Expiry Date',
      lblCost: 'Unit Cost (€) *',
      lblMarkup: 'Commercial Markup (%)',
      lblInitialQty: 'Initial Intake Quantity *',
      lblIrsaliye: 'Dispatch / Delivery Note No',
      lblSupplier: 'Supplier Name',
      btnSaveAndIntake: 'Save & Ingest into Depot',
      placeholderSubcategory: 'E.g.: Heat Pump / Ceramic Tiles',
      placeholderSpec: 'E.g.: R32 Inverter, 14kW, 4 Cassette Units',
      alignHelp: 'ALIGN BARCODE FROM ANY ANGLE',

      categories: [
        'Mechanical & HVAC',
        'Plumbing & Sanitary',
        'Electrical & Infrastructure',
        'Finishing & Cladding',
        'Structural & Concrete',
        'Landscaping & External Works',
        'Hardware & Consumables',
      ],
      units: ['pcs', 'set', 'm2', 'm3', 'kg', 'ton', 'meter'],
    },
    personnel: {
      title: 'Personnel & 2D RBAC Governance Center',
      subtitle: 'Caesar Purchasing Sub-Ledger • 48-Hour Cryptographic Invites & Hierarchical Delegation',
      btnInvite: '+ Invite Team Member',
      tabRoster: 'Active Team Roster',
      tabInvites: 'Pending & Past Invites',
      searchPlaceholder: 'Search name, email, role, or department...',
      kpiTotalUsers: 'Total Registered Users',
      kpiTotalUsersSub: 'Registered Staff',
      kpiActiveUsers: 'Active Accounts',
      kpiActiveUsersSub: 'Authorized Accounts',
      kpiPendingInvites: 'Pending Invites (48h)',
      kpiPendingInvitesSub: 'Open Invitations',
      kpiDepartments: 'Active Departments',
      kpiDepartmentsSub: 'Operational Divisions',

      // Table Headers
      thUser: 'User / Personnel',
      thDepartment: 'Department',
      thRole: 'Role & Hierarchy',
      thTier: 'Authority Tier',
      thStatus: 'Status',
      thLastLogin: 'Last Login',
      thActions: 'Actions',
      thInvitee: 'Invitee',
      thTargetRole: 'Target Role & Division',
      thExpiresIn: 'Expires In (48h Clock)',
      thInviteStatus: 'Invite Status',

      // Status Badges
      statusActive: 'ACTIVE',
      statusInvited: 'INVITED',
      statusSuspended: 'SUSPENDED',
      statusAccepted: 'ACCEPTED',
      statusRevoked: 'REVOKED',
      statusExpired: 'EXPIRED',
      calculating: 'Calculating...',
      timeLeft: (h: number, m: number) => `${h}h ${m}m left`,

      // Actions
      btnSuspend: 'Suspend',
      btnActivate: 'Activate',
      btnChangeRole: 'Change Role',
      btnResend: 'Resend (48h)',
      btnRevoke: 'Revoke',
      btnCopy: 'Copy Link',
      copySuccess: 'Link Copied to Clipboard!',

      // Modals
      modalInviteTitle: 'Create Team Member Invitation',
      lblDelegator: 'Delegator:',
      lblFullName: 'Full Name *',
      lblEmail: 'Corporate Email Address *',
      lblTargetRole: 'Assignable Role (Within Delegation Scope) *',
      lblDepartmentAuto: 'Department (Auto-Assigned)',
      lblAllowedProjects: 'Permitted Projects (Optional)',
      btnSendInvite: 'Generate & Send Invite',
      inviteSuccessNotice: 'Invitation created and 48-hour activation link is ready!',
      modalRoleTitle: 'Change Role',
      lblNewRole: 'New Role',
      btnSaveRole: 'Save Role Changes',
      allDepartments: 'All Departments',
      emptyRoster: 'No personnel found matching the criteria.',
      emptyInvites: 'No invitations found.',
    },
    requisitions: {
      title: 'Requisition Workspace & Sub-Ledger',
      subtitle: 'Operational Requisitions, Supplier Quotations & Multi-Tier Approvals',
      btnNewReq: '+ Create Requisition',
      thTicketId: 'Ticket ID',
      thLocation: 'Location / Project / Block',
      thMaterial: 'Material Description',
      thBudget: 'Technical Budget Ceiling',
      thQuote: 'Purchasing Quota',
      thStatus: 'Status',
      thActions: 'Actions',
      searchPlaceholder: 'Search Ticket ID, Material, or Project...',
      allProjects: 'All Projects',
      allStatuses: 'All Statuses',
      awaitingQuote: 'Awaiting Supplier Quota',
      overrunBadge: 'Quota Overrun (Internal)',
      btnInspect: 'Inspect & Act',
      batchSelected: 'requisitions selected',
      batchApprove: 'Batch Approve',
      batchReject: 'Batch Reject',
      batchClear: 'Clear Selection',
      noRecords: 'No requisitions match the active filter criteria.',
    },
    intake: {
      title: 'Technical Intake & Predictive Volume Engine',
      subtitle: 'BIM / Architectural Volume Baseline Calculation & Budget Ceiling Lock',
      btnBack: '← Back to Requisition Workspace',
      step1Title: '1. Jobsite and Building Block Location',
      step2Title: '2. Material & Predictive Volume Parameters',
      step3Title: '3. Engineering Baseline & Budget Lock',
      lblProject: 'Project Selection *',
      lblBuilding: 'Building Block Selection *',
      lblCategory: 'Trade Category Filter',
      lblMaterial: 'Master Catalog Material *',
      lblVolume: 'Target Execution Volume / Area *',
      lblBrand: 'Brand Preference / Constraint',
      lblNotes: 'Technical Specification Notes',
      calculatedQty: 'Calculated Required Quantity:',
      refUnitPrice: 'Reference Base Unit Cost:',
      lockedCeiling: 'Locked Budget Ceiling:',
      lockedCeilingDesc: 'This budget ceiling will be locked by the Technical Office and handed over to Purchasing.',
      submitBtn: 'Ratify Requisition & Handover to Sourcing →',
      submitting: 'Submitting Requisition...',
    },
  },
};

/**
 * Locale-compliant uppercase helper:
 * When lang === 'tr', uses 'tr-TR' producing dotted 'İ'.
 * When lang === 'en', uses standard ASCII uppercase, strictly preventing dotted 'İ'.
 */
export function toLocaleUpper(text: string, lang: Language = 'tr'): string {
  if (!text) return '';
  return lang === 'tr' ? text.toLocaleUpperCase('tr-TR') : text.toUpperCase();
}

/**
 * Currency formatter with clean tabular alignment
 */
export function formatCurrency(amount: number, lang: Language = 'tr'): string {
  return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Locale-aware numeric formatter
 */
export function formatNumber(value: number, lang: Language = 'tr'): string {
  return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US').format(value);
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('caesar_pref_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('caesar_pref_change', callback);
  };
}

/**
 * Hydration-safe language hook using useSyncExternalStore
 */
export function useCaesarLanguage(): [Language, (lang: Language) => void] {
  const lang = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem('caesar_lang');
        if (val === 'tr' || val === 'en') return val as Language;
      } catch {
        // ignore
      }
      return 'tr' as Language;
    },
    () => 'tr' as Language
  );

  const setLanguage = (newLang: Language) => {
    try {
      localStorage.setItem('caesar_lang', newLang);
      document.documentElement.lang = newLang;
      window.dispatchEvent(new Event('caesar_pref_change'));
    } catch {
      // ignore
    }
  };

  return [lang, setLanguage];
}

/**
 * Hydration-safe theme hook using useSyncExternalStore
 */
export function useCaesarTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem('caesar_theme');
        if (val === 'dark' || val === 'light') return val as Theme;
      } catch {
        // ignore
      }
      return 'dark' as Theme;
    },
    () => 'dark' as Theme
  );

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('caesar_theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      window.dispatchEvent(new Event('caesar_pref_change'));
    } catch {
      // ignore
    }
  };

  return [theme, setTheme];
}
