import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';
import { ayrsharePost, AYRSHARE_PLATFORMS, AyrshareNotConfigured, type AyrsharePlatform } from '@/lib/ayrshare';

// POST /api/social-media/post
//   body: {
//     post: string,                  // required — caption / status text
//     platforms: string[],           // required — at least one
//     mediaUrls?: string[],          // optional — public image / video URLs
//     scheduleDate?: string,         // optional — ISO8601 in the future
//   }
//
// Hands the post off to Ayrshare's /post endpoint. Ayrshare returns a
// per-platform results array so the UI can show which ones succeeded
// and which need re-auth.

export const dynamic = 'force-dynamic';

type Body = {
  post?: string;
  platforms?: unknown;
  mediaUrls?: unknown;
  scheduleDate?: string | null;
};

const PLATFORM_SET = new Set<string>(AYRSHARE_PLATFORMS as readonly string[]);

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const post = (body.post ?? '').trim();
  if (!post) {
    return NextResponse.json({ error: 'post (text) is required' }, { status: 400 });
  }

  const platformsRaw = Array.isArray(body.platforms) ? body.platforms : [];
  const platforms: AyrsharePlatform[] = platformsRaw
    .filter((v): v is string => typeof v === 'string')
    .filter((v): v is AyrsharePlatform => PLATFORM_SET.has(v));
  if (platforms.length === 0) {
    return NextResponse.json({ error: 'platforms must include at least one supported platform' }, { status: 400 });
  }

  const mediaUrlsRaw = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
  const mediaUrls = mediaUrlsRaw
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    // Cap at 10 — same default Ayrshare enforces; rejecting on our
    // side gives a clearer error than a 400 from upstream.
    .slice(0, 10);

  const payload: Record<string, unknown> = {
    post,
    platforms,
  };
  if (mediaUrls.length > 0) payload.mediaUrls = mediaUrls;

  // scheduleDate must parse + be in the future; otherwise Ayrshare
  // 400s with a confusing message.
  if (body.scheduleDate) {
    const ts = Date.parse(body.scheduleDate);
    if (Number.isNaN(ts)) {
      return NextResponse.json({ error: 'scheduleDate must be a parseable ISO8601 timestamp' }, { status: 400 });
    }
    if (ts <= Date.now()) {
      return NextResponse.json({ error: 'scheduleDate must be in the future' }, { status: 400 });
    }
    payload.scheduleDate = new Date(ts).toISOString();
  }

  try {
    const { status, body: result } = await ayrsharePost('/post', payload);
    // Pass the upstream status through (200 OK on success, 400 on
    // platform errors). Ayrshare's response carries postIds + a
    // per-platform array even on partial success.
    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
