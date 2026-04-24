'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Admin console for the site-wide redirect table. Each row is a
// single 301/302 rule: from_path (what old URL the user hits) →
// to_path (where they end up). Enabled rows are served by the Next.js
// edge middleware in src/middleware.ts.
//
// Actions per row: edit (inline), toggle enabled, delete (two-step).
// A sticky "Add redirect" form sits above the table, and a bulk-paste
// dialog lets admins drop in a list at once when porting another
// legacy site.

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: boolean;
  notes: string | null;
  hits: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  rows: Redirect[];
  total: number;
}

type DraftState = { from_path: string; to_path: string; status_code: number; notes: string };

const EMPTY_DRAFT: DraftState = { from_path: '', to_path: '', status_code: 301, notes: '' };

function normalisePath(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

export default function RedirectsContent() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyDisabled, setOnlyDisabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seo/redirects', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ListResponse;
      setRows(json.rows ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyDisabled && r.enabled) return false;
      if (!q) return true;
      return (
        r.from_path.toLowerCase().includes(q) ||
        r.to_path.toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyDisabled]);

  const activeCount = rows.filter((r) => r.enabled).length;
  const totalHits = rows.reduce((acc, r) => acc + (r.hits || 0), 0);

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">SEO · Admin</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Redirects
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            301/302 rules served by the edge middleware. Used to keep old WordPress URLs
            alive as the site is rebuilt — add a row and any request matching the
            <code className="mx-1 px-1 py-0.5 rounded bg-warm-bg/60 text-[12px]">From</code>
            path is redirected to the <code className="mx-1 px-1 py-0.5 rounded bg-warm-bg/60 text-[12px]">To</code> URL.
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            {activeCount} active of {rows.length} · {totalHits.toLocaleString()} total hits ·{' '}
            <Link href="/app/seo" className="text-primary underline decoration-dotted">Back to SEO</Link>
          </p>
        </div>
      </header>

      <AddRedirectForm onAdded={load} />

      <BulkImport onImported={load} />

      <div className="my-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by from, to, or note…"
          className="text-sm rounded-md border border-black/10 bg-white px-3 py-2 w-80 max-w-full"
        />
        <label className="inline-flex items-center gap-2 text-xs text-foreground/70">
          <input type="checkbox" checked={onlyDisabled} onChange={(e) => setOnlyDisabled(e.target.checked)} />
          Only show disabled
        </label>
      </div>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-foreground/50">No redirects yet. Add one above.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-black/10 rounded-xl bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-warm-bg/60 text-left text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Code</Th>
                <Th>Hits</Th>
                <Th>Notes</Th>
                <Th>Enabled</Th>
                <Th className="text-right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((r) => (
                <RedirectRow key={r.id} row={r} onChange={load} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-foreground/50">
                    No rows match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------- Add form ----------------------------------------------------

function AddRedirectForm({ onAdded }: { onAdded: () => void }) {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const from_path = normalisePath(draft.from_path);
    const to_path = normalisePath(draft.to_path);
    if (!from_path || !to_path) {
      setError('Both paths are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/seo/redirects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from_path, to_path, status_code: draft.status_code, notes: draft.notes || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setDraft(EMPTY_DRAFT);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-black/10 bg-white p-4 flex flex-wrap items-end gap-3">
      <Field label="From (old path)" hint="/old-url/">
        <input
          type="text"
          value={draft.from_path}
          onChange={(e) => setDraft((d) => ({ ...d, from_path: e.target.value }))}
          placeholder="/old-url/"
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
        />
      </Field>
      <Field label="To (new path or URL)" hint="/new-path">
        <input
          type="text"
          value={draft.to_path}
          onChange={(e) => setDraft((d) => ({ ...d, to_path: e.target.value }))}
          placeholder="/new-path"
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Code" hint="Usually 301">
        <select
          value={draft.status_code}
          onChange={(e) => setDraft((d) => ({ ...d, status_code: Number(e.target.value) }))}
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
        >
          <option value={301}>301 (permanent)</option>
          <option value={302}>302 (temporary)</option>
          <option value={307}>307 (temporary, preserve method)</option>
          <option value={308}>308 (permanent, preserve method)</option>
        </select>
      </Field>
      <Field label="Notes (optional)" hint="Why this exists">
        <input
          type="text"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder="Context / source of rule"
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? 'Adding…' : 'Add redirect'}
      </button>
      {error && <p className="text-xs text-red-600 w-full">Error: {error}</p>}
    </form>
  );
}

// ------------- Bulk import -------------------------------------------------

function BulkImport({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState(301);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/seo/redirects/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, status_code: status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
      if (json.inserted > 0) onImported();
    } catch (err) {
      setResult({ inserted: 0, skipped: 0, errors: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-primary underline decoration-dotted"
      >
        {open ? '− Hide bulk import' : '+ Bulk import (paste list)'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-black/10 bg-white p-4 space-y-3">
          <p className="text-xs text-foreground/60">
            Paste one redirect per line. Separator can be tab, comma, or whitespace. Blank lines and
            lines starting with <code>#</code> are ignored. Example:
          </p>
          <pre className="text-[11px] text-foreground/70 bg-warm-bg/40 rounded px-3 py-2 overflow-x-auto">
{`/old-path/         /new-path
/another-old,    /somewhere-else`}
          </pre>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-mono"
            placeholder="/old-url/  /new-url"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-foreground/60">
              Default code:{' '}
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs"
              >
                <option value={301}>301</option>
                <option value={302}>302</option>
                <option value={307}>307</option>
                <option value={308}>308</option>
              </select>
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !text.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
          {result && (
            <div className="text-xs">
              <p className="text-emerald-700">
                Inserted: <strong>{result.inserted}</strong> · Skipped (duplicate / invalid):{' '}
                <strong>{result.skipped}</strong>
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 text-red-700 list-disc list-inside">
                  {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 10 && <li>+ {result.errors.length - 10} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------- Row ---------------------------------------------------------

function RedirectRow({ row, onChange }: { row: Redirect; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    from_path: row.from_path,
    to_path: row.to_path,
    status_code: row.status_code,
    notes: row.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setDraft({ from_path: row.from_path, to_path: row.to_path, status_code: row.status_code, notes: row.notes ?? '' });
  }, [row.id, row.from_path, row.to_path, row.status_code, row.notes]);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/seo/redirects/${row.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from_path: normalisePath(draft.from_path),
          to_path: normalisePath(draft.to_path),
          status_code: draft.status_code,
          notes: draft.notes || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(false);
      onChange();
    } catch (err) {
      console.error('save failed', err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled() {
    setBusy(true);
    try {
      const res = await fetch(`/api/seo/redirects/${row.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/seo/redirects/${row.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  const dim = !row.enabled ? 'opacity-50' : '';

  return (
    <tr className={`align-top ${dim}`}>
      <Td>
        {editing ? (
          <input
            type="text"
            value={draft.from_path}
            onChange={(e) => setDraft((d) => ({ ...d, from_path: e.target.value }))}
            className="w-full rounded border border-black/15 px-2 py-1 text-xs font-mono"
          />
        ) : (
          <code className="text-[12px] text-foreground/85 break-all">{row.from_path}</code>
        )}
      </Td>
      <Td>
        {editing ? (
          <input
            type="text"
            value={draft.to_path}
            onChange={(e) => setDraft((d) => ({ ...d, to_path: e.target.value }))}
            className="w-full rounded border border-black/15 px-2 py-1 text-xs font-mono"
          />
        ) : (
          <code className="text-[12px] text-foreground/85 break-all">{row.to_path}</code>
        )}
      </Td>
      <Td>
        {editing ? (
          <select
            value={draft.status_code}
            onChange={(e) => setDraft((d) => ({ ...d, status_code: Number(e.target.value) }))}
            className="rounded border border-black/15 px-1.5 py-0.5 text-xs"
          >
            <option value={301}>301</option>
            <option value={302}>302</option>
            <option value={307}>307</option>
            <option value={308}>308</option>
          </select>
        ) : (
          <span className="text-xs font-semibold text-foreground/80">{row.status_code}</span>
        )}
      </Td>
      <Td>
        <span className="text-xs tabular-nums text-foreground/70">{row.hits.toLocaleString()}</span>
        {row.last_hit_at && (
          <p className="text-[10px] text-foreground/40">
            {new Date(row.last_hit_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </Td>
      <Td>
        {editing ? (
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            className="w-full rounded border border-black/15 px-2 py-1 text-xs"
          />
        ) : (
          <span className="text-xs text-foreground/70 line-clamp-2 max-w-[260px]">{row.notes ?? <span className="text-foreground/40">—</span>}</span>
        )}
      </Td>
      <Td>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={busy}
          aria-pressed={row.enabled}
          className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
            row.enabled ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              row.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </Td>
      <Td className="text-right">
        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
          {editing ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={busy}
                className="text-[10px] text-foreground/50 underline decoration-dotted hover:text-foreground"
              >
                cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-medium text-foreground/70 hover:text-primary hover:border-primary/40"
            >
              Edit
            </button>
          )}
          {armed ? (
            <>
              <button
                type="button"
                onClick={() => { setArmed(false); void doDelete(); }}
                disabled={busy}
                className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="text-[10px] text-foreground/50 underline decoration-dotted hover:text-foreground"
              >
                cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setArmed(true)}
              title="Delete redirect"
              aria-label="Delete redirect"
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-black/10 bg-white text-foreground/55 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

// ------------- Table helpers ----------------------------------------------

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-semibold border-b border-black/10 ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-[180px] flex-1">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-foreground/55">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-foreground/40">{hint}</span>}
    </label>
  );
}
