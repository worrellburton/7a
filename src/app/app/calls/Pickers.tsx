'use client';

import { useEffect, useRef } from 'react';
import { Call } from './_shared';

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
