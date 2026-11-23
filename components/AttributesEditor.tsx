'use client';

import React, { useState, useRef, useMemo } from 'react';
import { DICTIONARY } from '@/lib/i18n';

const PROVENANCE_KEYS = ['source_workbook', 'source_sheet', 'raw_ozellik'] as const;
const PROVENANCE_KEY_SET = new Set<string>(PROVENANCE_KEYS);

interface QuickChip {
  key: string;
  labelEn: string;
  labelTr: string;
}

const CONSTRUCTION_CHIPS: QuickChip[] = [
  { key: 'dimensions_size', labelEn: 'Dimensions / Size', labelTr: 'Boyut / Ebat' },
  { key: 'grade_class', labelEn: 'Grade / Class', labelTr: 'Sınıf / Kalite' },
  { key: 'weight_per_unit_kg', labelEn: 'Weight (kg)', labelTr: 'Birim Ağırlık (kg)' },
  { key: 'color_finish', labelEn: 'Color / Finish', labelTr: 'Renk / Yüzey' },
  { key: 'standard_cert', labelEn: 'Standard / Cert', labelTr: 'Standart / Sertifika' },
];

const FURNISHING_CHIPS: QuickChip[] = [
  { key: 'dimensions_cm', labelEn: 'Dimensions (W×D×H cm)', labelTr: 'Boyutlar (G×D×Y cm)' },
  { key: 'color_material', labelEn: 'Color / Material', labelTr: 'Renk / Malzeme' },
  { key: 'box_count', labelEn: 'Box Count', labelTr: 'Koli / Paket Adedi' },
  { key: 'voltage_power', labelEn: 'Voltage / Power', labelTr: 'Voltaj / Güç' },
  { key: 'warranty_months', labelEn: 'Warranty (Months)', labelTr: 'Garanti (Ay)' },
];

interface AttributeRow {
  id: string;
  key: string;
  value: string;
}

export interface AttributesEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  productDomain?: string;
  readOnly?: boolean;
  lang: 'en' | 'tr';
}

const INPUT_CLASS =
  'h-10 px-3.5 py-2 rounded-xl text-xs font-light border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500';

export function sanitizeAttributeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function sanitizeAttributeValue(raw: string): string {
  return raw.trim().replace(/\s{2,}/g, ' ');
}

function formatAttributeDisplayValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function humanizeKey(key: string, lang: 'en' | 'tr'): string {
  const allChips = [...CONSTRUCTION_CHIPS, ...FURNISHING_CHIPS];
  const matched = allChips.find((c) => c.key === key);
  if (matched) {
    return lang === 'tr' ? matched.labelTr : matched.labelEn;
  }
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildInitialRows(val: Record<string, unknown>): AttributeRow[] {
  const entries = Object.entries(val || {}).filter(
    ([k, v]) => !PROVENANCE_KEY_SET.has(k) && v !== null && v !== undefined && String(v).trim() !== ''
  );
  return entries.map(([k, v], idx) => ({
    id: `attr-init-${idx}-${k}`,
    key: k,
    value: formatAttributeDisplayValue(v),
  }));
}

export default function AttributesEditor({
  value,
  onChange,
  productDomain,
  readOnly = false,
  lang,
}: AttributesEditorProps) {
  const t = DICTIONARY[lang].attributesEditor;

  const provenanceEntries = useMemo(() => {
    const safeVal = value && typeof value === 'object' ? value : {};
    return PROVENANCE_KEYS.filter(
      (k) => safeVal[k] !== undefined && safeVal[k] !== null && String(safeVal[k]).trim() !== ''
    ).map((k) => ({
      key: k,
      value: formatAttributeDisplayValue(safeVal[k]),
    }));
  }, [value]);

  const [rows, setRows] = useState<AttributeRow[]>(() =>
    buildInitialRows(value && typeof value === 'object' ? value : {})
  );
  const rowSeqRef = useRef<number>(1);
  const valueInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const quickChips =
    productDomain === 'CONSTRUCTION_MATERIALS' ? CONSTRUCTION_CHIPS : FURNISHING_CHIPS;

  const emitSerialized = (nextRows: AttributeRow[]) => {
    const result: Record<string, unknown> = {};

    // 1. Always preserve locked provenance keys verbatim
    const safeVal = value && typeof value === 'object' ? value : {};
    for (const pk of PROVENANCE_KEYS) {
      if (safeVal[pk] !== undefined && safeVal[pk] !== null && String(safeVal[pk]).trim() !== '') {
        result[pk] = safeVal[pk];
      }
    }

    // 2. Serialize valid editable rows with snake_case keys & trimmed values
    for (const row of nextRows) {
      const cleanKey = sanitizeAttributeKey(row.key);
      const cleanVal = sanitizeAttributeValue(row.value);
      if (!cleanKey || !cleanVal) continue;
      if (PROVENANCE_KEY_SET.has(cleanKey)) continue;
      result[cleanKey] = cleanVal;
    }

    onChange(result);
  };

  const handleRowKeyChange = (id: string, nextKey: string) => {
    const nextRows = rows.map((r) => (r.id === id ? { ...r, key: nextKey } : r));
    setRows(nextRows);
    emitSerialized(nextRows);
  };

  const handleRowKeyBlur = (id: string) => {
    const nextRows = rows.map((r) => {
      if (r.id !== id) return r;
      const sanitized = sanitizeAttributeKey(r.key);
      if (PROVENANCE_KEY_SET.has(sanitized)) {
        return { ...r, key: '' };
      }
      return { ...r, key: sanitized };
    });
    setRows(nextRows);
    emitSerialized(nextRows);
  };

  const handleRowValueChange = (id: string, nextValue: string) => {
    const nextRows = rows.map((r) => (r.id === id ? { ...r, value: nextValue } : r));
    setRows(nextRows);
    emitSerialized(nextRows);
  };

  const handleRowValueBlur = (id: string) => {
    const nextRows = rows.map((r) =>
      r.id === id ? { ...r, value: sanitizeAttributeValue(r.value) } : r
    );
    setRows(nextRows);
    emitSerialized(nextRows);
  };

  const handleAddRow = () => {
    const newId = `attr-row-${rowSeqRef.current++}`;
    const nextRows = [...rows, { id: newId, key: '', value: '' }];
    setRows(nextRows);
  };

  const handleRemoveRow = (id: string) => {
    const nextRows = rows.filter((r) => r.id !== id);
    setRows(nextRows);
    emitSerialized(nextRows);
  };

  const handleQuickChipClick = (chipKey: string) => {
    const existing = rows.find((r) => sanitizeAttributeKey(r.key) === chipKey);
    if (existing) {
      const inputEl = valueInputRefs.current[existing.id];
      if (inputEl) {
        inputEl.focus();
      }
      return;
    }
    const newId = `attr-chip-${rowSeqRef.current++}`;
    const nextRows = [...rows, { id: newId, key: chipKey, value: '' }];
    setRows(nextRows);
    setTimeout(() => {
      const inputEl = valueInputRefs.current[newId];
      if (inputEl) {
        inputEl.focus();
      }
    }, 0);
  };

  // READ-ONLY MODE: Clean key-value chips/grid without raw JSON braces
  if (readOnly) {
    const safeVal = value && typeof value === 'object' ? value : {};
    const customEntries = Object.entries(safeVal).filter(
      ([k, v]) => !PROVENANCE_KEY_SET.has(k) && v !== null && v !== undefined && String(v).trim() !== ''
    );

    if (provenanceEntries.length === 0 && customEntries.length === 0) {
      return (
        <p className="text-xs font-light text-slate-400 dark:text-slate-500">
          {t.emptyReadOnly}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {provenanceEntries.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>{t.provenanceLabel}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {provenanceEntries.map((entry) => (
                <span
                  key={entry.key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px]"
                >
                  <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                    {entry.key}:
                  </span>
                  <span className="font-light text-slate-700 dark:text-slate-300 break-all">
                    {entry.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {customEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {customEntries.map(([k, v]) => (
              <div
                key={k}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-center"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {humanizeKey(k, lang)}
                </span>
                <span className="text-xs font-light text-slate-800 dark:text-slate-200 mt-0.5 break-words">
                  {formatAttributeDisplayValue(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // EDITABLE MATRIX MODE
  const activeKeySet = new Set(rows.map((r) => sanitizeAttributeKey(r.key)).filter(Boolean));

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      {/* System Provenance Lock Pills */}
      {provenanceEntries.length > 0 && (
        <div className="space-y-1.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>{t.provenanceLabel}</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {provenanceEntries.map((entry) => (
              <span
                key={entry.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] select-none"
              >
                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                  {entry.key}:
                </span>
                <span className="font-light text-slate-700 dark:text-slate-300 break-all">
                  {entry.value}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Defined Domain Quick-Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          {t.quickAddLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip) => {
            const isAdded = activeKeySet.has(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => handleQuickChipClick(chip.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  isAdded
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span>{isAdded ? '✓' : '+'}</span>
                <span>{lang === 'tr' ? chip.labelTr : chip.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key -> Value Matrix Rows */}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-[11px] font-light text-slate-400 dark:text-slate-500 py-1">
            {t.emptyEditable}
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
              <input
                type="text"
                value={row.key}
                onChange={(e) => handleRowKeyChange(row.id, e.target.value)}
                onBlur={() => handleRowKeyBlur(row.id)}
                placeholder={t.placeholderKey}
                className={`w-full font-mono ${INPUT_CLASS}`}
              />
              <input
                ref={(el) => {
                  valueInputRefs.current[row.id] = el;
                }}
                type="text"
                value={row.value}
                onChange={(e) => handleRowValueChange(row.id, e.target.value)}
                onBlur={() => handleRowValueBlur(row.id)}
                placeholder={t.placeholderValue}
                className={`w-full ${INPUT_CLASS}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveRow(row.id)}
                title={t.btnRemove}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Attribute Action */}
      <div>
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <span>{t.btnAddAttribute}</span>
        </button>
      </div>
    </div>
  );
}
