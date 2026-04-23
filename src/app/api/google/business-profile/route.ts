import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  GoogleApiError,
  gbpListAccounts,
  gbpMultiDailyMetrics,
  gbpReviews,
  hasGoogleOAuth,
  resolveGbpLocation,
  type GbpMetric,
} from '@/lib/google';

// GET /api/google/business-profile?days=28
// Admin-only. Returns Google Business Profile data for the resolved location:
//   - location:   name, address, phone, website, maps URL
//   - account:    the owning account
//   - metrics:    daily series for impressions (maps/search x mobile/desktop),
//                 website clicks, call clicks, direction requests, conversations
//   - totals:     summed values over the window
//   - reviews:    up to 20 most recent (may be empty if the legacy v4 API
//                 denies the project — handled gracefully)

export const dynamic = 'force-dynamic';

const METRICS: GbpMetric[] = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'WEBSITE_CLICKS',
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_CONVERSATIONS',
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth()) {
    return NextResponse.json(
      { error: 'Business Profile not configured (GOOGLE_OAUTH_* required)' },
      { status: 412 }
    );
  }

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '28')));

  // Business Profile Performance API lags ~2 days like GSC.
  const endDate = daysAgo(2);
  const startDate = daysAgo(days + 1);

  try {
    const { account, location } = await resolveGbpLocation();

    const [series, reviewsSafe] = await Promise.all([
      gbpMultiDailyMetrics(location.name, METRICS, startDate, endDate).catch((err) => {
        // If the Performance API denies the project (common when the scope is
        // granted but the location is pending verification), bubble up but
        // don't kill the whole response.
        if (err instanceof GoogleApiError) {
          return { error: `Performance API: ${err.status} ${err.body.slice(0, 300)}` };
        }
        throw err;
      }),
      gbpReviews(account.name, location.name, 20).catch((err) => {
        if (err instanceof GoogleApiError) {
          return { error: `Reviews API: ${err.status} ${err.body.slice(0, 300)}` };
        }
        throw err;
      }),
    ]);

    const metricsPayload = Array.isArray(series)
      ? {
          series,
          totals: Object.fromEntries(series.map((s) => [s.metric, s.total])),
          error: null as string | null,
        }
      : { series: [], totals: {}, error: series.error };

    const reviewsPayload =
      reviewsSafe && 'reviews' in reviewsSafe
        ? reviewsSafe
        : { reviews: [], averageRating: null, totalReviewCount: null, error: reviewsSafe.error };

    return NextResponse.json({
      range: { startDate, endDate, days },
      account: {
        name: account.name,
        accountName: account.accountName ?? null,
        role: account.role ?? null,
        type: account.type ?? null,
      },
      location: {
        name: location.name,
        title: location.title ?? null,
        phone: location.phoneNumbers?.primaryPhone ?? null,
        website: location.websiteUri ?? null,
        mapsUri: location.metadata?.mapsUri ?? null,
        newReviewUri: location.metadata?.newReviewUri ?? null,
        address: formatAddress(location.storefrontAddress),
      },
      metrics: metricsPayload,
      reviews: reviewsPayload,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof GoogleApiError && err.status === 403) {
      let accounts: Awaited<ReturnType<typeof gbpListAccounts>> = [];
      try {
        accounts = await gbpListAccounts();
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        {
          error: `Business Profile denied access: ${err.body.slice(0, 300)}`,
          hint:
            'The connected Google account needs manager/owner access on the Business Profile, ' +
            'and the OAuth refresh token must have the `https://www.googleapis.com/auth/business.manage` scope. ' +
            'Re-mint the refresh token in OAuth Playground with that scope selected.',
          accounts,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

interface AddressInput {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  regionCode?: string;
}

function formatAddress(a: AddressInput | undefined): string | null {
  if (!a) return null;
  const lines = (a.addressLines ?? []).filter(Boolean).join(', ');
  const tail = [a.locality, a.administrativeArea, a.postalCode].filter(Boolean).join(' ');
  const full = [lines, tail].filter(Boolean).join(', ');
  return full || null;
}
