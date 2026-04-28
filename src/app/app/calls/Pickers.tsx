'use client';

import { useEffect, useRef, useState } from 'react';
import { Call, clientTypeBg } from './_shared';

// Inline operator selector shown in every row. Displays the current
// operator name (AI-picked or manually set) and lets staff override via
// a dropdown of known operators, or type a brand-new name.
export function OperatorPicker({ currentName, knownOperators, noAnswer, voicemail, error, onPick }: {
  currentName: string | null;
  knownOperators: string[];
  noAnswer: boolean;
  voicemail: boolean;
  error?: string;
  onPick: (name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState('');
  void noAnswer; void voicemail;

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { if (custom.trim()) onPick(custom.trim()); setEditing(false); }
            if (e.key === 'Escape') { setEditing(false); setCustom(''); }
          }}
          placeholder="Operator name"
          className="text-xs px-2 py-1 rounded-md border border-gray-200 focus:outline-none focus:border-primary/40 w-28"
        />
        <button type="button" onClick={() => { if (custom.trim()) onPick(custom.trim()); setEditing(false); }} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-primary text-white hover:opacity-90">Save</button>
        <button type="button" onClick={() => { setEditing(false); setCustom(''); }} className="text-[10px] text-foreground/40 hover:text-foreground/70">Cancel</button>
      </div>
    );
  }

  const options = Array.from(new Set([...(currentName ? [currentName] : []), ...knownOperators])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <select
          value={currentName || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__new__') { setEditing(true); return; }
            if (v === '__clear__') { onPick(null); return; }
            if (v === '') return;
            onPick(v);
          }}
          className={`appearance-none text-xs pl-2.5 pr-6 py-1 rounded-full font-medium border cursor-pointer focus:outline-none focus:border-primary/40 ${currentName ? 'bg-blue-50 text-blue-800 border-transparent' : error ? 'bg-red-50 text-red-700 border-transparent' : 'bg-white border-gray-200 text-foreground/40'}`}
        >
          {!currentName && <option value="">{error ? 'Error — Set…' : 'Set operator…'}</option>}
          {options.map((n) => <option key={n} value={n}>{n}</option>)}
          <option value="__new__">+ New name…</option>
          {currentName && <option value="__clear__">Clear</option>}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

// Inline client-type picker. Shows the pill when a type is set, otherwise a
// compact dropdown so the user can manually classify the call. Always allows
// changing or clearing via the dropdown on the right.
export function ClientTypePicker({ currentType, knownTypes, onPick }: {
  currentType: string | null;
  knownTypes: string[];
  onPick: (type: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState('');

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { if (custom.trim()) onPick(custom.trim()); setEditing(false); }
            if (e.key === 'Escape') { setEditing(false); setCustom(''); }
          }}
          placeholder="Call type"
          className="text-xs px-2 py-1 rounded-md border border-gray-200 focus:outline-none focus:border-primary/40 w-28"
        />
        <button type="button" onClick={() => { if (custom.trim()) onPick(custom.trim()); setEditing(false); }} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-primary text-white hover:opacity-90">Save</button>
        <button type="button" onClick={() => { setEditing(false); setCustom(''); }} className="text-[10px] text-foreground/40 hover:text-foreground/70">Cancel</button>
      </div>
    );
  }

  const options = Array.from(new Set([...(currentType ? [currentType] : []), ...knownTypes])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <select
          value={currentType || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__new__') { setEditing(true); return; }
            if (v === '__clear__') { onPick(null); return; }
            if (v === '') return;
            onPick(v);
          }}
          className={`appearance-none text-xs pl-2.5 pr-6 py-1 rounded-full font-medium border cursor-pointer focus:outline-none focus:border-primary/40 ${currentType ? `${clientTypeBg(currentType)} border-transparent` : 'bg-white border-gray-200 text-foreground/40'}`}
        >
          {!currentType && <option value="">Set type…</option>}
          {options.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value="__new__">+ Custom…</option>
          {currentType && <option value="__clear__">Clear</option>}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

// Tri-state select-all checkbox for the calls table header. Reflects
// "all visible selected" (checked), "some visible selected"
// (indeterminate), or "none selected" (unchecked). Toggling it adds /
// removes every visible call id from the selection set.
export function SelectAllCheckbox({
  visibleCalls,
  selectedIds,
  setSelectedIds,
}: {
  visibleCalls: Call[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const visibleIds = visibleCalls.map((c) => String(c.id));
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allChecked = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someChecked = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked;
  }, [someChecked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allChecked}
      onChange={() => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (allChecked) {
            for (const id of visibleIds) next.delete(id);
          } else {
            for (const id of visibleIds) next.add(id);
          }
          return next;
        });
      }}
      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
      aria-label={allChecked ? 'Unselect all visible calls' : 'Select all visible calls'}
    />
  );
}

// Sortable column header for the calls table.
export function SortTh({ label, sortKeyName, sortKey, sortDir, onSort, hiddenLg }: {
  label: string;
  sortKeyName: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  hiddenLg?: boolean;
}) {
  const active = sortKey === sortKeyName;
  return (
    <th
      onClick={() => onSort(sortKeyName)}
      className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-foreground/70 transition-colors ${active ? 'text-foreground/80' : 'text-foreground/40'} ${hiddenLg ? 'hidden lg:table-cell' : ''}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </span>
    </th>
  );
}

// Simple label/value cell used inside the expanded call detail drawer.
export function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && String(value).trim() ? String(value) : '—';
  return (
    <div>
      <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-sm ${display === '—' ? 'text-foreground/30' : 'text-foreground/80'} break-words`} style={{ fontFamily: 'var(--font-body)' }}>{display}</p>
    </div>
  );
}
