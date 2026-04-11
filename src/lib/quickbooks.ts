// QuickBooks Online integration — multi-tenant token store + QBO API helpers.
//
// Token store: public.quickbooks_tokens, keyed by realm_id. One row per
// connected Intuit company. All reads/writes go through the service role
// client because the JS client has hit RLS quirks on upsert in the past —
// we use raw PostgREST fetch with Prefer: resolution=merge-duplicates, as
// in the bfoffice reference integration.
//
// Env:
//   QUICKBOOKS_CLIENT_ID       (required)
//   QUICKBOOKS_CLIENT_SECRET   (required)
//   QUICKBOOKS_REDIRECT_URI    (optional — auto-derived from origin if absent)
//   QUICKBOOKS_ENV             (optional — 'production' or 'sandbox', default 'production')
//   NEXT_PUBLIC_SUPABASE_URL   (required)
//   SUPABASE_SERVICE_ROLE_KEY  (required)

export const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
export const INTUIT_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
export const INTUIT_REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
export const QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';

export function qbApiBase(): string {
  return process.env.QUICKBOOKS_ENV === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

export function getClientId(): string {
  return process.env.QUICKBOOKS_CLIENT_ID || '';
}

export function getClientSecret(): string {
  return process.env.QUICKBOOKS_CLIENT_SECRET || '';
}

export function getRedirectUri(origin: string): string {
  return process.env.QUICKBOOKS_REDIRECT_URI || `${origin}/api/quickbooks/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: 'code',
    scope: QUICKBOOKS_SCOPES,
    redirect_uri: getRedirectUri(origin),
    state,
  });
  return `${INTUIT_AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(): string {
  const raw = `${getClientId()}:${getClientSecret()}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string, origin: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(origin),
  });
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function revokeToken(refreshToken: string): Promise<void> {
  await fetch(INTUIT_REVOKE_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ token: refreshToken }),
  }).catch(() => {
    // Intuit can return 200/400 depending on state; we ignore failures so
    // the row still gets removed from our store.
  });
}

// ------------------------------------------------------------
// Token store — raw PostgREST so we don't trip over supabase-js RLS quirks.
// ------------------------------------------------------------

export interface StoredToken {
  realm_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  updated_at: string; // ISO
}

function supabaseHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return url.replace(/\/$/, '');
}

export async function listStoredTokens(): Promise<StoredToken[]> {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/quickbooks_tokens?select=*&order=updated_at.desc`,
    { headers: supabaseHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return [];
  return (await res.json()) as StoredToken[];
}

export async function getStoredToken(realmId: string): Promise<StoredToken | null> {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/quickbooks_tokens?realm_id=eq.${encodeURIComponent(realmId)}&select=*`,
    { headers: supabaseHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as StoredToken[];
  return rows[0] || null;
}

export async function upsertStoredToken(
  realmId: string,
  tokens: TokenResponse
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const row = {
    realm_id: realmId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(`${supabaseUrl()}/rest/v1/quickbooks_tokens`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upsert quickbooks_tokens: ${res.status} ${text}`);
  }
}

export async function deleteStoredToken(realmId: string): Promise<void> {
  await fetch(
    `${supabaseUrl()}/rest/v1/quickbooks_tokens?realm_id=eq.${encodeURIComponent(realmId)}`,
    { method: 'DELETE', headers: supabaseHeaders() }
  );
}

// ------------------------------------------------------------
// Access-token helper with auto-refresh and QBO fetch wrapper.
// ------------------------------------------------------------

// Returns a fresh access token, refreshing if the stored one is within
// 5 minutes of expiring. Throws 'auth_expired' on refresh failure so the
// route can surface it to the client.
export async function getFreshAccessToken(realmId: string): Promise<string> {
  const row = await getStoredToken(realmId);
  if (!row) throw new Error('auth_expired');

  const expires = new Date(row.expires_at).getTime();
  if (expires - Date.now() > 5 * 60 * 1000) {
    return row.access_token;
  }

  try {
    const refreshed = await refreshTokens(row.refresh_token);
    await upsertStoredToken(realmId, refreshed);
    return refreshed.access_token;
  } catch {
    throw new Error('auth_expired');
  }
}

// Thin wrapper — builds the URL, adds auth headers, surfaces 401 as
// 'auth_expired' so callers can respond with 401 to the frontend.
export async function qbApiFetch<T>(realmId: string, path: string): Promise<T> {
  const accessToken = await getFreshAccessToken(realmId);
  const url = `${qbApiBase()}/v3/company/${realmId}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (res.status === 401) {
    throw new Error('auth_expired');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}
