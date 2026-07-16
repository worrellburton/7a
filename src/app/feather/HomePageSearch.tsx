'use client';

// Home-page global search — searches EVERYTHING the viewer is allowed
// to reach: pages (via VisiblePagesContext, the shell's own permission
// filtering) plus records from /api/search (contacts, blogs, alumni,
// calls, directories, people, roadmap), which the server trims to the
// surfaces whose pages this user can actually see. Glass/glow input;
// arrow keys + Enter navigate, Escape clears, click goes. `dropUp`
// opens the suggestion list above the input (it sits at the bottom of
// the home page).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GLASS_SEARCH_INPUT, GLASS_SEARCH_WRAP } from './glassSearch';
import { useVisiblePages } from './VisiblePages';

interface SearchRow {
  key: string;
  surface: string;
  label: string;
  sub?: string | null;
  href: string;
  external?: boolean;
}

interface ApiResult {
  id: string;
  surface: string;
  label: string;
  sub?: string | null;
  href: string;
}

export default function HomePageSearch({ dropUp = false }: { dropUp?: boolean }) {
  const router = useRouter();
  const pages = useVisiblePages();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [apiRows, setApiRows] = useState<ApiResult[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounced record search — the server only returns rows from
  // surfaces whose pages this user can see.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setApiRows([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { credentials: 'include', signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { results?: ApiResult[] } | null) => { if (json?.results) setApiRows(json.results); })
        .catch(() => { /* aborted / offline — page hits still render */ });
    }, 220);
    return () => { ctrl.abort(); window.clearTimeout(t); };
  }, [query]);

  const hits = useMemo<SearchRow[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const starts: SearchRow[] = [];
    const contains: SearchRow[] = [];
    const seen = new Set<string>();
    for (const p of pages) {
      if (seen.has(p.path)) continue;
      seen.add(p.path);
      const row: SearchRow = {
        key: `page:${p.path}`,
        surface: 'Pages',
        label: p.label,
        sub: p.path,
        href: p.externalUrl ?? p.path,
        external: Boolean(p.externalUrl),
      };
      const label = p.label.toLowerCase();
      if (label.startsWith(q)) starts.push(row);
      else if (label.includes(q) || p.path.toLowerCase().includes(q)) contains.push(row);
    }
    const pageRows = [...starts, ...contains].slice(0, 5);
    const recordRows: SearchRow[] = apiRows.slice(0, 12).map((r) => ({
      key: r.id,
      surface: r.surface,
      label: r.label,
      sub: r.sub,
      href: r.href,
    }));
    return [...pageRows, ...recordRows];
  }, [pages, query, apiRows]);

  const go = (row: SearchRow) => {
    setQuery('');
    setApiRows([]);
    setActiveIdx(0);
    inputRef.current?.blur();
    if (row.external) window.open(row.href, '_blank', 'noopener,noreferrer');
    else router.push(row.href);
  };

  const open = focused && hits.length > 0;

  return (
    <div className={`${GLASS_SEARCH_WRAP} w-full max-w-xl`}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors">
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setQuery(''); setApiRows([]); setActiveIdx(0); return; }
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); const hit = hits[activeIdx] ?? hits[0]; if (hit) go(hit); }
        }}
        placeholder="Search everything…"
        aria-label="Search everything"
        aria-expanded={open}
        role="combobox"
        aria-controls="home-page-search-list"
        autoComplete="off"
        spellCheck={false}
        className={`${GLASS_SEARCH_INPUT} pl-11 pr-4 py-2.5`}
        style={{ fontFamily: 'var(--font-body)' }}
      />
      {open && (
        <ul
          id="home-page-search-list"
          role="listbox"
          className={`absolute z-[70] w-full max-h-[50vh] overflow-y-auto rounded-2xl border border-white/70 bg-white/85 supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_14px_40px_-16px_rgba(160,82,45,0.45)] divide-y divide-black/5 ${dropUp ? 'bottom-full mb-2' : 'mt-2'}`}
        >
          {hits.map((row, i) => (
            <li key={row.key} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                // onMouseDown beats the input's onBlur timer, so the
                // click always lands before the dropdown unmounts.
                onMouseDown={(e) => { e.preventDefault(); go(row); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIdx ? 'bg-primary/5' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground truncate">{row.label}</span>
                  {row.sub && <span className="block text-[11px] text-foreground/40 truncate">{row.sub}</span>}
                </span>
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/35 bg-foreground/[0.05] rounded-md px-1.5 py-0.5">
                  {row.surface}
                </span>
                {row.external && (
                  <svg className="w-3 h-3 shrink-0 text-foreground/35" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3h7v7" /><path d="M21 3l-9 9" /><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5" /></svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
