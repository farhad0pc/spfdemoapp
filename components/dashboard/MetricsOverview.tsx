"use client";

import React from 'react';
import { Files, CheckCircle2, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { DashboardMetrics } from '@/types/document';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Documents */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Ingested
          </span>
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Files className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {metrics.totalDocuments}
          </span>
          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="mr-0.5 h-3 w-3" /> +{metrics.processedToday} today
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Sync active with Supabase storage
        </p>
      </div>

      {/* Extraction Confidence */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Extraction Confidence
          </span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {metrics.avgConfidence.toFixed(1)}%
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            Optimal
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(metrics.avgConfidence, 100)}%` }}
          />
        </div>
      </div>

      {/* Pending Review */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Needs Human Review
          </span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {metrics.pendingReviewCount}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {metrics.pendingReviewCount === 0 ? 'Queue clear' : 'Low confidence fields'}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Flagged by Document AI validation threshold
        </p>
      </div>

      {/* Pipeline Health */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Pipeline Health
          </span>
          <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-lg font-bold capitalize tracking-tight text-zinc-900 dark:text-zinc-50">
            {metrics.pipelineHealth}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Document AI OCR &bull; Gemini 2.0 &bull; Supabase RLS
        </p>
      </div>
    </div>
  );
};
