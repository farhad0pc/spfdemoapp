"use client";

import React, { useState } from 'react';
import { Search, FileText, CheckCircle2, AlertTriangle, Clock, Database, ChevronRight } from 'lucide-react';
import { ProcessedDocument, DocumentStatus } from '@/types/document';

interface DocumentQueueTableProps {
  documents: ProcessedDocument[];
  onSelectDocument: (doc: ProcessedDocument) => void;
  selectedDocId?: string;
}

export const DocumentQueueTable: React.FC<DocumentQueueTableProps> = ({
  documents,
  onSelectDocument,
  selectedDocId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        );
      case 'review_required':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Review Required
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Clock className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Document Repository &amp; Extraction Queue
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live audit logs and structured extraction statuses
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 py-1.5 px-2.5 text-xs text-zinc-700 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Ready</option>
            <option value="review_required">Needs Review</option>
            <option value="processing">Processing</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200/80 bg-zinc-50/75 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="py-3 px-4 font-semibold">Document Title</th>
              <th className="py-3 px-3 font-semibold">Status</th>
              <th className="py-3 px-3 font-semibold">Confidence</th>
              <th className="py-3 px-3 font-semibold">Entities</th>
              <th className="py-3 px-3 font-semibold">Database Sync</th>
              <th className="py-3 px-3 font-semibold">Ingested</th>
              <th className="py-3 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const isSelected = selectedDocId === doc.id;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className={`group cursor-pointer transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                            {doc.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {doc.size} &bull; {doc.fileType}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">{getStatusBadge(doc.status)}</td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {doc.overallConfidence.toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${
                              doc.overallConfidence >= 90
                                ? 'bg-emerald-500'
                                : doc.overallConfidence >= 75
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${doc.overallConfidence}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-zinc-600 dark:text-zinc-300 font-medium">
                      {doc.entities.length} fields
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Database className="h-3 w-3" /> Synced
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {doc.uploadedAt}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No documents found matching the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
