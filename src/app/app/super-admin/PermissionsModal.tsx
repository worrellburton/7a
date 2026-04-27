'use client';

// Super-admin-only per-user page permission editor. Sits on top of
// the existing department + admin-only rules in
// `lib/PagePermissions.tsx`: each row is a 3-state cycle.
//
//   Inherit  — no row in user_page_permissions; the user sees the
//              page if (a) it's not admin-only or they're admin,
//              and (b) the page is unrestricted or their dept is
//              on the allowed list.
//   Allow    — explicit override can_view=true; user sees the page
//              even if dept rules would hide it.
//   Block    — explicit override can_view=false; user does NOT see
//              the page even if dept rules would show it. (Admins
//              still see admin pages by virtue of is_admin — block
//              is intended for non-admin members.)

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/db';
import { usePagePermissions } from '@/lib/PagePermissions';
import { logActivity } from '@/lib/activity';
import { useAuth } from '@/lib/AuthProvider';

export type OverrideState = 'inherit' | 'allow' | 'block';

interface OverrideRow {
  user_id: string;
  path: string;
  can_view: boolean;
}

export default function PermissionsModal({
  open,
  onClose,
  userId,
  userLabel,
  userIsAdmin,
  userDepartmentId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userLabel: string;
  userIsAdmin: boolean;
  userDepartmentId: string | null;
}) {
  const { pages, isPageAllowedForDepartment } = usePagePermissions();
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setOverrides({});
    setQuery('');
    db({
      action: 'select',
      table: 'user_page_permissions',
      match: { user_id: userId },
      select: 'user_id, path, can_view',
    })
      .then((rows) => {
        const map: Record<string, boolean> = {};
        if (Array.isArray(rows)) {
          for (const r of rows as OverrideRow[]) {
            map[r.path] = r.can_view;
          }
        }
        setOverrides(map);
      })
      .catch(() => { /* handled below — table might not exist yet */ })
      .finally(() => setLoading(false));
  }, [open, userId]);

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? pages.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
      : pages;
    // Sort: navs first (by sort_order), popups last (by sort_order).
    return [...list].sort((a, b) => {
      if (a.section !== b.section) return a.section === 'nav' ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }, [pages, query]);

  function defaultCanView(path: string): boolean {
    const page = pages.find((p) => p.path === path);
    if (!page) return true;
    if (page.adminOnly && !userIsAdmin) return false;
    if (!isPageAllowedForDepartment(path, userDepartmentId)) return false;
    return true;
  }

  function stateFor(path: string): OverrideState {
    const v = overrides[path];
    if (v === undefined) return 'inherit';
    return v ? 'allow' : 'block';
  }

  async function setOverride(path: string, next: OverrideState) {
    setSavingPath(path);
    try {
      if (next === 'inherit') {
        const res = await db({
          action: 'delete',
          table: 'user_page_permissions',
          match: { user_id: userId, path },
        });
        if (!res || (typeof res === 'object' && 'error' in res)) throw new Error('delete failed');
        setOverrides((prev) => {
          const copy = { ...prev };
          delete copy[path];
          return copy;
        });
      } else {
        const can_view = next === 'allow';
        const res = await db({
          action: 'upsert',
          table: 'user_page_permissions',
          data: [{ user_id: userId, path, can_view, updated_by: user?.id ?? null }],
          onConflict: 'user_id,path',
        });
        if (!res || (typeof res === 'object' && 'error' in res)) throw new Error('upsert failed');
        setOverrides((prev) => ({ ...prev, [path]: can_view }));
      }
      if (user?.id) {
        logActivity({
          userId: user.id,
          type: 'user.page_permission_changed',
          targetKind: 'user',
          targetId: userId,
          targetLabel: userLabel,
          targetPath: '/app/super-admin',
          metadata: { path, state: next },
        });
      }
    } catch {
      // best-effort — leave UI as it was; the next refresh will re-sync
    } finally {
      setSavingPath(null);
    }
  }

  function cycle(path: string) {
    const cur = stateFor(path);
    const next: OverrideState = cur === 'inherit' ? 'allow' : cur === 'allow' ? 'block' : 'inherit';
    setOverride(path, next);
  }

  if (!open) return null;

  const overrideCount = Object.keys(overrides).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit page permissions for ${userLabel}`}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
              Page permissions
            </p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">{userLabel}</h2>
            <p className="text-xs text-foreground/50 mt-1">
              Click a page to cycle <span className="font-medium">Inherit → Allow → Block</span>.
              {' '}Inherit follows the department + admin-only rules; Allow and Block override them.
              {overrideCount > 0 && <> · <span className="font-medium">{overrideCount}</span> override{overrideCount === 1 ? '' : 's'}</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-lg text-foreground/45 hover:bg-warm-bg hover:text-foreground/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-foreground/50">Loading permissions…</div>
          ) : filteredPages.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/50">No pages match.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filteredPages.map((p) => {
                const state = stateFor(p.path);
                const def = defaultCanView(p.path);
                const effective = state === 'allow' ? true : state === 'block' ? false : def;
                const tone =
                  state === 'allow' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : state === 'block' ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : effective
                    ? 'bg-gray-100 text-foreground/65 border-gray-200'
                    : 'bg-gray-50 text-foreground/40 border-gray-100';
                const label =
                  state === 'allow' ? 'Allow'
                  : state === 'block' ? 'Block'
                  : effective ? 'Inherit · visible' : 'Inherit · hidden';
                return (
                  <li key={p.path} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.label}</p>
                      <p className="text-[11px] text-foreground/45 truncate font-mono">{p.path}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cycle(p.path)}
                      disabled={savingPath === p.path}
                      className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors min-w-[110px] justify-center ${tone} ${savingPath === p.path ? 'opacity-50' : 'hover:brightness-95'}`}
                    >
                      {savingPath === p.path ? 'Saving…' : label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
