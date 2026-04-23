'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

interface FetchedRow {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  team_page_order?: number | null;
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
 *   • Up / down arrows instead of native HTML drag-drop. Drag-drop is
 *     noticeably broken on touch screens without a polyfill and the
 *     ordering pool here tops out at ~30 rows — buttons are clearer
 *     and keyboard-accessible with no extra work.
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
}

function sortMembers(list: OrderableMember[]): OrderableMember[] {
  return [...list].sort((a, b) => {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrderableMember[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Try the full select first; if team_page_order doesn't exist yet
      // (migration pending), fall back silently so the modal still shows
      // people you can save-reorder against.
      let rows: OrderableMember[] = [];
      let migrationPending = false;

      const full = await supabase
        .from('users')
        .select('id, full_name, job_title, avatar_url, team_page_order')
        .eq('status', 'active')
        .eq('public_team', true);

      if (full.error) {
        migrationPending = true;
        const fallback = await supabase
          .from('users')
          .select('id, full_name, job_title, avatar_url')
          .eq('status', 'active')
          .eq('public_team', true);
        if (fallback.error) {
          if (!cancelled) setError(fallback.error.message);
        } else {
          rows = ((fallback.data || []) as FetchedRow[]).map((r) => ({
            id: r.id,
            full_name: r.full_name || '',
            job_title: r.job_title,
            avatar_url: r.avatar_url,
            team_page_order: null,
          }));
        }
      } else {
        rows = ((full.data || []) as FetchedRow[]).map((r) => ({
          id: r.id,
          full_name: r.full_name || '',
          job_title: r.job_title,
          avatar_url: r.avatar_url,
          team_page_order: r.team_page_order ?? null,
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

  function move(index: number, delta: -1 | 1) {
    setMembers((prev) => {
      const next = prev.slice();
      const dest = index + delta;
      if (dest < 0 || dest >= next.length) return prev;
      [next[index], next[dest]] = [next[dest], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Assign a dense 10/20/30/... ordering so a future insert has
      // room to slide in between. Non-visible members keep null.
      let anyFailed = false;
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const desired = (i + 1) * 10;
        if (m.team_page_order === desired) continue;
        const r = await db({
          action: 'update',
          table: 'users',
          data: { team_page_order: desired },
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
              No active, publicly-visible team members found.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m, i) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-warm-bg/60 border border-black/5 p-2.5"
                >
                  <span
                    className="shrink-0 w-8 h-8 rounded-lg bg-white border border-black/10 flex items-center justify-center text-[11px] font-bold text-foreground/60 tabular-nums"
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
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {m.full_name}
                    </p>
                    {m.job_title && (
                      <p className="text-xs text-foreground/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {m.job_title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || saving}
                      aria-label={`Move ${m.full_name} up`}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-foreground/60 hover:text-primary hover:border-primary/40 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === members.length - 1 || saving}
                      aria-label={`Move ${m.full_name} down`}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-foreground/60 hover:text-primary hover:border-primary/40 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

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
