// PageSpeed Insights (PSI) API client.
//
// PSI runs a real Lighthouse pass against a URL and returns Core Web
// Vitals + a 0-100 performance score. Each call takes 10-25 seconds, so
// for the audit we only run it on the homepage (the highest-value page
// to optimize). Adding more URLs would blow the function budget.
//
// Env:
//   PAGESPEED_API_KEY  optional — without it, PSI uses a smaller shared
//                      quota and is more likely to throttle or 503. Get
//                      one free at:
//                      https://developers.google.com/speed/docs/insights/v5/get-started

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const FETCH_TIMEOUT_MS = 35_000;

export type PsiStrategy = 'mobile' | 'desktop';

export interface PsiOpportunity {
  /** Audit id, e.g. "unused-javascript". */
  id: string;
  /** Lighthouse-provided friendly title. */
  title: string;
  /** Estimated savings in ms (Lighthouse `numericValue` for opportunity audits). */
  savingsMs: number;
}

export interface PsiSnapshot {
  url: string;
  strategy: PsiStrategy;
  ok: boolean;
  /** Performance category score, 0-100. null on failure. */
  performance: number | null;
  /** Lab metrics (rounded). null on failure. */
  metrics: {
    /** First Contentful Paint, ms. */
    fcp: number | null;
    /** Largest Contentful Paint, ms. */
    lcp: number | null;
    /** Cumulative Layout Shift (unitless). */
    cls: number | null;
    /** Total Blocking Time, ms. */
    tbt: number | null;
    /** Speed Index, ms. */
    si: number | null;
  };
  /** Top Lighthouse opportunity audits (sorted by estimated savings desc). */
  opportunities: PsiOpportunity[];
  fetchedAt: string;
  fetchMs: number;
  error: string | null;
}

interface PsiAudit {
  id?: string;
  title?: string;
  numericValue?: number;
  details?: { type?: string; overallSavingsMs?: number };
}

interface PsiCategory {
  score?: number;
}

interface PsiLighthouseResult {
  categories?: { performance?: PsiCategory };
  audits?: Record<string, PsiAudit>;
}

interface PsiResponse {
  lighthouseResult?: PsiLighthouseResult;
}

export function hasPsiKey(): boolean {
  return !!process.env.PAGESPEED_API_KEY;
}

export async function runPsi(url: string, strategy: PsiStrategy): Promise<PsiSnapshot> {
  const startedAt = Date.now();
  const out: PsiSnapshot = {
    url,
    strategy,
    ok: false,
    performance: null,
    metrics: { fcp: null, lcp: null, cls: null, tbt: null, si: null },
    opportunities: [],
    fetchedAt: new Date().toISOString(),
    fetchMs: 0,
    error: null,
  };

  const params = new URLSearchParams({
    url,
    strategy,
    category: 'PERFORMANCE',
  });
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set('key', key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PSI_BASE}?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      out.error = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      return out;
    }
    const json = (await res.json()) as PsiResponse;
    const cat = json.lighthouseResult?.categories?.performance;
    const audits = json.lighthouseResult?.audits ?? {};
    out.performance = typeof cat?.score === 'number' ? Math.round(cat.score * 100) : null;
    out.metrics = {
      fcp: numeric(audits['first-contentful-paint']),
      lcp: numeric(audits['largest-contentful-paint']),
      cls:
        typeof audits['cumulative-layout-shift']?.numericValue === 'number'
          ? Number(audits['cumulative-layout-shift']!.numericValue!.toFixed(3))
          : null,
      tbt: numeric(audits['total-blocking-time']),
      si: numeric(audits['speed-index']),
    };
    out.opportunities = extractOpportunities(audits);
    out.ok = out.performance != null;
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
    out.fetchMs = Date.now() - startedAt;
  }
  return out;
}

function numeric(audit: PsiAudit | undefined): number | null {
  if (!audit || typeof audit.numericValue !== 'number') return null;
  return Math.round(audit.numericValue);
}

// Lighthouse marks "opportunity" audits with details.type === 'opportunity'.
// Each surfaces an `overallSavingsMs` — how much the page would speed up if
// the issue were fixed. We pull every opportunity with non-trivial savings,
// sort by impact desc, and cap at 8 so the UI stays digestible.
function extractOpportunities(audits: Record<string, PsiAudit>): PsiOpportunity[] {
  const out: PsiOpportunity[] = [];
  for (const [id, audit] of Object.entries(audits)) {
    if (audit?.details?.type !== 'opportunity') continue;
    const savings = audit.details?.overallSavingsMs ?? audit.numericValue ?? 0;
    if (typeof savings !== 'number' || savings < 50) continue;
    out.push({
      id,
      title: audit.title || id,
      savingsMs: Math.round(savings),
    });
  }
  out.sort((a, b) => b.savingsMs - a.savingsMs);
  return out.slice(0, 8);
}
