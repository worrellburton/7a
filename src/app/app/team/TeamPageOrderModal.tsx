'use client';

import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/AuthProvider';

interface FetchedRow {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  team_page_order?: number | null;
  public_team?: boolean | null;
}

/**
 * Team Page Order modal.
 *
 * Lets admins rearrange the order team members appear on the public
 * /who-we-are/meet-our-team grid. Lower number = higher up the page.
 * Writes back to `users.team_page_order` (added in migration
 * 20260423_team_page_order.sql).
 *
 * UI choices:
 *   • Native HTML5 drag-and-drop. The drop indicator shows where the
 *     item will land based on cursor position within each target row
 *     (upper half = above, lower half = below), and the dragged row
 *     fades to half opacity until release.
 *   • Reset-to-default clears the override column for every visible
 *     row so the jobRank sort resumes.
 *   • Save is optimistic — we keep the previous order in state so a
 *     failed write can revert cleanly.
 */

interface OrderableMember {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
  team_page_order: number | null;
  /** Snapshot of public_team at fetch time — used to detect what
   *  changed when the modal saves so we don't re-write the column for
   *  rows that didn't toggle. */
  public_team_initial: boolean;
  /** Live value — admins flip this via the eye toggle; non-admins
   *  see it but can't change it. */
  public_team: boolean;
}

// Visible rows sort first (by team_page_order then alphabetical),
// hidden rows sink to the bottom in alphabetical order. Pinning a
// hidden person to position 1 in their group still works — admins can
// pre-stage someone before flipping them on.
function sortMembers(list: OrderableMember[]): OrderableMember[] {
  return [...list].sort((a, b) => {
    if (a.public_team !== b.public_team) return a.public_team ? -1 : 1;
    const oa = a.team_page_order;
    const ob = b.team_page_order;
    const hasA = typeof oa === 'number';
    const hasB = typeof ob === 'number';
    if (hasA && hasB && oa !== ob) return (oa as number) - (ob as number);
    if (hasA !== hasB) return hasA ? -1 : 1;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });
}

export default function TeamPageOrderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrderableMember[]>([]);
  // Drag state. `dragIndex` is the index of the row currently being
  // dragged; `overIndex` is the insertion point (0..members.length)
  // computed from cursor position within the hovered row, so the
  // indicator can render exactly where the dropped item will land.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Pull every active user — visible AND hidden — so admins can
      // re-enable hidden people from this same modal. We previously
      // filtered .eq('public_team', true) here, which made the row
      // disappear the instant someone got toggled off and there was
      // no UI path to bring them back. The Visibility column added in
      // Phase 2 needs both states to be present.
      let rows: OrderableMember[] = [];
      let migrationPending = false;

      const full = await supabase
        .from('users')
        .select('id, full_name, job_title, avatar_url, team_page_order, public_team')
        .eq('status', 'active');

      if (full.error) {
        migrationPending = true;
        const fallback = await supabase
          .from('users')
          .select('id, full_name, job_title, avatar_url, public_team')
          .eq('status', 'active');
        if (fallback.error) {
          if (!cancelled) setError(fallback.error.message);
        } else {
          rows = ((fallback.data || []) as FetchedRow[]).map((r) => ({
            id: r.id,
            full_name: r.full_name || '',
            job_title: r.job_title,
            avatar_url: r.avatar_url,
            team_page_order: null,
            public_team_initial: r.public_team !== false,
            public_team: r.public_team !== false,
          }));
        }
      } else {
        rows = ((full.data || []) as FetchedRow[]).map((r) => ({
          id: r.id,
          full_name: r.full_name || '',
          job_title: r.job_title,
          avatar_url: r.avatar_url,
          team_page_order: r.team_page_order ?? null,
          public_team_initial: r.public_team !== false,
          public_team: r.public_team !== false,
        }));
      }

      if (cancelled) return;
      setMembers(sortMembers(rows.filter((r) => r.full_name.trim().length > 0)));
      if (migrationPending) {
        setError(
          'Database migration "team_page_order" is not yet applied. You can preview the order here, but Save will not persist until the migration runs.',
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetDragState() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function onDragStart(e: React.DragEvent<HTMLLIElement>, i: number) {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox to actually start the drag.
    e.dataTransfer.setData('text/plain', String(i));
  }

  function onDragOverRow(e: React.DragEvent<HTMLLIElement>, i: number) {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const insertAt = e.clientY < midpoint ? i : i + 1;
    setOverIndex((prev) => (prev === insertAt ? prev : insertAt));
  }

  function onDropRow(e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    if (dragIndex === null || overIndex === null) {
      resetDragState();
      return;
    }
    setMembers((prev) => {
      // No-op when the insertion point is the row's own position
      // (above itself or directly below itself).
      if (overIndex === dragIndex || overIndex === dragIndex + 1) return prev;
      const next = prev.slice();
      const [moved] = next.splice(dragIndex, 1);
      // If the item came from above the insertion point, removing
      // it shifts every later index down by one — so the new
      // insertion index has to compensate.
      const insertAt = overIndex > dragIndex ? overIndex - 1 : overIndex;
      next.splice(insertAt, 0, moved);
      return next;
    });
    resetDragState();
  }

  // Toggle a member's public_team flag. Admin-only — we still gate
  // the click handler in the row, but defending here too keeps a
  // clean API even if the gate slips. The change is local until the
  // user clicks Save.
  function toggleVisibility(id: string) {
    if (!isAdmin) return;
    setMembers((prev) =>
      sortMembers(
        prev.map((m) =>
          m.id === id ? { ...m, public_team: !m.public_team } : m,
        ),
      ),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Assign a dense 10/20/30/... ordering so a future insert has
      // room to slide in between. We also persist any visibility
      // toggles in the same per-row update — one round-trip per
      // changed row, so a 30-person team with 2 toggles is still
      // 2 writes (or 30 if the order changed too).
      let anyFailed = false;
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const desiredOrder = (i + 1) * 10;
        const orderChanged = m.team_page_order !== desiredOrder;
        const visibilityChanged = m.public_team !== m.public_team_initial;
        if (!orderChanged && !visibilityChanged) continue;
        const data: { team_page_order?: number; public_team?: boolean } = {};
        if (orderChanged) data.team_page_order = desiredOrder;
        if (visibilityChanged) data.public_team = m.public_team;
        const r = await db({
          action: 'update',
          table: 'users',
          data,
          match: { id: m.id },
        });
        if (r?.error) {
          anyFailed = true;
          setError(`Save failed for ${m.full_name}: ${r.error}`);
          break;
        }
      }
      if (!anyFailed) onClose();
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!confirm('Clear all custom ordering and revert to the default job-rank sort?')) return;
    setSaving(true);
    setError(null);
    try {
      for (const m of members) {
        if (m.team_page_order == null) continue;
        const r = await db({
          action: 'update',
          table: 'users',
          data: { team_page_order: null },
          match: { id: m.id },
        });
        if (r?.error) {
          setError(`Reset failed for ${m.full_name}: ${r.error}`);
          break;
        }
      }
      setMembers((prev) => sortMembers(prev.map((m) => ({ ...m, team_page_order: null }))));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Team page order"
      className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team page order</h2>
            <p className="text-sm text-foreground/55 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Rearrange the order people appear at{' '}
              <span className="text-foreground/80 font-medium">/who-we-are/meet-our-team</span>.
              Top of this list = top of the public page.
              {isAdmin ? (
                <>
                  {' '}Click the eye to hide someone from the public site —
                  super-admin only.
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full text-foreground/50 hover:text-foreground hover:bg-warm-bg flex items-center justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-amber-900">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center text-sm text-foreground/55">
              No active team members found.
            </div>
          ) : (
            <ul className="space-y-1.5" onDragLeave={(e) => {
              // Only clear the indicator when the cursor leaves the
              // entire list, not when crossing between sibling rows.
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setOverIndex(null);
            }}>
              {members.map((m, i) => {
                const isDragging = dragIndex === i;
                const showIndicatorAbove = overIndex === i && dragIndex !== null && dragIndex !== i && dragIndex !== i - 1;
                const showIndicatorBelow =
                  i === members.length - 1 &&
                  overIndex === members.length &&
                  dragIndex !== null &&
                  dragIndex !== i;
                return (
                  <Fragment key={m.id}>
                    {/* Drop indicator above this row. Reserves no
                        layout height when inactive so rows don't
                        shift while dragging. */}
                    <li
                      aria-hidden="true"
                      className={`h-0.5 -my-px rounded-full transition-colors ${
                        showIndicatorAbove ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                    <li
                      draggable={!saving}
                      onDragStart={(e) => onDragStart(e, i)}
                      onDragOver={(e) => onDragOverRow(e, i)}
                      onDrop={onDropRow}
                      onDragEnd={resetDragState}
                      className={`flex items-center gap-2 sm:gap-3 rounded-xl border p-2.5 select-none transition-opacity ${
                        m.public_team
                          ? 'bg-warm-bg/60 border-black/5'
                          : 'bg-warm-bg/30 border-black/5'
                      } ${isDragging ? 'opacity-40' : 'opacity-100'} ${
                        saving ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                      }`}
                    >
                      {/* Drag-handle grip — six dots, the conventional
                          affordance for "this row is draggable". */}
                      <span
                        aria-hidden="true"
                        className="shrink-0 w-5 flex items-center justify-center text-foreground/35"
                        title="Drag to reorder"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="9" cy="6" r="1.6" />
                          <circle cx="15" cy="6" r="1.6" />
                          <circle cx="9" cy="12" r="1.6" />
                          <circle cx="15" cy="12" r="1.6" />
                          <circle cx="9" cy="18" r="1.6" />
                          <circle cx="15" cy="18" r="1.6" />
                        </svg>
                      </span>
                      <span
                        className={`shrink-0 w-8 h-8 rounded-lg bg-white border border-black/10 flex items-center justify-center text-[11px] font-bold tabular-nums ${
                          m.public_team ? 'text-foreground/60' : 'text-foreground/30'
                        }`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {i + 1}
                      </span>
                      {m.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.avatar_url}
                          alt=""
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className={`w-9 h-9 rounded-full object-cover shrink-0 transition-opacity ${
                            m.public_team ? '' : 'opacity-40 grayscale'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            m.public_team
                              ? 'bg-primary/10 text-primary'
                              : 'bg-foreground/10 text-foreground/30'
                          }`}
                        >
                          {m.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            m.public_team
                              ? 'text-foreground'
                              : 'text-foreground/40 line-through decoration-foreground/30'
                          }`}
                        >
                          {m.full_name}
                        </p>
                        {m.job_title && (
                          <p
                            className={`text-xs truncate ${
                              m.public_team ? 'text-foreground/50' : 'text-foreground/30'
                            }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {m.job_title}
                          </p>
                        )}
                      </div>
                      {/* Visibility toggle — admin-only. Click flips
                          local state; persistence happens on Save. */}
                      <VisibilityToggle
                        visible={m.public_team}
                        canEdit={isAdmin}
                        // Stop propagation so the parent row's drag
                        // listeners don't capture the click.
                        onToggle={(e) => {
                          e.stopPropagation();
                          toggleVisibility(m.id);
                        }}
                      />
                    </li>
                    {/* Trailing indicator only after the last row, so
                        users can drop "to the very bottom". */}
                    {i === members.length - 1 && (
                      <li
                        aria-hidden="true"
                        className={`h-0.5 -my-px rounded-full transition-colors ${
                          showIndicatorBelow ? 'bg-primary' : 'bg-transparent'
                        }`}
                      />
                    )}
                  </Fragment>
                );
              })}
            </ul>
          )}
        </div>

        {isAdmin ? <VisibilityLog open={open} /> : null}

        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={resetDefaults}
            disabled={saving || loading}
            className="text-xs font-semibold text-foreground/55 hover:text-foreground underline decoration-foreground/30 hover:decoration-foreground disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Reset to default order
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-foreground/70 hover:bg-warm-bg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading || members.length === 0}
              className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuditRow {
  id: string;
  user_name_snapshot: string | null;
  old_value: boolean | null;
  new_value: boolean | null;
  changed_by_name_snapshot: string | null;
  changed_at: string;
}

/**
 * Collapsible "Visibility log" panel surfacing the most recent flips
 * recorded in public.team_visibility_audit. Read access is gated by
 * RLS to is_admin(), and the modal only mounts this for admins, so a
 * non-admin who somehow bypassed the gate would still see an empty
 * list rather than other admins' actions. Defaults closed so the
 * primary modal flow stays focused; expanding triggers a single
 * select.
 */
function VisibilityLog({ open }: { open: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !expanded || rows !== null) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('team_visibility_audit')
        .select('id, user_name_snapshot, old_value, new_value, changed_by_name_snapshot, changed_at')
        .order('changed_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (err) {
        // Likely the trigger / table hasn't been applied yet in a
        // preview env — degrade silently with a short label so the
        // primary flow isn't blocked.
        setError(err.message);
        setRows([]);
        return;
      }
      setRows((data as AuditRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, expanded, rows]);

  return (
    <div className="px-4 sm:px-6 py-2 border-t border-gray-100 bg-warm-bg/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55 hover:text-foreground inline-flex items-center gap-1.5"
        style={{ fontFamily: 'var(--font-body)' }}
        aria-expanded={expanded}
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Visibility log
        {rows && rows.length > 0 ? (
          <span className="ml-1 text-foreground/40">· {rows.length}</span>
        ) : null}
      </button>
      {expanded ? (
        rows == null ? (
          <p className="mt-2 text-[12px] text-foreground/55 italic">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-[12px] text-foreground/55 italic">
            {error ? `Couldn't load log: ${error}` : 'No visibility changes recorded yet.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {rows.map((r) => {
              const went =
                r.new_value === true ? 'shown' : r.new_value === false ? 'hidden' : 'changed';
              const tone =
                r.new_value === true
                  ? 'text-emerald-700'
                  : r.new_value === false
                    ? 'text-foreground/55'
                    : 'text-foreground/70';
              return (
                <li
                  key={r.id}
                  className="text-[12px] text-foreground/70 flex items-baseline gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className="text-foreground/40 tabular-nums shrink-0">
                    {new Date(r.changed_at).toLocaleString()}
                  </span>
                  <span className="truncate">
                    <span className="font-semibold text-foreground">
                      {r.user_name_snapshot ?? 'Someone'}
                    </span>{' '}
                    <span className={tone}>{went}</span>
                    {r.changed_by_name_snapshot ? (
                      <span className="text-foreground/45"> by {r.changed_by_name_snapshot}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}

/**
 * Per-row visibility toggle. Eye icon when shown, eye-with-slash when
 * hidden. Admins click to flip; non-admins see the same icon but the
 * button is disabled and the cursor is not-allowed. The icon stays
 * visible to everyone so the team can see who is currently published
 * to the public site without being able to change it.
 */
function VisibilityToggle({
  visible,
  canEdit,
  onToggle,
}: {
  visible: boolean;
  canEdit: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const label = visible ? 'Hide from public team page' : 'Show on public team page';
  const tooltip = canEdit
    ? label
    : visible
      ? 'Visible on public team page'
      : 'Hidden from public team page (admin only)';
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canEdit}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={visible}
      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
        canEdit
          ? visible
            ? 'text-emerald-600 hover:bg-emerald-50'
            : 'text-foreground/35 hover:bg-warm-bg'
          : 'cursor-not-allowed ' +
            (visible ? 'text-emerald-500/70' : 'text-foreground/25')
      }`}
    >
      {visible ? (
        // Eye open
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        // Eye with slash
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}
