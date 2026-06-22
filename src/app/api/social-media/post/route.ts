import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrsharePost, extractAyrshareError, AYRSHARE_PLATFORMS, AyrshareNotConfigured, type AyrsharePlatform } from '@/lib/ayrshare';
import { readFlag } from '@/lib/app-flags';

// POST /api/social-media/post
//   body: {
//     post: string,                          // required — caption / status text
//     platforms: string[],                   // required — at least one
//     mediaUrls?: string[],                  // optional — shared fallback media
//     mediaByPlatform?: { [p]: string[] },   // optional — per-network media
//     scheduleDate?: string,                 // optional — ISO8601 in the future
//   }
//
// Posts PER NETWORK: platforms are grouped by their resolved media, and each
// distinct-media group is sent to Ayrshare as its own /post call. This lets
// each network receive its own correctly-cropped asset (e.g. a 1:1 for
// Instagram vs a 1.91:1 for the Facebook link card) instead of one shared
// image that has to satisfy every platform's aspect-ratio rules. When every
// platform resolves to the same media (no per-network crops), it collapses
// to a single call — identical to the old behaviour.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = {
  post?: string;
  platforms?: unknown;
  mediaUrls?: unknown;
  mediaByPlatform?: unknown;
  scheduleDate?: string | null;
};

const PLATFORM_SET = new Set<string>(AYRSHARE_PLATFORMS as readonly string[]);

function cleanUrls(raw: unknown): string[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, 10);
}

// Dig Ayrshare's scheduled-post id out of a /post result (id / refId, or
// inside the postIds array). Needed so the post can be canceled later.
function ayrshareIdOf(result: unknown): string | null {
  const r = (result ?? {}) as { id?: unknown; refId?: unknown; postIds?: Array<{ id?: unknown; postId?: unknown }> };
  const fromPostIds = Array.isArray(r.postIds)
    ? r.postIds.map((p) => (typeof p?.id === 'string' && p.id) || (typeof p?.postId === 'string' && p.postId) || '').find(Boolean)
    : undefined;
  return (typeof r.id === 'string' && r.id) || (typeof r.refId === 'string' && r.refId) || fromPostIds || null;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  // Global posting kill switch.
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

  const platforms: AyrsharePlatform[] = (Array.isArray(body.platforms) ? body.platforms : [])
    .filter((v): v is string => typeof v === 'string')
    .filter((v): v is AyrsharePlatform => PLATFORM_SET.has(v));
  if (platforms.length === 0) {
    return NextResponse.json({ error: 'platforms must include at least one supported platform' }, { status: 400 });
  }

  const sharedMedia = cleanUrls(body.mediaUrls);
  const mediaByPlatform: Record<string, string[]> = {};
  if (body.mediaByPlatform && typeof body.mediaByPlatform === 'object') {
    for (const [k, v] of Object.entries(body.mediaByPlatform as Record<string, unknown>)) {
      const urls = cleanUrls(v);
      if (urls.length > 0) mediaByPlatform[k] = urls;
    }
  }

  // scheduleDate must parse + be in the future.
  let scheduleIso: string | null = null;
  if (body.scheduleDate) {
    const ts = Date.parse(body.scheduleDate);
    if (Number.isNaN(ts)) return NextResponse.json({ error: 'scheduleDate must be a parseable ISO8601 timestamp' }, { status: 400 });
    if (ts <= Date.now()) return NextResponse.json({ error: 'scheduleDate must be in the future' }, { status: 400 });
    scheduleIso = new Date(ts).toISOString();
  }
  const isScheduled = scheduleIso !== null;

  // Group platforms by their resolved media so each distinct asset set is
  // one Ayrshare call. Shared media → a single group (old behaviour).
  const groupMap = new Map<string, { platforms: AyrsharePlatform[]; media: string[] }>();
  for (const p of platforms) {
    const media = mediaByPlatform[p]?.length ? mediaByPlatform[p] : sharedMedia;
    const sig = JSON.stringify(media);
    const g = groupMap.get(sig) ?? { platforms: [], media };
    g.platforms.push(p);
    groupMap.set(sig, g);
  }
  const groups = [...groupMap.values()];

  try {
    const mergedPosts: unknown[] = [];
    const mergedPostIds: unknown[] = [];
    const mergedErrors: unknown[] = [];
    const failures: string[] = [];
    let anyOk = false;
    let worstStatus = 200;

    for (const g of groups) {
      const payload: Record<string, unknown> = { post, platforms: g.platforms };
      if (g.media.length > 0) payload.mediaUrls = g.media;
      if (scheduleIso) payload.scheduleDate = scheduleIso;

      const { status, body: result } = await ayrsharePost('/post', payload);
      const r = result as { posts?: unknown[]; postIds?: unknown[]; errors?: unknown[] };
      if (Array.isArray(r.posts)) {
        mergedPosts.push(...r.posts);
        // Flatten per-post platform errors up to a top-level errors[] so
        // consumers that build per-platform results (the Compose toast)
        // keep working.
        for (const p of r.posts) {
          const errs = p && typeof p === 'object' ? (p as { errors?: unknown }).errors : null;
          if (Array.isArray(errs)) mergedErrors.push(...errs);
        }
      }
      if (Array.isArray(r.errors)) mergedErrors.push(...r.errors);
      if (Array.isArray(r.postIds)) mergedPostIds.push(...r.postIds);

      if (status >= 200 && status < 300) {
        anyOk = true;
        // Log each successful group separately so it carries its own
        // Ayrshare id (for per-network cancellation) and media (thumbnail).
        if (auth.user?.id) {
          try {
            await supabase.from('activity_log').insert({
              user_id: auth.user.id,
              type: isScheduled ? 'social.scheduled' : 'social.posted',
              target_kind: 'social_post',
              target_id: null,
              target_label: post.slice(0, 80) || null,
              target_path: '/feather/social-media',
              metadata: {
                platforms: g.platforms,
                scheduled: isScheduled,
                scheduleDate: scheduleIso,
                mediaUrls: g.media,
                postIds: Array.isArray(r.postIds) ? r.postIds : [],
                ayrshareId: ayrshareIdOf(result),
                raw: result,
              },
            });
          } catch { /* logging is best-effort */ }
        }
      } else {
        worstStatus = status;
        const msg = extractAyrshareError(result, status, '/post');
        if (msg && !failures.includes(msg)) failures.push(msg);
      }
    }

    // Build the human error string from failed groups, and — when groups
    // returned 2xx but still carry per-post errors — from those too, so a
    // partial failure is always surfaced.
    const errLines = [...failures];
    if (errLines.length === 0) {
      for (const e of mergedErrors) {
        if (!e || typeof e !== 'object') continue;
        const o = e as { message?: unknown; error?: unknown; platform?: unknown };
        const msg = ((typeof o.message === 'string' && o.message) || (typeof o.error === 'string' && o.error) || '').trim();
        if (!msg) continue;
        const plat = typeof o.platform === 'string' && o.platform ? o.platform.charAt(0).toUpperCase() + o.platform.slice(1) : '';
        const line = plat ? `${plat}: ${msg}` : msg;
        if (!errLines.includes(line)) errLines.push(line);
      }
    }
    const error = errLines.length > 0 ? errLines.join(' · ') : undefined;

    // All groups failed → surface the upstream error status. Otherwise 200
    // (full or partial success); `error` carries any per-network failures.
    if (!anyOk) {
      return NextResponse.json(
        { status: 'error', posts: mergedPosts, postIds: mergedPostIds, errors: mergedErrors, error: error ?? `Ayrshare returned ${worstStatus}` },
        { status: worstStatus >= 400 ? worstStatus : 400 },
      );
    }
    return NextResponse.json(
      { status: error ? 'partial' : 'success', posts: mergedPosts, postIds: mergedPostIds, errors: mergedErrors, ...(error ? { error } : {}) },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AyrshareNotConfigured) {
      return NextResponse.json({ error: 'Ayrshare is not configured.' }, { status: 503 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
