import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4RunRealtime, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/realtime
// Admin-only. What's happening right now (last 30 minutes).
//   - activeUsers:       single total
//   - byMinute:          activeUsers per minute, last 30
//   - topPages:          most-viewed pages in the last 30 min
//   - topCountries:      active users by country
//   - topDevices:        device category split

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  try {
    // Note: GA4's realtime report API has a smaller dimension set than
    // the regular Data API. unifiedScreenClass / source / etc. are NOT
    // valid here (they 400). The Google docs list the supported set:
    //   https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema
    // We use `platform` (Web / iOS / Android) for the breakdown that
    // used to be `unifiedScreenClass`.
    const [
      totalRes,
      newUsersRes,
      minuteRes,
      pagesRes,
      countriesRes,
      citiesRes,
      devicesRes,
      platformsRes,
      eventsRes,
    ] = await Promise.all([
      ga4RunRealtime({ metrics: [{ name: 'activeUsers' }] }),
      ga4RunRealtime({ metrics: [{ name: 'newUsers' }] }),
      ga4RunRealtime({
        dimensions: [{ name: 'minutesAgo' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 50,
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4RunRealtime({
        // City + country dimensions live in the realtime schema —
        // pair them so the panel can render "Tucson, US" rather than
        // a bare "Tucson" that's ambiguous globally.
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'platform' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      ga4RunRealtime({
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      }),
    ]);

    const activeUsers = Number(totalRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const newUsers = Number(newUsersRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);

    // Minute-ago series: 30 buckets (0..29), invert to chronological order
    // (29 minutes ago → now) for charting.
    const minutes: number[] = Array(30).fill(0);
    for (const r of minuteRes.rows ?? []) {
      const idx = Number(r.dimensionValues?.[0]?.value ?? -1);
      const v = Number(r.metricValues?.[0]?.value ?? 0);
      if (idx >= 0 && idx < 30) minutes[idx] = v;
    }
    const byMinute = minutes.slice().reverse(); // oldest → newest, left → right

    const topPages = (pagesRes.rows ?? []).map((r) => ({
      title: r.dimensionValues?.[0]?.value ?? '(unknown)',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      views: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const topCountries = (countriesRes.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? '',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const topCities = (citiesRes.rows ?? [])
      .map((r) => ({
        city: r.dimensionValues?.[0]?.value ?? '',
        country: r.dimensionValues?.[1]?.value ?? '',
        activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
      }))
      // GA4 reports an empty / "(not set)" city for clients that
      // can't be geolocated — drop those so the panel doesn't show
      // a row labeled nothing. Same with low-info "(not set)".
      .filter((c) => c.city && c.city !== '(not set)');

    const devices = (devicesRes.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? '',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const platforms = (platformsRes.rows ?? []).map((r) => ({
      platform: r.dimensionValues?.[0]?.value ?? '',
      activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const events = (eventsRes.rows ?? []).map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? '',
      count: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    return NextResponse.json({
      activeUsers,
      newUsers,
      byMinute,
      topPages,
      topCountries,
      topCities,
      devices,
      platforms,
      events,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
