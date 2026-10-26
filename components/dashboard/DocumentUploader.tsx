"use client";

import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, Sparkles } from 'lucide-react';
import { ProcessedDocument } from '@/types/document';

interface DocumentUploaderProps {
  onDocumentProcessed: (doc: ProcessedDocument) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<'upload' | 'ocr' | 'genai' | 'synced' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateProcessing = (fileName: string, fileSize: string) => {
    setIsProcessing(true);
    setCurrentStage('upload');

    setTimeout(() => {
      setCurrentStage('ocr');
      setTimeout(() => {
        setCurrentStage('genai');
        setTimeout(() => {
          setCurrentStage('synced');
          
          const newDoc: ProcessedDocument = {
            id: `doc_${Date.now()}`,
            name: fileName,
            size: fileSize,
            fileType: fileName.split('.').pop()?.toUpperCase() || 'PDF',
            uploadedAt: 'Just now',
            status: 'completed',
            overallConfidence: 98.2,
            processingStage: 'synced',
            supabaseSynced: true,
            entities: [
              { id: '1', name: 'Facility Limit', value: '$45,000,000 USD', category: 'financial', confidence: 99.4, page: 1 },
              { id: '2', name: 'Borrower Entity', value: 'Apex Global SPV Holdings LLC', category: 'identity', confidence: 98.8, page: 1 },
              { id: '3', name: 'Effective Date', value: '2026-03-15', category: 'dates', confidence: 99.1, page: 2 },
              { id: '4', name: 'Maturity Horizon', value: '36 Months (Bullet)', category: 'financial', confidence: 97.6, page: 2 },
              { id: '5', name: 'Governing Law', value: 'State of New York', category: 'compliance', confidence: 96.2, page: 14 },
              { id: '6', name: 'DSCR Covenant', value: 'Min 1.35x Quarterly', category: 'compliance', confidence: 98.0, page: 8 }
            ],
            geminiAnalysis: {
              executiveSummary: 'Standard senior secured Special Purpose Facility agreement. The covenants stipulate strict quarterly debt service coverage with no cross-default risk identified on secondary guarantors.',
              riskScore: 'low',
              riskFactors: [
                'First-priority lien on underlying cash flows required by Day 30',
                'Reporting deadline tightened to 45 days post-quarter end'
              ],
              suggestedActions: [
                'Reconcile schedule 4.1 collateral schedule against custody records',
                'Set calendar alert for preliminary compliance certificate delivery'
              ],
              complianceChecked: true,
              modelUsed: 'Gemini 2.0 Flash (Multimodal)',
              generatedAt: new Date().toLocaleTimeString()
            },
            rawTextSnippet: 'CREDIT AND FACILITY AGREEMENT dated as of March 15, 2026, among APEX GLOBAL SPV HOLDINGS LLC, as Borrower, and the Lenders party hereto...'
          };

          onDocumentProcessed(newDoc);
          setTimeout(() => {
            setIsProcessing(false);
            setCurrentStage(null);
          }, 800);
        }, 1200);
      }, 1400);
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      simulateProcessing(file.name, sizeMb);
    }
  };

  const loadSampleDoc = () => {
    simulateProcessing('SPF_Facility_TermSheet_Executed.pdf', '3.42 MB');
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Document Ingestion &amp; Pipeline
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Auto-extract key covenants, parties, and financials via Document AI &amp; Gemini
          </p>
        </div>
        <button
          onClick={loadSampleDoc}
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Demo Ingestion</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.png,.jpg,.jpeg,.tiff"
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            simulateProcessing(file.name, (file.size / (1024 * 1024)).toFixed(2) + ' MB');
          }
        }}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700'
        }`}
      >
        {!isProcessing ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-zinc-900">
              <UploadCloud className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Drag &amp; drop document, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse files</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              PDF, TIFF, PNG, or JPEG up to 25MB &bull; Automatic OCR &amp; Supabase Storage
            </p>
          </>
        ) : (
          <div className="w-full max-w-md py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>
                {currentStage === 'upload' && 'Uploading document to Supabase storage...'}
                {currentStage === 'ocr' && 'Google Cloud Document AI parsing text & tables...'}
                {currentStage === 'genai' && 'Gemini 2.0 synthesizing covenants & financial terms...'}
                {currentStage === 'synced' && 'Finalizing relational record synchronization...'}
              </span>
            </div>

            {/* Stage Stepper */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <div className={`rounded-lg p-2 text-center transition ${currentStage === 'upload' ? 'bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                1. Upload
              </div>
              <div className={`rounded-lg p-2 text-center transition ${currentStage === 'ocr' ? 'bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                2. OCR
              </div>
              <div className={`rounded-lg p-2 text-center transition ${currentStage === 'genai' ? 'bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                3. Gemini
              </div>
              <div className={`rounded-lg p-2 text-center transition ${currentStage === 'synced' ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                4. Database
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
