'use client';

// Kaizen — daily Claude-driven codebase scan that lists ten
// recommendations across Website + Feather. Super-admin only.
// Each recommendation carries a one-click "Copy for Claude Code"
// button that puts a ready-to-paste prompt on the clipboard.
//
// Layout: header with "Run scan now" + last-scan-at, then two
// columns on desktop (Website left, Feather right) collapsing to
// stacked sections on mobile. Each card surfaces a category pill
// + an optional SEO/GEO tag.
//
// First-visit behavior: if no scan has ever run, the page kicks
// one off so the super admin doesn't see an empty surface. The
// daily 6 AM Phoenix cron handles subsequent days automatically.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

type Area = 'website' | 'feather';
type Category = 'features' | 'codebase' | 'growth' | 'ux' | 'performance';
type SeoGeo = 'none' | 'seo' | 'geo' | 'both';

interface ScanRow {
  id: string;
  scanned_at: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  model: string | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

interface Recommendation {
  id: string;
  area: Area;
  category: Category;
  seo_geo: SeoGeo;
  title: string;
  description: string;
  copy_prompt: string;
  priority: number;
  dismissed_at: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  features: 'Feature',
  codebase: 'Codebase',
  growth: 'Growth',
  ux: 'UX',
  performance: 'Performance',
};

const CATEGORY_TONE: Record<Category, string> = {
  features: 'bg-primary/10 text-primary ring-primary/25',
  codebase: 'bg-violet-50 text-violet-700 ring-violet-200',
  growth: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ux: 'bg-sky-50 text-sky-700 ring-sky-200',
  performance: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'P1 · Critical',
  2: 'P2 · High',
  3: 'P3 · Medium',
  4: 'P4 · Low',
  5: 'P5 · Wishlist',
};

function fmtScanTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function KaizenContent() {
  const router = useRouter();
  const { session, isSuperAdmin, loading: authLoading } = useAuth();
  const [scan, setScan] = useState<ScanRow | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  // Super admin gate. Mirrors Levers / Social Media / Content —
  // adminOnly in the PageConfig keeps the link out of the popup
  // for non-admins, this runtime check bounces an admin (non-super)
  // who tries to navigate in directly.
  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) return;
    if (!isSuperAdmin) router.replace('/app');
  }, [authLoading, session?.access_token, isSuperAdmin, router]);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/kaizen/recommendations', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { scan: ScanRow | null; recommendations: Recommendation[] };
      setScan(json.scan);
      setRecommendations(json.recommendations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const triggerScan = useCallback(async () => {
    if (!session?.access_token || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/kaizen/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${res.status}`);
      } else {
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }, [session?.access_token, scanning, refresh]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Auto-fire on first visit when no scan has ever run, so the
  // super admin lands on real content instead of an empty page.
  useEffect(() => {
    if (loading || autoTried || !isSuperAdmin || !session?.access_token) return;
    if (scan === null) {
      setAutoTried(true);
      void triggerScan();
    }
  }, [loading, autoTried, isSuperAdmin, session?.access_token, scan, triggerScan]);

  const dismissRecommendation = async (id: string) => {
    if (!session?.access_token) return;
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/kaizen/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    } catch {
      void refresh();
    }
  };

  const byArea = useMemo(() => {
    return {
      website: recommendations.filter((r) => r.area === 'website'),
      feather: recommendations.filter((r) => r.area === 'feather'),
    };
  }, [recommendations]);

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="p-10 text-center text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Super admin only.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Super admin · Continuous improvement
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Kaizen <em className="not-italic text-primary">scan</em>
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55 max-w-2xl">
            Daily Claude-driven scan of the codebase. Every morning at 6&nbsp;AM Phoenix, 10
            opinionated recommendations land here — 5 for the Website, 5 for Feather — across
            features, codebase, growth, UX, and performance. Each card has a one-tap copy
            button that drops a ready-to-paste prompt into Claude Code.
          </p>
          {scan && (
            <p className="mt-2 text-[11px] text-foreground/55">
              Last scan{' '}
              <span className="font-semibold text-foreground/70">{fmtScanTime(scan.scanned_at)}</span>
              {' '}({timeAgo(scan.scanned_at)})
              {scan.status === 'running' && <span className="ml-2 text-amber-700 font-semibold">· scan running…</span>}
              {scan.status === 'failed' && (
                <span className="ml-2 text-rose-700 font-semibold">· last run failed{scan.error_message ? `: ${scan.error_message.slice(0, 80)}` : ''}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app"
            className="px-3 py-2 rounded-md border border-black/10 bg-white text-[11px] font-semibold uppercase tracking-wider text-foreground/65 hover:bg-warm-bg/60"
          >
            ← Back
          </Link>
          <button
            type="button"
            onClick={() => void triggerScan()}
            disabled={scanning}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <span aria-hidden className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <>↻ Run scan now</>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[12.5px] text-rose-900">
            <span className="font-semibold">Scan error:</span> {error}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-10">Loading…</p>
      ) : recommendations.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-10 text-center">
          <p className="text-[13px] text-foreground/55 mb-3">
            {scan?.status === 'running' || scanning
              ? 'First scan running — Claude is reading the codebase. Refresh in 30-60 seconds.'
              : 'No recommendations yet. Click Run scan now to kick the first one off.'}
          </p>
          {!scanning && (
            <button
              type="button"
              onClick={() => void triggerScan()}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
            >
              Run first scan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AreaColumn title="Website" subtitle="sevenarrowsrecoveryarizona.com" recs={byArea.website} onDismiss={dismissRecommendation} />
          <AreaColumn title="Feather" subtitle="/app — internal CMS / CRM / ops" recs={byArea.feather} onDismiss={dismissRecommendation} />
        </div>
      )}
    </div>
  );
}

function AreaColumn({
  title, subtitle, recs, onDismiss,
}: {
  title: string;
  subtitle: string;
  recs: Recommendation[];
  onDismiss: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
          {title}
        </p>
        <p className="mt-0.5 text-[11.5px] text-foreground/55">{subtitle}</p>
      </header>
      {recs.length === 0 ? (
        <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center">
          No recommendations this scan.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {recs.map((r) => (
            <RecommendationCard key={r.id} rec={r} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendationCard({
  rec, onDismiss,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const categoryTone = CATEGORY_TONE[rec.category];
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(rec.copy_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: open a textarea selection
      const el = document.createElement('textarea');
      el.value = rec.copy_prompt;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
      document.body.removeChild(el);
    }
  };
  return (
    <li className="px-4 py-4">
      <div className="flex items-start gap-2 flex-wrap mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] ring-1 ${categoryTone}`}>
          {CATEGORY_LABEL[rec.category]}
        </span>
        {rec.seo_geo !== 'none' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] ring-1 bg-foreground/5 text-foreground/70 ring-foreground/15">
            {rec.seo_geo === 'seo' ? 'SEO'
              : rec.seo_geo === 'geo' ? 'GEO'
              : 'SEO + GEO'}
          </span>
        )}
        <span className="ml-auto text-[10px] tabular-nums text-foreground/45 whitespace-nowrap">
          {PRIORITY_LABEL[rec.priority] ?? `P${rec.priority}`}
        </span>
      </div>
      <h3 className="text-[14px] font-semibold text-foreground leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
        {rec.title}
      </h3>
      <p className="mt-1.5 text-[12.5px] text-foreground/70 leading-relaxed">{rec.description}</p>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-foreground text-white hover:bg-foreground/85'
          }`}
          title="Copy a ready-to-paste prompt for Claude Code"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy for Claude Code
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(rec.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/55 hover:text-foreground hover:bg-warm-bg/60 transition-colors"
          title="Hide this recommendation. It stays on the historical scan but disappears from the dashboard."
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}
