import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/api-gates';
import { listStoredTokens } from '@/lib/quickbooks';
import { ga4Run, gscSearchAnalytics, hasGoogleOAuth } from '@/lib/google';
import { hasPsiKey } from '@/lib/seo/psi';

// GET /api/integrations
// Admin-only snapshot of every third-party integration the app talks to.
// For each integration we report:
//   - configured: env vars needed to even attempt a call
//   - connected:  a live probe (cheap GET) succeeded, or for token-based
//                 integrations that there's at least one live row in the
//                 token store
//   - detail:     human-readable extras (realm count, error message, etc)
//
// Intentionally no cache — this is a live dashboard. Probes run in parallel
// with a short timeout so the page stays responsive even if CTM is slow.

const PROBE_TIMEOUT_MS = 6000;

interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'database' | 'finance' | 'calls' | 'claims' | 'storage' | 'ai' | 'seo' | 'social' | 'reviews';
  configured: boolean;
  connected: boolean;
  detail: string | null;
  error: string | null;
  docsUrl?: string;
  manageUrl?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// -- Supabase -----------------------------------------------------------
// Always "configured" if the app loaded. We verify the service-role key is
// usable by running a trivial RPC/auth fetch.
async function probeSupabase(): Promise<IntegrationStatus> {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const configured = hasUrl && hasAnon && hasService;

  const base: IntegrationStatus = {
    id: 'supabase',
    name: 'Supabase',
    description: 'Postgres database, auth, and storage.',
    category: 'database',
    configured,
    connected: false,
    detail: null,
    error: null,
    docsUrl: 'https://supabase.com/dashboard',
  };

  if (!configured) {
    base.error = 'Missing NEXT_PUBLIC_SUPABASE_URL / ANON key / SUPABASE_SERVICE_ROLE_KEY';
    return base;
  }

  try {
    const admin = getAdminSupabase();
    // Cheap, admin-scoped probe: count users. If this returns anything, the
    // service role key is valid and PostgREST is reachable. The filter
    // builder is thenable but not a real Promise, so wrap it in an async
    // IIFE before handing to Promise.race.
    const result = await withTimeout(
      (async () => admin.from('users').select('id', { count: 'exact', head: true }))(),
      PROBE_TIMEOUT_MS,
      'Supabase'
    );
    if (result.error) {
      base.error = result.error.message;
      return base;
    }
    base.connected = true;
    base.detail =
      typeof result.count === 'number' ? `${result.count} user${result.count === 1 ? '' : 's'}` : 'Reachable';
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  return base;
}

// -- Google OAuth (via Supabase Auth) ----------------------------------
// Not a direct API for us — Supabase manages the token exchange. We report
// "configured" if sign-in works at all (i.e. Supabase is configured) and
// leave the live probe to the Supabase entry.
async function probeGoogleOauth(): Promise<IntegrationStatus> {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = hasUrl && hasAnon;
  return {
    id: 'google_oauth',
    name: 'Google Sign-In',
    description: 'OAuth provider for user sign-in, proxied through Supabase Auth.',
    category: 'auth',
    configured,
    // We can't probe Google directly without a user session; if Supabase
    // is reachable and configured, the sign-in flow works.
    connected: configured,
    detail: configured ? 'Configured via Supabase Auth provider' : null,
    error: configured ? null : 'Supabase Auth not configured',
    docsUrl: 'https://supabase.com/dashboard/project/_/auth/providers',
  };
}

// -- QuickBooks Online -------------------------------------------------
// Configured = client id + secret present. Connected = ≥1 row in
// quickbooks_tokens. We don't ping Intuit here because every token is
// per-company; the real liveness check happens when reports are fetched.
async function probeQuickBooks(): Promise<IntegrationStatus> {
  const hasId = !!process.env.QUICKBOOKS_CLIENT_ID;
  const hasSecret = !!process.env.QUICKBOOKS_CLIENT_SECRET;
  const env = process.env.QUICKBOOKS_ENV === 'sandbox' ? 'sandbox' : 'production';
  const configured = hasId && hasSecret;

  const base: IntegrationStatus = {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Intuit OAuth2 + QBO reports API, multi-tenant keyed by realm_id.',
    category: 'finance',
    configured,
    connected: false,
    detail: env === 'sandbox' ? 'Sandbox mode' : 'Production mode',
    error: null,
    docsUrl: 'https://developer.intuit.com/app/developer/myapps',
  };

  if (!configured) {
    base.error = 'Missing QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET';
    return base;
  }

  try {
    const rows = await withTimeout(listStoredTokens(), PROBE_TIMEOUT_MS, 'QuickBooks token store');
    base.connected = rows.length > 0;
    base.detail = `${rows.length} connected compan${rows.length === 1 ? 'y' : 'ies'} · ${env}`;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  return base;
}

// -- CallTrackingMetrics -----------------------------------------------
// Live probe: GET /accounts.json. Returns the accounts the token has
// access to — cheap and auth-scoped.
async function probeCTM(): Promise<IntegrationStatus> {
  const token = process.env.CTM_API_TOKEN;
  const base: IntegrationStatus = {
    id: 'ctm',
    name: 'CallTrackingMetrics',
    description: 'Phone call logs, heatmaps, and source attribution.',
    category: 'calls',
    configured: !!token,
    connected: false,
    detail: null,
    error: null,
    docsUrl: 'https://app.calltrackingmetrics.com',
  };

  if (!token) {
    base.error = 'Missing CTM_API_TOKEN';
    return base;
  }

  try {
    const res = await withTimeout(
      fetch('https://api.calltrackingmetrics.com/api/v1/accounts.json', {
        headers: { Authorization: `Basic ${token}` },
        cache: 'no-store',
      }),
      PROBE_TIMEOUT_MS,
      'CTM'
    );
    if (!res.ok) {
      base.error = `${res.status} ${res.statusText}`;
      return base;
    }
    const data = (await res.json()) as { accounts?: Array<{ name?: string }> };
    const names = (data.accounts || []).map((a) => a.name).filter(Boolean);
    base.connected = true;
    base.detail = names.length > 0 ? `${names.length} account${names.length === 1 ? '' : 's'}: ${names.slice(0, 3).join(', ')}` : 'Reachable';
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  return base;
}

// -- Google Analytics 4 -------------------------------------------------
// Live probe: runReport for 1 day with sessions only. Cheap call, confirms
// the refresh token still works AND the GA4 property is reachable.
async function probeGoogleAnalytics(): Promise<IntegrationStatus> {
  const configured = hasGoogleOAuth() && !!process.env.GA4_PROPERTY_ID;
  const base: IntegrationStatus = {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Site traffic, sessions, and landing-page performance.',
    category: 'auth',
    configured,
    connected: false,
    detail: null,
    error: null,
    docsUrl: 'https://analytics.google.com/',
  };

  if (!configured) {
    base.error = 'Missing GOOGLE_OAUTH_* env or GA4_PROPERTY_ID';
    return base;
  }

  try {
    const result = await withTimeout(
      ga4Run({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
      }),
      PROBE_TIMEOUT_MS,
      'GA4'
    );
    const sessions = Number(
      result.rows?.[0]?.metricValues?.[0]?.value ??
        result.totals?.[0]?.metricValues?.[0]?.value ??
        0
    );
    base.connected = true;
    base.detail = `property ${process.env.GA4_PROPERTY_ID} · ${sessions.toLocaleString()} sessions (7d)`;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  return base;
}

// -- Google Search Console ---------------------------------------------
// Live probe: tiny searchAnalytics query against the verified site.
async function probeSearchConsole(): Promise<IntegrationStatus> {
  const configured = hasGoogleOAuth() && !!process.env.GSC_SITE_URL;
  const base: IntegrationStatus = {
    id: 'gsc',
    name: 'Google Search Console',
    description: 'Organic search impressions, clicks, and query rankings.',
    category: 'auth',
    configured,
    connected: false,
    detail: null,
    error: null,
    docsUrl: 'https://search.google.com/search-console',
  };

  if (!configured) {
    base.error = 'Missing GOOGLE_OAUTH_* env or GSC_SITE_URL';
    return base;
  }

  try {
    const result = await withTimeout(
      gscSearchAnalytics({
        startDate: '30daysAgo',
        endDate: 'today',
        rowLimit: 1,
      }),
      PROBE_TIMEOUT_MS,
      'Search Console'
    );
    const clicks = Number(result.rows?.[0]?.clicks ?? 0);
    base.connected = true;
    base.detail = `${process.env.GSC_SITE_URL} · ${clicks.toLocaleString()} clicks (30d)`;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  return base;
}

// -- Stedi --------------------------------------------------------------
// No cheap probe — the only endpoint is a destructive professional-claim
// POST. Configured = key present; we mark connected true if configured
// and trust the call path. The RCM pipeline page (which took over the
// Stedi claims surface from /feather/billing) will surface real errors.
async function probeStedi(): Promise<IntegrationStatus> {
  const key = process.env.STEDI_API_KEY;
  return {
    id: 'stedi',
    name: 'Stedi',
    description: 'X12 EDI professional claims gateway for billing.',
    category: 'claims',
    configured: !!key,
    connected: !!key,
    detail: key ? 'Key present (no live probe — send-only API)' : null,
    error: key ? null : 'Missing STEDI_API_KEY',
    docsUrl: 'https://www.stedi.com/app',
    manageUrl: '/feather/rcm-pipeline',
  };
}

// -- Anthropic (Claude) -------------------------------------------------
// Used for: call scoring summaries, daily SEO summaries, outings
// research prompts, ask-policies, and a handful of one-shot rewrites.
// No cheap probe — every Anthropic call costs tokens. Configured ⇒
// connected; live errors will surface in the dependent feature.
//
// Additional liveness signal: the 6 AM daily cron at
// /api/cron/anthropic/model-check writes a row to
// anthropic_model_checks comparing /v1/models output to the model IDs
// the codebase is wired to. If the cron flagged drift (Anthropic
// shipped a newer model than what's in code), surface that as an
// orange "newer model available" note here so we don't go months
// without noticing.
async function probeAnthropic(): Promise<IntegrationStatus> {
  const key = process.env.ANTHROPIC_API_KEY;
  let driftDetail: string | null = null;
  let driftWarning: string | null = null;
  try {
    const admin = getAdminSupabase();
    const { data: row } = await admin
      .from('anthropic_model_checks')
      .select('checked_at, drift_detected, drift_summary, http_status, error')
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) {
      const summary = (row.drift_summary ?? {}) as Record<string, { current: string; latest: string | null; drift: boolean }>;
      if (row.drift_detected) {
        const drifted = Object.entries(summary)
          .filter(([, v]) => v.drift)
          .map(([tier, v]) => `${tier}: ${v.current} → ${v.latest}`)
          .join(', ');
        driftWarning = `Newer Claude model available — ${drifted}`;
      } else if (row.error || (row.http_status && row.http_status >= 400)) {
        driftDetail = `Last model-check ${new Date(row.checked_at as string).toLocaleDateString()} failed: ${row.error ?? `HTTP ${row.http_status}`}`;
      } else {
        const checked = new Date(row.checked_at as string).toLocaleDateString();
        driftDetail = `All on latest models (checked ${checked})`;
      }
    }
  } catch {
    /* drift surface is best-effort */
  }

  return {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Call summaries, ask-policies answers, SEO daily summary, outings research.',
    category: 'ai',
    configured: !!key,
    connected: !!key,
    detail: key ? (driftDetail ?? 'Key present') : null,
    error: key ? driftWarning : 'Missing ANTHROPIC_API_KEY',
    docsUrl: 'https://console.anthropic.com',
  };
}

// -- Google Gemini ------------------------------------------------------
// Used for: call audio analysis (gemini-2.5-pro), bling-mode image
// edits + outing image generation (gemini-3-pro-image-preview /
// nano-banana). Token-billed; no cheap probe. Configured ⇒ connected.
async function probeGemini(): Promise<IntegrationStatus> {
  const key = process.env.GEMINI_API_KEY;
  const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
  return {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Audio analysis on calls, image generation for outings + equine bling mode.',
    category: 'ai',
    configured: !!key,
    connected: !!key,
    detail: key ? `Image model · ${imageModel}` : null,
    error: key ? null : 'Missing GEMINI_API_KEY',
    docsUrl: 'https://aistudio.google.com/',
  };
}

// -- Google Places -------------------------------------------------------
// Used for: live Google review fetch on the home + landing pages.
// Configured = key present. We don't ping Places here because the
// per-place lookup costs a billable read; the home review section
// will surface failures.
async function probePlaces(): Promise<IntegrationStatus> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return {
    id: 'places',
    name: 'Google Places',
    description: 'Live Google Business Profile reviews + ratings.',
    category: 'reviews',
    configured: !!key,
    connected: !!key,
    detail: key ? 'Key present' : null,
    error: key ? null : 'Missing GOOGLE_PLACES_API_KEY',
    docsUrl: 'https://console.cloud.google.com/google/maps-apis',
  };
}

// -- Ayrshare ------------------------------------------------------------
// Used for: cross-posting to Facebook + Instagram via /feather/social-media.
async function probeAyrshare(): Promise<IntegrationStatus> {
  const key = process.env.AYRSHARE_API_KEY;
  const profile = process.env.AYRSHARE_PROFILE_KEY;
  const configured = !!key && !!profile;
  return {
    id: 'ayrshare',
    name: 'Ayrshare',
    description: 'Cross-platform social posting (Facebook, Instagram).',
    category: 'social',
    configured,
    connected: configured,
    detail: configured ? 'API + profile key present' : null,
    error: configured
      ? null
      : !key
      ? 'Missing AYRSHARE_API_KEY'
      : 'Missing AYRSHARE_PROFILE_KEY',
    docsUrl: 'https://app.ayrshare.com/dashboard',
    manageUrl: '/feather/social-media',
  };
}

// -- SerpAPI -------------------------------------------------------------
// Used for: SERP audit + GEO engine probes. Daily cap configurable
// via SERPAPI_DAILY_CAP.
async function probeSerpApi(): Promise<IntegrationStatus> {
  const key = process.env.SERPAPI_KEY;
  const cap = process.env.SERPAPI_DAILY_CAP;
  return {
    id: 'serpapi',
    name: 'SerpAPI',
    description: 'Google SERP audit + Google AIO probes for SEO/GEO.',
    category: 'seo',
    configured: !!key,
    connected: !!key,
    detail: key ? (cap ? `Daily cap · ${cap}` : 'Key present') : null,
    error: key ? null : 'Missing SERPAPI_KEY',
    docsUrl: 'https://serpapi.com/manage-api-key',
    manageUrl: '/feather/seo',
  };
}

// -- PageSpeed Insights --------------------------------------------------
// Used for: SEO audit (Lighthouse-as-a-service). The API works without a
// key but is rate-limited and will 503 under load — we report "connected"
// only when PAGESPEED_API_KEY is set, which gives us the full per-project
// quota. A real Lighthouse run takes 10-25s, so we skip the live probe
// and trust the key's presence; the audit page surfaces real errors.
async function probePsi(): Promise<IntegrationStatus> {
  const configured = hasPsiKey();
  return {
    id: 'pagespeed',
    name: 'PageSpeed Insights',
    description: 'Lighthouse Core Web Vitals (performance score + LCP/CLS/TBT) for the SEO audit.',
    category: 'seo',
    configured,
    connected: configured,
    detail: configured ? 'Key present · full quota' : null,
    error: configured ? null : 'Missing PAGESPEED_API_KEY (PSI falls back to throttled, keyless access)',
    docsUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    manageUrl: '/feather/seo/audit',
  };
}

// -- Semrush -------------------------------------------------------------
// Used for: backlinks snapshot + referring-domain tracking.
async function probeSemrush(): Promise<IntegrationStatus> {
  const key = process.env.SEMRUSH_API_KEY;
  const target = process.env.SEMRUSH_TARGET_DOMAIN;
  return {
    id: 'semrush',
    name: 'Semrush',
    description: 'Backlinks snapshot + referring-domain tracking.',
    category: 'seo',
    configured: !!key,
    connected: !!key,
    detail: key ? (target ? `Target · ${target}` : 'Key present') : null,
    error: key ? null : 'Missing SEMRUSH_API_KEY',
    docsUrl: 'https://www.semrush.com/api/',
    manageUrl: '/feather/seo',
  };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const integrations = await Promise.all([
    probeSupabase(),
    probeGoogleOauth(),
    probeGoogleAnalytics(),
    probeSearchConsole(),
    probeQuickBooks(),
    probeCTM(),
    probeStedi(),
    probeAnthropic(),
    probeGemini(),
    probePlaces(),
    probeAyrshare(),
    probeSerpApi(),
    probeSemrush(),
    probePsi(),
  ]);

  return NextResponse.json({ integrations, checked_at: new Date().toISOString() });
}
