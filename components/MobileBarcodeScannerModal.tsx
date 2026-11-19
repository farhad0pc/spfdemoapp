'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  InventoryCatalogItem, 
  DepotStockBalance, 
  AssetRegisterItem,
  DetectedBarcode 
} from '@/types/requisition';

interface MobileBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItems: InventoryCatalogItem[];
  stockBalances: DepotStockBalance[];
  assetRegister: AssetRegisterItem[];
  lang: 'tr' | 'en';
  onQuickAction?: (item: InventoryCatalogItem, action: 'INBOUND' | 'OUTBOUND' | 'REGISTER_ASSET', asset?: AssetRegisterItem) => void;
}

export default function MobileBarcodeScannerModal({
  isOpen,
  onClose,
  catalogItems,
  stockBalances,
  assetRegister,
  lang,
  onQuickAction,
}: MobileBarcodeScannerModalProps) {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedCatalogItem, setMatchedCatalogItem] = useState<InventoryCatalogItem | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<AssetRegisterItem | null>(null);
  const [scanFlash, setScanFlash] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>('');

  const t = {
    title: lang === 'tr' ? 'Mobil Barkod & Seri No Tarayıcı' : 'Mobile Barcode & Serial Scanner',
    subTitle: lang === 'tr' ? 'Kamera veya Barkod Okuyucu ile Hızlı Okutma' : 'Camera or Barcode Reader Fast Scan',
    close: lang === 'tr' ? 'Kapat' : 'Close',
    cameraUnavailable: lang === 'tr' 
      ? 'Kamera erişimi sağlanamadı. Lütfen manuel barkod girişini kullanınız.' 
      : 'Camera access unavailable. Please use manual barcode entry.',
    manualPlaceholder: lang === 'tr' ? 'Barkod EAN, Seri No (S/N) veya Kod girin...' : 'Enter Barcode EAN, Serial No (S/N) or SKU...',
    btnSearch: lang === 'tr' ? 'Sorgula' : 'Lookup',
    itemFound: lang === 'tr' ? 'Malzeme / Varlık Eşleşti' : 'Item / Asset Matched',
    sku: lang === 'tr' ? 'Malzeme Kodu' : 'SKU Code',
    packaging: lang === 'tr' ? 'Ambalaj Tipi' : 'Packaging Unit',
    atomicSet: lang === 'tr' ? 'ATOMIC SET' : 'ATOMIC SET',
    singleItem: lang === 'tr' ? 'TEKİL ÜRÜN' : 'SINGLE ITEM',
    pieceCount: lang === 'tr' ? 'Parça' : 'Pcs',
    stockOnHand: lang === 'tr' ? 'Depodaki Stok' : 'Stock On Hand',
    baseCost: lang === 'tr' ? 'Birim Maliyet' : 'Unit Cost',
    valuedCost: lang === 'tr' ? 'Değerlenmiş Fiyat' : 'Valued Cost',
    assetTag: lang === 'tr' ? 'Varlık Etiketi' : 'Asset Tag',
    serialNo: lang === 'tr' ? 'Seri Numarası' : 'Serial Number',
    custody: lang === 'tr' ? 'Zimmet Durumu' : 'Custody Status',
    location: lang === 'tr' ? 'Konum' : 'Location',
    btnInbound: lang === 'tr' ? '+ Malzeme Girişi Yap' : '+ Log Inbound Receipt',
    btnOutbound: lang === 'tr' ? '+ Şantiyeye Çıkış Yap' : '+ Issue Outbound Handover',
    btnRegisterAsset: lang === 'tr' ? '+ Seri No Kaydı Aç' : '+ Register Serialized Asset',
    quickPresets: lang === 'tr' ? 'Hızlı Test Kodları:' : 'Quick Test Barcodes:',
    notFound: lang === 'tr' ? 'Bu barkod veya seri numarası ile eşleşen kayıt bulunamadı.' : 'No records matched this barcode or serial number.',
    inDepot: lang === 'tr' ? 'DEPODA (Zimmete Hazır)' : 'IN DEPOT',
    handedOver: lang === 'tr' ? 'ŞANTİYEYE TESLİM EDİLDİ' : 'HANDED OVER TO AFTERSALES',
    installed: lang === 'tr' ? 'DAİREYE MONTE EDİLDİ' : 'INSTALLED IN UNIT',
    maintenance: lang === 'tr' ? 'BAKIMDA' : 'UNDER MAINTENANCE',
    retired: lang === 'tr' ? 'HURDA / ÇIKIŞ' : 'RETIRED',
  };

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleResolveCode = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setScannedCode(clean);
    playBeep();
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 300);

    // 1. Look up in Asset Register by serial_number or asset_tag
    const foundAsset = assetRegister.find(
      (a) => a.serial_number.toLowerCase() === clean.toLowerCase() ||
             a.asset_tag.toLowerCase() === clean.toLowerCase() ||
             (a.barcode_ean && a.barcode_ean.toLowerCase() === clean.toLowerCase())
    );

    // 2. Look up in Inventory Catalog by barcode_ean, legacy_code or item_id
    let foundCatalog = catalogItems.find(
      (c) => (c.barcode_ean && c.barcode_ean.toLowerCase() === clean.toLowerCase()) ||
             (c.legacy_code && c.legacy_code.toLowerCase() === clean.toLowerCase()) ||
             c.item_id === clean
    );

    if (foundAsset && !foundCatalog) {
      foundCatalog = catalogItems.find((c) => c.item_id === foundAsset.catalog_item_id);
    }

    setMatchedAsset(foundAsset || null);
    setMatchedCatalogItem(foundCatalog || null);
  }, [assetRegister, catalogItems]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg || t.cameraUnavailable);
      setCameraActive(false);
    }
  }, [t.cameraUnavailable]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Continuous Barcode Scanning Loop via window.BarcodeDetector
  useEffect(() => {
    if (!isOpen || !cameraActive || !videoRef.current) return;

    let isScanning = true;
    let detector: { detect: (src: ImageBitmapSource) => Promise<DetectedBarcode[]> } | null = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'],
        });
      } catch {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw !== lastScannedRef.current) {
              lastScannedRef.current = raw;
              handleResolveCode(raw);
            }
          }
        } catch {
          // Ignore individual frame detection failures
        }
      }

      scanLoopRef.current = requestAnimationFrame(checkFrame);
    };

    scanLoopRef.current = requestAnimationFrame(checkFrame);

    return () => {
      isScanning = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isOpen, cameraActive, handleResolveCode]);

  // Trigger camera on modal open / stop on close
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera();
    } else {
      stopCamera();
      setScannedCode(null);
      setMatchedCatalogItem(null);
      setMatchedAsset(null);
      setManualInput('');
      lastScannedRef.current = '';
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  // Resolve current on-hand stock for matched catalog item
  const matchedBalance = matchedCatalogItem 
    ? stockBalances.find((b) => b.catalog_item_id === matchedCatalogItem.item_id)
    : null;

  const currentStockQty = matchedBalance ? matchedBalance.quantity_on_hand : 0;
  const baseCost = matchedCatalogItem?.base_cost_eur || 0;
  const markupPct = matchedCatalogItem?.commercial_markup_pct ?? 15;
  const valuedCost = Number((baseCost * (1 + markupPct / 100)).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {t.title}
              </h2>
              <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                {t.subTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t.close}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Viewfinder Video Area */}
          <div className={`relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center border-2 transition-all ${
            scanFlash ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'border-slate-800'
          }`}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Scanning Overlay Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-3/5 border-2 border-dashed border-amber-400/70 rounded-xl relative">
                {/* Laser scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce" />
                <div className="absolute -top-6 left-0 right-0 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded-md">
                    {lang === 'tr' ? 'BARKOD VEYA SERİ NO HİZALAYIN' : 'ALIGN BARCODE OR SERIAL S/N'}
                  </span>
                </div>
              </div>
            </div>

            {/* Camera error badge if failed */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center">
                <svg className="w-10 h-10 text-amber-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs font-light text-slate-300 max-w-xs mb-3">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {lang === 'tr' ? 'Kamerayı Yeniden Başlat' : 'Retry Camera'}
                </button>
              </div>
            )}
          </div>

          {/* Manual Input & Barcode Reader Fallback */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleResolveCode(manualInput);
                    }
                  }}
                  placeholder={t.manualPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  autoFocus
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => handleResolveCode(manualInput)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {t.btnSearch}
              </button>
            </div>

            {/* Quick Test Barcode Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.quickPresets}</span>
              <button
                type="button"
                onClick={() => {
                  setManualInput('8690123456789');
                  handleResolveCode('8690123456789');
                }}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-100"
              >
                EAN: 8690123456789 (VRF AC Set)
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualInput('AST-2026-9A1F');
                  handleResolveCode('AST-2026-9A1F');
                }}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800 rounded-md hover:bg-cyan-100"
              >
                Tag: AST-2026-9A1F
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualInput('SN-VRF-884920');
                  handleResolveCode('SN-VRF-884920');
                }}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-md hover:bg-emerald-100"
              >
                S/N: SN-VRF-884920
              </button>
            </div>
          </div>

          {/* Matched Result Card */}
          {scannedCode && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.itemFound}: <span className="font-mono text-slate-800 dark:text-slate-200">{scannedCode}</span>
                </span>
                {matchedCatalogItem?.packaging_unit_type === 'ATOMIC_SET' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    {t.atomicSet} ({matchedCatalogItem.set_piece_count || 1} {t.pieceCount})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {t.singleItem}
                  </span>
                )}
              </div>

              {matchedCatalogItem ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                      {lang === 'tr' ? matchedCatalogItem.item_name_tr : (matchedCatalogItem.item_name_en || matchedCatalogItem.item_name_tr)}
                    </h3>
                    <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                      {matchedCatalogItem.category} • {matchedCatalogItem.subcategory || 'Genel'}
                    </p>
                  </div>

                  {/* Stock & Valuation Stats */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t.stockOnHand}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentStockQty} <span className="text-[10px] font-light text-slate-500">{matchedCatalogItem.unit_of_measure}</span>
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t.baseCost}</span>
                      <span className="text-sm font-light text-slate-700 dark:text-slate-300">
                        €{baseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t.valuedCost} (+{markupPct}%)</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        €{valuedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Serialized Asset Info if matched */}
                  {matchedAsset && (
                    <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{t.assetTag}:</span>
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{matchedAsset.asset_tag}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{t.serialNo}:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{matchedAsset.serial_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{t.custody}:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{matchedAsset.custody_status}</span>
                      </div>
                      {matchedAsset.deployed_building_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">{t.location}:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {matchedAsset.deployed_building_id} • {matchedAsset.deployed_unit_label || '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Dispatch Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        onQuickAction?.(matchedCatalogItem, 'INBOUND', matchedAsset || undefined);
                        onClose();
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>{t.btnInbound}</span>
                    </button>

                    <button
                      onClick={() => {
                        onQuickAction?.(matchedCatalogItem, 'OUTBOUND', matchedAsset || undefined);
                        onClose();
                      }}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>{t.btnOutbound}</span>
                    </button>
                  </div>

                  {matchedCatalogItem.is_trackable_asset && !matchedAsset && (
                    <button
                      onClick={() => {
                        onQuickAction?.(matchedCatalogItem, 'REGISTER_ASSET');
                        onClose();
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>{t.btnRegisterAsset}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center text-xs font-light text-slate-500">
                  {t.notFound}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
}
