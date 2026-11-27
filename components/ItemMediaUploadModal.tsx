'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef, useEffect } from 'react';
import {
  InventoryItemMedia,
  MediaSourceType,
  RoleTier,
} from '@/types/requisition';
import {
  compressImageToWebP,
  CompressedImageResult,
  formatBytesLabel,
} from '@/lib/imageCompression';
import { DICTIONARY } from '@/lib/i18n';
import WebcamCaptureModal from '@/components/WebcamCaptureModal';

const CONTROL_CLASS =
  'w-full min-h-[44px] h-11 sm:h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500';

interface ItemMediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItemId: string;
  itemTitle: string;
  existingCount: number;
  currentRole: RoleTier;
  lang: 'tr' | 'en';
  onUploaded: (
    updatedAlbum: InventoryItemMedia[],
    primaryImageUrl: string | null
  ) => void;
}

function parseGoogleDriveId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (fileMatch?.[1]) return fileMatch[1];
    const idParam = parsed.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) return idParam;
    return null;
  } catch {
    return null;
  }
}

export default function ItemMediaUploadModal({
  isOpen,
  onClose,
  catalogItemId,
  itemTitle,
  existingCount,
  currentRole,
  lang,
  onUploaded,
}: ItemMediaUploadModalProps) {
  const tm = DICTIONARY[lang].media;
  const tc = DICTIONARY[lang].common;

  const [activeSource, setActiveSource] = useState<MediaSourceType>('CAMERA');
  const [compressedResult, setCompressedResult] =
    useState<CompressedImageResult | null>(null);
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  const [driveUrl, setDriveUrl] = useState<string>('');
  const [drivePreviewId, setDrivePreviewId] = useState<string | null>(null);
  const [setAsPrimary, setSetAsPrimary] = useState<boolean>(
    existingCount === 0
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasGooglePickerConfig = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  );

  // Clean up object URL when compressedResult changes or modal closes
  useEffect(() => {
    return () => {
      if (compressedResult?.previewUrl) {
        URL.revokeObjectURL(compressedResult.previewUrl);
      }
    };
  }, [compressedResult]);

  if (!isOpen) return null;

  const resetPreview = () => {
    if (compressedResult?.previewUrl) {
      URL.revokeObjectURL(compressedResult.previewUrl);
    }
    setCompressedResult(null);
    setDrivePreviewId(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (uploading) return;
    resetPreview();
    setIsWebcamOpen(false);
    setDriveUrl('');
    onClose();
  };

  const handleSwitchTab = (nextSource: MediaSourceType) => {
    if (uploading || compressing) return;
    resetPreview();
    setActiveSource(nextSource);
  };

  const processSelectedFile = async (file: File) => {
    setErrorMessage(null);
    setCompressing(true);
    try {
      const result = await compressImageToWebP(file, 1024, 0.78);
      if (compressedResult?.previewUrl) {
        URL.revokeObjectURL(compressedResult.previewUrl);
      }
      setCompressedResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
  };

  const handleValidateDriveLink = () => {
    setErrorMessage(null);
    const extractedId = parseGoogleDriveId(driveUrl);
    if (!extractedId) {
      setErrorMessage(
        lang === 'tr'
          ? 'Geçerli bir Google Drive dosya bağlantısı bulunamadı. Lütfen paylaşım linkini kontrol edin.'
          : 'Could not parse a valid Google Drive file ID from the provided link.'
      );
      return;
    }
    setDrivePreviewId(extractedId);
  };

  const handleConfirmUpload = async () => {
    if (uploading) return;
    setErrorMessage(null);
    setUploading(true);

    try {
      let res: Response;

      if (activeSource === 'GOOGLE_DRIVE') {
        if (!drivePreviewId) {
          setErrorMessage(
            lang === 'tr'
              ? 'Lütfen önce Google Drive bağlantısını doğrulayın.'
              : 'Please validate the Google Drive link first.'
          );
          setUploading(false);
          return;
        }

        res = await fetch('/api/depot/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog_item_id: catalogItemId,
            drive_url: driveUrl.trim(),
            source_type: 'GOOGLE_DRIVE',
            set_primary: existingCount === 0 || setAsPrimary,
            actor_role: currentRole,
          }),
        });
      } else {
        if (!compressedResult?.file) {
          setErrorMessage(
            lang === 'tr'
              ? 'Lütfen önce bir fotoğraf çekin veya seçin.'
              : 'Please capture or select a photo first.'
          );
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('catalog_item_id', catalogItemId);
        formData.append('source_type', activeSource);
        formData.append(
          'set_primary',
          existingCount === 0 || setAsPrimary ? 'true' : 'false'
        );
        formData.append('actor_role', currentRole);
        formData.append('file', compressedResult.file);

        res = await fetch('/api/depot/media', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (lang === 'tr'
              ? 'Fotoğraf yüklenirken hata oluştu.'
              : 'Failed to upload photo.')
        );
        setUploading(false);
        return;
      }

      const updatedAlbum = (data.media || []) as InventoryItemMedia[];
      const primaryUrl =
        (data.primary_image_url as string | null | undefined) ?? null;

      onUploaded(updatedAlbum, primaryUrl);
      resetPreview();
      setDriveUrl('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const hasReadyPreview =
    (activeSource !== 'GOOGLE_DRIVE' && Boolean(compressedResult)) ||
    (activeSource === 'GOOGLE_DRIVE' && Boolean(drivePreviewId));

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in font-sans select-none">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={handleClose} />

      {/* Responsive Container: Mobile slide-up bottom sheet (< md) vs Desktop centered rounded modal (md:+) */}
      <div className="relative z-10 w-full md:w-[calc(100vw-1rem)] md:max-w-lg bg-white dark:bg-[#0f172a] rounded-t-2xl md:rounded-2xl shadow-2xl border-t md:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Mobile Bottom-Sheet Drag Handle Pill */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 bg-slate-50 dark:bg-slate-900/60">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {tm.addPhoto}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                {existingCount}/5 • {tm.maxPhotosLimit}
              </span>
            </div>
            <p className="text-xs font-light text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {itemTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={tc.close}
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

        {/* 3 Source Tabs (min-h-[44px] Touch Controls) */}
        <div className="px-4 sm:px-5 pt-3.5 bg-white dark:bg-[#0f172a] shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchTab('CAMERA')}
              className={`min-h-[44px] h-11 sm:h-10 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeSource === 'CAMERA'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{tm.takePhoto}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('LOCAL')}
              className={`min-h-[44px] h-11 sm:h-10 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeSource === 'LOCAL'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="truncate">{tm.uploadFromDevice}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('GOOGLE_DRIVE')}
              className={`min-h-[44px] h-11 sm:h-10 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeSource === 'GOOGLE_DRIVE'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span className="truncate">{tm.googleDrive}</span>
            </button>
          </div>
        </div>

        {/* Hidden Native File Input for Local Device Tab */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/webp,image/jpeg,image/png,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: TAKE PHOTO (CROSS-DEVICE LIVE CAMERA VIEWFINDER) */}
          {activeSource === 'CAMERA' && !hasReadyPreview && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {tm.cameraHelpTitle}
                </p>
                <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                  {tm.cameraHelpSub}
                </p>
              </div>
              <button
                type="button"
                disabled={compressing}
                onClick={() => setIsWebcamOpen(true)}
                className="min-h-[44px] h-11 sm:h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <span>
                  {compressing ? tm.compressing : `📷 ${tm.takePhoto}`}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: LOCAL DEVICE (DRAG & DROP ON DESKTOP + TAP ON MOBILE) */}
          {activeSource === 'LOCAL' && !hasReadyPreview && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-400'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {tm.dropzoneTitle}
                </p>
                <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
                  {tm.dropzoneSub}
                </p>
              </div>
              <button
                type="button"
                disabled={compressing}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="min-h-[44px] h-11 sm:h-10 px-5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {compressing ? tm.compressing : tm.uploadFromDevice}
              </button>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE LINK & OPTIONAL PICKER */}
          {activeSource === 'GOOGLE_DRIVE' && !hasReadyPreview && (
            <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {tm.driveInputLabel}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder={tm.driveInputPlaceholder}
                    className={CONTROL_CLASS}
                  />
                  <button
                    type="button"
                    onClick={handleValidateDriveLink}
                    disabled={!driveUrl.trim()}
                    className="min-h-[44px] h-11 sm:h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {tm.btnValidateDrive}
                  </button>
                </div>
                <p className="text-[11px] font-light text-slate-500 dark:text-slate-400 mt-1.5">
                  ℹ️ {tm.driveHelperHint}
                </p>
              </div>

              {hasGooglePickerConfig && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        'https://drive.google.com/drive/my-drive',
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    className="w-full min-h-[44px] h-11 sm:h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{tm.btnGooglePicker}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MANDATORY PREVIEW & CONFIRM STEP */}
          {hasReadyPreview && (
            <div className="space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 p-4">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3] max-h-64 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                {compressedResult ? (
                  <img
                    src={compressedResult.previewUrl}
                    alt={itemTitle}
                    className="w-full h-full object-contain"
                  />
                ) : drivePreviewId ? (
                  <img
                    src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
                      drivePreviewId
                    )}&sz=w800`}
                    alt={itemTitle}
                    className="w-full h-full object-contain"
                  />
                ) : null}

                {/* Compression / Source Badge */}
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-xs text-white text-[11px] font-mono font-bold border border-white/15 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {compressedResult ? (
                    <span>
                      {formatBytesLabel(compressedResult.sizeBytes)} •{' '}
                      {compressedResult.formatLabel} ({compressedResult.width}×
                      {compressedResult.height})
                    </span>
                  ) : (
                    <span>
                      Google Drive • ID: {drivePreviewId?.slice(0, 8)}…
                    </span>
                  )}
                </div>
              </div>

              {/* Set as Primary Toggle */}
              {existingCount > 0 && (
                <label className="min-h-[44px] h-11 sm:h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsPrimary}
                    onChange={(e) => setSetAsPrimary(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tm.setAsPrimaryCheckbox}
                  </span>
                </label>
              )}

              {/* Explicit Replace & Confirm & Save Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    resetPreview();
                    if (activeSource === 'CAMERA') {
                      setIsWebcamOpen(true);
                    }
                  }}
                  className="min-h-[44px] h-11 sm:h-10 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  {tm.replacePhoto}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleConfirmUpload()}
                  className="min-h-[44px] h-11 sm:h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <span>
                    {uploading ? tm.uploading : `✓ ${tm.confirmAndSave}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Safe-Area Bottom Padding */}
        <div className="px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] font-mono font-light text-slate-400">
            WebP ≤ 1024px • Cache-Control: 1y
          </span>
          <button
            type="button"
            disabled={uploading}
            onClick={handleClose}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
          >
            {tc.cancel}
          </button>
        </div>
      </div>

      {/* Cross-Device getUserMedia Live Camera Viewfinder */}
      <WebcamCaptureModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        lang={lang}
        onCaptured={(capturedResult) => {
          if (compressedResult?.previewUrl) {
            URL.revokeObjectURL(compressedResult.previewUrl);
          }
          setErrorMessage(null);
          setCompressedResult(capturedResult);
        }}
      />
    </div>
  );
}
