import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';
import { ayrsharePost, AyrshareNotConfigured, extractAyrshareError } from '@/lib/ayrshare';

// POST /api/social-media/analytics
//   body: { platforms: string[] }
//
// Proxy to Ayrshare's /analytics/social endpoint. Returns the per-
// platform stats blob — follower / fan / subscriber counts, recent
// engagement totals, etc. The shape varies across platforms (Ayrshare
// passes through whatever the platform's own analytics API exposes),
// so we hand the response back as-is and let the UI shake out the
// fields it actually wants.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { platforms?: unknown };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const raw = Array.isArray(body.platforms) ? body.platforms : [];
  const platforms = raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (platforms.length === 0) {
    return NextResponse.json({ error: 'platforms must include at least one entry' }, { status: 400 });
  }

  try {
    // Ayrshare returns a top-level object keyed by platform name when
    // /analytics/social succeeds. Errors come back per-platform, so a
    // 200 can still contain partial failures the UI needs to surface.
    const { status, body: result } = await ayrsharePost('/analytics/social', { platforms });
    if (status >= 400) {
      return NextResponse.json(
        { error: extractAyrshareError(result, status, '/analytics/social') },
        { status: 502 },
      );
    }
    return NextResponse.json({ analytics: result });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
