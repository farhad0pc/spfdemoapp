"use client";

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Copy, Check, FileCode, Tag } from 'lucide-react';
import { ProcessedDocument } from '@/types/document';

interface DocumentDetailDrawerProps {
  document: ProcessedDocument | null;
  onClose: () => void;
  onUpdateStatus?: (docId: string, newStatus: 'completed' | 'review_required') => void;
}

export const DocumentDetailDrawer: React.FC<DocumentDetailDrawerProps> = ({
  document,
  onClose,
  onUpdateStatus
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'entities' | 'raw'>('gemini');
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const copyJsonPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(document, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'financial':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
      case 'identity':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400';
      case 'compliance':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400';
      case 'dates':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {document.name}
              </h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                {document.overallConfidence.toFixed(1)}% Confidence
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ID: {document.id} &bull; Uploaded {document.uploadedAt} &bull; Synced with Supabase
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-200/80 px-6 dark:border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition ${
              activeTab === 'gemini'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gemini Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition ${
              activeTab === 'entities'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Extracted Entities ({document.entities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition ${
              activeTab === 'raw'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Supabase / JSON</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {activeTab === 'gemini' && document.geminiAnalysis && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Executive AI Summary ({document.geminiAnalysis.modelUsed})</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {document.geminiAnalysis.executiveSummary}
                </p>
              </div>

              {/* Risk Assessment */}
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Covenant Risk Assessment
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 uppercase">
                    Risk: {document.geminiAnalysis.riskScore}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Key Risk Factors:
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {document.geminiAnalysis.riskFactors.map((rf, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500">&bull;</span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Suggested Workflow Actions:
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {document.geminiAnalysis.suggestedActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Raw snippet context */}
              {document.rawTextSnippet && (
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Document AI OCR Excerpt
                  </span>
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg">
                    {document.rawTextSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Categorized structured extractions</span>
                <span>Threshold: &gt; 90% confidence</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {document.entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200/80 p-3 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {entity.name}
                        </span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${getCategoryColor(entity.category)}`}>
                          {entity.category}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {entity.value}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {entity.confidence}%
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {entity.page ? `Page ${entity.page}` : 'Extracted'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Supabase Table Payload View</span>
                <button
                  onClick={copyJsonPayload}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="max-h-96 overflow-auto rounded-xl bg-zinc-900 p-4 text-xs font-mono text-zinc-100">
                {JSON.stringify(document, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-200/80 px-6 py-4 flex items-center justify-between dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="text-xs text-zinc-500">
            Relational Integrity: Verified
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onUpdateStatus?.(document.id, 'review_required');
                onClose();
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Flag for Audit
            </button>
            <button
              onClick={() => {
                onUpdateStatus?.(document.id, 'completed');
                onClose();
              }}
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
            >
              Approve Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
