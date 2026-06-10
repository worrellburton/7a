'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/lib/ModalProvider';

// Inline "click to pick from a list, or type a new value" cell. Used
// for grid columns where the same string values repeat across rows
// (Company on /feather/outreach, Specialty on /feather/partnerships, etc.):
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
  onRenameOption,
  onDeleteOption,
  placeholder = 'Set value…',
  className = '',
}: {
  value: string | null | undefined;
  options: string[];
  onSave: (next: string | null) => Promise<void> | void;
  // Optional bulk-edit hooks. When provided, the dropdown reveals a
  // pencil + trash button next to each option on hover. Edit kicks
  // off an inline rename input; delete confirms then runs the
  // callback. Both callbacks are expected to fan out the change
  // across every row that holds the value (see /api/.../rename-value).
  onRenameOption?: (from: string, to: string) => Promise<void> | void;
  onDeleteOption?: (value: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}) {
  const modal = useModal();
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
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
              filtered.map((o) => {
                const isEditing = editingOption === o;
                const showEditTools = !!(onRenameOption || onDeleteOption);
                if (isEditing) {
                  // Inline rename row. Enter commits to the bulk
                  // rename callback (which updates every row that
                  // shared the old value); Escape bails.
                  return (
                    <div key={o} className="flex items-center gap-1 px-3 py-1.5 bg-warm-bg/40">
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Escape') { e.preventDefault(); setEditingOption(null); return; }
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const next = renameDraft.trim();
                          if (!next || next === o) { setEditingOption(null); return; }
                          if (!onRenameOption) { setEditingOption(null); return; }
                          setBusy(o);
                          try { await onRenameOption(o, next); }
                          finally { setBusy(null); setEditingOption(null); }
                        }}
                        className="flex-1 min-w-0 rounded-md border border-primary/40 bg-white px-2 py-0.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setEditingOption(null); }}
                        className="px-1.5 py-0.5 text-[10px] text-foreground/55 hover:text-foreground"
                      >Cancel</button>
                    </div>
                  );
                }
                return (
                  <div key={o} className={`group/opt flex items-center gap-1 px-3 py-1.5 hover:bg-warm-bg/60 transition-colors ${busy === o ? 'opacity-50' : ''}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); void pick(o); }}
                      className={`flex-1 min-w-0 flex items-center justify-between gap-2 text-left text-[12px] ${o === value ? 'text-foreground font-semibold' : 'text-foreground/75'}`}
                    >
                      <span className="truncate">{o}</span>
                      {o === value && <span className="text-primary text-[10px]">✓</span>}
                    </button>
                    {showEditTools && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                        {onRenameOption && (
                          <button
                            type="button"
                            title="Rename across all rows"
                            aria-label={`Rename ${o}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setRenameDraft(o);
                              setEditingOption(o);
                            }}
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-foreground/45 hover:text-foreground hover:bg-warm-bg"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                        )}
                        {onDeleteOption && (
                          <button
                            type="button"
                            title="Delete from every row"
                            aria-label={`Delete ${o}`}
                            onMouseDown={async (e) => {
                              e.preventDefault();
                              const ok = await modal.confirm(`Delete "${o}"?`, {
                                message: 'Removes this value from every row that uses it. The rows stay; just this value gets cleared.',
                                confirmLabel: 'Delete',
                                tone: 'danger',
                              });
                              if (!ok) return;
                              if (!onDeleteOption) return;
                              setBusy(o);
                              try { await onDeleteOption(o); }
                              finally { setBusy(null); }
                            }}
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-foreground/45 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
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
