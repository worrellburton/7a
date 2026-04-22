import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/acquisition?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Returns breakdowns powering the Acquisition section:
//   - channels:   Default Channel Group with a full engagement-metric set
//   - sources:    Source / Medium table
//   - campaigns:  UTM campaign performance (only non-empty campaigns)
//   - referrers:  Page referrer hosts for Referral traffic
//   - landingByChannel: Top 3 landing pages inside each channel

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || '30daysAgo';
  const endDate = url.searchParams.get('endDate') || 'today';

  try {
    const [channelsRes, sourcesRes, campaignsRes, referrersRes, landingByChannelRes] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViewsPerSession' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 25,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pageReferrer' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'landingPage' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 60,
      }),
    ]);

    const channels = (channelsRes.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? 'unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      avgDurationSec: Number(r.metricValues?.[3]?.value ?? 0),
      pagesPerSession: Number(r.metricValues?.[4]?.value ?? 0),
      bounceRate: Number(r.metricValues?.[5]?.value ?? 0),
    }));

    const sources = (sourcesRes.rows ?? []).map((r) => ({
      source: r.dimensionValues?.[0]?.value ?? '(not set)',
      medium: r.dimensionValues?.[1]?.value ?? '(not set)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      avgDurationSec: Number(r.metricValues?.[3]?.value ?? 0),
      bounceRate: Number(r.metricValues?.[4]?.value ?? 0),
    }));

    const campaignsAll = (campaignsRes.rows ?? []).map((r) => ({
      campaign: r.dimensionValues?.[0]?.value ?? '(not set)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      avgDurationSec: Number(r.metricValues?.[3]?.value ?? 0),
    }));
    // Filter out the catch-all bucket so the table only shows real campaigns.
    const campaigns = campaignsAll.filter(
      (c) => c.campaign && c.campaign !== '(not set)' && c.campaign !== '(organic)' && c.campaign !== '(direct)'
    );

    // Normalize referrers to host + path, aggregate by host so 20 rows ->
    // ~8 meaningful entries.
    const referrerHostMap = new Map<string, { sessions: number; activeUsers: number }>();
    for (const r of referrersRes.rows ?? []) {
      const raw = r.dimensionValues?.[0]?.value ?? '';
      if (!raw || raw === '(not set)' || raw === '(direct)') continue;
      let host = raw;
      try {
        host = new URL(raw).host || raw;
      } catch {
        host = raw;
      }
      const sessions = Number(r.metricValues?.[0]?.value ?? 0);
      const activeUsers = Number(r.metricValues?.[1]?.value ?? 0);
      const prev = referrerHostMap.get(host) ?? { sessions: 0, activeUsers: 0 };
      referrerHostMap.set(host, {
        sessions: prev.sessions + sessions,
        activeUsers: prev.activeUsers + activeUsers,
      });
    }
    const referrers = Array.from(referrerHostMap.entries())
      .map(([host, v]) => ({ host, ...v }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    // Nest landing pages under channels; keep the top 3 per channel.
    const landingMap = new Map<string, { path: string; sessions: number }[]>();
    for (const r of landingByChannelRes.rows ?? []) {
      const ch = r.dimensionValues?.[0]?.value ?? 'unknown';
      const path = r.dimensionValues?.[1]?.value ?? '';
      const sessions = Number(r.metricValues?.[0]?.value ?? 0);
      if (!landingMap.has(ch)) landingMap.set(ch, []);
      landingMap.get(ch)!.push({ path, sessions });
    }
    const landingByChannel: Record<string, { path: string; sessions: number }[]> = {};
    for (const [ch, rows] of landingMap) {
      landingByChannel[ch] = rows.sort((a, b) => b.sessions - a.sessions).slice(0, 3);
    }

    return NextResponse.json({
      range: { startDate, endDate },
      channels,
      sources,
      campaigns,
      referrers,
      landingByChannel,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
