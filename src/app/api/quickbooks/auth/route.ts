import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, getClientId } from '@/lib/quickbooks';

// GET /api/quickbooks/auth
// Kicks off the OAuth2 Authorization Code flow by redirecting to Intuit.
// Multi-tenant — any admin can connect another Intuit company; their tokens
// land in quickbooks_tokens keyed by realm_id.
export async function GET(req: NextRequest) {
  if (!getClientId()) {
    return NextResponse.json(
      { error: 'QUICKBOOKS_CLIENT_ID is not configured on the server' },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const authUrl = buildAuthUrl(origin, state);

  const res = NextResponse.redirect(authUrl);
  // Cookie-based CSRF check for the callback.
  res.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
