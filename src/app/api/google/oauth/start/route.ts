import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/google/oauth/start — admin only.
//
// Generates the Google consent URL the admin should be redirected
// to, and sets a short-lived state cookie the callback validates.
// Requires `access_type=offline` + `prompt=consent` so Google mints
// a fresh refresh token (it would otherwise omit refresh_token on
// repeat consents).

export const dynamic = 'force-dynamic';

const GOOGLE_AUTHZ_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE = 'google_oauth_state';

// Scopes mirror what the existing refresh token covered: GA4 read,
// Search Console read, Business Profile read+manage. If you change
// these, also remove the row from public.google_oauth_tokens so a
// fresh consent is forced on the next reconnect.
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/business.manage',
];

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          'Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI, and add the redirect URI to the OAuth client in Google Cloud Console.',
      },
      { status: 412 },
    );
  }

  const state = randomToken();
  const reqUrl = new URL(req.url);
  const returnTo = reqUrl.searchParams.get('returnTo') || '/app/analytics';

  const url = new URL(GOOGLE_AUTHZ_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);

  const res = NextResponse.json({ url: url.toString() });
  // Bind the state to this browser via a cookie. The callback will
  // refuse mismatched states, so an attacker can't trick an admin
  // into authorizing a different account.
  res.cookies.set(STATE_COOKIE, `${state}|${returnTo}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return res;
}
