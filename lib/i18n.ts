import { useSyncExternalStore } from 'react';

export type Language = 'tr' | 'en';
export type Theme = 'dark' | 'light';

export const DICTIONARY = {
  tr: {
    appTitle: 'CAESAR SATINALMA DEFTERİ',
    appSubtitle: 'Öngörülü Malzeme Kontrolü (v2.0.0)',
    siteRibbon: 'CAESAR RESORT & SPA — PHASES 7 & 8',
    activeRole: 'Aktif Rol',
    newRequisition: '+ YENİ MALZEME TALEBİ',
    searchPlaceholder: 'Talep no, malzeme veya blok ara...',
    allBlocks: 'TÜMÜ',
    roles: {
      FOREMAN: 'Şantiye Şefi',
      PURCHASING_MGR: 'Satınalma Müdürü',
      PROJECT_DIRECTOR: 'Proje Direktörü',
      EXECUTIVE: 'Yönetim Kurulu',
    },
    roleTiers: {
      FOREMAN: 'Talep Girişi (Saha)',
      PURCHASING_MGR: 'Tier 1 (< €2.5k)',
      PROJECT_DIRECTOR: 'Tier 2 (< €15k)',
      EXECUTIVE: 'Tier 3 (> €15k)',
    },
    metrics: {
      card1Title: 'TALEP HIZI & BLOK DAĞILIMI',
      card1Sub: 'Caesar Resort & Spa 4 Ana Blok',
      card1ActiveTickets: 'Aktif Talep',
      card2Title: 'ÖNGÖRÜ SAPMA TELEMETRİSİ',
      card2Sub: 'Mühendislik Tüketim Katsayı Doğrulaması',
      card2WithinTolerance: 'Tolerans Dahilinde (+%5)',
      card2Anomalies: 'Gerekçelendirilmiş Sapma',
      card3Title: 'MALİ TAAHHÜT & 3-KADEME ONAY',
      card3Sub: 'Onay Kademelerine Göre Bütçe Ayrımı',
      tierBreakdown: 'Kademe Dağılımı',
    },
    viewMode: {
      matrix: 'KARE MATRİS GÖRÜNÜMÜ',
      subledger: 'DETAYLI ALT-DEFTER',
      matrixSubtitle: 'İnşaat İlerleme ve Blok Bazlı Malzeme Tüketimi',
    },
    blocks: {
      ZENO: { name: 'ZENO', desc: 'Konut Kulesi (28 Kat)', progress: 68 },
      PHUKET: { name: 'PHUKET', desc: 'Lüks Villa & Rezidans Kümesi', progress: 42 },
      PATTAYA: { name: 'PATTAYA', desc: 'Daire Blokları & Teras Evler', progress: 85 },
      'KOH SAMUI': { name: 'KOH SAMUI', desc: 'Ticari Alan & Sosyal Tesisler', progress: 54 },
    },
    table: {
      title: 'MALZEME SATINALMA ALT-DEFTERİ',
      subtitle: 'Caesar Resort & Spa şantiye kütüğü ve onay geçmişi',
      colTicket: 'Talep No & Tarih',
      colBlock: 'Blok',
      colMaterial: 'Malzeme (Katalog)',
      colVolumePredicted: 'Mimari Hacim & Öngörü',
      colRequestedVariance: 'Talep & Sapma',
      colCost: 'Mali Tutar',
      colTier: 'Kademe',
      colStatus: 'Durum',
      colAction: 'İşlem',
      inspectBtn: 'İncele & Onayla',
      empty: 'Filtrelere uygun malzeme talebi bulunamadı.',
      anomaliesOnly: 'YALNIZCA SAPMALI TALEPLER',
      allTiers: 'Tüm Kademeler',
      allStatuses: 'Tüm Durumlar',
    },
    mobileCard: {
      ticket: 'TALEP',
      block: 'BLOK',
      material: 'MALZEME',
      volume: 'HACİM',
      predicted: 'ÖNGÖRÜ',
      requested: 'TALEP EDİLEN',
      variance: 'SAPMA',
      cost: 'TUTAR',
      status: 'DURUM',
      inspectAction: 'TALEBİ İNCELE & ONAYLA',
    },
    form: {
      title: 'AKILLI MALZEME TALEP FORMU',
      subtitle: 'Mimari hacme dayalı anlık tüketim hesabı ve kademe ataması',
      blockSelect: 'Şantiye Bloğu Seçimi',
      materialSelect: 'Katalog Malzemesi Seçimi',
      volumeInput: 'Mimari İmalat Hacmi (m³)',
      volumeHelp: 'Statik ve mimari metraj birimi',
      predictedQty: 'Mühendislik Öngörüsü (Hesaplanan)',
      formulaDesc: 'Hacim × Tüketim Katsayısı',
      requestedQty: 'Talep Edilen Saha Miktarı',
      varianceBadge: 'Sapma Oranı',
      toleranceOk: 'Tolerans Limitinde (<= +%5)',
      toleranceAnomaly: 'Tolerans Sınırı Aşıldı (> +%5)',
      anomalyAlertTitle: 'DİKKAT: Mühendislik Sapma Toleransı Aşıldı',
      anomalyAlertDesc: 'Talep edilen miktar mimari katsayıyı aşmaktadır. Yönetim onayına sunulmak üzere zorunlu teknik gerekçe giriniz.',
      justificationPlaceholder: 'Örn: Radye temel kot düşümü ve ilave donatı bindirme boyu statik pafta no ST-104 revizyonu gereği...',
      justificationMinNotice: 'Gerekçe en az 10 karakter olmalıdır.',
      estimatedCost: 'Hesaplanan Sipariş Tutarı',
      tierBadge: 'Gereken Onay Kademesi',
      tierAuthorityNotice: 'Yetkili Onaycı',
      submitBtn: 'TALEBİ ALT-DEFTERE İŞLE',
      cancelBtn: 'İPTAL',
      quickScenarios: 'Hızlı Senaryo',
      presetNormal: 'Normal (Tier 1)',
      presetAnomaly: 'Sapmalı Beton (Tier 2)',
      presetBulk: 'Yüksek Tonaj Çelik (Tier 3)',
    },
    drawer: {
      title: 'TALEP DETAYI VE 3-KADEMELİ ONAY MERKEZİ',
      close: 'Kapat',
      materialDetails: 'MALZEME VE BİRİM MALİYET',
      contractedUnitPrice: 'Sözleşmeli Birim Fiyat',
      architecturalVolume: 'Mimari Hacim',
      predictedQuantity: 'Hesaplanan Öngörü',
      estimatedTotal: 'Toplam Sipariş Değeri',
      equationTitle: 'MÜHENDİSLİK HESAPLAMA DOĞRULAMASI',
      justificationTitle: 'SAHA ŞEFİ SAPMA GEREKÇESİ',
      geminiTitle: 'GEMINI 2.0 GEREKÇE SENTETİK DEĞERLENDİRMESİ',
      geminiText: 'Belirtilen saha revizyonu Caesar zemin etüdü ve statik donatı normlarıyla uyumludur. Döküm takvimini aksatmamak için onay önerilir.',
      governanceTitle: '3-KADEMELİ ONAY HİYERARŞİSİ (GOVERNANCE MATRIX)',
      requiredAuthority: 'Gereken Yetki Kademesi',
      authorizedBanner: 'Aktif rolünüz bu sipariş emrini imzalamak için tam yetkiye sahiptir.',
      blockedBannerTitle: 'SATINALMA EMRİ BLOKE EDİLDİ (BLOCKED PO STATE)',
      blockedBannerDesc: 'Mevcut rolünüz bu tutarı onaylamak için yetersizdir. Lütfen sağ üstteki rol seçiciden yetkili kademeye geçiniz.',
      commentLabel: 'Onay Notu & Kriptografik İmza Açıklaması',
      commentPlaceholder: 'Teknik ve metraj uygunluğu doğrulandı...',
      signOffBtn: 'KRİPTOGRAFİK İMZA İLE ONAYLA',
      rejectBtn: 'REDDET',
      ledgerStatus: 'Alt-Defter Durumu',
    },
    statuses: {
      PENDING_PURCHASING: 'Satınalma Onayında (Tier 1)',
      PENDING_TIER2: 'Proje Direktörü Onayında (Tier 2)',
      PENDING_TIER3: 'Yönetim Kurulu Onayında (Tier 3)',
      APPROVED: 'Onaylandı / Sipariş Emri Aktif',
      ORDER_PLACED: 'Tedarikçiye Sipariş Geçildi',
      DELIVERED: 'Şantiyeye Teslim Edildi',
      REJECTED: 'Reddedildi',
    },
  },
  en: {
    appTitle: 'CAESAR PURCHASING LEDGER',
    appSubtitle: 'Predictive Material Control (v2.0.0)',
    siteRibbon: 'CAESAR RESORT & SPA — PHASES 7 & 8',
    activeRole: 'Active Role',
    newRequisition: '+ NEW REQUISITION',
    searchPlaceholder: 'Search by ticket ID, material, or block...',
    allBlocks: 'ALL',
    roles: {
      FOREMAN: 'Site Foreman',
      PURCHASING_MGR: 'Purchasing Manager',
      PROJECT_DIRECTOR: 'Project Director',
      EXECUTIVE: 'Executive Board',
    },
    roleTiers: {
      FOREMAN: 'Intake Authority (Site)',
      PURCHASING_MGR: 'Tier 1 (< €2.5k)',
      PROJECT_DIRECTOR: 'Tier 2 (< €15k)',
      EXECUTIVE: 'Tier 3 (> €15k)',
    },
    metrics: {
      card1Title: 'VELOCITY & BLOCK DISTRIBUTION',
      card1Sub: 'Caesar Resort & Spa 4 Core Blocks',
      card1ActiveTickets: 'Active Tickets',
      card2Title: 'PREDICTIVE VARIANCE TELEMETRY',
      card2Sub: 'Engineering Consumption Verification',
      card2WithinTolerance: 'Within Tolerance (+5%)',
      card2Anomalies: 'Justified Overruns',
      card3Title: 'FINANCIAL COMMITMENT & 3 TIERS',
      card3Sub: 'Budget Allocation Across Approval Tiers',
      tierBreakdown: 'Tier Breakdown',
    },
    viewMode: {
      matrix: 'SQUARE MATRIX VIEW',
      subledger: 'DETAILED SUB-LEDGER',
      matrixSubtitle: 'Construction Progress & Material Consumption by Block',
    },
    blocks: {
      ZENO: { name: 'ZENO', desc: 'Residential Tower (28 Floors)', progress: 68 },
      PHUKET: { name: 'PHUKET', desc: 'Luxury Villa & Residence Cluster', progress: 42 },
      PATTAYA: { name: 'PATTAYA', desc: 'Apartment Blocks & Terraces', progress: 85 },
      'KOH SAMUI': { name: 'KOH SAMUI', desc: 'Commercial & Amenities Complex', progress: 54 },
    },
    table: {
      title: 'MATERIAL PURCHASING SUB-LEDGER',
      subtitle: 'Caesar Resort & Spa project requisition and audit ledger',
      colTicket: 'Ticket No & Date',
      colBlock: 'Block',
      colMaterial: 'Catalog Material',
      colVolumePredicted: 'Volume & Predicted',
      colRequestedVariance: 'Requested & Variance',
      colCost: 'Estimated Cost',
      colTier: 'Tier',
      colStatus: 'Status',
      colAction: 'Action',
      inspectBtn: 'Inspect & Approve',
      empty: 'No requisitions found matching the active filter criteria.',
      anomaliesOnly: 'ANOMALIES ONLY',
      allTiers: 'All Tiers',
      allStatuses: 'All Statuses',
    },
    mobileCard: {
      ticket: 'TICKET',
      block: 'BLOCK',
      material: 'MATERIAL',
      volume: 'VOLUME',
      predicted: 'PREDICTED',
      requested: 'REQUESTED',
      variance: 'VARIANCE',
      cost: 'COST',
      status: 'STATUS',
      inspectAction: 'INSPECT & APPROVE TICKET',
    },
    form: {
      title: 'SMART REQUISITION FORM',
      subtitle: 'Architectural volume-driven predictive quantity and tier assignment',
      blockSelect: 'Construction Block Selection',
      materialSelect: 'Catalog Material Selection',
      volumeInput: 'Architectural Volume (m³)',
      volumeHelp: 'Structural and architectural BOQ unit',
      predictedQty: 'Engineering Baseline (Calculated)',
      formulaDesc: 'Volume × Consumption Rate',
      requestedQty: 'Field Requested Quantity',
      varianceBadge: 'Variance Rate',
      toleranceOk: 'Within Tolerance (<= +5%)',
      toleranceAnomaly: 'Tolerance Overrun (> +5%)',
      anomalyAlertTitle: 'WARNING: Engineering Tolerance Exceeded',
      anomalyAlertDesc: 'Requested quantity exceeds architectural baseline. A mandatory engineering justification is required before submission.',
      justificationPlaceholder: 'E.g.: Raft foundation deepened by 10cm and rebar overlap extended per revision sheet ST-104...',
      justificationMinNotice: 'Justification must be at least 10 characters.',
      estimatedCost: 'Estimated Purchase Order Total',
      tierBadge: 'Mandated Approval Tier',
      tierAuthorityNotice: 'Authorized Approver',
      submitBtn: 'SUBMIT TO SUB-LEDGER',
      cancelBtn: 'CANCEL',
      quickScenarios: 'Quick Scenarios',
      presetNormal: 'Standard (Tier 1)',
      presetAnomaly: 'Overrun Concrete (Tier 2)',
      presetBulk: 'Bulk Steel (Tier 3)',
    },
    drawer: {
      title: 'REQUISITION & 3-TIER GOVERNANCE CENTER',
      close: 'Close',
      materialDetails: 'MATERIAL SPECIFICATION & PRICING',
      contractedUnitPrice: 'Contracted Unit Price',
      architecturalVolume: 'Architectural Volume',
      predictedQuantity: 'Calculated Baseline',
      estimatedTotal: 'Estimated Order Value',
      equationTitle: 'MATHEMATICAL INVARIANT VERIFICATION',
      justificationTitle: 'FIELD FOREMAN VARIANCE JUSTIFICATION',
      geminiTitle: 'GEMINI 2.0 SYNTHETIC REASONING AUDIT',
      geminiText: 'The cited revision complies with Caesar geotechnical profiling and structural rebar norms. Sign-off recommended to prevent pouring schedule delays.',
      governanceTitle: '3-TIER APPROVAL GOVERNANCE MATRIX',
      requiredAuthority: 'Required Authority Level',
      authorizedBanner: 'Your active role has full cryptographic authority to approve this order.',
      blockedBannerTitle: 'PURCHASE ORDER BLOCKED (BLOCKED PO STATE)',
      blockedBannerDesc: 'Your active role lacks sufficient financial clearance for this amount. Please switch to an authorized role via the top-right role switcher.',
      commentLabel: 'Audit Comment & Cryptographic Sign-Off Note',
      commentPlaceholder: 'Technical quantity and budget verified...',
      signOffBtn: 'CRYPTOGRAPHIC SIGN-OFF (APPROVE)',
      rejectBtn: 'REJECT ORDER',
      ledgerStatus: 'Sub-Ledger Status',
    },
    statuses: {
      PENDING_PURCHASING: 'Pending Purchasing (Tier 1)',
      PENDING_TIER2: 'Pending Project Director (Tier 2)',
      PENDING_TIER3: 'Pending Executive Board (Tier 3)',
      APPROVED: 'Approved / Active PO',
      ORDER_PLACED: 'Purchase Order Placed',
      DELIVERED: 'Delivered to Jobsite',
      REJECTED: 'Rejected',
    },
  },
};

/**
 * Turkic-compliant uppercase helper that correctly transforms 'i' -> 'İ' and 'ı' -> 'I'
 */
export function toLocaleUpper(text: string, lang: Language = 'tr'): string {
  return text.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US');
}

/**
 * Currency formatter with tabular alignment
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
