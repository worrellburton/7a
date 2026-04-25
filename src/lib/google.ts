// Google OAuth + API helpers.
//
// One OAuth client, one long-lived refresh token, used for every Google API
// the app reads from (GA4 Data API, Search Console, Business Profile). The
// refresh token can live in two places, in this order of precedence:
//   1. public.google_oauth_tokens (id='primary') — written by an admin
//      using the in-app "Reconnect Google" flow at /api/google/oauth/*.
//      This is the path of least resistance: a Workspace admin clicks a
//      button, signs in with Google, and the new token is live without
//      a Vercel deploy.
//   2. GOOGLE_OAUTH_REFRESH_TOKEN env var — original/legacy path, minted
//      via OAuth Playground. Still consulted as a fallback so a fresh
//      deploy with no DB row keeps working.
//
// When the refresh fails with `invalid_grant` (token expired/revoked),
// callers see a typed `GoogleTokenInvalidGrantError` so the UI can show
// a Reconnect button instead of a generic 500.
//
// Env:
//   GOOGLE_OAUTH_CLIENT_ID       (required)
//   GOOGLE_OAUTH_CLIENT_SECRET   (required)
//   GOOGLE_OAUTH_REFRESH_TOKEN   (optional fallback if no DB row)
//   GOOGLE_OAUTH_REDIRECT_URI    (required for the in-app reconnect flow)
//   GA4_PROPERTY_ID              (required for ga4Run / ga4TopPages)
//   GSC_SITE_URL                 (required for gscSearchAnalytics)

import { getAdminSupabase } from '@/lib/supabase-server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
  /** Tag the cache entry with the refresh token that produced it so a
   *  reconnect (which writes a new refresh token to the DB) immediately
   *  invalidates the in-memory access token. */
  refreshToken: string;
}
let cachedToken: CachedToken | null = null;

export class GoogleTokenInvalidGrantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleTokenInvalidGrantError';
  }
}

export function hasGoogleOAuth(): boolean {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const admin = getAdminSupabase();
    const { data } = await admin
      .from('google_oauth_tokens')
      .select('refresh_token')
      .eq('id', 'primary')
      .maybeSingle();
    const tok = data?.refresh_token;
    return typeof tok === 'string' && tok.length > 0 ? tok : null;
  } catch {
    // Table missing or DB unreachable — fall back to env var.
    return null;
  }
}

/** Drop the in-memory access token (used by the reconnect flow so a
 *  fresh refresh token takes effect on the next API call). */
export function invalidateCachedGoogleToken(): void {
  cachedToken = null;
}

export async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth env missing (CLIENT_ID / CLIENT_SECRET)');
  }

  const dbToken = await getStoredRefreshToken();
  const refreshToken = dbToken ?? process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? null;
  if (!refreshToken) {
    throw new GoogleTokenInvalidGrantError(
      'Google is not connected. An admin needs to run "Reconnect Google" to authorize the integration.',
    );
  }

  if (
    cachedToken &&
    cachedToken.refreshToken === refreshToken &&
    cachedToken.expiresAt - Date.now() > 60_000
  ) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    // Distinguish "you need to reconnect" from generic outages so the
    // UI can render a Reconnect button instead of a scary stack trace.
    if (res.status === 400 && /invalid_grant/i.test(text)) {
      throw new GoogleTokenInvalidGrantError(
        `Google token refresh failed: ${res.status} ${text}`,
      );
    }
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    refreshToken,
  };
  return json.access_token;
}

async function googleFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getGoogleAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method || 'GET'} ${url} -> ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// -------- GA4 Data API --------

interface Ga4OrderBy {
  metric?: { metricName: string };
  dimension?: { dimensionName: string };
  desc?: boolean;
}

interface Ga4RunRequest {
  dateRanges: { startDate: string; endDate: string }[];
  metrics: { name: string }[];
  dimensions?: { name: string }[];
  limit?: number;
  orderBys?: Ga4OrderBy[];
}

export interface Ga4RunReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string; type: string }[];
  rows?: {
    dimensionValues?: { value: string }[];
    metricValues?: { value: string }[];
  }[];
  rowCount?: number;
  totals?: { metricValues?: { value: string }[] }[];
}

export async function ga4Run(body: Ga4RunRequest): Promise<Ga4RunReportResponse> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GA4_PROPERTY_ID is not set');
  const cleanId = propertyId.replace(/^properties\//, '');
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanId}:runReport`;
  return googleFetch<Ga4RunReportResponse>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

interface Ga4RealtimeRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  limit?: number;
  orderBys?: Ga4OrderBy[];
  minuteRanges?: { startMinutesAgo: number; endMinutesAgo: number }[];
}

export async function ga4RunRealtime(body: Ga4RealtimeRequest): Promise<Ga4RunReportResponse> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GA4_PROPERTY_ID is not set');
  const cleanId = propertyId.replace(/^properties\//, '');
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanId}:runRealtimeReport`;
  return googleFetch<Ga4RunReportResponse>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// -------- Business Profile (reviews) --------
//
// The Google Business Profile API is what actually returns the full
// review corpus for a managed location. Places Details caps at 5 — BP
// paginates through all of them (50 per page by default). We use the
// legacy v4 endpoint because Google has not migrated reviews to the
// newer mybusinessbusinessinformation.googleapis.com service yet.
//
// Env:
//   GOOGLE_BP_ACCOUNT_ID   — bare numeric account id (see /api/admin/bp/discover)
//   GOOGLE_BP_LOCATION_ID  — bare numeric location id
//
// OAuth scope required on the refresh token: https://www.googleapis.com/auth/business.manage

export interface MbStarRatingMap {
  FIVE: 5;
  FOUR: 4;
  THREE: 3;
  TWO: 2;
  ONE: 1;
  STAR_RATING_UNSPECIFIED: 0;
}

interface MbReview {
  reviewId: string;
  reviewer?: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  };
  starRating?: keyof MbStarRatingMap;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
  name?: string;
}

interface MbReviewsResponse {
  reviews?: MbReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

export interface MbNormalizedReview {
  id: string;
  authorName: string;
  profilePhotoUrl: string | null;
  rating: number;
  text: string;
  createdAt: string;
  relativeTime: string;
}

export interface MbReviewsResult {
  reviews: MbNormalizedReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
}

const STAR_MAP: Record<string, number> = {
  FIVE: 5,
  FOUR: 4,
  THREE: 3,
  TWO: 2,
  ONE: 1,
  STAR_RATING_UNSPECIFIED: 0,
};

function relativeTimeFrom(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const DAY = 86_400_000;
  const days = Math.floor(diff / DAY);
  if (days < 1) return 'today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? '' : 's'} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m === 1 ? '' : 's'} ago`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

export function hasBusinessProfileConfig(): boolean {
  return (
    hasGoogleOAuth() &&
    !!process.env.GOOGLE_BP_ACCOUNT_ID &&
    !!process.env.GOOGLE_BP_LOCATION_ID
  );
}

/**
 * List every review for the configured Seven Arrows location via the
 * Business Profile v4 reviews endpoint. Paginates automatically. Caller
 * is responsible for caching (wrap the call site with Next
 * `unstable_cache` or fetch revalidate tags, since this helper itself
 * does not cache).
 *
 * Rate-limit note: historically 1 QPM per location; now relaxed, but
 * don't hammer it — serve cached results where possible.
 */
export async function mbReviews(options?: {
  accountId?: string;
  locationId?: string;
  /** Hard cap on pages fetched so a runaway loop can't accidentally burn quota. */
  maxPages?: number;
}): Promise<MbReviewsResult> {
  const accountId = options?.accountId ?? process.env.GOOGLE_BP_ACCOUNT_ID;
  const locationId = options?.locationId ?? process.env.GOOGLE_BP_LOCATION_ID;
  const maxPages = options?.maxPages ?? 10; // 10 * 50 = 500 reviews max per call

  if (!accountId || !locationId) {
    throw new Error('GOOGLE_BP_ACCOUNT_ID and GOOGLE_BP_LOCATION_ID must be set');
  }

  const out: MbReview[] = [];
  let pageToken: string | undefined;
  let average: number | null = null;
  let total: number | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
    );
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await googleFetch<MbReviewsResponse>(url.toString());
    if (data.reviews) out.push(...data.reviews);
    if (typeof data.averageRating === 'number') average = data.averageRating;
    if (typeof data.totalReviewCount === 'number') total = data.totalReviewCount;
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  const reviews: MbNormalizedReview[] = out.map((r) => ({
    id: r.reviewId || r.name || '',
    authorName: r.reviewer?.displayName || 'Google user',
    profilePhotoUrl: r.reviewer?.profilePhotoUrl ?? null,
    rating: STAR_MAP[r.starRating ?? 'STAR_RATING_UNSPECIFIED'] ?? 0,
    text: r.comment ?? '',
    createdAt: r.createTime ?? '',
    relativeTime: relativeTimeFrom(r.createTime),
  }));

  return {
    reviews,
    averageRating: average,
    totalReviewCount: total,
  };
}

/**
 * Discover the authenticated account's Business Profile accounts and
 * the locations under each. Used once by an admin to find the IDs that
 * populate GOOGLE_BP_ACCOUNT_ID / GOOGLE_BP_LOCATION_ID.
 */
export interface MbAccount {
  name: string; // "accounts/{id}"
  accountName?: string;
  type?: string;
}
export interface MbLocation {
  name: string; // "accounts/{aid}/locations/{lid}"
  title?: string;
  storeCode?: string;
}
export async function mbAccounts(): Promise<MbAccount[]> {
  const data = await googleFetch<{ accounts?: MbAccount[] }>(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
  );
  return data.accounts ?? [];
}
export async function mbLocations(accountId: string): Promise<MbLocation[]> {
  const url = new URL(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
  );
  url.searchParams.set('readMask', 'name,title,storeCode');
  const data = await googleFetch<{ locations?: MbLocation[] }>(url.toString());
  return data.locations ?? [];
}

// -------- Search Console --------

interface GscQueryRequest {
  startDate: string;
  endDate: string;
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'date'>;
  rowLimit?: number;
  startRow?: number;
}

export interface GscQueryResponse {
  rows?: {
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }[];
  responseAggregationType?: string;
}

export async function gscSearchAnalytics(body: GscQueryRequest): Promise<GscQueryResponse> {
  const site = process.env.GSC_SITE_URL;
  if (!site) throw new Error('GSC_SITE_URL is not set');
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  return googleFetch<GscQueryResponse>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
