'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Inline "click to pick from a list, or type a new value" cell. Used
// for grid columns where the same string values repeat across rows
// (Company on /app/outreach, Specialty on /app/partnerships, etc.):
//
//   - Click the value → opens a portal-rendered search dropdown
//   - Type to filter the list of existing values
//   - Click a suggestion to save it
//   - When the query doesn't match any existing value, a "+ Add new"
//     row at the top of the dropdown lets you save the freeform text
//     as the new value (and surfaces it as an option for everyone
//     else next time they edit)
//   - Esc / outside-click closes without saving
//
// Portal-rendered so the dropdown escapes the parent table's overflow
// clipping context.

export function SearchSelectCell({
  value,
  options,
  onSave,
  placeholder = 'Set value…',
  className = '',
}: {
  value: string | null | undefined;
  options: string[];
  onSave: (next: string | null) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}) {
  const display = value ?? '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4, width: Math.max(220, r.width) });
    }
    // Focus the search input on next tick so the click event finishes
    // before we steal focus.
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const o of options) {
      if (!o) continue;
      const k = o.trim();
      if (!k) continue;
      const lk = k.toLowerCase();
      if (seen.has(lk)) continue;
      seen.add(lk);
      uniq.push(k);
    }
    if (!q) return uniq.slice(0, 100);
    return uniq.filter((o) => o.toLowerCase().includes(q)).slice(0, 100);
  }, [options, query]);

  const trimmedQuery = query.trim();
  const exactMatch = trimmedQuery && filtered.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase());
  const canAddNew = trimmedQuery.length > 0 && !exactMatch;

  async function pick(next: string | null) {
    setOpen(false);
    if ((next ?? '') !== (value ?? '')) await onSave(next);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title={display || 'Click to set'}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group/sscell inline-flex items-center gap-1 max-w-full text-left rounded-md px-1.5 -mx-1.5 py-0.5 cursor-pointer hover:bg-warm-bg/60 transition-colors ${className}`}
      >
        {display ? (
          <span className="truncate text-foreground/75 whitespace-nowrap">{display}</span>
        ) : (
          <span className="text-foreground/30 italic text-[11px]">{placeholder}</span>
        )}
        {/* Chevron makes the cell visually advertise that it's a
            dropdown — admissions kept treating Company / Specialty as
            plain text because the trigger had no affordance. Always
            visible (slightly muted at rest, full strength on hover /
            open) so the dropdown reads as a dropdown without needing
            a hover discovery. */}
        <span
          aria-hidden
          className={`shrink-0 ml-auto inline-flex items-center justify-center transition-all ${open ? 'rotate-180 text-foreground/70' : 'text-foreground/35 group-hover/sscell:text-foreground/65'}`}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{ left: pos.left, top: pos.top, width: pos.width }}
          className="fixed z-[1000] rounded-lg border border-black/10 bg-white shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-black/5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
                else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (canAddNew) void pick(trimmedQuery);
                  else if (filtered[0]) void pick(filtered[0]);
                }
              }}
              placeholder="Search or add…"
              className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {canAddNew && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); void pick(trimmedQuery); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-primary hover:bg-primary/5 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-primary text-primary text-[10px]">+</span>
                Add &ldquo;{trimmedQuery}&rdquo;
              </button>
            )}
            {filtered.length > 0 ? (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); void pick(o); }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-warm-bg/60 transition-colors ${o === value ? 'text-foreground font-semibold' : 'text-foreground/75'}`}
                >
                  <span className="truncate">{o}</span>
                  {o === value && <span className="text-primary text-[10px]">✓</span>}
                </button>
              ))
            ) : !canAddNew ? (
              <div className="px-3 py-2 text-[11px] text-foreground/55">No matches.</div>
            ) : null}
            {value && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); void pick(null); }}
                className="block w-full px-3 py-1.5 text-left text-[10.5px] text-rose-700 hover:bg-rose-50 border-t border-black/5"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
