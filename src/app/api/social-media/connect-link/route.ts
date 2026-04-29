import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';
import { ayrsharePost, AyrshareNotConfigured, extractAyrshareError } from '@/lib/ayrshare';

// POST /api/social-media/connect-link
//   body: { platform?: string }   // optional — pre-select a platform on the hosted page
//
// Asks Ayrshare to mint a short-lived JWT-signed link the admin can
// open in a popup to connect / re-connect a social account on the
// Seven Arrows User Profile. Ayrshare hosts the OAuth flow itself —
// we just supply the URL.
//
// The JWT URL is single-use and expires shortly (Ayrshare rotates
// these every minute), so we generate it on demand each time the
// admin clicks "Connect".

export const dynamic = 'force-dynamic';

type Body = { platform?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const platform = (body.platform ?? '').trim();

  // Profile-Key MUST be set for the JWT generator — Ayrshare ties
  // the resulting hosted page to that specific User Profile.
  if (!process.env.AYRSHARE_PROFILE_KEY) {
    return NextResponse.json(
      { error: 'AYRSHARE_PROFILE_KEY is not set. Connect-link requires a User Profile.' },
      { status: 503 },
    );
  }

  try {
    // Ayrshare's generateJWT accepts an optional `domain` for white-
    // labeling. We don't pass one — the hosted page lives at
    // app.ayrshare.com, which is fine for an internal admin tool.
    const payload: Record<string, unknown> = {};
    if (platform) payload.platform = platform;

    const { status, body: result } = await ayrsharePost('/profiles/generateJWT', payload);
    if (status >= 400) {
      return NextResponse.json(
        { error: extractAyrshareError(result, status, '/profiles/generateJWT') },
        { status: 502 },
      );
    }
    // Successful response shape: { status: 'success', token, url, expiresIn }
    return NextResponse.json({
      url: typeof result.url === 'string' ? result.url : null,
      token: typeof result.token === 'string' ? result.token : null,
      expiresIn: typeof result.expiresIn === 'number' ? result.expiresIn : null,
    });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured. Set AYRSHARE_API_KEY in Vercel.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
