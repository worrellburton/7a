import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { invalidateCachedGoogleToken } from '@/lib/google';

// GET /api/google/oauth/callback?code=…&state=…
//
// Google redirects here after the admin grants consent. We:
//   1. validate the `state` cookie matches the query param
//   2. exchange the auth code for a refresh token
//   3. upsert the refresh token into public.google_oauth_tokens
//   4. invalidate the in-memory access-token cache
//   5. redirect back to the page the admin came from

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const STATE_COOKIE = 'google_oauth_state';

function originOf(req: Request): string {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function fail(req: Request, reason: string, returnTo = '/app/analytics'): NextResponse {
  const url = new URL(returnTo, originOf(req));
  url.searchParams.set('google_oauth', 'error');
  url.searchParams.set('reason', reason);
  return NextResponse.redirect(url.toString(), { status: 302 });
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/app', originOf(req)).toString(), { status: 302 });
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.redirect(new URL('/app', originOf(req)).toString(), { status: 302 });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errParam = url.searchParams.get('error');

  const jar = await cookies();
  const stateCookie = jar.get(STATE_COOKIE)?.value ?? '';
  const [storedState, returnTo] = stateCookie.split('|');
  const dest = returnTo || '/app/analytics';

  // Always clear the cookie before responding.
  const clearCookie = (res: NextResponse) => {
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  if (errParam) return clearCookie(fail(req, errParam, dest));
  if (!code || !state || !storedState || state !== storedState) {
    return clearCookie(fail(req, 'state_mismatch', dest));
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return clearCookie(fail(req, 'not_configured', dest));
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const tokRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!tokRes.ok) {
    return clearCookie(fail(req, `token_exchange_${tokRes.status}`, dest));
  }
  const tok = (await tokRes.json()) as {
    refresh_token?: string;
    scope?: string;
    access_token?: string;
  };
  if (!tok.refresh_token) {
    // Google omits refresh_token on repeat grants without prompt=consent.
    // The /start route always sends prompt=consent, so this should never
    // happen — but if it does, surface the failure rather than store a
    // useless row.
    return clearCookie(fail(req, 'no_refresh_token', dest));
  }

  const admin = getAdminSupabase();
  const { error } = await admin.from('google_oauth_tokens').upsert(
    {
      id: 'primary',
      refresh_token: tok.refresh_token,
      scope: tok.scope ?? null,
      updated_by: user.id,
    },
    { onConflict: 'id' },
  );
  if (error) {
    return clearCookie(fail(req, 'db_write_failed', dest));
  }

  invalidateCachedGoogleToken();

  const successUrl = new URL(dest, originOf(req));
  successUrl.searchParams.set('google_oauth', 'success');
  return clearCookie(NextResponse.redirect(successUrl.toString(), { status: 302 }));
}
