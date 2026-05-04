import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /auth/callback
//
// Supabase's canonical OAuth return path. The signInWithOAuth call
// sends the visitor to `{SITE_URL}/auth/callback?next=/app` with a
// `?code=` appended by the OAuth provider on completion. We exchange
// the short-lived code for a persistent session cookie on the server
// and then redirect to whatever `next` asked for (defaulting to /app
// for admin sign-ins).
//
// This route does two things the old implicit flow did not:
//   1. Guarantees the visitor lands on a specific post-auth page
//      instead of whichever Site URL Supabase falls back to when the
//      originating host isn't in the project's redirect allow-list.
//   2. Sets the session cookie server-side so the very first
//      request to /app already has the user attached (no flicker of
//      the unauthenticated shell).

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') || '/app';
  // Only allow same-origin relative paths as `next` so a crafted link
  // like `?next=https://evil.example` can't turn a successful login
  // into an open redirect.
  const safeNext = nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/app';

  if (code) {
    try {
      const supabase = await getServerSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
      }
    } catch (err) {
      console.error('[auth/callback] unexpected error exchanging code:', err);
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
