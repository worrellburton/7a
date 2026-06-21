import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrsharePost, extractAyrshareError, AYRSHARE_PLATFORMS, AyrshareNotConfigured, type AyrsharePlatform } from '@/lib/ayrshare';
import { readFlag } from '@/lib/app-flags';

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
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  // Global posting kill switch — flipped via the toggle at the top
  // of /feather/social-media. When false, every POST is short-circuited
  // server-side so a stale tab or scheduled cron can't bypass it.
  const postingEnabled = await readFlag<boolean>('social_posting_enabled', false);
  if (!postingEnabled) {
    return NextResponse.json({
      error: 'Social posting is paused. Flip the toggle at the top of /feather/social-media to re-enable.',
      code: 'posting_disabled',
    }, { status: 423 });
  }

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

    // Ayrshare rejected the post (400 etc.). Pass the upstream status
    // through, but lead with a READABLE reason — extractAyrshareError
    // digs the message out of Ayrshare's many error shapes (and logs the
    // raw body to the function logs). Without this the UI only saw a
    // bare "HTTP 400" because Ayrshare's error fields don't match the
    // `error`/`message` keys the client checks.
    if (status < 200 || status >= 300) {
      const message = extractAyrshareError(result, status, '/post');
      return NextResponse.json({ ...result, error: message }, { status });
    }

    // On a successful (or partially-successful) post, write a row to
    // activity_log so the post shows up on /feather/activity and counts
    // toward the user's "on fire" daily action total — same treatment
    // as logging a contact touchpoint or filling a field. Skipped on
    // upstream errors so a failed Ayrshare round-trip doesn't masquerade
    // as completed work.
    if (status >= 200 && status < 300 && auth.user?.id) {
      const isScheduled = typeof payload.scheduleDate === 'string';
      const postIds = Array.isArray((result as { postIds?: unknown[] }).postIds)
        ? ((result as { postIds: unknown[] }).postIds)
        : [];
      // Ayrshare's scheduled-post identifier — needed to cancel it later.
      // It can come back as `id` / `refId` (top level) or inside the
      // postIds array. We also stash the raw response so a later cancel
      // can dig the id out even if the shape changes.
      const r = result as { id?: unknown; refId?: unknown; postIds?: Array<{ id?: unknown; postId?: unknown }> };
      const fromPostIds = Array.isArray(r.postIds)
        ? r.postIds.map((p) => (typeof p?.id === 'string' && p.id) || (typeof p?.postId === 'string' && p.postId) || '').find(Boolean)
        : undefined;
      const ayrshareId = (typeof r.id === 'string' && r.id)
        || (typeof r.refId === 'string' && r.refId)
        || fromPostIds
        || null;
      const label = post.trim().slice(0, 80);
      try {
        await supabase.from('activity_log').insert({
          user_id: auth.user.id,
          type: isScheduled ? 'social.scheduled' : 'social.posted',
          target_kind: 'social_post',
          target_id: null,
          target_label: label || null,
          target_path: '/feather/social-media',
          metadata: {
            platforms,
            scheduled: isScheduled,
            scheduleDate: payload.scheduleDate ?? null,
            // Stash the media so the Scheduled-posts list can show a
            // thumbnail without a second lookup.
            mediaUrls,
            postIds,
            ayrshareId,
            raw: result,
          },
        });
      } catch {
        /* logging is best-effort — never block the post response */
      }
    }
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
