"use client";

import React from 'react';
import { Building2, Database, UserCheck, RefreshCw } from 'lucide-react';
import { CorporateRole } from '@/types/requisition';

interface HeaderProps {
  currentRole: CorporateRole;
  onRoleChange: (role: CorporateRole) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  supabaseConnected?: boolean;
}

const ROLE_LABELS: Record<CorporateRole, { tr: string; en: string; tier: string }> = {
  FOREMAN: { tr: 'Şantiye Şefi', en: 'Site Foreman', tier: 'Talep Girişi / Intake' },
  PURCHASING_MGR: { tr: 'Satın Alma Müdürü', en: 'Purchasing Manager', tier: 'Tier 1 (< €2.5k)' },
  PROJECT_DIRECTOR: { tr: 'Proje Direktörü', en: 'Project Director', tier: 'Tier 2 (< €15k)' },
  EXECUTIVE: { tr: 'Yönetim Kurulu / Genel Müdür', en: 'Executive Board', tier: 'Tier 3 (> €15k)' },
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onRefresh,
  isRefreshing = false,
  supabaseConnected = true,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand & Project Scope */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-600 via-amber-700 to-zinc-900 text-white shadow-lg shadow-amber-600/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                Afik Group &bull; Caesar Projects
              </h1>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-400">
                Caesar Resort &amp; Spa
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              İnşaat Malzeme Satın Alma Alt-Defteri <span className="text-zinc-400 dark:text-zinc-500">| Construction Material Sub-Ledger (v1.2.1)</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Supabase Status Pill */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 md:flex">
            <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Supabase Cloud SQL</span>
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${supabaseConnected ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          {/* Active Role Simulator Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 p-1 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <div className="flex items-center gap-1 pl-1.5 pr-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aktif Rol:</span>
            </div>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as CorporateRole)}
              className="rounded-md border-0 bg-white py-1 pl-2 pr-6 text-xs font-semibold text-zinc-900 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {(Object.keys(ROLE_LABELS) as CorporateRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role].tr} ({ROLE_LABELS[role].tier})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-xs transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Alt-Defteri Yenile / Sync Sub-Ledger"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
