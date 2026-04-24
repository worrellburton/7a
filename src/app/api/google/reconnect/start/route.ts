import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { buildGoogleReconnectUrl } from '@/lib/google';

// GET /api/google/reconnect/start
// Admin-only. Kicks off the OAuth2 Authorization Code flow against the same
// Google OAuth client that backs the env refresh token, so the admin can mint
// a replacement when the existing refresh token gets revoked.
//
// The callback returns to /api/google/reconnect/callback and renders the new
// refresh token for the admin to paste into GOOGLE_OAUTH_REFRESH_TOKEN in
// Vercel. Tokens never touch the database — pasting into env keeps a single
// source of truth for every server that reads Google APIs.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not configured' },
      { status: 412 }
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/google/reconnect/callback`;
  const state = crypto.randomUUID();
  const authUrl = buildGoogleReconnectUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('google_reconnect_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
