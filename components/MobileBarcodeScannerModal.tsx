'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BarcodeDetector as ZXingBarcodeDetector,
  prepareZXingModule,
} from 'barcode-detector/ponyfill';
import {
  InventoryCatalogItem,
  DepotStockBalance,
  AssetRegisterItem,
  DepotTransaction,
  PackagingUnitType,
  PortfolioProject,
  DepotLocation,
  RoleTier,
  MediaSourceType,
} from '@/types/requisition';
import { supabase } from '@/lib/supabaseClient';
import { DICTIONARY } from '@/lib/i18n';
import AttributesEditor from '@/components/AttributesEditor';
import WebcamCaptureModal from '@/components/WebcamCaptureModal';
import {
  compressImageToWebP,
  CompressedImageResult,
  formatBytesLabel,
} from '@/lib/imageCompression';

const CONTROL_CLASS =
  'w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500';

const MAX_STAGED_BARCODES = 5;

export type StagedBarcodeStatus =
  | 'CHECKING'
  | 'INVENTORY_MATCH'
  | 'PUBLIC_MATCH'
  | 'UNLISTED';

export interface StagedBarcodeEntry {
  code: string;
  format: string;
  status: StagedBarcodeStatus;
  inventoryItem?: InventoryCatalogItem;
  inventoryAsset?: AssetRegisterItem;
  publicSuggestion?: {
    name?: string;
    brand?: string;
    specification?: string;
    source?: string;
  };
  skippedExternalReason?: 'URL_OR_NON_GTIN';
  detectedAt: number;
}

/**
 * Client-side mirror of the URL / Non-GTIN guard to skip wasted external requests.
 */
function isEligibleForExternalLookup(rawCode: string): boolean {
  const code = rawCode.trim();
  if (!code || code.length < 6 || code.length > 32) return false;

  const lower = code.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.') ||
    lower.includes('://') ||
    /\s/.test(code)
  ) {
    return false;
  }

  if (/^\d{8,14}$/.test(code)) {
    return true;
  }

  if (/\.[a-z]{2,}(\/|$)/i.test(code)) {
    return false;
  }

  if (/^[A-Za-z0-9][A-Za-z0-9._-]{5,31}$/.test(code) && /\d/.test(code)) {
    return true;
  }

  return false;
}

/**
 * Smart default selection priority for new barcodes:
 * Strongly prefers 1D retail/industrial product codes (EAN-13, UPC-A, EAN-8, Code-128,
 * numeric 8-14 digit GTINs) over QR_CODE / URL payloads.
 */
function getNewBarcodePriorityScore(entry: StagedBarcodeEntry): number {
  const fmt = entry.format.toLowerCase();
  const code = entry.code.trim();
  const lowerCode = code.toLowerCase();
  const isUrl =
    lowerCode.startsWith('http://') ||
    lowerCode.startsWith('https://') ||
    lowerCode.startsWith('www.') ||
    lowerCode.includes('://');

  if (isUrl) return 0;

  let score = 0;
  if (entry.status === 'PUBLIC_MATCH') score += 40;
  if (/^\d{13}$/.test(code)) score += 100;
  else if (/^\d{8,14}$/.test(code)) score += 90;

  if (fmt.includes('ean_13') || fmt.includes('ean-13')) score += 60;
  else if (fmt.includes('upc_a') || fmt.includes('upc-a')) score += 55;
  else if (fmt.includes('ean_8') || fmt.includes('upc_e')) score += 50;
  else if (
    fmt.includes('code_128') ||
    fmt.includes('code_39') ||
    fmt.includes('itf')
  )
    score += 45;
  else if (fmt === 'manual') score += 35;
  else if (fmt.includes('qr') || fmt.includes('data_matrix')) score += 10;

  return score;
}

function formatBarcodeTypeLabel(format: string): string {
  const clean = format.replace(/_/g, '-').toUpperCase();
  return clean || 'BARCODE';
}

interface MobileBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDepotId?: string;
  catalogItems: InventoryCatalogItem[];
  stockBalances: DepotStockBalance[];
  assetRegister: AssetRegisterItem[];
  portfolioProjects?: PortfolioProject[];
  depotLocations?: DepotLocation[];
  currentRole?: RoleTier;
  lang: 'tr' | 'en';
  onQuickAction?: (
    item: InventoryCatalogItem,
    action: 'INBOUND' | 'OUTBOUND' | 'REGISTER_ASSET',
    asset?: AssetRegisterItem
  ) => void;
  onViewExistingItem?: (item: InventoryCatalogItem) => void;
  onItemRegistered?: (
    newCatalogItem: InventoryCatalogItem,
    newBalance: DepotStockBalance,
    newTx?: DepotTransaction | null,
    newAsset?: AssetRegisterItem | null
  ) => void;
  onCatalogRefresh?: () => Promise<void> | void;
  onShowToast?: (message: string, subMessage?: string) => void;
}

export default function MobileBarcodeScannerModal({
  isOpen,
  onClose,
  activeDepotId = 'DEPOT-PRJ02-MAIN',
  catalogItems,
  stockBalances,
  assetRegister,
  portfolioProjects = [],
  depotLocations = [],
  currentRole = 'DEPOT_MANAGER',
  lang,
  onQuickAction,
  onViewExistingItem,
  onItemRegistered,
  onCatalogRefresh,
  onShowToast,
}: MobileBarcodeScannerModalProps) {
  const d = DICTIONARY[lang].scanner;
  const common = DICTIONARY[lang].common;
  const tm = DICTIONARY[lang].media;
  const tc = DICTIONARY[lang].camera;

  // Dual-Mode Switcher: 'SCAN_LOOKUP' vs 'MANUAL_ADD'
  const [activeMode, setActiveMode] = useState<'SCAN_LOOKUP' | 'MANUAL_ADD'>(
    'SCAN_LOOKUP'
  );

  // Camera & Device State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPaused, setCameraPaused] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [engineStatus, setEngineStatus] = useState<
    'INITIALIZING' | 'READY' | 'ERROR'
  >('INITIALIZING');

  // Milestone v2.9.1: Multi-Barcode Session Staging Tray & Single-Barcode Guardrail
  const [manualInput, setManualInput] = useState<string>('');
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [detectedBarcodes, setDetectedBarcodes] = useState<
    StagedBarcodeEntry[]
  >([]);
  const [selectedNewBarcode, setSelectedNewBarcode] = useState<string | null>(
    null
  );

  // External Lookup Badge in Manual Add form
  const [externalLookingUp, setExternalLookingUp] = useState<boolean>(false);
  const [externalSuggestionSource, setExternalSuggestionSource] = useState<
    string | null
  >(null);

  // Registration Form State
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regProjectId, setRegProjectId] = useState<string>('PRJ-02');
  const [regProductDomain, setRegProductDomain] = useState<string>(
    'CONSTRUCTION_MATERIALS'
  );
  const [regCategory, setRegCategory] = useState<string>(
    d.categories[0] || 'Mekanik & İklimlendirme'
  );
  const [regSubcategory, setRegSubcategory] = useState<string>('');
  const [regNameTr, setRegNameTr] = useState<string>('');
  const [regNameEn, setRegNameEn] = useState<string>('');
  const [regUnit, setRegUnit] = useState<string>(d.units[0] || 'adet');
  const [regBarcode, setRegBarcode] = useState<string>('');
  const [regLegacyCode, setRegLegacyCode] = useState<string>('');
  const [regBrandModel, setRegBrandModel] = useState<string>('');
  const [regSupplier, setRegSupplier] = useState<string>('');
  const [regBaseCostEur, setRegBaseCostEur] = useState<number>(0);
  const [regSourceCurrency, setRegSourceCurrency] = useState<string>('EUR');
  const [regMarkupPct, setRegMarkupPct] = useState<number>(15);
  const [regPackagingType, setRegPackagingType] =
    useState<PackagingUnitType>('SINGLE_ITEM');
  const [regPieceCount, setRegPieceCount] = useState<number>(1);
  const [regIsTrackable, setRegIsTrackable] = useState<boolean>(false);
  const [regSerialNo, setRegSerialNo] = useState<string>('');
  const [regWarrantyDate, setRegWarrantyDate] = useState<string>('');
  const [regProductUrl, setRegProductUrl] = useState<string>('');
  const [regSpec, setRegSpec] = useState<string>('');
  const [regAttributes, setRegAttributes] = useState<Record<string, unknown>>(
    {}
  );
  const [regFormKey, setRegFormKey] = useState<number>(0);
  const [regInitialQty, setRegInitialQty] = useState<number>(1);
  const [regIrsaliye, setRegIrsaliye] = useState<string>('');
  const [regSubmitting, setRegSubmitting] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(
    null
  );

  // Milestone v2.9.0 / v2.9.3: Top-Mounted Reference Photo Hero + Cross-Device Live Camera
  const [regRefPhoto, setRegRefPhoto] = useState<CompressedImageResult | null>(
    null
  );
  const [regPhotoSource, setRegPhotoSource] =
    useState<MediaSourceType>('CAMERA');
  const [regPhotoCompressing, setRegPhotoCompressing] =
    useState<boolean>(false);
  const [isRefWebcamOpen, setIsRefWebcamOpen] = useState<boolean>(false);

  // Refs for camera, WASM detector, and synchronous deduplication
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const detectorRef = useRef<ZXingBarcodeDetector | null>(null);
  const seenCodesRef = useRef<Set<string>>(new Set());
  const regDevicePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup Reference Photo object URL
  useEffect(() => {
    return () => {
      if (regRefPhoto?.previewUrl) {
        URL.revokeObjectURL(regRefPhoto.previewUrl);
      }
    };
  }, [regRefPhoto]);

  // Web Audio Synth Beep
  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
  }, []);

  // Direct external lookup button inside Manual Add form
  const triggerManualExternalLookup = useCallback(async (code: string) => {
    if (!isEligibleForExternalLookup(code)) return;
    setExternalLookingUp(true);
    setExternalSuggestionSource(null);
    try {
      const res = await fetch(
        `/api/depot/barcode-lookup?code=${encodeURIComponent(code)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          found: boolean;
          name?: string;
          brand?: string;
          specification?: string;
          source?: string;
        };
        if (data.found) {
          if (data.name) {
            setRegNameTr(data.name);
            setRegNameEn(data.name);
          }
          if (data.brand) {
            setRegBrandModel(data.brand);
          }
          if (data.specification) {
            setRegSpec(data.specification);
          }
          setExternalSuggestionSource(data.source || 'Public Directory');
        }
      }
    } catch {
      // Ignore timeout or miss gracefully
    } finally {
      setExternalLookingUp(false);
    }
  }, []);

  /**
   * Hardened Two-Tier Resolution Pipeline (NEVER auto-redirects to Manual Add):
   * Priority 1 — Existing Supabase Inventory (always wins, NEVER calls external API).
   * Priority 2 — Smart Public Directory Lookup (skipped immediately for URLs / non-GTINs).
   */
  const stageAndResolveBarcode = useCallback(
    async (rawCode: string, format: string) => {
      const clean = rawCode.trim();
      if (!clean) return;

      const dedupeKey = clean.toLowerCase();
      if (seenCodesRef.current.has(dedupeKey)) {
        return;
      }
      if (seenCodesRef.current.size >= MAX_STAGED_BARCODES) {
        return;
      }

      seenCodesRef.current.add(dedupeKey);
      playBeep();
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 220);

      const initialEntry: StagedBarcodeEntry = {
        code: clean,
        format: format || 'MANUAL',
        status: 'CHECKING',
        detectedAt: Date.now(),
      };

      setDetectedBarcodes((prev) => {
        if (
          prev.length >= MAX_STAGED_BARCODES ||
          prev.some((e) => e.code.toLowerCase() === dedupeKey)
        ) {
          return prev;
        }
        return [...prev, initialEntry];
      });

      const updateEntry = (patch: Partial<StagedBarcodeEntry>) => {
        setDetectedBarcodes((prev) =>
          prev.map((entry) =>
            entry.code.toLowerCase() === dedupeKey
              ? { ...entry, ...patch }
              : entry
          )
        );
      };

      // =========================================================
      // PRIORITY 1: EXISTING SUPABASE INVENTORY (ALWAYS WINS)
      // =========================================================
      let foundAsset = assetRegister.find(
        (a) =>
          a.serial_number.toLowerCase() === dedupeKey ||
          a.asset_tag.toLowerCase() === dedupeKey ||
          (a.barcode_ean && a.barcode_ean.toLowerCase() === dedupeKey)
      );

      let foundCatalog = catalogItems.find(
        (c) =>
          (c.barcode_ean && c.barcode_ean.toLowerCase() === dedupeKey) ||
          (c.legacy_code && c.legacy_code.toLowerCase() === dedupeKey) ||
          (c.manufacturer_article &&
            c.manufacturer_article.toLowerCase() === dedupeKey) ||
          c.item_id === clean
      );

      // Query live Supabase tables if not in local cache
      if (!foundCatalog && !foundAsset) {
        try {
          const isPostgrestOrSafe = /^[A-Za-z0-9._-]+$/.test(clean);

          if (isPostgrestOrSafe) {
            const { data: dbCatalog } = await supabase
              .from('inventory_catalog')
              .select('*')
              .or(
                `barcode_ean.eq.${clean},legacy_code.ilike.${clean},manufacturer_article.ilike.${clean}`
              )
              .limit(1)
              .maybeSingle();

            if (dbCatalog) {
              foundCatalog = dbCatalog as InventoryCatalogItem;
            } else {
              const { data: dbAsset } = await supabase
                .from('asset_register')
                .select('*, catalog_item:inventory_catalog(*)')
                .or(
                  `serial_number.ilike.${clean},asset_tag.ilike.${clean},barcode_ean.eq.${clean}`
                )
                .limit(1)
                .maybeSingle();

              if (dbAsset) {
                foundAsset = dbAsset as AssetRegisterItem;
                if (dbAsset.catalog_item) {
                  foundCatalog = dbAsset.catalog_item as InventoryCatalogItem;
                }
              }
            }
          } else {
            const { data: dbCatalog } = await supabase
              .from('inventory_catalog')
              .select('*')
              .eq('barcode_ean', clean)
              .limit(1)
              .maybeSingle();

            if (dbCatalog) {
              foundCatalog = dbCatalog as InventoryCatalogItem;
            }
          }
        } catch {
          // Continue cleanly if live query fails
        }
      }

      if (foundAsset && !foundCatalog) {
        foundCatalog = catalogItems.find(
          (c) => c.item_id === foundAsset?.catalog_item_id
        );
      }

      if (foundCatalog) {
        updateEntry({
          status: 'INVENTORY_MATCH',
          inventoryItem: foundCatalog,
          inventoryAsset: foundAsset || undefined,
        });
        return;
      }

      // =========================================================
      // PRIORITY 2: SMART PUBLIC DIRECTORY LOOKUP (NEW CODES ONLY)
      // =========================================================
      if (!isEligibleForExternalLookup(clean)) {
        updateEntry({
          status: 'UNLISTED',
          skippedExternalReason: 'URL_OR_NON_GTIN',
        });
        return;
      }

      try {
        const res = await fetch(
          `/api/depot/barcode-lookup?code=${encodeURIComponent(clean)}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            found: boolean;
            name?: string;
            brand?: string;
            specification?: string;
            source?: string;
            skippedReason?: 'URL_OR_NON_GTIN';
          };

          if (data.found) {
            updateEntry({
              status: 'PUBLIC_MATCH',
              publicSuggestion: {
                name: data.name,
                brand: data.brand,
                specification: data.specification,
                source: data.source || 'Public Directory',
              },
            });
            return;
          }

          updateEntry({
            status: 'UNLISTED',
            skippedExternalReason: data.skippedReason,
          });
          return;
        }
      } catch {
        // Network error falls through gracefully to UNLISTED
      }

      updateEntry({
        status: 'UNLISTED',
      });
    },
    [assetRegister, catalogItems, playBeep]
  );

  // Enumerate Cameras
  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((dev) => dev.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Ignore enumeration failure
    }
  }, [selectedDeviceId]);

  // Start Camera Stream
  const startCamera = useCallback(
    async (deviceId?: string) => {
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
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
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
    },
    [d.cameraUnavailable, refreshCameras]
  );

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
    setCameraPaused(false);
    void startCamera(newDeviceId);
  };

  // Clear Session Staging Tray
  const handleClearTray = useCallback(() => {
    seenCodesRef.current.clear();
    setDetectedBarcodes([]);
    setSelectedNewBarcode(null);
    setManualInput('');
    setRegSuccessMessage(null);
  }, []);

  // Manage Camera on Modal Open/Close, Pause/Resume & Mode Switch
  useEffect(() => {
    if (
      isOpen &&
      activeMode === 'SCAN_LOOKUP' &&
      !isRegistering &&
      !cameraPaused
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startCamera(selectedDeviceId || undefined);
    } else {
      stopCamera();
    }

    if (!isOpen) {
      seenCodesRef.current.clear();
      setDetectedBarcodes([]);
      setSelectedNewBarcode(null);
      setCameraPaused(false);
      setIsRegistering(false);
      setIsRefWebcamOpen(false);
      setActiveMode('SCAN_LOOKUP');
      setRegSuccessMessage(null);
      setRegError(null);
      setExternalSuggestionSource(null);
      setRegAttributes({});
      setRegRefPhoto(null);
      setManualInput('');
    }

    return () => {
      stopCamera();
    };
  }, [
    isOpen,
    activeMode,
    isRegistering,
    cameraPaused,
    selectedDeviceId,
    startCamera,
    stopCamera,
  ]);

  // Initialize ZXing-WASM Ponyfill Detector with Local Next.js 16 WASM Serving
  useEffect(() => {
    let isMounted = true;

    const initEngine = async () => {
      try {
        setEngineStatus('INITIALIZING');

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
            'data_matrix',
          ],
        });

        if (isMounted) {
          detectorRef.current = detector;
          setEngineStatus('READY');
        }
      } catch (err) {
        if (isMounted) {
          console.error(
            'Failed to initialize ZXing WebAssembly detector:',
            err
          );
          setEngineStatus('ERROR');
        }
      }
    };

    void initEngine();

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-Symbol Frame Detection Loop (Dual-Pass: Raw + Horizontal Un-Mirror)
  useEffect(() => {
    if (
      !isOpen ||
      activeMode !== 'SCAN_LOOKUP' ||
      isRegistering ||
      cameraPaused ||
      !cameraActive ||
      !videoRef.current
    ) {
      return;
    }

    let isScanning = true;
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    const checkFrame = async () => {
      if (
        !isScanning ||
        !videoRef.current ||
        videoRef.current.readyState < 2
      ) {
        scanLoopRef.current = requestAnimationFrame(checkFrame);
        return;
      }

      const video = videoRef.current;
      const overlayCanvas = canvasOverlayRef.current;
      const overlayCtx = overlayCanvas?.getContext('2d');

      if (
        detectorRef.current &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          // Pass 1: Raw capture
          offscreenCanvas.width = vw;
          offscreenCanvas.height = vh;
          offscreenCtx?.drawImage(video, 0, 0, vw, vh);

          let barcodes = await detectorRef.current.detect(offscreenCanvas);
          let isFlippedMatch = false;

          // Pass 2: Horizontally flipped frame for mirrored front webcams
          if ((!barcodes || barcodes.length === 0) && offscreenCtx) {
            offscreenCtx.save();
            offscreenCtx.translate(vw, 0);
            offscreenCtx.scale(-1, 1);
            offscreenCtx.drawImage(video, 0, 0, vw, vh);
            offscreenCtx.restore();

            const flippedBarcodes =
              await detectorRef.current.detect(offscreenCanvas);
            if (flippedBarcodes && flippedBarcodes.length > 0) {
              barcodes = flippedBarcodes;
              isFlippedMatch = true;
            }
          }

          if (overlayCanvas && overlayCtx) {
            overlayCanvas.width = vw;
            overlayCanvas.height = vh;
            overlayCtx.clearRect(
              0,
              0,
              overlayCanvas.width,
              overlayCanvas.height
            );
          }

          if (barcodes && barcodes.length > 0) {
            const mapX = (x: number) => (isFlippedMatch ? vw - x : x);

            barcodes.forEach((b) => {
              const raw = b.rawValue?.trim();
              if (!raw) return;

              const mappedCornerPoints = b.cornerPoints?.map((p) => ({
                x: mapX(p.x),
                y: p.y,
              }));

              if (
                overlayCtx &&
                mappedCornerPoints &&
                mappedCornerPoints.length >= 4
              ) {
                overlayCtx.beginPath();
                overlayCtx.moveTo(
                  mappedCornerPoints[0].x,
                  mappedCornerPoints[0].y
                );
                overlayCtx.lineTo(
                  mappedCornerPoints[1].x,
                  mappedCornerPoints[1].y
                );
                overlayCtx.lineTo(
                  mappedCornerPoints[2].x,
                  mappedCornerPoints[2].y
                );
                overlayCtx.lineTo(
                  mappedCornerPoints[3].x,
                  mappedCornerPoints[3].y
                );
                overlayCtx.closePath();
                overlayCtx.lineWidth = 4;
                overlayCtx.strokeStyle = isFlippedMatch ? '#06b6d4' : '#10b981';
                overlayCtx.stroke();

                const labelX = Math.min(
                  mappedCornerPoints[0].x,
                  mappedCornerPoints[1].x,
                  mappedCornerPoints[2].x,
                  mappedCornerPoints[3].x
                );
                const labelY = Math.min(
                  mappedCornerPoints[0].y,
                  mappedCornerPoints[1].y,
                  mappedCornerPoints[2].y,
                  mappedCornerPoints[3].y
                );
                const tagText = `${formatBarcodeTypeLabel(b.format)}${
                  isFlippedMatch ? ' (MIRRORED)' : ''
                }`;

                overlayCtx.fillStyle = isFlippedMatch ? '#0891b2' : '#059669';
                overlayCtx.fillRect(
                  labelX,
                  Math.max(0, labelY - 24),
                  tagText.length * 8 + 12,
                  22
                );
                overlayCtx.fillStyle = '#ffffff';
                overlayCtx.font = 'bold 11px Oswald, sans-serif';
                overlayCtx.fillText(
                  tagText,
                  labelX + 6,
                  Math.max(14, labelY - 8)
                );
              }

              void stageAndResolveBarcode(raw, b.format || 'BARCODE');
            });
          } else if (overlayCtx && overlayCanvas) {
            overlayCtx.clearRect(
              0,
              0,
              overlayCanvas.width,
              overlayCanvas.height
            );
          }
        } catch {
          // Frame decode error ignored
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
  }, [
    isOpen,
    activeMode,
    isRegistering,
    cameraPaused,
    cameraActive,
    stageAndResolveBarcode,
  ]);

  // Derived: Pin INVENTORY_MATCH cards to top of the staging tray
  const sortedStagedBarcodes = useMemo(() => {
    const rank = (status: StagedBarcodeStatus) => {
      if (status === 'INVENTORY_MATCH') return 0;
      if (status === 'PUBLIC_MATCH') return 1;
      if (status === 'CHECKING') return 2;
      return 3;
    };
    return [...detectedBarcodes].sort((a, b) => {
      const rDiff = rank(a.status) - rank(b.status);
      if (rDiff !== 0) return rDiff;
      return a.detectedAt - b.detectedAt;
    });
  }, [detectedBarcodes]);

  const inventoryMatchEntries = useMemo(
    () => sortedStagedBarcodes.filter((e) => e.status === 'INVENTORY_MATCH'),
    [sortedStagedBarcodes]
  );

  const newBarcodeEntries = useMemo(
    () => sortedStagedBarcodes.filter((e) => e.status !== 'INVENTORY_MATCH'),
    [sortedStagedBarcodes]
  );

  // Smart Default Single-Barcode Selection (prefers 1D EAN/UPC/Code-128 over QR/URLs)
  const effectiveSelectedNewBarcode = useMemo(() => {
    if (newBarcodeEntries.length === 0) return null;
    if (
      selectedNewBarcode &&
      newBarcodeEntries.some((e) => e.code === selectedNewBarcode)
    ) {
      return selectedNewBarcode;
    }
    const ranked = [...newBarcodeEntries].sort(
      (a, b) => getNewBarcodePriorityScore(b) - getNewBarcodePriorityScore(a)
    );
    return ranked[0]?.code || null;
  }, [newBarcodeEntries, selectedNewBarcode]);

  const selectedNewEntry = useMemo(
    () =>
      newBarcodeEntries.find((e) => e.code === effectiveSelectedNewBarcode) ||
      null,
    [newBarcodeEntries, effectiveSelectedNewBarcode]
  );

  // Explicit "Add New Item" transition using strictly the ONE selected barcode
  const handleProceedToAddNewItem = (
    targetEntry?: StagedBarcodeEntry | null
  ) => {
    const entry = targetEntry || selectedNewEntry;
    if (!entry) return;

    setCameraPaused(true);
    setRegBarcode(entry.code);
    setRegLegacyCode('');
    setRegNameTr(entry.publicSuggestion?.name || '');
    setRegNameEn(entry.publicSuggestion?.name || '');
    setRegBrandModel(entry.publicSuggestion?.brand || '');
    setRegSpec(entry.publicSuggestion?.specification || '');
    setExternalSuggestionSource(entry.publicSuggestion?.source || null);
    setRegAttributes({});
    setRegRefPhoto(null);
    setRegError(null);
    setRegSuccessMessage(null);
    setRegFormKey((k) => k + 1);
    setActiveMode('MANUAL_ADD');
    setIsRegistering(true);
  };

  // Switch to blank Manual Add mode
  const handleSwitchToManualAdd = () => {
    setCameraPaused(true);
    setActiveMode('MANUAL_ADD');
    setIsRegistering(true);
    setRegError(null);
    setRegSuccessMessage(null);
  };

  // Switch back to Scan / Lookup mode
  const handleSwitchToScanLookup = () => {
    setActiveMode('SCAN_LOOKUP');
    setIsRegistering(false);
    setCameraPaused(false);
    setRegError(null);
  };

  // Handle Manual Lookup Input -> stages into the tray (never auto-redirects)
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualInput.trim();
    if (!clean) return;
    void stageAndResolveBarcode(clean, 'MANUAL');
    setManualInput('');
  };

  // Handle Optional Reference Photo Compression from Local Device Picker
  const handleSelectReferencePhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    source: MediaSourceType
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRegPhotoSource(source);
    setRegPhotoCompressing(true);
    setRegError(null);

    try {
      const compressed = await compressImageToWebP(file, 1024, 0.78);
      if (regRefPhoto?.previewUrl) {
        URL.revokeObjectURL(regRefPhoto.previewUrl);
      }
      setRegRefPhoto(compressed);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegPhotoCompressing(false);
    }
  };

  // Handle Submission of New Item Form via POST /api/depot/catalog (+ optional POST /api/depot/media)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNameTr.trim() || !regUnit.trim() || !regCategory.trim()) return;

    setRegSubmitting(true);
    setRegError(null);
    setRegSuccessMessage(null);

    try {
      const targetDepot =
        regProductDomain === 'CONSTRUCTION_MATERIALS'
          ? 'DEPOT-PRJ02-CONST'
          : 'DEPOT-PRJ02-MAIN';

      const serializedAttributes =
        regAttributes && Object.keys(regAttributes).length > 0
          ? regAttributes
          : null;

      const res = await fetch('/api/depot/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_role: currentRole,
          project_id: regProjectId,
          product_domain: regProductDomain,
          depot_id: depotLocations.some((dl) => dl.depot_id === targetDepot)
            ? targetDepot
            : activeDepotId,
          category: regCategory.trim(),
          subcategory: regSubcategory.trim() || null,
          item_name_tr: regNameTr.trim(),
          item_name_en: regNameEn.trim() || regNameTr.trim(),
          unit_of_measure: regUnit.trim(),
          barcode_ean: regBarcode.trim() || null,
          legacy_code: regLegacyCode.trim() || null,
          brand_model: regBrandModel.trim() || null,
          supplier_name: regSupplier.trim() || null,
          base_cost_eur: Number(regBaseCostEur) || 0,
          source_unit_price: Number(regBaseCostEur) || 0,
          source_currency: regSourceCurrency.trim() || 'EUR',
          commercial_markup_pct: Number(regMarkupPct) || 15,
          packaging_unit_type: regPackagingType,
          set_piece_count:
            regPackagingType === 'ATOMIC_SET'
              ? Math.max(2, Number(regPieceCount) || 2)
              : 1,
          is_trackable_asset: regIsTrackable,
          serial_number: regSerialNo.trim() || null,
          warranty_expiry_date: regWarrantyDate || null,
          product_url: regProductUrl.trim() || null,
          specification: regSpec.trim() || null,
          attributes: serializedAttributes,
          initial_qty: Math.max(0, Number(regInitialQty) || 0),
          irsaliye_number: regIrsaliye.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(
          data.error ||
            (lang === 'tr'
              ? 'Kayıt sırasında hata oluştu.'
              : 'Failed to register item.')
        );
        setRegSubmitting(false);
        return;
      }

      let createdItem = data.item as InventoryCatalogItem;
      let createdBalance = data.balance as DepotStockBalance;
      const createdTx = (data.transaction as DepotTransaction) || null;
      const createdAsset = (data.asset as AssetRegisterItem) || null;

      // Milestone v2.9.0: Automatically upload optional Reference Photo right after item creation
      if (regRefPhoto?.file && createdItem?.item_id) {
        try {
          const mediaFormData = new FormData();
          mediaFormData.append('catalog_item_id', createdItem.item_id);
          mediaFormData.append('source_type', regPhotoSource);
          mediaFormData.append('set_primary', 'true');
          mediaFormData.append('actor_role', currentRole);
          mediaFormData.append('file', regRefPhoto.file);

          const mediaRes = await fetch('/api/depot/media', {
            method: 'POST',
            body: mediaFormData,
          });
          if (mediaRes.ok) {
            const mediaData = (await mediaRes.json()) as {
              primary_image_url?: string | null;
            };
            if (mediaData.primary_image_url) {
              createdItem = {
                ...createdItem,
                primary_image_url: mediaData.primary_image_url,
              };
              createdBalance = {
                ...createdBalance,
                catalog_item: createdItem,
              };
            }
          }
        } catch {
          // Non-fatal if optional photo upload fails after item creation
        }
      }

      onItemRegistered?.(
        createdItem,
        createdBalance,
        createdTx,
        createdAsset
      );
      await onCatalogRefresh?.();

      playBeep();
      const successTitle =
        lang === 'tr'
          ? 'Malzeme Kataloğa ve Depoya Eklendi'
          : 'Material Registered in Catalog & Depot';
      const successSub = `${createdItem.legacy_code} • ${createdItem.item_name_tr}`;

      onShowToast?.(successTitle, successSub);
      setRegSuccessMessage(`${successTitle}: ${successSub}`);

      // Upgrade the registered barcode in the staging tray to INVENTORY_MATCH
      const registeredCode = (
        createdItem.barcode_ean ||
        createdItem.legacy_code ||
        ''
      ).trim();
      if (registeredCode) {
        const key = registeredCode.toLowerCase();
        seenCodesRef.current.add(key);
        setDetectedBarcodes((prev) => {
          const exists = prev.some((e) => e.code.toLowerCase() === key);
          if (exists) {
            return prev.map((e) =>
              e.code.toLowerCase() === key
                ? {
                    ...e,
                    status: 'INVENTORY_MATCH',
                    inventoryItem: createdItem,
                    inventoryAsset: createdAsset || undefined,
                  }
                : e
            );
          }
          return [
            {
              code: registeredCode,
              format: 'REGISTERED',
              status: 'INVENTORY_MATCH',
              inventoryItem: createdItem,
              inventoryAsset: createdAsset || undefined,
              detectedAt: Date.now(),
            },
            ...prev.slice(0, MAX_STAGED_BARCODES - 1),
          ];
        });
      }

      setRegAttributes({});
      if (regRefPhoto?.previewUrl) {
        URL.revokeObjectURL(regRefPhoto.previewUrl);
      }
      setRegRefPhoto(null);
      setRegFormKey((k) => k + 1);
      setIsRegistering(false);
      setActiveMode('SCAN_LOOKUP');
      setCameraPaused(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRegError(msg);
    } finally {
      setRegSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const dynamicCategories = Array.from(
    new Set([
      ...d.categories,
      ...catalogItems
        .map((c) => c.category)
        .filter((cat): cat is string => Boolean(cat)),
    ])
  );

  const projectOptions =
    portfolioProjects.length > 0
      ? portfolioProjects
      : [{ project_id: 'PRJ-02', project_name: 'Caesar Resort & Spa' }];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full md:w-[calc(100vw-1rem)] md:max-w-2xl bg-white dark:bg-[#0f172a] rounded-t-2xl md:rounded-2xl shadow-2xl border-t md:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Mobile Bottom-Sheet Drag Handle Pill */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 bg-slate-50 dark:bg-slate-900/60">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <svg
                className="w-5 h-5"
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
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide truncate">
                  {d.title}
                </h2>
                {engineStatus === 'READY' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WASM Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 truncate">
                {d.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={common.close}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Top Dual-Mode Switcher: Scan / Lookup vs Manual Add */}
        <div className="px-4 sm:px-5 pt-3 bg-white dark:bg-[#0f172a] shrink-0">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSwitchToScanLookup}
              className={`min-h-[42px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeMode === 'SCAN_LOOKUP' && !isRegistering
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {d.tabScanLookup}
            </button>
            <button
              type="button"
              onClick={handleSwitchToManualAdd}
              className={`min-h-[42px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeMode === 'MANUAL_ADD' || isRegistering
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              + {d.tabManualAdd}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ========================================================= */}
          {/* SCAN / LOOKUP VIEWPORT + SESSION CONTROLS                 */}
          {/* ========================================================= */}
          {!isRegistering && activeMode === 'SCAN_LOOKUP' && (
            <div className="space-y-3">
              {/* Camera Control Row: Selector + Pause/Resume + Clear Tray */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cameraPaused
                      ? d.cameraPausedLabel
                      : videoDevices.length > 1
                      ? d.cameraSelect
                      : lang === 'tr'
                      ? 'Kamera Aktif'
                      : 'Active Camera'}
                  </span>
                  {videoDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="min-h-[40px] h-10 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                    >
                      {videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label ||
                            (lang === 'tr'
                              ? `Kamera ${idx + 1}`
                              : `Camera ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCameraPaused((prev) => !prev)}
                    className={`min-h-[40px] h-10 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      cameraPaused
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cameraPaused
                      ? `▶ ${d.btnResumeCamera}`
                      : `⏸ ${d.btnPauseCamera}`}
                  </button>

                  {detectedBarcodes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTray}
                      className="min-h-[40px] h-10 px-3 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                    >
                      {d.btnClearTray}
                    </button>
                  )}
                </div>
              </div>

              {/* Viewfinder Video Area with Live Multi-Symbol Overlay Canvas */}
              <div
                className={`relative rounded-xl overflow-hidden aspect-[16/9] sm:aspect-video max-h-56 sm:max-h-64 bg-black flex items-center justify-center border-2 transition-all ${
                  scanFlash
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]'
                    : 'border-slate-800'
                }`}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                <canvas
                  ref={canvasOverlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {!cameraPaused && !cameraError && (
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
                )}

                {cameraPaused && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      ⏸ {d.cameraPausedLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCameraPaused(false)}
                      className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      ▶ {d.btnResumeCamera}
                    </button>
                  </div>
                )}

                {cameraError && !cameraPaused && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-rose-400 font-bold text-sm mb-1">
                      {cameraError}
                    </span>
                    <p className="text-xs font-light text-slate-400 max-w-sm">
                      {d.cameraUnavailable}
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Lookup Input / USB Barcode Scanner Field */}
              <form
                onSubmit={handleManualSearch}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={d.manualPlaceholder}
                  className="flex-1 min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={
                    !manualInput.trim() ||
                    detectedBarcodes.length >= MAX_STAGED_BARCODES
                  }
                  className="min-h-[44px] h-11 sm:h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {d.btnSearch}
                </button>
              </form>

              {/* Success Banner if newly registered */}
              {regSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <svg
                    className="w-4 h-4 shrink-0 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{regSuccessMessage}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* MILESTONE v2.9.1: MULTI-BARCODE SESSION STAGING TRAY      */}
              {/* ========================================================= */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {d.trayTitle}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {detectedBarcodes.length}/{MAX_STAGED_BARCODES}
                    </span>
                  </div>
                  {detectedBarcodes.length >= MAX_STAGED_BARCODES && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {d.trayMaxReached}
                    </span>
                  )}
                </div>

                {/* Guardrail 1: Inventory Collision Warning when existing match + new codes coexist */}
                {inventoryMatchEntries.length > 0 &&
                  newBarcodeEntries.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <span className="shrink-0">ℹ️</span>
                      <span>{d.inventoryCollisionWarning}</span>
                    </div>
                  )}

                {/* Guardrail 2: Single-Barcode Selection Banner when > 1 new barcode is staged */}
                {newBarcodeEntries.length > 1 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{d.multiBarcodeGuardrail}</span>
                  </div>
                )}

                {sortedStagedBarcodes.length === 0 ? (
                  <p className="text-xs font-light text-slate-400 text-center py-4">
                    {d.trayEmptyHint}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {sortedStagedBarcodes.map((entry) => {
                      // -------------------------------------------------------
                      // CARD TYPE 1: EXISTING SUPABASE INVENTORY (EMERALD GREEN)
                      // -------------------------------------------------------
                      if (
                        entry.status === 'INVENTORY_MATCH' &&
                        entry.inventoryItem
                      ) {
                        const invItem = entry.inventoryItem;
                        const matchedBal = stockBalances.find(
                          (b) => b.catalog_item_id === invItem.item_id
                        );
                        const qty = matchedBal ? matchedBal.quantity_on_hand : 0;

                        return (
                          <div
                            key={entry.code}
                            className="rounded-xl border-2 border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0">
                                {invItem.primary_image_url ? (
                                  <img
                                    src={invItem.primary_image_url}
                                    alt={invItem.item_name_tr}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-emerald-500/30 bg-white dark:bg-slate-900"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg shrink-0 border border-emerald-500/30 bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                      ✓ {d.badgeInventoryMatch}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {formatBarcodeTypeLabel(entry.format)}
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 break-all">
                                      {entry.code}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                                    {lang === 'tr'
                                      ? invItem.item_name_tr
                                      : invItem.item_name_en ||
                                        invItem.item_name_tr}
                                  </h4>
                                  <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-light text-slate-600 dark:text-slate-300 mt-0.5">
                                    <span className="font-mono font-bold">
                                      {invItem.legacy_code || 'SKU'}
                                    </span>
                                    <span>
                                      {d.stockOnHand}:{' '}
                                      <strong className="font-bold text-slate-900 dark:text-white">
                                        {qty}
                                      </strong>{' '}
                                      {invItem.unit_of_measure}
                                    </span>
                                    {entry.inventoryAsset && (
                                      <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                                        S/N:{' '}
                                        {entry.inventoryAsset.serial_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Primary Action: View Item (+ Quick Inbound/Outbound) */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onViewExistingItem) {
                                    onViewExistingItem(invItem);
                                  } else {
                                    onClose();
                                  }
                                }}
                                className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              >
                                {d.btnViewItem}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onQuickAction?.(
                                    invItem,
                                    'INBOUND',
                                    entry.inventoryAsset
                                  );
                                }}
                                className="min-h-[40px] px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                              >
                                {d.btnInbound}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onQuickAction?.(
                                    invItem,
                                    'OUTBOUND',
                                    entry.inventoryAsset
                                  );
                                }}
                                className="min-h-[40px] px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-colors cursor-pointer"
                              >
                                {d.btnOutbound}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // -------------------------------------------------------
                      // CARD TYPE 2 & 3: NEW BARCODE (PUBLIC_MATCH / UNLISTED / CHECKING)
                      // -------------------------------------------------------
                      const isSelected =
                        effectiveSelectedNewBarcode === entry.code;
                      const isPublicMatch = entry.status === 'PUBLIC_MATCH';
                      const isChecking = entry.status === 'CHECKING';

                      const cardStyle = isPublicMatch
                        ? isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/35 ring-1 ring-blue-500/40'
                          : 'border-blue-300/70 dark:border-blue-800/70 bg-blue-50/30 dark:bg-blue-950/20 hover:border-blue-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:border-amber-400';

                      return (
                        <div
                          key={entry.code}
                          onClick={() => setSelectedNewBarcode(entry.code)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              setSelectedNewBarcode(entry.code);
                            }
                          }}
                          className={`rounded-xl border-2 p-3 transition-all cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Single-Barcode Radio Selection Ring */}
                            <div className="pt-0.5 shrink-0">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? isPublicMatch
                                      ? 'border-blue-600 bg-blue-600'
                                      : 'border-amber-600 bg-amber-600'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {isChecking ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 animate-pulse">
                                    {d.badgeChecking}
                                  </span>
                                ) : isPublicMatch ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                    ✨ {d.badgePublicMatch}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    {d.badgeUnlisted}
                                  </span>
                                )}

                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {formatBarcodeTypeLabel(entry.format)}
                                </span>

                                {isSelected && newBarcodeEntries.length > 1 && (
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    • {d.selectedForNewItem}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white break-all">
                                {entry.code}
                              </div>

                              {isPublicMatch && entry.publicSuggestion && (
                                <div className="text-xs space-y-0.5">
                                  {entry.publicSuggestion.name && (
                                    <p className="font-bold text-blue-900 dark:text-blue-200">
                                      {entry.publicSuggestion.name}
                                    </p>
                                  )}
                                  {(entry.publicSuggestion.brand ||
                                    entry.publicSuggestion.source) && (
                                    <p className="text-[11px] font-light text-slate-600 dark:text-slate-400">
                                      {entry.publicSuggestion.brand
                                        ? `${entry.publicSuggestion.brand}`
                                        : ''}
                                      {entry.publicSuggestion.brand &&
                                      entry.publicSuggestion.source
                                        ? ' • '
                                        : ''}
                                      {entry.publicSuggestion.source || ''}
                                    </p>
                                  )}
                                </div>
                              )}

                              {!isChecking && !isPublicMatch && (
                                <p className="text-[11px] font-light text-slate-600 dark:text-slate-400">
                                  {entry.skippedExternalReason ===
                                  'URL_OR_NON_GTIN'
                                    ? d.urlSkippedText
                                    : d.unlistedConfirmText}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explicit "Add New Item" Action Button for the Single Selected New Barcode */}
                {selectedNewEntry && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] font-light text-slate-500 dark:text-slate-400 truncate">
                      {lang === 'tr' ? 'Atanacak ID:' : 'Assigned ID:'}{' '}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedNewEntry.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={selectedNewEntry.status === 'CHECKING'}
                      onClick={() =>
                        handleProceedToAddNewItem(selectedNewEntry)
                      }
                      className="min-h-[44px] h-11 sm:h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      + {d.btnAddNewItem}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* MANUAL / NEW ITEM REGISTRATION FORM               */}
          {/* ================================================= */}
          {isRegistering && (
            <form
              onSubmit={handleRegisterSubmit}
              className="bg-slate-50 dark:bg-slate-900/90 border border-blue-500/40 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">
                      {d.formTitle}
                    </h4>
                    {externalLookingUp && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse">
                        {d.lookingUpExternal}
                      </span>
                    )}
                    {externalSuggestionSource && !externalLookingUp && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        ✨ {d.externalSuggestion} ({externalSuggestionSource})
                      </span>
                    )}
                  </div>
                  {regBarcode && (
                    <p className="text-[11px] font-mono font-light text-slate-400 mt-0.5 break-all">
                      ID / EAN: <span className="font-bold">{regBarcode}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToScanLookup}
                  className="min-h-[36px] px-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer shrink-0 ml-2"
                >
                  ✕ {common.cancel}
                </button>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
                  {regError}
                </div>
              )}

              {/* ========================================================= */}
              {/* MILESTONE v2.9.3: TOP-MOUNTED REFERENCE PHOTO HERO CARD   */}
              {/* Left: w-28 h-28 md:w-32 md:h-32 rounded-2xl frame         */}
              {/* Right: Separate Take Photo (Live Camera) vs Upload        */}
              {/* ========================================================= */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <input
                  ref={regDevicePhotoInputRef}
                  type="file"
                  accept="image/webp,image/jpeg,image/png,image/*"
                  onChange={(e) => void handleSelectReferencePhoto(e, 'LOCAL')}
                  className="hidden"
                />

                {/* Left: Large 112x112px (mobile) / 128x128px (desktop) Square Preview Frame */}
                <div
                  onClick={() => {
                    if (!regRefPhoto) {
                      setIsRefWebcamOpen(true);
                    }
                  }}
                  className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl shrink-0 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {regRefPhoto ? (
                    <>
                      <img
                        src={regRefPhoto.previewUrl}
                        alt="Reference preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 inset-x-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/85 text-emerald-400 text-[9px] font-mono font-bold truncate">
                        {formatBytesLabel(regRefPhoto.sizeBytes)} •{' '}
                        {regRefPhoto.formatLabel}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.6"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.6"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2">
                        {tm.noPhotoPlaceholder}
                      </span>
                    </>
                  )}
                </div>

                {/* Right: Title, Helper Subtext & Distinct min-h-[44px] Take Photo / Upload Image Controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3 text-center sm:text-left w-full">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                      {d.lblRefPhoto}
                    </span>
                    <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 mt-0.5">
                      {tm.dropzoneSub}
                    </p>
                    {regRefPhoto && (
                      <p className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                        ✓ {regRefPhoto.file.name} ({regRefPhoto.width}×
                        {regRefPhoto.height})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      disabled={regPhotoCompressing}
                      onClick={() => {
                        setRegPhotoSource('CAMERA');
                        setIsRefWebcamOpen(true);
                      }}
                      className="min-h-[44px] h-11 sm:h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>
                        📷 {regRefPhoto ? tc.retakePhoto : tc.takePhoto}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={regPhotoCompressing}
                      onClick={() => regDevicePhotoInputRef.current?.click()}
                      className="min-h-[44px] h-11 sm:h-10 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>
                        📁{' '}
                        {regPhotoCompressing
                          ? tm.compressing
                          : tc.uploadImage}
                      </span>
                    </button>

                    {regRefPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          if (regRefPhoto.previewUrl) {
                            URL.revokeObjectURL(regRefPhoto.previewUrl);
                          }
                          setRegRefPhoto(null);
                        }}
                        className="min-h-[44px] h-11 sm:h-10 px-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {d.btnRemovePhoto}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary Classification Filters (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblProject}
                  </label>
                  <select
                    value={regProjectId}
                    onChange={(e) => setRegProjectId(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    {projectOptions.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.project_name} ({p.project_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblDepotDomain}
                  </label>
                  <select
                    value={regProductDomain}
                    onChange={(e) => setRegProductDomain(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    <option value="CONSTRUCTION_MATERIALS">
                      {d.domainConstruction}
                    </option>
                    <option value="FURNISHING_AND_EQUIPMENT">
                      {d.domainFurnishing}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblCategory}
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    {dynamicCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Core & Extended Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Single Assigned Barcode / EAN & Optional Reference SKU */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500">
                      {d.lblBarcode}
                    </label>
                    {isEligibleForExternalLookup(regBarcode) && (
                      <button
                        type="button"
                        onClick={() =>
                          void triggerManualExternalLookup(regBarcode.trim())
                        }
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {lang === 'tr' ? 'Rehberden Doldur' : 'Auto-Fill'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={regBarcode}
                    onChange={(e) => setRegBarcode(e.target.value)}
                    placeholder={
                      lang === 'tr'
                        ? 'Boş bırakılırsa otomatik üretilir'
                        : 'Auto-generated if left blank'
                    }
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblLegacyCode}
                  </label>
                  <input
                    type="text"
                    value={regLegacyCode}
                    onChange={(e) => setRegLegacyCode(e.target.value)}
                    placeholder="MAT-XXXX / WH-XXXX"
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>

                {/* Item Name (Required) & English Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblNameTr}
                  </label>
                  <input
                    type="text"
                    required
                    value={regNameTr}
                    onChange={(e) => setRegNameTr(e.target.value)}
                    placeholder="Örn: 24kW Inverter VRF Klima Dış Ünite"
                    className={CONTROL_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblNameEn}
                  </label>
                  <input
                    type="text"
                    value={regNameEn}
                    onChange={(e) => setRegNameEn(e.target.value)}
                    placeholder="e.g. 24kW Inverter VRF Outdoor Unit"
                    className={CONTROL_CLASS}
                  />
                </div>

                {/* Unit of Measure (Required) & Subcategory */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblUnit}
                  </label>
                  <select
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value)}
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    {d.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblSubcategory}
                  </label>
                  <input
                    type="text"
                    value={regSubcategory}
                    onChange={(e) => setRegSubcategory(e.target.value)}
                    placeholder={d.placeholderSubcategory}
                    className={CONTROL_CLASS}
                  />
                </div>

                {/* Brand / Model & Supplier */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblBrandModel}
                  </label>
                  <input
                    type="text"
                    value={regBrandModel}
                    onChange={(e) => setRegBrandModel(e.target.value)}
                    placeholder="Daikin / Grohe / Vitra"
                    className={CONTROL_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblSupplier}
                  </label>
                  <input
                    type="text"
                    value={regSupplier}
                    onChange={(e) => setRegSupplier(e.target.value)}
                    placeholder={
                      lang === 'tr'
                        ? 'Örn: Daikin Kıbrıs / Çimko'
                        : 'e.g. Daikin Cyprus / Lafarge'
                    }
                    className={CONTROL_CLASS}
                  />
                </div>

                {/* Base Cost, Source Currency & Markup */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblCost}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={regBaseCostEur}
                      onChange={(e) =>
                        setRegBaseCostEur(Number(e.target.value))
                      }
                      className="flex-1 min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={regSourceCurrency}
                      onChange={(e) => setRegSourceCurrency(e.target.value)}
                      className="w-24 min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                      <option value="TRY">TRY</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblMarkup}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={regMarkupPct}
                    onChange={(e) => setRegMarkupPct(Number(e.target.value))}
                    className={CONTROL_CLASS}
                  />
                </div>

                {/* Packaging Type & Piece Count */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblPackaging}
                  </label>
                  <select
                    value={regPackagingType}
                    onChange={(e) =>
                      setRegPackagingType(e.target.value as PackagingUnitType)
                    }
                    className={`${CONTROL_CLASS} cursor-pointer`}
                  >
                    <option value="SINGLE_ITEM">{d.singleItem}</option>
                    <option value="ATOMIC_SET">{d.atomicSet}</option>
                  </select>
                </div>

                {regPackagingType === 'ATOMIC_SET' ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      {d.lblPieces}
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={regPieceCount}
                      onChange={(e) =>
                        setRegPieceCount(Number(e.target.value))
                      }
                      className={CONTROL_CLASS}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      {d.lblProductUrl}
                    </label>
                    <input
                      type="url"
                      value={regProductUrl}
                      onChange={(e) => setRegProductUrl(e.target.value)}
                      placeholder="https://..."
                      className={CONTROL_CLASS}
                    />
                  </div>
                )}

                {/* Initial Quantity & Dispatch Note */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblInitialQty}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={regInitialQty}
                    onChange={(e) => setRegInitialQty(Number(e.target.value))}
                    className={CONTROL_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblIrsaliye}
                  </label>
                  <input
                    type="text"
                    value={regIrsaliye}
                    onChange={(e) => setRegIrsaliye(e.target.value)}
                    placeholder="IRS-2026-..."
                    className={`${CONTROL_CLASS} font-mono`}
                  />
                </div>

                {/* Specification / Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {d.lblSpecification}
                  </label>
                  <input
                    type="text"
                    value={regSpec}
                    onChange={(e) => setRegSpec(e.target.value)}
                    placeholder={d.placeholderSpec}
                    className={CONTROL_CLASS}
                  />
                </div>

                {/* Structured Attributes Matrix */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                    {d.lblAttributes}
                  </label>
                  <AttributesEditor
                    key={`reg-attrs-${regFormKey}`}
                    value={regAttributes}
                    onChange={setRegAttributes}
                    productDomain={regProductDomain}
                    lang={lang}
                  />
                </div>

                {/* Trackable Serialized Asset Options */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="min-h-[36px] flex items-center space-x-2 cursor-pointer mb-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 sm:pl-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {d.lblSerial}
                        </label>
                        <input
                          type="text"
                          value={regSerialNo}
                          onChange={(e) => setRegSerialNo(e.target.value)}
                          placeholder="SN-XXXX-YYYY"
                          className={`${CONTROL_CLASS} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {d.lblWarranty}
                        </label>
                        <input
                          type="date"
                          value={regWarrantyDate}
                          onChange={(e) => setRegWarrantyDate(e.target.value)}
                          className={`${CONTROL_CLASS} font-mono`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSwitchToScanLookup}
                  className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting || !regNameTr.trim()}
                  className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>
                    {regSubmitting
                      ? lang === 'tr'
                        ? 'Kaydediliyor...'
                        : 'Saving...'
                      : d.btnSaveAndIntake}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Modal Footer with Safe-Area Bottom Padding */}
        <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] font-mono font-bold text-slate-400">
            {activeDepotId}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {common.close}
          </button>
        </div>
      </div>

      {/* Cross-Device getUserMedia Live Camera Viewfinder for Reference Photo */}
      <WebcamCaptureModal
        isOpen={isRefWebcamOpen}
        onClose={() => setIsRefWebcamOpen(false)}
        lang={lang}
        onCaptured={(capturedResult) => {
          if (regRefPhoto?.previewUrl) {
            URL.revokeObjectURL(regRefPhoto.previewUrl);
          }
          setRegPhotoSource('CAMERA');
          setRegError(null);
          setRegRefPhoto(capturedResult);
        }}
      />
    </div>
  );
}
