import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrsharePost, extractAyrshareError, AyrshareNotConfigured } from '@/lib/ayrshare';

// POST /api/social-media/analytics/post
//   body: { id: string, platforms?: string[] }
//
// Per-POST engagement (likes / comments / shares / impressions / …) from
// Ayrshare's /analytics/post for one published post, normalised to a flat
// per-platform metric list the History row can render. Distinct from
// /analytics (account-level follower counts). Ayrshare's shape varies a lot
// per network, so we walk the response defensively and surface whatever
// numeric fields it returns rather than hard-coding each platform.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRETTY: Record<string, string> = {
  likeCount: 'Likes', likes: 'Likes', favoriteCount: 'Likes',
  commentsCount: 'Comments', comments: 'Comments', commentCount: 'Comments', replyCount: 'Replies',
  sharesCount: 'Shares', shares: 'Shares', shareCount: 'Shares', retweetCount: 'Reposts',
  impressionsCount: 'Impressions', impressions: 'Impressions', impressionCount: 'Impressions',
  reachCount: 'Reach', reach: 'Reach',
  viewsCount: 'Views', views: 'Views', viewCount: 'Views', videoViews: 'Views',
  savedCount: 'Saves', saved: 'Saves', bookmarkCount: 'Saves',
  engagementCount: 'Engagement', engagement: 'Engagement', clickCount: 'Clicks', clicks: 'Clicks',
};

function flattenMetrics(obj: unknown): { label: string; value: number }[] {
  if (!obj || typeof obj !== 'object') return [];
  const out: { label: string; value: number }[] = [];
  const seen = new Set<string>();
  const walk = (o: Record<string, unknown>, depth: number) => {
    if (depth > 3) return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number' && Number.isFinite(v) && PRETTY[k]) {
        const label = PRETTY[k];
        if (!seen.has(label)) { seen.add(label); out.push({ label, value: v }); }
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v as Record<string, unknown>, depth + 1);
      }
    }
  };
  walk(obj as Record<string, unknown>, 0);
  return out;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: { id?: unknown; platforms?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const platforms = Array.isArray(body.platforms)
    ? (body.platforms as unknown[]).filter((p): p is string => typeof p === 'string')
    : undefined;

  try {
    const payload: Record<string, unknown> = { id };
    if (platforms && platforms.length > 0) payload.platforms = platforms;
    const { status, body: result } = await ayrsharePost('/analytics/post', payload);
    if (status < 200 || status >= 300) {
      return NextResponse.json({ error: extractAyrshareError(result, status, '/analytics/post') }, { status: 502 });
    }
    // Ayrshare keys the response by platform name; skip envelope fields.
    const skip = new Set(['status', 'id', 'refId', 'created', 'code']);
    const out: { platform: string; metrics: { label: string; value: number }[] }[] = [];
    for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
      if (skip.has(k)) continue;
      const metrics = flattenMetrics(v);
      if (metrics.length > 0) out.push({ platform: k, metrics });
    }
    return NextResponse.json({ platforms: out });
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
