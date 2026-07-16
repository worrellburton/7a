'use client';

// Home-page page search — replaces the sidebar's "Search pages…" box.
// Glass/glow input (same treatment as the Contacts + New-log search
// fields) with an autocomplete dropdown over every page the viewer can
// actually see (via VisiblePagesContext, so permission rules stay in
// one place). Arrow keys + Enter navigate, Escape clears, click goes.

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GLASS_SEARCH_INPUT, GLASS_SEARCH_WRAP } from './glassSearch';
import { useVisiblePages } from './VisiblePages';
import type { PageConfig } from '@/lib/PagePermissions';

export default function HomePageSearch() {
  const router = useRouter();
  const pages = useVisiblePages();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const starts: PageConfig[] = [];
    const contains: PageConfig[] = [];
    const seen = new Set<string>();
    for (const p of pages) {
      if (seen.has(p.path)) continue;
      seen.add(p.path);
      const label = p.label.toLowerCase();
      if (label.startsWith(q)) starts.push(p);
      else if (label.includes(q) || p.path.toLowerCase().includes(q)) contains.push(p);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [pages, query]);

  const go = (p: PageConfig) => {
    setQuery('');
    setActiveIdx(0);
    inputRef.current?.blur();
    if (p.externalUrl) window.open(p.externalUrl, '_blank', 'noopener,noreferrer');
    else router.push(p.path);
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
          if (e.key === 'Escape') { setQuery(''); setActiveIdx(0); return; }
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); const hit = hits[activeIdx] ?? hits[0]; if (hit) go(hit); }
        }}
        placeholder="Search pages…"
        aria-label="Search pages"
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
          className="absolute z-[70] mt-2 w-full rounded-2xl border border-white/70 bg-white/85 supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_14px_40px_-16px_rgba(160,82,45,0.45)] overflow-hidden divide-y divide-black/5"
        >
          {hits.map((p, i) => (
            <li key={p.path} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                // onMouseDown beats the input's onBlur timer, so the
                // click always lands before the dropdown unmounts.
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIdx ? 'bg-primary/5' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground truncate">{p.label}</span>
                  <span className="block text-[11px] text-foreground/40 truncate">{p.path}</span>
                </span>
                {p.externalUrl && (
                  <svg className="w-3 h-3 shrink-0 text-foreground/35" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3h7v7" /><path d="M21 3l-9 9" /><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5" /></svg>
                )}
                <svg className="w-3 h-3 shrink-0 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
