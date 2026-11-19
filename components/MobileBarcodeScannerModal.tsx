'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarcodeDetector as ZXingBarcodeDetector } from 'barcode-detector/ponyfill';
import { 
  InventoryCatalogItem, 
  DepotStockBalance, 
  AssetRegisterItem,
  DepotTransaction,
  PackagingUnitType
} from '@/types/requisition';
import { supabase } from '@/lib/supabaseClient';

interface DetectedItemInfo {
  rawValue: string;
  format: string;
  cornerPoints?: { x: number; y: number }[];
  boundingBox?: DOMRectReadOnly;
}

interface MobileBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDepotId?: string;
  catalogItems: InventoryCatalogItem[];
  stockBalances: DepotStockBalance[];
  assetRegister: AssetRegisterItem[];
  lang: 'tr' | 'en';
  onQuickAction?: (item: InventoryCatalogItem, action: 'INBOUND' | 'OUTBOUND' | 'REGISTER_ASSET', asset?: AssetRegisterItem) => void;
  onItemRegistered?: (
    newCatalogItem: InventoryCatalogItem,
    newBalance: DepotStockBalance,
    newTx: DepotTransaction,
    newAsset?: AssetRegisterItem
  ) => void;
}

export default function MobileBarcodeScannerModal({
  isOpen,
  onClose,
  activeDepotId = 'DEPOT-PRJ02-MAIN',
  catalogItems,
  stockBalances,
  assetRegister,
  lang,
  onQuickAction,
  onItemRegistered,
}: MobileBarcodeScannerModalProps) {
  // Camera & Device State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Scanning & Detection State
  const [manualInput, setManualInput] = useState<string>('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedCatalogItem, setMatchedCatalogItem] = useState<InventoryCatalogItem | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<AssetRegisterItem | null>(null);
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [detectedBarcodes, setDetectedBarcodes] = useState<DetectedItemInfo[]>([]);
  
  // Unregistered Item Registry Form State
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regBarcode, setRegBarcode] = useState<string>('');
  const [regLegacyCode, setRegLegacyCode] = useState<string>('');
  const [regNameTr, setRegNameTr] = useState<string>('');
  const [regNameEn, setRegNameEn] = useState<string>('');
  const [regCategory, setRegCategory] = useState<string>('Mekanik & İklimlendirme');
  const [regSubcategory, setRegSubcategory] = useState<string>('');
  const [regSpec, setRegSpec] = useState<string>('');
  const [regUnit, setRegUnit] = useState<string>('adet');
  const [regPackagingType, setRegPackagingType] = useState<PackagingUnitType>('SINGLE_ITEM');
  const [regPieceCount, setRegPieceCount] = useState<number>(1);
  const [regIsTrackable, setRegIsTrackable] = useState<boolean>(false);
  const [regSerialNo, setRegSerialNo] = useState<string>('');
  const [regWarrantyDate, setRegWarrantyDate] = useState<string>('');
  const [regBaseCostEur, setRegBaseCostEur] = useState<number>(0);
  const [regMarkupPct, setRegMarkupPct] = useState<number>(30);
  const [regInitialQty, setRegInitialQty] = useState<number>(1);
  const [regIrsaliye, setRegIrsaliye] = useState<string>('');
  const [regSupplier, setRegSupplier] = useState<string>('');
  const [regSubmitting, setRegSubmitting] = useState<boolean>(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const detectorRef = useRef<ZXingBarcodeDetector | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const t = {
    title: lang === 'tr' ? 'Evrensel Barkod & Seri No Tarayıcı' : 'Universal Barcode & Serial Scanner',
    subTitle: lang === 'tr' 
      ? 'ZXing WebAssembly Motoru • Çoklu Barkod Okuma & Doğrudan Veri Tabanı Kaydı' 
      : 'ZXing WebAssembly Engine • Multi-Barcode Detection & Direct Database Registry',
    close: lang === 'tr' ? 'Kapat' : 'Close',
    cameraUnavailable: lang === 'tr' 
      ? 'Kamera erişimi sağlanamadı. Lütfen manuel barkod girişini kullanınız.' 
      : 'Camera access unavailable. Please use manual barcode entry.',
    manualPlaceholder: lang === 'tr' ? 'Barkod EAN, Seri No (S/N) veya Kod girin...' : 'Enter Barcode EAN, Serial No (S/N) or SKU...',
    btnSearch: lang === 'tr' ? 'Sorgula' : 'Lookup',
    itemFound: lang === 'tr' ? 'Malzeme / Varlık Eşleşti' : 'Item / Asset Matched',
    detectedInFrame: lang === 'tr' ? 'Kamerada Algılanan Barkodlar:' : 'Barcodes in Camera View:',
    dualDetected: lang === 'tr' ? 'İkili Barkod Eşleşmesi (Ürün EAN + Seri No S/N)' : 'Dual Barcodes Paired (Product EAN + Serial S/N)',
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
    
    // Unregistered Prompt
    unregisteredTitle: lang === 'tr' ? 'Kayıtsız Barkod Algılandı' : 'Unregistered Barcode Detected',
    unregisteredDesc: (code: string) => lang === 'tr' 
      ? `"${code}" barkodu sistemde kayıtlı değil. Bu malzemeyi veri tabanına ekleyip şantiye mal kabulünü hemen yapabilirsiniz.`
      : `Barcode "${code}" is not registered in the database. Would you like to register it now?`,
    btnOpenRegistry: lang === 'tr' ? '+ Yeni Malzeme / Varlık Kaydı Aç' : '+ Register New Item / Asset',

    // Registry Form
    formTitle: lang === 'tr' ? 'Yeni Malzeme / Varlık Veri Tabanı Kaydı' : 'Register New Material / Asset in Database',
    lblBarcode: lang === 'tr' ? 'Barkod (EAN / UPC / QR) *' : 'Barcode (EAN / UPC / QR) *',
    lblLegacyCode: lang === 'tr' ? 'Malzeme Referans Kodu *' : 'Material Reference Code (SKU) *',
    lblNameTr: lang === 'tr' ? 'Malzeme Adı (Türkçe) *' : 'Material Name (Turkish) *',
    lblNameEn: lang === 'tr' ? 'Malzeme Adı (İngilizce)' : 'Material Name (English)',
    lblCategory: lang === 'tr' ? 'Ticari Kategori *' : 'Trade Category *',
    lblSubcategory: lang === 'tr' ? 'Alt Kategori' : 'Subcategory',
    lblSpecification: lang === 'tr' ? 'Teknik Özellik / Standart' : 'Technical Specification',
    lblUnit: lang === 'tr' ? 'Birim *' : 'Unit of Measure *',
    lblPackaging: lang === 'tr' ? 'Ambalaj Tipi *' : 'Packaging Type *',
    lblPieces: lang === 'tr' ? 'Set Parça Sayısı' : 'Set Piece Count',
    lblTrackable: lang === 'tr' ? 'Seri Numaralı Varlık Takibi (Asset Register)' : 'Track as Serialized Asset',
    lblSerial: lang === 'tr' ? 'Üretici Seri Numarası (S/N)' : 'Manufacturer Serial Number (S/N)',
    lblWarranty: lang === 'tr' ? 'Garanti Bitiş Tarihi' : 'Warranty Expiry Date',
    lblCost: lang === 'tr' ? 'Birim Maliyet (€) *' : 'Unit Cost (€) *',
    lblMarkup: lang === 'tr' ? 'Ticari Kâr Marjı (%)' : 'Commercial Markup (%)',
    lblInitialQty: lang === 'tr' ? 'Depoya Giriş Miktarı *' : 'Initial Intake Quantity *',
    lblIrsaliye: lang === 'tr' ? 'İrsaliye Numarası (Boş ise eksik evrak uyarısı verir)' : 'Delivery Note / Dispatch No',
    lblSupplier: lang === 'tr' ? 'Tedarikçi Firma' : 'Supplier Name',
    btnSaveAndIntake: lang === 'tr' ? 'Kaydet & Mal Kabulünü Tamamla' : 'Save & Ingest into Depot',
    btnCancel: lang === 'tr' ? 'İptal' : 'Cancel',
    cameraSelect: lang === 'tr' ? 'Kamera Seç:' : 'Select Camera:',
  };

  // Web Audio Synth Beep
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
      osc.frequency.setValueAtTime(940, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Resolve Barcode Match
  const handleResolveCode = useCallback((code: string, secondarySerial?: string) => {
    const clean = code.trim();
    if (!clean) return;

    setScannedCode(clean);
    playBeep();
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 250);

    // Look up in Asset Register
    const foundAsset = assetRegister.find(
      (a) => a.serial_number.toLowerCase() === clean.toLowerCase() ||
             a.asset_tag.toLowerCase() === clean.toLowerCase() ||
             (a.barcode_ean && a.barcode_ean.toLowerCase() === clean.toLowerCase())
    );

    // Look up in Inventory Catalog
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

    // If not found, prepare registration form presets
    if (!foundCatalog && !foundAsset) {
      setRegBarcode(clean);
      setRegLegacyCode(`MAT-NEW-${Math.random().toString(16).substring(2, 6).toUpperCase()}`);
      if (secondarySerial) {
        setRegIsTrackable(true);
        setRegSerialNo(secondarySerial);
      }
    }
  }, [assetRegister, catalogItems]);

  // Enumerate Cameras
  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Ignore enumeration failure
    }
  }, [selectedDeviceId]);

  // Start Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      await refreshCameras();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg || t.cameraUnavailable);
      setCameraActive(false);
    }
  }, [refreshCameras, t.cameraUnavailable]);

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

  // Initialize ZXing-WASM Ponyfill Detector
  useEffect(() => {
    try {
      detectorRef.current = new ZXingBarcodeDetector({
        formats: [
          'ean_13', 
          'ean_8', 
          'upc_a', 
          'upc_e', 
          'code_128', 
          'code_39', 
          'itf', 
          'qr_code', 
          'data_matrix'
        ],
      });
    } catch {
      detectorRef.current = null;
    }
  }, []);

  // Multi-Barcode Frame Detection Loop
  useEffect(() => {
    if (!isOpen || !cameraActive || !videoRef.current) return;

    let isScanning = true;
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    const checkFrame = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      const video = videoRef.current;
      const overlayCanvas = canvasOverlayRef.current;
      const overlayCtx = overlayCanvas?.getContext('2d');

      if (detectorRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          offscreenCanvas.width = video.videoWidth;
          offscreenCanvas.height = video.videoHeight;
          offscreenCtx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

          const barcodes = await detectorRef.current.detect(offscreenCanvas);

          if (overlayCanvas && overlayCtx) {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          }

          if (barcodes && barcodes.length > 0) {
            const currentItems: DetectedItemInfo[] = [];

            barcodes.forEach((b) => {
              const raw = b.rawValue?.trim();
              if (raw) {
                currentItems.push({
                  rawValue: raw,
                  format: b.format,
                  cornerPoints: b.cornerPoints,
                  boundingBox: b.boundingBox,
                });

                // Draw live bounding box on overlay canvas
                if (overlayCtx && b.cornerPoints && b.cornerPoints.length >= 4) {
                  overlayCtx.beginPath();
                  overlayCtx.moveTo(b.cornerPoints[0].x, b.cornerPoints[0].y);
                  overlayCtx.lineTo(b.cornerPoints[1].x, b.cornerPoints[1].y);
                  overlayCtx.lineTo(b.cornerPoints[2].x, b.cornerPoints[2].y);
                  overlayCtx.lineTo(b.cornerPoints[3].x, b.cornerPoints[3].y);
                  overlayCtx.closePath();
                  overlayCtx.lineWidth = 4;
                  overlayCtx.strokeStyle = '#10b981';
                  overlayCtx.stroke();

                  // Format label tag
                  overlayCtx.fillStyle = '#10b981';
                  overlayCtx.fillRect(b.cornerPoints[0].x, b.cornerPoints[0].y - 22, 100, 20);
                  overlayCtx.fillStyle = '#ffffff';
                  overlayCtx.font = 'bold 12px monospace';
                  overlayCtx.fillText(b.format.toUpperCase(), b.cornerPoints[0].x + 4, b.cornerPoints[0].y - 6);
                }
              }
            });

            setDetectedBarcodes(currentItems);

            // Throttle auto-resolution
            const now = Date.now();
            if (now - lastScannedTimeRef.current > 1500 && currentItems.length > 0) {
              lastScannedTimeRef.current = now;

              // Check if dual pair detected (EAN-13 + Code-128 / DataMatrix)
              const eanBarcode = currentItems.find((i) => i.format.includes('ean') || i.format.includes('upc'));
              const snBarcode = currentItems.find((i) => i.format.includes('code_128') || i.format.includes('data_matrix') || i.format.includes('code_39'));

              if (eanBarcode && snBarcode && eanBarcode.rawValue !== snBarcode.rawValue) {
                handleResolveCode(eanBarcode.rawValue, snBarcode.rawValue);
              } else {
                handleResolveCode(currentItems[0].rawValue);
              }
            }
          } else {
            if (overlayCtx && overlayCanvas) {
              overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }
          }
        } catch {
          // Frame error ignored
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

  // Modal lifecycle
  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (isOpen) {
        await startCamera(selectedDeviceId || undefined);
      } else {
        stopCamera();
        setScannedCode(null);
        setMatchedCatalogItem(null);
        setMatchedAsset(null);
        setManualInput('');
        setDetectedBarcodes([]);
        setIsRegistering(false);
        setRegSuccessMessage(null);
      }
    };

    if (!ignore) {
      void init();
    }

    return () => {
      ignore = true;
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, startCamera, stopCamera]);

  // Switch camera lens
  const handleCameraChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    void startCamera(deviceId);
  };

  // Submit Unregistered Item Registry Form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNameTr.trim() || !regBarcode.trim()) return;

    setRegSubmitting(true);
    setRegSuccessMessage(null);

    const newItemId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`;
    const legacyCode = regLegacyCode.trim() || `MAT-NEW-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const costEur = Number(regBaseCostEur) || 0;
    const markup = Number(regMarkupPct) || 30;
    const valuedEur = Number((costEur * (1 + markup / 100)).toFixed(2));
    const qty = Math.max(1, Number(regInitialQty) || 1);

    // 1. New Catalog Item
    const newCatalogItem: InventoryCatalogItem = {
      item_id: newItemId,
      legacy_code: legacyCode,
      item_name_tr: regNameTr.trim(),
      item_name_en: regNameEn.trim() || null,
      specification: regSpec.trim() || null,
      category: regCategory.trim() || 'Mekanik & İklimlendirme',
      subcategory: regSubcategory.trim() || null,
      unit_of_measure: regUnit,
      base_cost_eur: costEur,
      consumption_rate: 1.0,
      consumption_metric: `${regUnit}_per_unit`,
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: regBarcode.trim(),
      is_trackable_asset: regIsTrackable,
      packaging_unit_type: regPackagingType,
      set_piece_count: regPackagingType === 'ATOMIC_SET' ? Number(regPieceCount) || 1 : 1,
      commercial_markup_pct: markup,
    };

    // 2. New Depot Stock Balance
    const newBalance: DepotStockBalance = {
      balance_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bal-${Date.now()}`,
      depot_id: activeDepotId,
      catalog_item_id: newItemId,
      quantity_on_hand: qty,
      quantity_reserved: 0,
      min_stock_threshold: 5,
      last_scanned_at: new Date().toISOString(),
      catalog_item: newCatalogItem,
    };

    // 3. New Depot Transaction (Inbound Intake)
    const txCode = `MOV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const isMissing = !regIrsaliye.trim();

    const newTx: DepotTransaction = {
      transaction_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      transaction_code: txCode,
      depot_id: activeDepotId,
      catalog_item_id: newItemId,
      movement_type: 'INBOUND_RECEIPT',
      quantity: qty,
      irsaliye_number: regIrsaliye.trim() || null,
      supplier_name: regSupplier.trim() || null,
      unit_cost_eur: costEur,
      final_valued_cost_eur: valuedEur,
      has_missing_docs: isMissing,
      delivery_confirmed: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      notes: `Hızlı barkod tarayıcıdan sisteme kaydedildi (${regNameTr.trim()}).`,
      catalog_item: newCatalogItem,
    };

    // 4. Optional Serialized Asset
    let newAsset: AssetRegisterItem | undefined;
    if (regIsTrackable && regSerialNo.trim()) {
      newAsset = {
        asset_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ast-${Date.now()}`,
        asset_tag: `AST-${new Date().getFullYear()}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
        catalog_item_id: newItemId,
        barcode_ean: regBarcode.trim(),
        serial_number: regSerialNo.trim(),
        current_depot_id: activeDepotId,
        custody_status: 'IN_DEPOT',
        inbound_transaction_id: newTx.transaction_id,
        warranty_expiry_date: regWarrantyDate || null,
        notes: `Mal kabul esnasında seri numarası bağlandı.`,
        created_at: new Date().toISOString(),
        catalog_item: newCatalogItem,
      };
    }

    // Persist to Supabase with PostgreSQL Generated Column Safety
    try {
      await supabase.from('inventory_catalog').insert([newCatalogItem]);
      await supabase.from('depot_stock_balances').upsert([newBalance]);

      // Exclude generated column has_missing_docs from insert payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { has_missing_docs, ...txPayload } = newTx;
      await supabase.from('depot_transactions').insert([txPayload]);

      if (newAsset) {
        await supabase.from('asset_register').insert([newAsset]);
      }
    } catch {
      // Prototype state fallback
    }

    // Update parent workspace state immediately
    onItemRegistered?.(newCatalogItem, newBalance, newTx, newAsset);

    // Provide success feedback & set active item card
    playBeep();
    setRegSuccessMessage(lang === 'tr' ? 'Malzeme ve stok girişi başarıyla kaydedildi!' : 'Item & stock intake successfully registered!');
    setMatchedCatalogItem(newCatalogItem);
    if (newAsset) setMatchedAsset(newAsset);
    setScannedCode(regBarcode.trim());
    setRegSubmitting(false);
    setIsRegistering(false);
  };

  if (!isOpen) return null;

  // Resolve on-hand quantity for active matched item
  const matchedBalance = matchedCatalogItem 
    ? stockBalances.find((b) => b.catalog_item_id === matchedCatalogItem.item_id)
    : null;

  const currentStockQty = matchedBalance ? matchedBalance.quantity_on_hand : 0;
  const baseCost = matchedCatalogItem?.base_cost_eur || 0;
  const markupPct = matchedCatalogItem?.commercial_markup_pct ?? 15;
  const valuedCost = Number((baseCost * (1 + markupPct / 100)).toFixed(2));

  // Existing categories for dropdown
  const categoryOptions = Array.from(
    new Set(catalogItems.map((c) => c.category).filter(Boolean))
  ) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {t.title}
                </h2>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  ZXING WASM
                </span>
              </div>
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
          
          {/* Camera Viewport & Multi-Lens Switcher */}
          {!isRegistering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-light text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {videoDevices.length > 1 ? t.cameraSelect : 'Kamera Aktif:'}
                </span>
                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {videoDevices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId}>
                        {d.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Viewfinder Video Area with Live Overlay Canvas */}
              <div className={`relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center border-2 transition-all ${
                scanFlash ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'border-slate-800'
              }`}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Canvas Overlay for Live Barcode Bounding Boxes */}
                <canvas
                  ref={canvasOverlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Laser scan line overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-4/5 h-3/5 border border-dashed border-amber-400/50 rounded-xl relative">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce" />
                    <div className="absolute -top-6 left-0 right-0 text-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded-md">
                        {lang === 'tr' ? 'HER TÜRLÜ AÇIDAN BARKOD HİZALAYIN' : 'ALIGN BARCODE FROM ANY ANGLE'}
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
                      onClick={() => void startCamera(selectedDeviceId || undefined)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {lang === 'tr' ? 'Kamerayı Yeniden Başlat' : 'Retry Camera'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Multi-Barcode Interactive Chips Tray */}
          {detectedBarcodes.length > 0 && !isRegistering && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.detectedInFrame}
                </span>
                {detectedBarcodes.length >= 2 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                    {t.dualDetected}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedBarcodes.map((item, idx) => (
                  <button
                    key={`${item.rawValue}-${idx}`}
                    type="button"
                    onClick={() => handleResolveCode(item.rawValue)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 shadow-2xs flex items-center space-x-1.5"
                  >
                    <span className="text-[9px] font-sans px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                      {item.format.toUpperCase()}
                    </span>
                    <span>{item.rawValue}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success Banner if newly registered */}
          {regSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <span>✓</span>
              <span>{regSuccessMessage}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          {!isRegistering && (
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

              {/* Quick Presets */}
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
                  EAN: 8690123456789
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualInput('8699999000111');
                    handleResolveCode('8699999000111');
                  }}
                  className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded-md hover:bg-rose-100"
                >
                  Kayıtsız Barkod Testi
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
              </div>
            </div>
          )}

          {/* MATCHED RESULT CARD */}
          {!isRegistering && scannedCode && matchedCatalogItem && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.itemFound}: <span className="font-mono text-slate-800 dark:text-slate-200">{scannedCode}</span>
                </span>
                {matchedCatalogItem.packaging_unit_type === 'ATOMIC_SET' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    {t.atomicSet} ({matchedCatalogItem.set_piece_count || 1} {t.pieceCount})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {t.singleItem}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                    {lang === 'tr' ? matchedCatalogItem.item_name_tr : (matchedCatalogItem.item_name_en || matchedCatalogItem.item_name_tr)}
                  </h3>
                  <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                    {matchedCatalogItem.category} • {matchedCatalogItem.subcategory || 'Genel'}
                  </p>
                </div>

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
                  </div>
                )}

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
              </div>
            </div>
          )}

          {/* UNREGISTERED BARCODE PROMPT */}
          {!isRegistering && scannedCode && !matchedCatalogItem && !matchedAsset && (
            <div className="border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                    {t.unregisteredTitle}
                  </h3>
                  <p className="text-xs font-light text-amber-800 dark:text-amber-400 mt-1">
                    {t.unregisteredDesc(scannedCode)}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t.btnOpenRegistry}</span>
                </button>
              </div>
            </div>
          )}

          {/* FULL DATABASE ITEM & ASSET REGISTRY FORM */}
          {isRegistering && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                    {t.formTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblBarcode}
                  </label>
                  <input
                    type="text"
                    required
                    value={regBarcode}
                    onChange={(e) => setRegBarcode(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblLegacyCode}
                  </label>
                  <input
                    type="text"
                    required
                    value={regLegacyCode}
                    onChange={(e) => setRegLegacyCode(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblNameTr}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 24.000 BTU Inverter VRF İç Ünite"
                    value={regNameTr}
                    onChange={(e) => setRegNameTr(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblNameEn}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24,000 BTU Inverter VRF Indoor Unit"
                    value={regNameEn}
                    onChange={(e) => setRegNameEn(e.target.value)}
                    className="w-full px-3 py-2 font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblCategory}
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Mekanik & İklimlendirme">Mekanik & İklimlendirme</option>
                    <option value="Sıhhi Tesisat & Vitrifiye">Sıhhi Tesisat & Vitrifiye</option>
                    <option value="Elektrik & Altyapı">Elektrik & Altyapı</option>
                    <option value="İnce Yapı & Kaplama">İnce Yapı & Kaplama</option>
                    <option value="Kaba Yapı & Çelik">Kaba Yapı & Çelik</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblSubcategory}
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: VRF Sistemleri"
                    value={regSubcategory}
                    onChange={(e) => setRegSubcategory(e.target.value)}
                    className="w-full px-3 py-2 font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblUnit}
                  </label>
                  <select
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="adet">adet</option>
                    <option value="set">set</option>
                    <option value="kutu">kutu</option>
                    <option value="kg">kg</option>
                    <option value="m2">m2</option>
                    <option value="m3">m3</option>
                    <option value="lt">lt</option>
                    <option value="ton">ton</option>
                    <option value="metre">metre</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblSpecification}
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: R32 Inverter, 60x60 Panel, A++ Verimlilik"
                    value={regSpec}
                    onChange={(e) => setRegSpec(e.target.value)}
                    className="w-full px-3 py-2 font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Packaging Type */}
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblPackaging}
                  </label>
                  <select
                    value={regPackagingType}
                    onChange={(e) => setRegPackagingType(e.target.value as PackagingUnitType)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="SINGLE_ITEM">TEKİL ÜRÜN (Single Item)</option>
                    <option value="ATOMIC_SET">AYRILMAZ SET (Atomic Set)</option>
                  </select>
                </div>

                {regPackagingType === 'ATOMIC_SET' && (
                  <div>
                    <label className="block font-bold text-slate-500 uppercase mb-1">
                      {t.lblPieces}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={regPieceCount}
                      onChange={(e) => setRegPieceCount(Number(e.target.value))}
                      className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Trackable Asset Switch */}
                <div className="sm:col-span-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t.lblTrackable}
                    </span>
                    <input
                      type="checkbox"
                      checked={regIsTrackable}
                      onChange={(e) => setRegIsTrackable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {regIsTrackable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block font-bold text-slate-500 uppercase mb-1">
                          {t.lblSerial}
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: SN-VRF-992100"
                          value={regSerialNo}
                          onChange={(e) => setRegSerialNo(e.target.value)}
                          className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 uppercase mb-1">
                          {t.lblWarranty}
                        </label>
                        <input
                          type="date"
                          value={regWarrantyDate}
                          onChange={(e) => setRegWarrantyDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing & Intake */}
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblCost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={regBaseCostEur}
                    onChange={(e) => setRegBaseCostEur(Number(e.target.value))}
                    className="w-full px-3 py-2 font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblMarkup}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={regMarkupPct}
                    onChange={(e) => setRegMarkupPct(Number(e.target.value))}
                    className="w-full px-3 py-2 font-light rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblInitialQty}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={regInitialQty}
                    onChange={(e) => setRegInitialQty(Number(e.target.value))}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblIrsaliye}
                  </label>
                  <input
                    type="text"
                    placeholder="IRS-2026-..."
                    value={regIrsaliye}
                    onChange={(e) => setRegIrsaliye(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 uppercase mb-1">
                    {t.lblSupplier}
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Daikin / Geberit / Çimko"
                    value={regSupplier}
                    onChange={(e) => setRegSupplier(e.target.value)}
                    className="w-full px-3 py-2 font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting || !regNameTr.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <span>{regSubmitting ? 'Kaydediliyor...' : t.btnSaveAndIntake}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-400">
            {activeDepotId}
          </div>
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
