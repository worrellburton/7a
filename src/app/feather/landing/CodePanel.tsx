'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fileLabel, GROUP_ORDER, LANDING_ROUTE } from '@/lib/editable-pages';
import SpaceBackground from './SpaceBackground';

// Landing → Code tab. The admin describes a change to the public
// landing page (optionally pasting screenshots); the server has Claude
// propose surgical source edits, opens a PR for review, and records it
// so this panel can show a history + offer a one-click revert. Themed
// as a "space console" — deliberately unlike the rest of Feather.

interface CodeResult {
  ok: true;
  summary: string;
  prUrl: string;
  prNumber: number;
  branch: string;
  changedFiles: string[];
  deployed?: boolean;
  deployNote?: string | null;
}
interface HistoryItem {
  id: string;
  pr_number: number;
  pr_url: string;
  title: string;
  summary: string | null;
  changed_files: string[];
  requested_by_name: string | null;
  requested_by_email: string | null;
  reverts_pr_number: number | null;
  created_at: string;
  status: 'open' | 'closed' | 'merged' | null;
}
interface PastedImage { id: string; media_type: string; data: string; preview: string }
interface SitePageLite { key: string; route: string; label: string; group: string }

const COOKING_LINES = [
  'Reading the landing page…',
  'Stirring the components…',
  'Whisking up some JSX…',
  'Letting the edits simmer…',
  'Plating the pull request…',
];

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Downscale a pasted/dropped image to keep the request small (and under
// Vercel's body limit) — max 1600px on the long edge, re-encoded JPEG.
function fileToImage(file: File): Promise<PastedImage | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cw = Math.round(img.width * scale);
        const ch = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const cx = c.getContext('2d');
        if (!cx) return resolve(null);
        cx.drawImage(img, 0, 0, cw, ch);
        const url = c.toDataURL('image/jpeg', 0.85);
        resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, media_type: 'image/jpeg', data: url.split(',')[1], preview: url });
      };
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function LandingCodePanel({ token }: { token: string | null }) {
  const [instruction, setInstruction] = useState('');
  const [images, setImages] = useState<PastedImage[]>([]);
  // Selected page keys (the sitemap). Landing is pre-selected once the
  // sitemap loads (and immediately so a submit before load still targets it).
  const [pages, setPages] = useState<Set<string>>(new Set([LANDING_ROUTE]));
  const [sitePages, setSitePages] = useState<SitePageLite[]>([]);
  const [showScope, setShowScope] = useState(false);
  const [pageQuery, setPageQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [cookIdx, setCookIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CodeResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = useCallback(
    (): HeadersInit => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/landing/code', { headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.items)) setHistory(json.items as HistoryItem[]);
    } catch { /* history is non-critical */ }
  }, [authHeaders]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  // Load the sitemap of editable public pages once.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/landing/code/sitemap', { headers: authHeaders() });
        const json = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(json.pages)) setSitePages(json.pages as SitePageLite[]);
      } catch { /* sitemap is non-critical — defaults to landing */ }
    })();
  }, [authHeaders]);

  // Universe mode: theme the whole Feather shell (rail + top bar) dark
  // while the Code tab is open, so the space backdrop isn't cut off at
  // the content edge. Cleared on unmount / tab switch.
  useEffect(() => {
    document.body.classList.add('universe-mode');
    return () => document.body.classList.remove('universe-mode');
  }, []);

  const groupedPages = useMemo(() => {
    const q = pageQuery.trim().toLowerCase();
    const filtered = q ? sitePages.filter((p) => p.label.toLowerCase().includes(q) || p.route.toLowerCase().includes(q)) : sitePages;
    const byGroup = new Map<string, SitePageLite[]>();
    for (const p of filtered) {
      const arr = byGroup.get(p.group) ?? [];
      arr.push(p);
      byGroup.set(p.group, arr);
    }
    return [...byGroup.entries()].sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));
  }, [sitePages, pageQuery]);

  const pageSummary = pages.size === 0
    ? 'Landing (default)'
    : pages.size === 1
      ? (sitePages.find((p) => pages.has(p.key))?.label ?? ([...pages][0] === LANDING_ROUTE ? 'Landing' : [...pages][0]))
      : `${pages.size} pages`;

  // Cycle the cooking lines while a request is in flight.
  useEffect(() => {
    if (!busy) return;
    setCookIdx(0);
    const t = setInterval(() => setCookIdx((i) => (i + 1) % COOKING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [busy]);

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const processed = (await Promise.all(incoming.map(fileToImage))).filter((x): x is PastedImage => !!x);
    if (processed.length) setImages((prev) => [...prev, ...processed].slice(0, 6));
  }

  function togglePage(key: string) {
    setPages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function submit() {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/landing/code', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          instruction: text,
          pages: pages.size > 0 ? [...pages] : undefined,
          images: images.map((im) => ({ media_type: im.media_type, data: im.data })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
      setResult(json as CodeResult);
      setInstruction(''); setImages([]);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revert(item: HistoryItem) {
    if (revertingId) return;
    if (!window.confirm(`Open a PR that reverts "${item.title}"?`)) return;
    setRevertingId(item.id); setError(null);
    try {
      const res = await fetch('/api/landing/code/revert', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ id: item.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `Revert failed (${res.status})`);
      setResult({ ok: true, summary: json.deployed ? `Reverted "${item.title}".` : `Revert PR opened for "${item.title}".`, prUrl: json.prUrl, prNumber: json.prNumber, branch: json.branch, changedFiles: [], deployed: json.deployed, deployNote: json.deployNote });
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <div className="lc-root relative -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-10 lg:-mb-10 mt-2 min-h-[calc(100vh-150px)] overflow-hidden bg-[#070815]">
      <SpaceBackground className="absolute inset-0 z-0" />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-[#070815]" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-8">
        <header className="lc-in mb-6" style={{ animationDelay: '40ms' }}>
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300/70 mb-1">Marketing &amp; Admissions · Mission Control</p>
          <h1 className="text-3xl font-bold text-white inline-flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="lc-rocket">🚀</span> Landing &middot; Code
          </h1>
          <p className="mt-1.5 text-sm text-white/65 max-w-2xl">
            Describe a change to the public landing page in plain English &mdash; paste screenshots if it helps.
            Claude rewrites the page&rsquo;s code, then <strong className="text-white/90">merges &amp; deploys</strong> it
            automatically. Every change is logged below, and you can revert any of them in one click.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── Composer ─────────────────────────────────────── */}
          <section className="lc-in lc-glass lg:col-span-3 rounded-2xl p-5" style={{ animationDelay: '120ms' }}>
            <label htmlFor="lc-instruction" className="block text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold mb-2">
              What should change?
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files); }}
              className={`rounded-xl transition-shadow ${dragOver ? 'ring-2 ring-sky-400/70' : ''}`}
            >
              <textarea
                id="lc-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onPaste={(e) => {
                  const imgs = Array.from(e.clipboardData?.items ?? []).filter((it) => it.type.startsWith('image/'));
                  if (imgs.length) {
                    e.preventDefault();
                    void addFiles(imgs.map((it) => it.getAsFile()).filter((f): f is File => !!f));
                  }
                }}
                rows={6}
                placeholder={'e.g. "Make the hero headline punchier and shorten the subhead." — or paste a screenshot and say what to change.'}
                className={`lc-input w-full rounded-xl px-3.5 py-3 text-[14px] leading-relaxed resize-y focus:outline-none ${instruction.trim() ? 'has-text' : ''}`}
              />
            </div>

            {/* Screenshot thumbnails */}
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((im) => (
                  <div key={im.id} className="lc-thumb relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.preview} alt="screenshot" className="h-16 w-16 object-cover rounded-lg border border-white/25" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((x) => x.id !== im.id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-[11px] border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove screenshot"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[11.5px] font-semibold text-sky-300/80 hover:text-sky-200 transition-colors inline-flex items-center gap-1.5">
                <span>🖼️</span> Add / paste screenshot
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }} />
              <button type="button" onClick={() => setShowScope((v) => !v)} className="text-[11.5px] font-semibold text-white/55 hover:text-white/85 transition-colors">
                {showScope ? '▾' : '▸'} Page: <span className="text-sky-300/85">{pageSummary}</span>
              </button>
            </div>

            {showScope && (
              <div className="lc-in mt-2 rounded-xl border border-white/12 bg-white/[0.04] p-3">
                <input
                  value={pageQuery}
                  onChange={(e) => setPageQuery(e.target.value)}
                  placeholder="Search pages…"
                  className="w-full mb-2 rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                />
                <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5">
                  {sitePages.length === 0 ? (
                    <p className="text-[11px] text-white/45">Sitemap unavailable — defaulting to the Landing page.</p>
                  ) : groupedPages.map(([group, list]) => (
                    <div key={group}>
                      <p className="text-[9.5px] uppercase tracking-[0.18em] text-sky-300/60 font-bold mb-1">{group}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {list.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-[12px] text-white/75 rounded-md px-2 py-1 hover:bg-white/5 cursor-pointer">
                            <input type="checkbox" checked={pages.has(p.key)} onChange={() => togglePage(p.key)} className="accent-sky-400" />
                            <span className="truncate" title={p.route}>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/40 mt-2">Pick one or more pages to edit. Landing is selected by default.</p>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={submit}
                disabled={busy || !instruction.trim()}
                className="lc-launch relative px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {busy ? <><span className="lc-cook">🍳</span> Cooking…</> : <><span>🚀</span> Launch &amp; deploy</>}
              </button>
              {busy ? (
                <span className="lc-fade text-[12px] text-sky-200/80">{COOKING_LINES[cookIdx]}</span>
              ) : (
                <span className="text-[11px] text-white/45">Merges + deploys automatically — revert anytime.</span>
              )}
            </div>

            {error && <div className="lc-in mt-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-[12.5px] text-rose-100">{error}</div>}

            {result && (
              <div className="lc-in mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3">
                <p className="text-[13px] font-semibold text-emerald-100 inline-flex items-center gap-1.5">
                  <span className="lc-pop">{result.deployed ? '🚀' : '✨'}</span>
                  {result.deployed ? `Deployed! PR #${result.prNumber} merged` : `Pull request #${result.prNumber} opened`}
                </p>
                <p className="text-[12.5px] text-white/75 mt-0.5">{result.summary}</p>
                {result.deployed && <p className="text-[11.5px] text-emerald-200/80 mt-0.5">Live on the site in ~1–2 minutes.</p>}
                {result.deployNote && <p className="text-[11.5px] text-amber-200/90 mt-0.5">{result.deployNote}</p>}
                {result.changedFiles.length > 0 && (
                  <p className="text-[11.5px] text-white/50 mt-1">Changed: {result.changedFiles.map((f) => fileLabel(f)).join(', ')}</p>
                )}
                <a href={result.prUrl} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0b1020] text-[11.5px] font-bold hover:bg-sky-100 transition-colors">{result.deployed ? 'View on GitHub →' : 'Review &amp; merge on GitHub →'}</a>
              </div>
            )}
          </section>

          {/* ── History ──────────────────────────────────────── */}
          <aside className="lc-in lg:col-span-2" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/55 font-bold">Flight log</h2>
              {history.length > 0 && <span className="text-[11px] text-white/35">{history.length} change{history.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="space-y-2.5">
              {history.length === 0 ? (
                <div className="lc-glass rounded-2xl px-4 py-6 text-center text-[12.5px] text-white/45">
                  No changes yet. Your launched PRs will log here 🛰️
                </div>
              ) : history.map((item, i) => {
                const isRevert = item.reverts_pr_number != null;
                const badge = item.status === 'merged'
                  ? 'bg-violet-500/25 text-violet-100 border-violet-400/40'
                  : item.status === 'closed'
                    ? 'bg-white/10 text-white/55 border-white/20'
                    : 'bg-amber-400/20 text-amber-100 border-amber-300/40';
                return (
                  <div key={item.id} className="lc-card lc-glass rounded-2xl px-4 py-3" style={{ animationDelay: `${260 + i * 55}ms` }}>
                    <div className="flex items-start justify-between gap-2">
                      <a href={item.pr_url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-white hover:text-sky-200 transition-colors leading-snug">
                        {isRevert && <span className="mr-1">↩️</span>}{item.title}
                      </a>
                      <span className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge}`}>
                        {item.status ?? 'open'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      #{item.pr_number} · {item.requested_by_name || item.requested_by_email || 'someone'} · {relTime(item.created_at)}
                    </p>
                    {item.changed_files.length > 0 && (
                      <p className="mt-1 text-[10.5px] text-white/40 truncate">{item.changed_files.map((f) => fileLabel(f)).join(', ')}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <a href={item.pr_url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-sky-300/80 hover:text-sky-200">Open PR →</a>
                      {!isRevert && (
                        <button type="button" onClick={() => revert(item)} disabled={revertingId === item.id} className="text-[11px] font-semibold text-rose-300/80 hover:text-rose-200 disabled:opacity-50 inline-flex items-center gap-1">
                          {revertingId === item.id ? <span className="lc-cook">🍳</span> : '↩️'} Revert
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .lc-glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 18px 50px -24px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        /* Glass-white input; typed text glows brighter than the placeholder. */
        .lc-input {
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.28);
          color: #eef5ff;
          caret-color: #7dd3fc;
          transition: border-color 0.3s, box-shadow 0.3s, text-shadow 0.3s;
        }
        .lc-input::placeholder { color: rgba(255, 255, 255, 0.42); text-shadow: none; }
        .lc-input:focus { border-color: rgba(125, 211, 252, 0.6); box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18); }
        .lc-input.has-text {
          text-shadow: 0 0 8px rgba(125, 211, 252, 0.55), 0 0 18px rgba(99, 102, 241, 0.35);
          animation: lc-glow 2.6s ease-in-out infinite;
        }
        @keyframes lc-glow {
          0%, 100% { text-shadow: 0 0 8px rgba(125, 211, 252, 0.5), 0 0 16px rgba(99, 102, 241, 0.3); }
          50% { text-shadow: 0 0 15px rgba(125, 211, 252, 0.85), 0 0 28px rgba(99, 102, 241, 0.5); }
        }
        .lc-launch {
          background: linear-gradient(135deg, #6d28d9 0%, #2563eb 50%, #0ea5e9 100%);
          background-size: 200% 200%;
          box-shadow: 0 10px 30px -10px rgba(37, 99, 235, 0.7);
          animation: lc-shift 6s ease infinite;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .lc-launch:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 14px 36px -10px rgba(56, 189, 248, 0.8); }
        .lc-launch:not(:disabled):active { transform: translateY(0); }
        @keyframes lc-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .lc-in { animation: lc-floatin 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lc-card { animation: lc-floatin 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        @keyframes lc-floatin { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        .lc-thumb { animation: lc-pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lc-rocket { display: inline-block; animation: lc-bob 3s ease-in-out infinite; }
        .lc-cook { display: inline-block; animation: lc-bob 0.9s ease-in-out infinite; }
        @keyframes lc-bob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
        .lc-pop { display: inline-block; animation: lc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes lc-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        .lc-fade { animation: lc-fadein 0.5s ease; }
        @keyframes lc-fadein { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .lc-in, .lc-card, .lc-thumb, .lc-rocket, .lc-cook, .lc-pop, .lc-launch, .lc-input.has-text {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
