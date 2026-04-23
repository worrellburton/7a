'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface GoogleRow {
  id: string;
  place_id: string;
  author_name: string;
  profile_photo_url: string | null;
  rating: number;
  relative_time: string | null;
  text: string | null;
  review_time: string;
  featured: boolean;
  hidden: boolean;
  display_order: number | null;
  fetched_at: string;
}

interface CuratedRow {
  id: string;
  author_name: string;
  attribution: string | null;
  rating: number;
  text: string;
  featured: boolean;
  hidden: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

interface Counts {
  google_total: number;
  google_hidden: number;
  google_featured: number;
  curated_total: number;
  curated_hidden: number;
  curated_featured: number;
}

type SourceFilter = 'all' | 'google' | 'curated';
type StatusFilter = 'all' | 'visible' | 'hidden' | 'featured';

interface UnifiedRow {
  id: string;
  source: 'google' | 'curated';
  authorName: string;
  rating: number;
  text: string;
  byline: string;
  featured: boolean;
  hidden: boolean;
  displayOrder: number | null;
  // raw timestamp for sorting
  ts: number;
}

function rowsFromGoogle(g: GoogleRow): UnifiedRow {
  return {
    id: g.id,
    source: 'google',
    authorName: g.author_name,
    rating: g.rating,
    text: g.text ?? '',
    byline: g.relative_time ?? new Date(g.review_time).toLocaleDateString(),
    featured: g.featured,
    hidden: g.hidden,
    displayOrder: g.display_order,
    ts: new Date(g.review_time).getTime(),
  };
}

function rowsFromCurated(c: CuratedRow): UnifiedRow {
  return {
    id: c.id,
    source: 'curated',
    authorName: c.author_name,
    rating: c.rating,
    text: c.text,
    byline: c.attribution ?? 'Curated',
    featured: c.featured,
    hidden: c.hidden,
    displayOrder: c.display_order,
    ts: new Date(c.created_at).getTime(),
  };
}

export default function ReviewsContent() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleRow[]>([]);
  const [curated, setCurated] = useState<CuratedRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  // null = closed, 'new' = create curated, otherwise the row being edited.
  const [editing, setEditing] = useState<UnifiedRow | 'new' | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/reviews', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setGoogle(data.google ?? []);
        setCurated(data.curated ?? []);
        setCounts(data.counts ?? null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin, refreshTick]);

  function refresh() { setRefreshTick((n) => n + 1); }

  const rows: UnifiedRow[] = useMemo(() => {
    const all: UnifiedRow[] = [
      ...google.map(rowsFromGoogle),
      ...curated.map(rowsFromCurated),
    ];
    return all
      .filter((r) => sourceFilter === 'all' || r.source === sourceFilter)
      .filter((r) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'visible') return !r.hidden;
        if (statusFilter === 'hidden') return r.hidden;
        if (statusFilter === 'featured') return r.featured;
        return true;
      })
      .filter((r) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return r.authorName.toLowerCase().includes(s) || r.text.toLowerCase().includes(s);
      })
      .sort((a, b) => {
        // featured first, then by displayOrder asc, then by ts desc
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return b.ts - a.ts;
      });
  }, [google, curated, sourceFilter, statusFilter, search]);

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Reviews
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Curate the alumni and Google reviews shown across the marketing site.
        </p>
        {counts && (
          <p className="mt-2 text-xs text-foreground/50">
            {counts.google_total} Google · {counts.curated_total} curated · {counts.google_hidden + counts.curated_hidden} hidden · {counts.google_featured + counts.curated_featured} featured
          </p>
        )}
      </header>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <FilterChips
          label="Source"
          value={sourceFilter}
          onChange={(v) => setSourceFilter(v as SourceFilter)}
          options={[
            { v: 'all', l: 'All' },
            { v: 'google', l: 'Google' },
            { v: 'curated', l: 'Curated' },
          ]}
        />
        <FilterChips
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { v: 'all', l: 'All' },
            { v: 'visible', l: 'Visible' },
            { v: 'hidden', l: 'Hidden' },
            { v: 'featured', l: 'Featured' },
          ]}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search author or text…"
          className="ml-auto px-3 py-1.5 text-sm rounded-md border border-black/10 bg-white focus:outline-none focus:border-primary/50"
        />
        {/* Real-reviews-only policy: no + New button. Curated rows
            stay in the DB (hidden) and are not creatable from the UI. */}
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        Real-reviews-only policy is active. Only Google reviews render on the public site. The 14 curated rows below are kept hidden for history; new curated reviews can't be created from this UI.
      </div>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-foreground/50">No reviews match the current filters.</p>
      )}

      <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
        {rows.map((r, idx) => (
          <ReviewRow
            key={`${r.source}-${r.id}`}
            row={r}
            isFirst={idx === 0}
            isLast={idx === rows.length - 1}
            onClick={() => setEditing(r)}
            onMove={async (direction) => {
              const partner = direction === 'up' ? rows[idx - 1] : rows[idx + 1];
              if (!partner) return;
              // Resolve effective orders. If null, fall back to current
              // sorted index so we never write a null-vs-null swap that
              // produces no visible change.
              const meOrder = r.displayOrder ?? idx + 1;
              const themOrder = partner.displayOrder ?? (direction === 'up' ? idx : idx + 2);
              try {
                await Promise.all([
                  fetch(`/api/reviews/${r.id}?source=${r.source}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: themOrder }),
                  }),
                  fetch(`/api/reviews/${partner.id}?source=${partner.source}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: meOrder }),
                  }),
                ]);
                refresh();
              } catch (e) {
                alert(`Move failed: ${e instanceof Error ? e.message : String(e)}`);
              }
            }}
            onToggleFlag={async (flag, value) => {
              try {
                const res = await fetch(`/api/reviews/${r.id}?source=${r.source}`, {
                  method: 'PATCH',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [flag]: value }),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  alert(`Toggle failed: ${body.error || res.status}`);
                  return;
                }
                refresh();
              } catch (e) {
                alert(`Toggle failed: ${e instanceof Error ? e.message : String(e)}`);
              }
            }}
          />
        ))}
      </ul>

      {editing && (
        <EditDrawer
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function FilterChips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-foreground/50 mr-1">{label}:</span>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            value === o.v
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-foreground/70 border-black/10 hover:border-primary/40 hover:text-primary'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ReviewRow({
  row,
  isFirst,
  isLast,
  onClick,
  onMove,
  onToggleFlag,
}: {
  row: UnifiedRow;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onToggleFlag: (flag: 'featured' | 'hidden', value: boolean) => void;
}) {
  const stars = '★'.repeat(row.rating) + '☆'.repeat(5 - row.rating);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <li
      className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-warm-bg/50 transition-colors ${row.hidden ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{row.authorName}</span>
          <span className="text-yellow-500 text-xs tracking-tight">{stars}</span>
          <span className="text-xs text-foreground/40">· {row.byline}</span>
        </div>
        <p className="mt-1 text-sm text-foreground/75 line-clamp-2">{row.text}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone={row.source === 'google' ? 'blue' : 'amber'}>{row.source}</Badge>
          {row.featured && <Badge tone="green">Featured</Badge>}
          {row.hidden && <Badge tone="gray">Hidden</Badge>}
          {row.displayOrder !== null && <Badge tone="gray">Order #{row.displayOrder}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={stop}>
        <button
          type="button"
          onClick={() => onMove('up')}
          disabled={isFirst}
          title="Move up"
          aria-label="Move up"
          className="w-7 h-7 inline-flex items-center justify-center rounded border border-black/10 bg-white text-foreground/40 hover:text-foreground hover:border-foreground/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove('down')}
          disabled={isLast}
          title="Move down"
          aria-label="Move down"
          className="w-7 h-7 inline-flex items-center justify-center rounded border border-black/10 bg-white text-foreground/40 hover:text-foreground hover:border-foreground/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ↓
        </button>
        <QuickToggle
          on={row.featured}
          onClick={() => onToggleFlag('featured', !row.featured)}
          title={row.featured ? 'Unfeature' : 'Feature'}
          label={row.featured ? '★' : '☆'}
          tone="amber"
        />
        <QuickToggle
          on={row.hidden}
          onClick={() => onToggleFlag('hidden', !row.hidden)}
          title={row.hidden ? 'Unhide' : 'Hide'}
          label={row.hidden ? '⊘' : '👁'}
          tone="gray"
        />
      </div>
    </li>
  );
}

function QuickToggle({
  on,
  onClick,
  title,
  label,
  tone,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  label: string;
  tone: 'amber' | 'gray';
}) {
  const onCls = tone === 'amber'
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-gray-200 text-gray-700 border-gray-300';
  const offCls = 'bg-white text-foreground/40 border-black/10 hover:border-foreground/30 hover:text-foreground/70';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-7 h-7 inline-flex items-center justify-center rounded border text-sm transition-colors ${on ? onCls : offCls}`}
    >
      {label}
    </button>
  );
}

interface DrawerForm {
  author_name: string;
  attribution: string;
  rating: number;
  text: string;
  featured: boolean;
  hidden: boolean;
  display_order: string; // string in form, parsed on save
}

function EditDrawer({
  target,
  onClose,
  onSaved,
}: {
  target: UnifiedRow | 'new';
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === 'new';
  const isGoogle = !isNew && target.source === 'google';

  const [form, setForm] = useState<DrawerForm>(() => {
    if (isNew) {
      return { author_name: '', attribution: '', rating: 5, text: '', featured: false, hidden: false, display_order: '' };
    }
    return {
      author_name: target.authorName,
      attribution: target.source === 'curated' ? target.byline : '',
      rating: target.rating,
      text: target.text,
      featured: target.featured,
      hidden: target.hidden,
      display_order: target.displayOrder !== null ? String(target.displayOrder) : '',
    };
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const display_order = form.display_order.trim() === '' ? null : Number(form.display_order);
      if (display_order !== null && !Number.isFinite(display_order)) {
        throw new Error('display_order must be a number or empty');
      }
      if (isNew) {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author_name: form.author_name,
            attribution: form.attribution || null,
            rating: form.rating,
            text: form.text,
            featured: form.featured,
            hidden: form.hidden,
            display_order,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      } else {
        const source = (target as UnifiedRow).source;
        const id = (target as UnifiedRow).id;
        const body: Record<string, unknown> = {
          featured: form.featured,
          hidden: form.hidden,
          display_order,
        };
        if (source === 'curated') {
          body.author_name = form.author_name;
          body.attribution = form.attribution || null;
          body.text = form.text;
          body.rating = form.rating;
        }
        const res = await fetch(`/api/reviews/${id}?source=${source}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow() {
    if (isNew || target.source !== 'curated') return;
    if (!confirm('Delete this curated review? This is permanent.')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/reviews/${target.id}?source=curated`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div
        className="w-full max-w-md bg-white shadow-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {isNew ? 'New curated review' : isGoogle ? 'Google review' : 'Curated review'}
          </h2>
          <button type="button" onClick={onClose} className="text-foreground/50 hover:text-foreground text-xl leading-none">×</button>
        </div>

        {isGoogle && (
          <p className="mb-4 text-xs text-foreground/50 bg-warm-bg/50 p-2 rounded">
            Google reviews are read-only — only the curation flags below are editable. To remove from display, use Hide (deletion would be undone by the next sync).
          </p>
        )}

        <div className="space-y-3 text-sm">
          <Field label="Author">
            <input
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              disabled={isGoogle}
              className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            />
          </Field>

          <Field label={isGoogle ? 'Relative time' : 'Attribution'}>
            <input
              value={form.attribution}
              onChange={(e) => setForm({ ...form, attribution: e.target.value })}
              disabled={isGoogle}
              placeholder={isGoogle ? '' : 'e.g. Alumnus · 8 months sober'}
              className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            />
          </Field>

          <Field label="Rating">
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              disabled={isGoogle}
              className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>)}
            </select>
          </Field>

          <Field label="Text">
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              disabled={isGoogle}
              rows={6}
              className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-white disabled:bg-gray-50 disabled:text-gray-500 resize-y"
            />
          </Field>

          <Field label="Display order (lower = earlier)">
            <input
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })}
              placeholder="empty = unordered"
              className="w-full px-3 py-1.5 rounded-md border border-black/10 bg-white"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              <span>Featured (always sorted first)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} />
              <span>Hidden (not rendered on the public site)</span>
            </label>
          </div>

          {err && <p className="text-sm text-red-600">Error: {err}</p>}

          <div className="flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
            {!isNew && target.source === 'curated' && (
              <button
                type="button"
                onClick={deleteRow}
                disabled={busy}
                className="px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs text-foreground/60">{label}</span>
      {children}
    </label>
  );
}

function Badge({ tone, children }: { tone: 'blue' | 'amber' | 'green' | 'gray'; children: React.ReactNode }) {
  const map = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  } as const;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${map[tone]}`}>
      {children}
    </span>
  );
}
