import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { exchangeReconnectCode } from '@/lib/google';

// GET /api/google/reconnect/callback?code=...&state=...
// Admin-only. Exchanges the authorization code from the reconnect flow for
// a new refresh token and redirects the admin to /app/google-reconnect with
// a one-shot signed cookie carrying the token. The page reads the cookie
// client-side and shows the copy-to-Vercel instructions, then clears it.
//
// The refresh token is never persisted server-side. It's issued to the
// browser once via an httpOnly cookie (so the page's server component can
// read it), and the page response immediately expires the cookie.

export const dynamic = 'force-dynamic';

const ADMIN_REDIRECT = '/app/google-reconnect';

function redirectWithError(origin: string, error: string) {
  const url = `${origin}${ADMIN_REDIRECT}?error=${encodeURIComponent(error)}`;
  const res = NextResponse.redirect(url);
  res.cookies.delete('google_reconnect_state');
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { origin } = url;

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return redirectWithError(origin, `google_${oauthError}`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get('google_reconnect_state')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return redirectWithError(origin, 'state_mismatch');
  }
  if (!code) {
    return redirectWithError(origin, 'missing_code');
  }

  const redirectUri = `${origin}/api/google/reconnect/callback`;

  try {
    const tokens = await exchangeReconnectCode(code, redirectUri);
    const res = NextResponse.redirect(`${origin}${ADMIN_REDIRECT}?ok=1`);
    res.cookies.delete('google_reconnect_state');
    // One-shot handoff. The admin page reads this server-side, renders the
    // token, and the response clears the cookie so the token can't linger
    // in the browser across reloads.
    res.cookies.set('google_reconnect_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300,
      path: ADMIN_REDIRECT,
    });
    res.cookies.set('google_reconnect_scope', tokens.scope, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300,
      path: ADMIN_REDIRECT,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return redirectWithError(origin, message);
  }
}
