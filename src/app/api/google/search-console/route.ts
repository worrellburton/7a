import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  GoogleApiError,
  gscListSites,
  gscSearchAnalytics,
  hasGoogleOAuth,
  resolveGscSite,
} from '@/lib/google';

// GET /api/google/search-console?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&compare=prev
// Admin-only. Powers the SEO section + overview digest. Returns:
//   - summary:         site-wide clicks/impressions/ctr/position
//   - previous:        same for prior equal period when ?compare=prev
//   - daily:           per-day clicks + impressions (for trend chart)
//   - topQueries:      top 25 by clicks
//   - topPages:        top 25 by clicks
//   - quickWins:       page-2 queries (pos 11-20) with ≥50 impressions and
//                      CTR < 2% — the fastest SEO lift you can get
//   - positionBuckets: impression share across pos 1-3, 4-10, 11-20, 21+
//   - devices:         mobile / desktop / tablet split
//   - countries:       top 10 countries by clicks

export const dynamic = 'force-dynamic';

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function parseIsoUtc(dateStr: string): Date {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(yy, mo - 1, dd));
}

function addDays(dateStr: string, delta: number): string {
  const d = parseIsoUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function clampGscEnd(endStr: string): string {
  const cap = daysAgo(2);
  return endStr > cap ? cap : endStr;
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth()) {
    return NextResponse.json(
      { error: 'Search Console not configured (GOOGLE_OAUTH_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN required)' },
      { status: 412 }
    );
  }

  const url = new URL(req.url);
  const qStart = url.searchParams.get('startDate');
  const qEnd = url.searchParams.get('endDate');
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '28')));
  const withCompare = url.searchParams.get('compare') === 'prev';

  const endDate = clampGscEnd(qEnd || daysAgo(2));
  const startDate = qStart || daysAgo(days + 2);

  const rangeDays =
    Math.round(
      (parseIsoUtc(endDate).getTime() - parseIsoUtc(startDate).getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(prevEnd, -(rangeDays - 1));

  let site: string;
  try {
    site = await resolveGscSite();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, configuredSite: process.env.GSC_SITE_URL ?? null },
      { status: 502 }
    );
  }

  try {
    const fetches = [
      gscSearchAnalytics({ startDate, endDate, rowLimit: 1 }, site),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 400,
      }, site),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 25,
      }, site),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 25,
      }, site),
      // Large query dump for quick-wins analysis (up to 500 queries)
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 500,
      }, site),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['device'],
        rowLimit: 10,
      }, site),
      gscSearchAnalytics({
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 25,
      }, site),
    ];
    if (withCompare) {
      fetches.push(
        gscSearchAnalytics({ startDate: prevStart, endDate: prevEnd, rowLimit: 1 }, site)
      );
    }

    const results = await Promise.all(fetches);
    const totalsRes = results[0];
    const dailyRes = results[1];
    const topQueriesRes = results[2];
    const topPagesRes = results[3];
    const allQueriesRes = results[4];
    const devicesRes = results[5];
    const countriesRes = results[6];
    const prevRes = withCompare ? results[7] : null;

    const t = totalsRes.rows?.[0] ?? {};
    const summary = {
      clicks: Number(t.clicks ?? 0),
      impressions: Number(t.impressions ?? 0),
      ctr: Number(t.ctr ?? 0),
      position: Number(t.position ?? 0),
    };
    const previous = prevRes
      ? (() => {
          const r = prevRes.rows?.[0] ?? {};
          return {
            clicks: Number(r.clicks ?? 0),
            impressions: Number(r.impressions ?? 0),
            ctr: Number(r.ctr ?? 0),
            position: Number(r.position ?? 0),
          };
        })()
      : null;

    const daily = (dailyRes.rows ?? [])
      .map((r) => ({
        date: r.keys?.[0] ?? '',
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topQueries = (topQueriesRes.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? '',
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    const topPages = (topPagesRes.rows ?? []).map((r) => ({
      page: r.keys?.[0] ?? '',
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    const allQueries = (allQueriesRes.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? '',
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    // Quick wins: page-2 keywords with real volume and poor CTR.
    const quickWins = allQueries
      .filter((q) => q.impressions >= 50 && q.position > 10 && q.position <= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);

    // Impression share by position bucket.
    const buckets = [
      { label: 'Pos 1–3', min: 1, max: 3, impressions: 0, clicks: 0 },
      { label: 'Pos 4–10', min: 4, max: 10, impressions: 0, clicks: 0 },
      { label: 'Pos 11–20', min: 11, max: 20, impressions: 0, clicks: 0 },
      { label: 'Pos 21+', min: 21, max: 10_000, impressions: 0, clicks: 0 },
    ];
    for (const q of allQueries) {
      for (const b of buckets) {
        if (q.position >= b.min && q.position <= b.max) {
          b.impressions += q.impressions;
          b.clicks += q.clicks;
          break;
        }
      }
    }
    const totalImpressions = buckets.reduce((s, b) => s + b.impressions, 0);
    const positionBuckets = buckets.map((b) => ({
      label: b.label,
      impressions: b.impressions,
      clicks: b.clicks,
      share: totalImpressions ? b.impressions / totalImpressions : 0,
    }));

    const devices = (devicesRes.rows ?? []).map((r) => ({
      device: (r.keys?.[0] ?? '').toLowerCase(),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    const countries = (countriesRes.rows ?? []).slice(0, 10).map((r) => ({
      country: (r.keys?.[0] ?? '').toUpperCase(),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));

    return NextResponse.json({
      range: { startDate, endDate, days: rangeDays },
      previousRange: withCompare ? { startDate: prevStart, endDate: prevEnd, days: rangeDays } : null,
      site,
      configuredSite: process.env.GSC_SITE_URL ?? null,
      summary,
      previous,
      daily,
      topQueries,
      topPages,
      quickWins,
      positionBuckets,
      devices,
      countries,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // On a 403, the OAuth account has no access to this specific property.
    // Help the admin out: list the sites the account *does* see.
    if (err instanceof GoogleApiError && err.status === 403) {
      let accessible: { siteUrl: string; permissionLevel: string }[] = [];
      try {
        accessible = await gscListSites();
      } catch {
        /* ignore — fall through to bare 403 message */
      }
      return NextResponse.json(
        {
          error: `Search Console denied access to ${site}. The connected Google account is not an owner or user on that property.`,
          configuredSite: process.env.GSC_SITE_URL ?? null,
          resolvedSite: site,
          accessibleSites: accessible,
          hint:
            accessible.length > 0
              ? 'Either grant the connected Google account access to the configured site, or set GSC_SITE_URL to one of the accessible sites above.'
              : 'The connected Google account has no Search Console properties. Add it as an owner or full user in Search Console → Settings → Users and permissions.',
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
