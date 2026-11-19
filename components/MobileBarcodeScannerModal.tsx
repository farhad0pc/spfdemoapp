'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BarcodeDetector as ZXingBarcodeDetector,
  prepareZXingModule 
} from 'barcode-detector/ponyfill';
import { 
  InventoryCatalogItem, 
  DepotStockBalance, 
  AssetRegisterItem,
  DepotTransaction,
  PackagingUnitType
} from '@/types/requisition';
import { supabase } from '@/lib/supabaseClient';
import { DICTIONARY } from '@/lib/i18n';

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
  const d = DICTIONARY[lang].scanner;
  const common = DICTIONARY[lang].common;

  // Camera & Device State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [engineStatus, setEngineStatus] = useState<'INITIALIZING' | 'READY' | 'ERROR'>('INITIALIZING');
  
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
  const [regCategory, setRegCategory] = useState<string>(d.categories[0] || 'Mekanik & İklimlendirme');
  const [regSubcategory, setRegSubcategory] = useState<string>('');
  const [regSpec, setRegSpec] = useState<string>('');
  const [regUnit, setRegUnit] = useState<string>(d.units[0] || 'adet');
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
        throw new Error(d.cameraUnavailable);
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
      setCameraError(msg || d.cameraUnavailable);
      setCameraActive(false);
    }
  }, [d.cameraUnavailable, refreshCameras]);

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

  // Handle camera device switch
  const handleCameraChange = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    void startCamera(newDeviceId);
  };

  // Manage Camera on Modal Open/Close
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startCamera(selectedDeviceId || undefined);
    } else {
      stopCamera();
      setScannedCode(null);
      setMatchedCatalogItem(null);
      setMatchedAsset(null);
      setDetectedBarcodes([]);
      setIsRegistering(false);
      setRegSuccessMessage(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, startCamera, stopCamera]);

  // Initialize ZXing-WASM Ponyfill Detector with Local Next.js 16 WASM Serving
  useEffect(() => {
    let isMounted = true;

    const initEngine = async () => {
      try {
        setEngineStatus('INITIALIZING');

        // Configure ZXing WebAssembly to load from local Next.js public directory
        await prepareZXingModule({
          overrides: {
            locateFile: (path: string) => {
              if (path.endsWith('.wasm')) {
                return '/wasm/zxing_reader.wasm';
              }
              return path;
            },
          },
          fireImmediately: true,
        });

        const detector = new ZXingBarcodeDetector({
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

        if (isMounted) {
          detectorRef.current = detector;
          setEngineStatus('READY');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to initialize ZXing WebAssembly detector:', err);
          setEngineStatus('ERROR');
        }
      }
    };

    void initEngine();

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-Barcode Frame Detection Loop (Dual-Pass: Raw + Horizontal Un-Mirror)
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
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          // Pass 1: Raw capture for rear smartphone cameras / non-mirrored feeds
          offscreenCanvas.width = vw;
          offscreenCanvas.height = vh;
          offscreenCtx?.drawImage(video, 0, 0, vw, vh);

          let barcodes = await detectorRef.current.detect(offscreenCanvas);
          let isFlippedMatch = false;

          // Pass 2: If no barcodes found, capture horizontally flipped frame for mirrored front webcams
          if ((!barcodes || barcodes.length === 0) && offscreenCtx) {
            offscreenCtx.save();
            offscreenCtx.translate(vw, 0);
            offscreenCtx.scale(-1, 1);
            offscreenCtx.drawImage(video, 0, 0, vw, vh);
            offscreenCtx.restore();

            const flippedBarcodes = await detectorRef.current.detect(offscreenCanvas);
            if (flippedBarcodes && flippedBarcodes.length > 0) {
              barcodes = flippedBarcodes;
              isFlippedMatch = true;
            }
          }

          if (overlayCanvas && overlayCtx) {
            overlayCanvas.width = vw;
            overlayCanvas.height = vh;
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          }

          if (barcodes && barcodes.length > 0) {
            const currentItems: DetectedItemInfo[] = [];

            // Coordinate un-flipper function for visual bounding box alignment
            const mapX = (x: number) => (isFlippedMatch ? vw - x : x);

            barcodes.forEach((b) => {
              const raw = b.rawValue?.trim();
              if (raw) {
                // Map coordinates back to visible camera space if detected on flipped canvas
                const mappedCornerPoints = b.cornerPoints?.map((p) => ({
                  x: mapX(p.x),
                  y: p.y,
                }));

                const mappedBoundingBox = b.boundingBox
                  ? new DOMRectReadOnly(
                      isFlippedMatch ? vw - (b.boundingBox.x + b.boundingBox.width) : b.boundingBox.x,
                      b.boundingBox.y,
                      b.boundingBox.width,
                      b.boundingBox.height
                    )
                  : undefined;

                currentItems.push({
                  rawValue: raw,
                  format: b.format,
                  cornerPoints: mappedCornerPoints,
                  boundingBox: mappedBoundingBox,
                });

                // Draw live bounding box on overlay canvas
                if (overlayCtx && mappedCornerPoints && mappedCornerPoints.length >= 4) {
                  overlayCtx.beginPath();
                  overlayCtx.moveTo(mappedCornerPoints[0].x, mappedCornerPoints[0].y);
                  overlayCtx.lineTo(mappedCornerPoints[1].x, mappedCornerPoints[1].y);
                  overlayCtx.lineTo(mappedCornerPoints[2].x, mappedCornerPoints[2].y);
                  overlayCtx.lineTo(mappedCornerPoints[3].x, mappedCornerPoints[3].y);
                  overlayCtx.closePath();
                  overlayCtx.lineWidth = 4;
                  overlayCtx.strokeStyle = isFlippedMatch ? '#06b6d4' : '#10b981';
                  overlayCtx.stroke();

                  // Format label tag with mirror detection badge
                  const labelX = Math.min(mappedCornerPoints[0].x, mappedCornerPoints[1].x, mappedCornerPoints[2].x, mappedCornerPoints[3].x);
                  const labelY = Math.min(mappedCornerPoints[0].y, mappedCornerPoints[1].y, mappedCornerPoints[2].y, mappedCornerPoints[3].y);
                  const tagText = `${b.format.toUpperCase()}${isFlippedMatch ? ' (MIRRORED)' : ''}`;

                  overlayCtx.fillStyle = isFlippedMatch ? '#0891b2' : '#059669';
                  overlayCtx.fillRect(labelX, Math.max(0, labelY - 24), tagText.length * 8 + 12, 22);
                  overlayCtx.fillStyle = '#ffffff';
                  overlayCtx.font = 'bold 11px Oswald, sans-serif';
                  overlayCtx.fillText(tagText, labelX + 6, Math.max(14, labelY - 8));
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

      if (isScanning) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
      }
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

  // Handle Manual Form Search
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleResolveCode(manualInput.trim());
  };

  // Handle Submission of Unregistered Item Form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNameTr.trim() || !regBarcode.trim()) return;

    setRegSubmitting(true);
    setRegSuccessMessage(null);

    const newItemId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;
    const costEur = Number(regBaseCostEur) || 0;
    const markup = Number(regMarkupPct) || 15;
    const valuedEur = Number((costEur * (1 + markup / 100)).toFixed(2));
    const qty = Math.max(1, Number(regInitialQty) || 1);

    // 1. New Inventory Catalog Item
    const newCatalogItem: InventoryCatalogItem = {
      item_id: newItemId,
      legacy_code: regLegacyCode.trim() || `SKU-${Date.now()}`,
      item_name_tr: regNameTr.trim(),
      item_name_en: regNameEn.trim() || regNameTr.trim(),
      specification: regSpec.trim() || (lang === 'tr' ? 'Hızlı barkod kaydı' : 'Quick barcode registration'),
      category: regCategory.trim(),
      subcategory: regSubcategory.trim() || null,
      unit_of_measure: regUnit.trim() || 'adet',
      base_cost_eur: costEur,
      consumption_rate: 1.0,
      consumption_metric: 'pcs_per_building',
      record_status: 'active',
      review_status: 'approved',
      barcode_ean: regBarcode.trim(),
      is_trackable_asset: regIsTrackable,
      packaging_unit_type: regPackagingType,
      set_piece_count: regPackagingType === 'ATOMIC_SET' ? Math.max(2, regPieceCount) : 1,
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
      notes: lang === 'tr'
        ? `Hızlı barkod tarayıcıdan sisteme kaydedildi (${regNameTr.trim()}).`
        : `Ingested from Universal Barcode Scanner (${regNameEn.trim() || regNameTr.trim()}).`,
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
        notes: lang === 'tr' ? 'Mal kabul esnasında seri numarası bağlandı.' : 'Serial number attached during barcode intake.',
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

  // Merge available categories
  const dynamicCategories = Array.from(
    new Set([
      ...d.categories,
      ...catalogItems.map((c) => c.category).filter((cat): cat is string => Boolean(cat)),
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans">
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
                  {d.title}
                </h2>
                {engineStatus === 'READY' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WASM Ready
                  </span>
                )}
                {engineStatus === 'INITIALIZING' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                    Loading WASM...
                  </span>
                )}
                {engineStatus === 'ERROR' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    WASM Error
                  </span>
                )}
              </div>
              <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                {d.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={common.close}
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
                  {videoDevices.length > 1 ? d.cameraSelect : (lang === 'tr' ? 'Kamera Aktif:' : 'Active Camera:')}
                </span>
                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || (lang === 'tr' ? `Kamera ${idx + 1}` : `Camera ${idx + 1}`)}
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
                        {d.alignHelp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Camera error badge if failed */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-rose-400 font-bold text-sm mb-1">
                      {cameraError}
                    </span>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {d.cameraUnavailable}
                    </p>
                  </div>
                )}
              </div>

              {/* Detected Barcodes in Current Frame (Interactive Chips) */}
              {detectedBarcodes.length > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{d.detectedInFrame}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {detectedBarcodes.length} {lang === 'tr' ? 'Algılandı' : 'Detected'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedBarcodes.map((item, idx) => (
                      <button
                        key={`${item.rawValue}-${idx}`}
                        type="button"
                        onClick={() => handleResolveCode(item.rawValue)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all flex items-center space-x-1.5 ${
                          scannedCode === item.rawValue
                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[9px] opacity-70 uppercase font-sans font-normal">{item.format}</span>
                        <span>{item.rawValue}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Form / USB Scanner Barcode Field */}
          {!isRegistering && (
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={d.manualPlaceholder}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {d.btnSearch}
              </button>
            </form>
          )}

          {/* Quick Test Barcodes Tray */}
          {!isRegistering && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {d.quickPresets}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleResolveCode('8690123456789')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                >
                  8690123456789 (VRF Set)
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveCode('SN-VRF-884920')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                >
                  SN-VRF-884920 (S/N)
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveCode('8690987654321')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                >
                  8690987654321 (Rezervuar)
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveCode('8700216605830')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-mono font-bold border border-amber-300 dark:border-amber-800"
                >
                  8700216605830 (Test EAN)
                </button>
              </div>
            </div>
          )}

          {/* Success Banner if newly registered */}
          {regSuccessMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{regSuccessMessage}</span>
            </div>
          )}

          {/* Matched Item / Asset Card */}
          {matchedCatalogItem && !isRegistering && (
            <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {d.itemFound}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      [{scannedCode}]
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {lang === 'tr' ? matchedCatalogItem.item_name_tr : matchedCatalogItem.item_name_en}
                  </h3>
                  <p className="text-xs font-light text-slate-500 dark:text-slate-400">
                    {matchedCatalogItem.specification}
                  </p>
                </div>

                {matchedCatalogItem.packaging_unit_type === 'ATOMIC_SET' ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    {d.atomicSet} ({matchedCatalogItem.set_piece_count || 1} {d.pieceCount})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-light bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {d.singleItem}
                  </span>
                )}
              </div>

              {/* SKU & Price Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/20">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{d.sku}</span>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {matchedCatalogItem.legacy_code}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{d.stockOnHand}</span>
                  <p className="text-xs font-light text-slate-900 dark:text-white">
                    <span className="font-bold">{currentStockQty}</span> {matchedCatalogItem.unit_of_measure}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{d.baseCost}</span>
                  <p className="text-xs font-light text-slate-700 dark:text-slate-300">
                    €{baseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{d.valuedCost}</span>
                  <p className="text-xs font-light text-emerald-600 dark:text-emerald-400">
                    €{valuedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Matched Asset Details (if serialized) */}
              {matchedAsset && (
                <div className="bg-white/60 dark:bg-slate-900/60 rounded-xl p-3 border border-purple-300 dark:border-purple-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                      {lang === 'tr' ? 'Zimmetli Varlık Bilgisi:' : 'Custody Asset Info:'}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {matchedAsset.asset_tag}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{d.serialNo}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{matchedAsset.serial_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{d.custody}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{matchedAsset.custody_status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons for Matched Item */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onQuickAction?.(matchedCatalogItem, 'INBOUND', matchedAsset || undefined);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {d.btnInbound}
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onQuickAction?.(matchedCatalogItem, 'OUTBOUND', matchedAsset || undefined);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {d.btnOutbound}
                </button>
                {matchedCatalogItem.is_trackable_asset && !matchedAsset && (
                  <button
                    onClick={() => {
                      onClose();
                      onQuickAction?.(matchedCatalogItem, 'REGISTER_ASSET');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    {d.btnRegisterAsset}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Unregistered Barcode Found -> Prompt Quick Registry */}
          {scannedCode && !matchedCatalogItem && !matchedAsset && !isRegistering && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase">
                  {d.unregisteredTitle}
                </h4>
              </div>
              <p className="text-xs font-light text-slate-600 dark:text-slate-300">
                {d.unregisteredDesc(scannedCode)}
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <span>{d.btnOpenRegistry}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* INLINE UNREGISTERED ITEM QUICK-REGISTRY FORM */}
          {/* ================================================= */}
          {isRegistering && (
            <form onSubmit={handleRegisterSubmit} className="bg-slate-50 dark:bg-slate-900/90 border border-blue-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {d.formTitle}
                  </h4>
                  <p className="text-[11px] font-mono font-light text-slate-400">
                    EAN: <span className="font-bold">{regBarcode}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕ {common.cancel}
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Barcode & SKU Code */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblBarcode}</label>
                  <input
                    type="text"
                    required
                    value={regBarcode}
                    onChange={(e) => setRegBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblLegacyCode}</label>
                  <input
                    type="text"
                    required
                    value={regLegacyCode}
                    onChange={(e) => setRegLegacyCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Names */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblNameTr}</label>
                  <input
                    type="text"
                    required
                    value={regNameTr}
                    onChange={(e) => setRegNameTr(e.target.value)}
                    placeholder="Örn: 24kW Inverter VRF Klima Dış Ünite"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblNameEn}</label>
                  <input
                    type="text"
                    value={regNameEn}
                    onChange={(e) => setRegNameEn(e.target.value)}
                    placeholder="e.g. 24kW Inverter VRF Outdoor Unit"
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Category & Subcategory */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblCategory}</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {dynamicCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblSubcategory}</label>
                  <input
                    type="text"
                    value={regSubcategory}
                    onChange={(e) => setRegSubcategory(e.target.value)}
                    placeholder={d.placeholderSubcategory}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Unit of Measure & Technical Spec */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblUnit}</label>
                  <select
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {d.units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblSpecification}</label>
                  <input
                    type="text"
                    value={regSpec}
                    onChange={(e) => setRegSpec(e.target.value)}
                    placeholder={d.placeholderSpec}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Packaging Type & Piece Count */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblPackaging}</label>
                  <select
                    value={regPackagingType}
                    onChange={(e) => setRegPackagingType(e.target.value as PackagingUnitType)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="SINGLE_ITEM">{d.singleItem}</option>
                    <option value="ATOMIC_SET">{d.atomicSet} ({lang === 'tr' ? 'Parça Seti' : 'Pack Set'})</option>
                  </select>
                </div>

                {regPackagingType === 'ATOMIC_SET' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblPieces}</label>
                    <input
                      type="number"
                      min="2"
                      value={regPieceCount}
                      onChange={(e) => setRegPieceCount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Cost and Commercial Markup */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblCost}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={regBaseCostEur}
                    onChange={(e) => setRegBaseCostEur(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblMarkup}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={regMarkupPct}
                    onChange={(e) => setRegMarkupPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Intake Quantity & Delivery Note */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblInitialQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={regInitialQty}
                    onChange={(e) => setRegInitialQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblIrsaliye}</label>
                  <input
                    type="text"
                    value={regIrsaliye}
                    onChange={(e) => setRegIrsaliye(e.target.value)}
                    placeholder="IRS-2026-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblSupplier}</label>
                  <input
                    type="text"
                    value={regSupplier}
                    onChange={(e) => setRegSupplier(e.target.value)}
                    placeholder={lang === 'tr' ? 'Örn: Daikin Kıbrıs / Çimko Çimento' : 'e.g. Daikin Cyprus / Lafarge'}
                    className="w-full px-3 py-2 text-xs font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Trackable Serialized Asset Options */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center space-x-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={regIsTrackable}
                      onChange={(e) => setRegIsTrackable(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {d.lblTrackable}
                    </span>
                  </label>

                  {regIsTrackable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblSerial}</label>
                        <input
                          type="text"
                          value={regSerialNo}
                          onChange={(e) => setRegSerialNo(e.target.value)}
                          placeholder="SN-XXXX-YYYY"
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{d.lblWarranty}</label>
                        <input
                          type="date"
                          value={regWarrantyDate}
                          onChange={(e) => setRegWarrantyDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono font-light rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting || !regNameTr.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <span>{regSubmitting ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : d.btnSaveAndIntake}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-[10px] font-mono font-bold text-slate-400">
            {activeDepotId}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            {common.close}
          </button>
        </div>

      </div>
    </div>
  );
}
