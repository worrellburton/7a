// Google OAuth + API helpers.
//
// One OAuth client, one long-lived refresh token, used for every Google API
// the app reads from (GA4 Data API, Search Console, Business Profile). The
// refresh token is minted once via OAuth Playground as the Workspace admin
// and stored in Vercel env; each request trades it for a short-lived access
// token, with an in-memory cache so hot paths don't hammer the token endpoint.
//
// Env:
//   GOOGLE_OAUTH_CLIENT_ID       (required)
//   GOOGLE_OAUTH_CLIENT_SECRET   (required)
//   GOOGLE_OAUTH_REFRESH_TOKEN   (required)
//   GA4_PROPERTY_ID              (required for ga4Run / ga4TopPages)
//   GSC_SITE_URL                 (optional; auto-resolved from accessible
//                                 sites if unset or not accessible)
//   GBP_LOCATION_NAME            (optional, e.g. "locations/12345". If unset
//                                 we pick the first location on the first
//                                 account.)

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

export function hasGoogleOAuth(): boolean {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

export async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth env missing (CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN)');
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
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export class GoogleApiError extends Error {
  status: number;
  method: string;
  url: string;
  body: string;
  constructor(method: string, url: string, status: number, body: string) {
    super(`${method} ${url} -> ${status}: ${body}`);
    this.status = status;
    this.method = method;
    this.url = url;
    this.body = body;
  }
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
    throw new GoogleApiError(init.method || 'GET', url, res.status, text);
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

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export async function gscListSites(): Promise<GscSite[]> {
  const res = await googleFetch<{ siteEntry?: GscSite[] }>(
    'https://searchconsole.googleapis.com/webmasters/v3/sites',
    { method: 'GET' }
  );
  return res.siteEntry ?? [];
}

// Given a preferred site (e.g. the eventual domain) and the list the OAuth
// account actually owns, pick the best match. Exact first, then the same
// domain via URL-prefix <-> sc-domain swap, then a host-substring match,
// finally the first site with write access, finally the first site.
function pickBestSite(preferred: string | undefined, sites: GscSite[]): GscSite | null {
  if (!sites.length) return null;
  const usable = sites.filter((s) => s.permissionLevel !== 'siteUnverifiedUser');
  if (!usable.length) return null;

  if (preferred) {
    const exact = usable.find((s) => s.siteUrl === preferred);
    if (exact) return exact;

    const preferredHost = preferred
      .replace(/^sc-domain:/, '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase();
    if (preferredHost) {
      const host = usable.find((s) => {
        const h = s.siteUrl
          .replace(/^sc-domain:/, '')
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .toLowerCase();
        return h === preferredHost || h.endsWith('.' + preferredHost) || preferredHost.endsWith('.' + h);
      });
      if (host) return host;
    }
  }

  const owner = usable.find((s) => s.permissionLevel === 'siteOwner');
  return owner ?? usable[0];
}

let cachedResolvedSite: { value: string; at: number } | null = null;

// Resolve the site URL to query. Prefers GSC_SITE_URL, but if that's unset
// or the OAuth account doesn't have access, falls back to the best-matching
// accessible site. Cached for 10 minutes to avoid repeat sites.list calls.
export async function resolveGscSite(): Promise<string> {
  if (cachedResolvedSite && Date.now() - cachedResolvedSite.at < 10 * 60_000) {
    return cachedResolvedSite.value;
  }
  const preferred = process.env.GSC_SITE_URL || undefined;
  const sites = await gscListSites();
  if (!sites.length) {
    throw new Error(
      'No Search Console sites are accessible to the connected Google account. ' +
        'Add the account as an owner/full-user on the Search Console property.'
    );
  }
  const picked = pickBestSite(preferred, sites);
  if (!picked) {
    throw new Error(
      `Connected Google account has no usable Search Console sites. Found: ${sites
        .map((s) => `${s.siteUrl} (${s.permissionLevel})`)
        .join(', ')}`
    );
  }
  if (preferred && picked.siteUrl !== preferred) {
    console.warn(
      `[gsc] GSC_SITE_URL=${preferred} is not accessible. Falling back to ${picked.siteUrl}.`
    );
  }
  cachedResolvedSite = { value: picked.siteUrl, at: Date.now() };
  return picked.siteUrl;
}

export async function gscSearchAnalytics(body: GscQueryRequest, siteOverride?: string): Promise<GscQueryResponse> {
  const site = siteOverride ?? (await resolveGscSite());
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  return googleFetch<GscQueryResponse>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// -------- Google Business Profile --------
//
// Three separate services under the "Business Profile" umbrella, all using
// the same OAuth scope (https://www.googleapis.com/auth/business.manage):
//   - mybusinessaccountmanagement (account list)
//   - mybusinessbusinessinformation (location list / details)
//   - businessprofileperformance (daily metric time series)
// Reviews live on the legacy mybusiness v4 API. All are rate-limited per
// project — expect 429s on burst; we fetch sparingly.

export interface GbpAccount {
  name: string; // "accounts/{id}"
  accountName?: string;
  type?: string;
  role?: string;
  verificationState?: string;
}

export interface GbpLocation {
  name: string; // "locations/{id}"
  title?: string;
  storeCode?: string;
  websiteUri?: string;
  phoneNumbers?: { primaryPhone?: string };
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  metadata?: { mapsUri?: string; newReviewUri?: string };
}

export async function gbpListAccounts(): Promise<GbpAccount[]> {
  const res = await googleFetch<{ accounts?: GbpAccount[] }>(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { method: 'GET' }
  );
  return res.accounts ?? [];
}

export async function gbpListLocations(accountName: string): Promise<GbpLocation[]> {
  const readMask = [
    'name',
    'title',
    'storeCode',
    'websiteUri',
    'phoneNumbers',
    'storefrontAddress',
    'metadata',
  ].join(',');
  const out: GbpLocation[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
    url.searchParams.set('readMask', readMask);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await googleFetch<{ locations?: GbpLocation[]; nextPageToken?: string }>(
      url.toString(),
      { method: 'GET' }
    );
    if (res.locations) out.push(...res.locations);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

export type GbpMetric =
  | 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS'
  | 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'
  | 'BUSINESS_IMPRESSIONS_MOBILE_MAPS'
  | 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
  | 'BUSINESS_CONVERSATIONS'
  | 'BUSINESS_DIRECTION_REQUESTS'
  | 'CALL_CLICKS'
  | 'WEBSITE_CLICKS'
  | 'BUSINESS_BOOKINGS'
  | 'BUSINESS_FOOD_ORDERS'
  | 'BUSINESS_FOOD_MENU_CLICKS';

export interface GbpDailyPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface GbpMultiMetricSeries {
  metric: GbpMetric;
  daily: GbpDailyPoint[];
  total: number;
}

interface GbpMultiMetricApiResponse {
  multiDailyMetricTimeSeries?: Array<{
    dailyMetricTimeSeries?: Array<{
      dailyMetric?: GbpMetric;
      timeSeries?: {
        datedValues?: Array<{
          date?: { year?: number; month?: number; day?: number };
          value?: string | number;
        }>;
      };
    }>;
  }>;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function gbpMultiDailyMetrics(
  locationName: string,
  metrics: GbpMetric[],
  startDate: string,
  endDate: string
): Promise<GbpMultiMetricSeries[]> {
  const locId = locationName.replace(/^locations\//, '');
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const url = new URL(
    `https://businessprofileperformance.googleapis.com/v1/locations/${locId}:fetchMultiDailyMetricsTimeSeries`
  );
  for (const m of metrics) url.searchParams.append('dailyMetrics', m);
  url.searchParams.set('dailyRange.startDate.year', String(sy));
  url.searchParams.set('dailyRange.startDate.month', String(sm));
  url.searchParams.set('dailyRange.startDate.day', String(sd));
  url.searchParams.set('dailyRange.endDate.year', String(ey));
  url.searchParams.set('dailyRange.endDate.month', String(em));
  url.searchParams.set('dailyRange.endDate.day', String(ed));

  const res = await googleFetch<GbpMultiMetricApiResponse>(url.toString(), { method: 'GET' });

  const byMetric = new Map<GbpMetric, GbpDailyPoint[]>();
  for (const block of res.multiDailyMetricTimeSeries ?? []) {
    for (const series of block.dailyMetricTimeSeries ?? []) {
      const metric = series.dailyMetric;
      if (!metric) continue;
      const points: GbpDailyPoint[] = (series.timeSeries?.datedValues ?? []).map((dv) => {
        const y = dv.date?.year ?? 1970;
        const mo = dv.date?.month ?? 1;
        const d = dv.date?.day ?? 1;
        return {
          date: `${y}-${pad2(mo)}-${pad2(d)}`,
          value: Number(dv.value ?? 0),
        };
      });
      byMetric.set(metric, points);
    }
  }
  return metrics.map((m) => {
    const daily = (byMetric.get(m) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    return { metric: m, daily, total: daily.reduce((s, p) => s + p.value, 0) };
  });
}

export interface GbpReview {
  reviewId: string;
  reviewer: { displayName?: string; profilePhotoUrl?: string };
  starRating: number;
  comment?: string;
  createTime: string;
  updateTime?: string;
  reply?: { comment: string; updateTime: string };
}

interface GbpReviewsApiResponse {
  reviews?: Array<{
    reviewId?: string;
    reviewer?: { displayName?: string; profilePhotoUrl?: string };
    starRating?: string | number;
    comment?: string;
    createTime?: string;
    updateTime?: string;
    reviewReply?: { comment?: string; updateTime?: string };
  }>;
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function gbpReviews(
  accountName: string,
  locationName: string,
  pageSize = 20
): Promise<{ reviews: GbpReview[]; averageRating: number | null; totalReviewCount: number | null }> {
  const locId = locationName.replace(/^locations\//, '');
  const url = new URL(
    `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locId}/reviews`
  );
  url.searchParams.set('pageSize', String(pageSize));
  const res = await googleFetch<GbpReviewsApiResponse>(url.toString(), { method: 'GET' });
  const reviews: GbpReview[] = (res.reviews ?? []).map((r) => ({
    reviewId: r.reviewId ?? '',
    reviewer: {
      displayName: r.reviewer?.displayName,
      profilePhotoUrl: r.reviewer?.profilePhotoUrl,
    },
    starRating:
      typeof r.starRating === 'number'
        ? r.starRating
        : STAR_MAP[String(r.starRating ?? '').toUpperCase()] ?? 0,
    comment: r.comment,
    createTime: r.createTime ?? '',
    updateTime: r.updateTime,
    reply: r.reviewReply?.comment
      ? { comment: r.reviewReply.comment, updateTime: r.reviewReply.updateTime ?? '' }
      : undefined,
  }));
  return {
    reviews,
    averageRating: res.averageRating ?? null,
    totalReviewCount: res.totalReviewCount ?? null,
  };
}

let cachedGbpLocation: { account: string; location: GbpLocation; at: number } | null = null;

// Resolve the Business Profile location to query. Prefers GBP_LOCATION_NAME,
// but if that's unset or not found, falls back to the first location on the
// first account. Cached 10 minutes.
export async function resolveGbpLocation(): Promise<{ account: GbpAccount; location: GbpLocation }> {
  const accounts = await gbpListAccounts();
  if (!accounts.length) {
    throw new Error(
      'No Business Profile accounts accessible to the connected Google account. ' +
        'Grant manager/owner access to the Business Profile.'
    );
  }

  const preferred = process.env.GBP_LOCATION_NAME || undefined;

  if (
    cachedGbpLocation &&
    Date.now() - cachedGbpLocation.at < 10 * 60_000 &&
    (!preferred || cachedGbpLocation.location.name === preferred)
  ) {
    const acct = accounts.find((a) => a.name === cachedGbpLocation!.account) ?? accounts[0];
    return { account: acct, location: cachedGbpLocation.location };
  }

  for (const acct of accounts) {
    const locations = await gbpListLocations(acct.name);
    if (!locations.length) continue;
    const match = preferred ? locations.find((l) => l.name === preferred) : null;
    const picked = match ?? locations[0];
    if (preferred && !match) {
      console.warn(`[gbp] GBP_LOCATION_NAME=${preferred} not found on ${acct.name}.`);
    }
    cachedGbpLocation = { account: acct.name, location: picked, at: Date.now() };
    return { account: acct, location: picked };
  }

  throw new Error('Connected Google account has access to Business Profile accounts but no locations.');
}
