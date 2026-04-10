// QuickBooks Online OAuth2 helpers.
//
// QuickBooks uses a standard OAuth2 authorization code flow. Tokens live in
// the public.integrations table. Access tokens are short-lived (~1 hour);
// refresh tokens are valid for ~100 days. This module handles refresh
// transparently when the stored access token is within 5 minutes of expiry.

import { getAdminSupabase } from './supabase-server';

const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const INTUIT_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
// Sandbox API base. Swap to https://quickbooks.api.intuit.com when promoted to production.
const QB_API_BASE =
  process.env.QUICKBOOKS_ENV === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

export const QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';

export function getQuickBooksClientId(): string {
  return process.env.QUICKBOOKS_CLIENT_ID || '';
}

export function getQuickBooksClientSecret(): string {
  return process.env.QUICKBOOKS_CLIENT_SECRET || '';
}

export function getQuickBooksRedirectUri(origin: string): string {
  return process.env.QUICKBOOKS_REDIRECT_URI || `${origin}/api/quickbooks/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const clientId = getQuickBooksClientId();
  const redirect = getQuickBooksRedirectUri(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: QUICKBOOKS_SCOPES,
    redirect_uri: redirect,
    state,
  });
  return `${INTUIT_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string, origin: string): Promise<TokenResponse> {
  const clientId = getQuickBooksClientId();
  const clientSecret = getQuickBooksClientSecret();
  const redirect = getQuickBooksRedirectUri(origin);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirect,
  });
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
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
  const clientId = getQuickBooksClientId();
  const clientSecret = getQuickBooksClientSecret();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
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

export interface QuickBooksIntegration {
  id: string;
  provider: string;
  realm_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connected_at: string | null;
}

export async function loadIntegration(): Promise<QuickBooksIntegration | null> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('integrations')
    .select('id, provider, realm_id, access_token, refresh_token, expires_at, connected_at')
    .eq('provider', 'quickbooks')
    .maybeSingle();
  if (error || !data) return null;
  return data as QuickBooksIntegration;
}

export async function saveIntegration(
  realmId: string,
  tokens: TokenResponse,
  connectedBy: string | null
): Promise<void> {
  const admin = getAdminSupabase();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await admin
    .from('integrations')
    .upsert(
      {
        provider: 'quickbooks',
        realm_id: realmId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        connected_by: connectedBy,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' }
    );
}

export async function deleteIntegration(): Promise<void> {
  const admin = getAdminSupabase();
  await admin.from('integrations').delete().eq('provider', 'quickbooks');
}

// Returns a valid access token, refreshing if needed. Throws if disconnected.
export async function getAccessToken(): Promise<{ accessToken: string; realmId: string }> {
  let row = await loadIntegration();
  if (!row || !row.access_token || !row.realm_id) {
    throw new Error('QuickBooks is not connected');
  }

  const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const fiveMinutes = 5 * 60 * 1000;
  if (expires < Date.now() + fiveMinutes) {
    if (!row.refresh_token) throw new Error('QuickBooks refresh token missing; reconnect');
    const next = await refreshTokens(row.refresh_token);
    await saveIntegration(row.realm_id, next, null);
    row = await loadIntegration();
    if (!row) throw new Error('Failed to reload integration after refresh');
  }

  return { accessToken: row.access_token!, realmId: row.realm_id! };
}

// Thin wrapper for authenticated QBO API calls.
export async function qbFetch<T>(path: string): Promise<T> {
  const { accessToken, realmId } = await getAccessToken();
  const url = `${QB_API_BASE}/v3/company/${realmId}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}
