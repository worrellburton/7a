import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { listStoredTokens } from '@/lib/quickbooks';
import { ga4Run, gscSearchAnalytics, hasGoogleOAuth } from '@/lib/google';

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
  category: 'auth' | 'database' | 'finance' | 'calls' | 'claims' | 'storage';
  configured: boolean;
  connected: boolean;
  detail: string | null;
  error: string | null;
  docsUrl?: string;
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
// and trust the call path. The billing page will surface real errors.
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
  };
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const integrations = await Promise.all([
    probeSupabase(),
    probeGoogleOauth(),
    probeGoogleAnalytics(),
    probeSearchConsole(),
    probeQuickBooks(),
    probeCTM(),
    probeStedi(),
  ]);

  return NextResponse.json({ integrations, checked_at: new Date().toISOString() });
}
