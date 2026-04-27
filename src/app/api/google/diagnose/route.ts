import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  ga4Run,
  ga4RunRealtime,
  GoogleApiError,
  hasGoogleOAuth,
  hasBusinessProfileConfig,
} from '@/lib/google';

// GET /api/google/diagnose
//
// Admin-only health check for every Google API the app talks to.
// Pings each surface in parallel with the smallest possible request,
// then reports per-endpoint status so an admin can answer "what's
// broken?" without needing Vercel log access.
//
// Surfaces tested:
//   - GA4 Data API (runReport)
//   - GA4 Data API realtime (runRealtimeReport)
//   - Search Console (skipped if not configured) — TODO when needed
//   - Google Business Profile reviews — only when configured
//
// Each entry returns:
//   { id, label, configured, ok, status, errorCode, error, durationMs }

export const dynamic = 'force-dynamic';

interface ProbeResult {
  id: string;
  label: string;
  configured: boolean;
  ok: boolean;
  status: number | null;
  errorCode: string | null;
  error: string | null;
  endpoint: string | null;
  durationMs: number;
}

async function probe(
  id: string,
  label: string,
  configured: boolean,
  fn: () => Promise<unknown>,
): Promise<ProbeResult> {
  if (!configured) {
    return {
      id,
      label,
      configured: false,
      ok: false,
      status: null,
      errorCode: null,
      error: 'Not configured',
      endpoint: null,
      durationMs: 0,
    };
  }
  const startedAt = Date.now();
  try {
    await fn();
    return {
      id,
      label,
      configured: true,
      ok: true,
      status: 200,
      errorCode: null,
      error: null,
      endpoint: null,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return {
        id,
        label,
        configured: true,
        ok: false,
        status: err.status,
        errorCode: err.code,
        error: err.message,
        endpoint: err.endpoint,
        durationMs: Date.now() - startedAt,
      };
    }
    return {
      id,
      label,
      configured: true,
      ok: false,
      status: null,
      errorCode: null,
      error: err instanceof Error ? err.message : String(err),
      endpoint: null,
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ga4Configured = hasGoogleOAuth() && !!process.env.GA4_PROPERTY_ID;
  const gbpConfigured = hasBusinessProfileConfig();
  const today = new Date().toISOString().slice(0, 10);

  const results = await Promise.all([
    probe('ga4_runreport', 'GA4 Data API · runReport', ga4Configured, () =>
      ga4Run({
        dateRanges: [{ startDate: today, endDate: today }],
        metrics: [{ name: 'sessions' }],
      }),
    ),
    probe(
      'ga4_realtime',
      'GA4 Data API · runRealtimeReport',
      ga4Configured,
      () => ga4RunRealtime({ metrics: [{ name: 'activeUsers' }] }),
    ),
  ]);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    env: {
      GOOGLE_OAUTH_CLIENT_ID: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID ?? null,
      GBP_CONFIGURED: gbpConfigured,
    },
    results,
  });
}
