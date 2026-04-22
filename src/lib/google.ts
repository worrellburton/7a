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
//   GSC_SITE_URL                 (required for gscSearchAnalytics)

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

interface Ga4RunRequest {
  dateRanges: { startDate: string; endDate: string }[];
  metrics: { name: string }[];
  dimensions?: { name: string }[];
  limit?: number;
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[];
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
