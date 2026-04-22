import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/audience?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Powers the Audience section: who the visitors are + where
// they come from + what devices they use.
//   - countries:   top countries by users (primary list for US-heavy site)
//   - states:      US states (when country=United States)
//   - cities:      top cities
//   - devices:     deviceCategory split (mobile / desktop / tablet)
//   - browsers:    browser share
//   - os:          operating system share
//   - languages:   language share (top 10)
//   - ageBrackets + gender: only populated if demographics are enabled
//                  in GA4 + the property has enough volume

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
    const [
      countriesRes,
      statesRes,
      citiesRes,
      devicesRes,
      browsersRes,
      osRes,
      languagesRes,
      ageRes,
      genderRes,
    ] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 15,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'region' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 20,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
        ],
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'language' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'userAgeBracket' }],
        metrics: [{ name: 'activeUsers' }],
      }).catch(() => ({ rows: [] })),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'userGender' }],
        metrics: [{ name: 'activeUsers' }],
      }).catch(() => ({ rows: [] })),
    ]);

    const countries = (countriesRes.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    const states = (statesRes.rows ?? []).map((r) => ({
      state: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const cities = (citiesRes.rows ?? [])
      .map((r) => ({
        city: r.dimensionValues?.[0]?.value ?? '',
        users: Number(r.metricValues?.[0]?.value ?? 0),
        sessions: Number(r.metricValues?.[1]?.value ?? 0),
      }))
      .filter((c) => c.city && c.city !== '(not set)');

    const devices = (devicesRes.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      avgDurationSec: Number(r.metricValues?.[3]?.value ?? 0),
    }));

    const browsers = (browsersRes.rows ?? []).map((r) => ({
      browser: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const os = (osRes.rows ?? []).map((r) => ({
      os: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const languages = (languagesRes.rows ?? []).map((r) => ({
      language: r.dimensionValues?.[0]?.value ?? '',
      users: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const ageBrackets = (ageRes.rows ?? [])
      .map((r) => ({
        bracket: r.dimensionValues?.[0]?.value ?? '',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      }))
      .filter((b) => b.bracket && b.bracket !== '(not set)' && b.bracket !== 'unknown');

    const genders = (genderRes.rows ?? [])
      .map((r) => ({
        gender: r.dimensionValues?.[0]?.value ?? '',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      }))
      .filter((g) => g.gender && g.gender !== '(not set)' && g.gender !== 'unknown');

    return NextResponse.json({
      range: { startDate, endDate },
      countries,
      states,
      cities,
      devices,
      browsers,
      os,
      languages,
      ageBrackets,
      genders,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
