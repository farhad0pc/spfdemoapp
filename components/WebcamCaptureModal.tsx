'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  compressImageToWebP,
  CompressedImageResult,
} from '@/lib/imageCompression';
import { DICTIONARY, Language } from '@/lib/i18n';

interface WebcamCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (result: CompressedImageResult) => void;
  lang: Language;
}

export default function WebcamCaptureModal({
  isOpen,
  onClose,
  onCaptured,
  lang,
}: WebcamCaptureModalProps) {
  const tc = DICTIONARY[lang].camera;
  const common = DICTIONARY[lang].common;
  const tm = DICTIONARY[lang].media;

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number>(0);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startStream = useCallback(
    async (deviceId?: string) => {
      setCameraError(null);
      setCameraReady(false);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(tc.cameraDenied);
        return;
      }

      stopStream();

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 960 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 960 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }

        if (navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const cameras = allDevices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cameras);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        setCameraError(msg ? `${tc.cameraDenied} (${msg})` : tc.cameraDenied);
        setCameraReady(false);
      }
    },
    [stopStream, tc.cameraDenied]
  );

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startStream();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startStream, stopStream]);

  if (!isOpen) return null;

  const handleSwitchCamera = () => {
    if (videoDevices.length <= 1) return;
    const nextIdx = (activeDeviceIndex + 1) % videoDevices.length;
    setActiveDeviceIndex(nextIdx);
    const nextDevice = videoDevices[nextIdx];
    if (nextDevice?.deviceId) {
      void startStream(nextDevice.deviceId);
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current || !cameraReady || capturing) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 960;

    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }
      ctx.drawImage(video, 0, 0, vw, vh);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      );
      if (!blob) {
        throw new Error('Failed to capture camera frame');
      }

      const rawFile = new File([blob], `camera-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const compressed = await compressImageToWebP(rawFile, 1024, 0.78);
      stopStream();
      onCaptured(compressed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg);
    } finally {
      setCapturing(false);
    }
  };

  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCapturing(true);
    try {
      const compressed = await compressImageToWebP(file, 1024, 0.78);
      stopStream();
      onCaptured(compressed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg);
    } finally {
      setCapturing(false);
    }
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              📷 {tc.modalTitle}
            </h3>
            <p className="text-[11px] font-light text-slate-500 dark:text-slate-400">
              {tc.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={common.close}
          >
            ✕
          </button>
        </div>

        {/* Hidden Fallback File Input */}
        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleFallbackFile(e)}
          className="hidden"
        />

        {/* Live Video Viewfinder */}
        <div className="p-4 space-y-3">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300 text-xs font-bold space-y-2">
                <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <span>{tc.initializingCamera}</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-xs font-bold text-rose-400 max-w-sm">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  📁 {tc.cameraFallback}
                </button>
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {videoDevices.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  🔄 {tc.switchCamera}
                </button>
              )}
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                📁 {tc.cameraFallback}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="h-10 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                disabled={!cameraReady || capturing}
                onClick={() => void handleCaptureFrame()}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>
                  {capturing ? tm.compressing : `📸 ${tc.captureShutter}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
