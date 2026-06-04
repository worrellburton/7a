'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

// Global cmd+K / ctrl+K command palette. Searches across contacts /
// blogs / alumni / calls / directories / people / roadmap with one
// debounced fetch and routes to the matching record on Enter.
//
// Mounted once in PlatformShell — listens for the keyboard shortcut
// globally, takes over Escape to close, and traps Tab navigation
// while open. No portals or stacking surprises: it renders into
// document.body via createPortal so a parent's overflow:hidden can
// never clip it.

interface SearchResult {
  id: string;
  surface: string;
  label: string;
  sub?: string | null;
  href: string;
}

export default function CommandPalette() {
  const { session, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Global keyboard shortcut. cmd+K on mac, ctrl+K elsewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus the input on every open.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    setQ('');
    setResults([]);
    setSelectedIdx(0);
  }, [open]);

  // Debounced search. Cancels in-flight when the query changes.
  useEffect(() => {
    if (!open || !session?.access_token) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (controller.signal.aborted) return;
        setResults((json.results ?? []) as SearchResult[]);
        setSelectedIdx(0);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { controller.abort(); clearTimeout(t); };
  }, [q, open, session?.access_token]);

  const choose = useCallback((r: SearchResult) => {
    setOpen(false);
    router.push(r.href);
  }, [router]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      choose(results[selectedIdx]);
    }
  }

  if (!mounted || !user) return null;
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={() => setOpen(false)}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5">
          <svg className="w-4 h-4 text-foreground/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search contacts, blogs, alumni, calls…"
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-foreground/40 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-bold tracking-wider text-foreground/40 border border-black/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && q.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-foreground/50 italic">Searching…</p>
          )}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-foreground/50 italic">No matches.</p>
          )}
          {q.trim().length < 2 && (
            <p className="px-4 py-6 text-[13px] text-foreground/45 italic">Type at least 2 characters to search.</p>
          )}
          <ul>
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={() => choose(r)}
                  className={`w-full text-left px-4 py-2.5 flex items-baseline gap-3 transition-colors ${
                    i === selectedIdx ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/40'
                  }`}
                >
                  <span className="shrink-0 inline-flex items-center text-[9.5px] font-bold uppercase tracking-wider text-primary/85 bg-primary/8 border border-primary/15 rounded px-1.5 py-0.5">
                    {r.surface}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-foreground truncate">{r.label}</span>
                    {r.sub && <span className="block text-[11.5px] text-foreground/55 truncate">{r.sub}</span>}
                  </span>
                  {i === selectedIdx && (
                    <span aria-hidden className="shrink-0 text-[10px] font-bold text-foreground/40">↵</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 py-2 border-t border-black/5 bg-warm-bg/30 text-[10.5px] text-foreground/45 flex items-center gap-3">
          <span><kbd className="font-bold">↑↓</kbd> navigate</span>
          <span><kbd className="font-bold">↵</kbd> open</span>
          <span className="ml-auto"><kbd className="font-bold">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
