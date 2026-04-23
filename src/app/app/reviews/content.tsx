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
  }, [user, isAdmin]);

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
      </div>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-foreground/50">No reviews match the current filters.</p>
      )}

      <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
        {rows.map((r) => <ReviewRow key={`${r.source}-${r.id}`} row={r} />)}
      </ul>
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

function ReviewRow({ row }: { row: UnifiedRow }) {
  const stars = '★'.repeat(row.rating) + '☆'.repeat(5 - row.rating);
  return (
    <li className={`px-4 py-3 flex items-start gap-3 ${row.hidden ? 'opacity-50' : ''}`}>
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
    </li>
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
