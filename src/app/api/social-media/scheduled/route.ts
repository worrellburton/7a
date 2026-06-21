import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { ayrshareGet } from '@/lib/ayrshare';

// GET /api/social-media/scheduled
//
// Authoritative list of scheduled-but-not-yet-sent posts, sourced from
// OUR OWN records (activity_log) rather than Ayrshare's /history — which
// proved unreliable at surfacing future-dated posts. Returns:
//   - posts:            future scheduled posts, minus canceled ones,
//                       with the scheduler's name + (when recoverable)
//                       the Ayrshare id so they can be canceled in-app.
//   - recentlyCanceled: the last few cancellations, with who canceled.

export const dynamic = 'force-dynamic';

interface Row { id: string; created_at: string; target_label: string | null; metadata: Record<string, unknown> | null; user_id: string | null }

// Dig the Ayrshare post id out of an activity_log metadata blob. Prefer
// the top-level `ayrshareId` we now capture at schedule time, but fall
// back to the stashed raw Ayrshare response (id / refId / postIds[]) so
// rows written before the capture fix are still cancelable in-app.
function ayrshareIdFromMetadata(metadata: Record<string, unknown> | null): string | null {
  const m = (metadata ?? {}) as { ayrshareId?: unknown; raw?: unknown };
  if (typeof m.ayrshareId === 'string' && m.ayrshareId) return m.ayrshareId;
  const raw = (m.raw ?? {}) as { id?: unknown; refId?: unknown; postIds?: unknown };
  if (typeof raw.id === 'string' && raw.id) return raw.id;
  if (typeof raw.refId === 'string' && raw.refId) return raw.refId;
  if (Array.isArray(raw.postIds)) {
    for (const p of raw.postIds as Array<{ id?: unknown; postId?: unknown }>) {
      if (p && typeof p.id === 'string' && p.id) return p.id;
      if (p && typeof p.postId === 'string' && p.postId) return p.postId;
    }
  }
  return null;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();

  const [{ data: scheduledRows }, { data: canceledRows }] = await Promise.all([
    admin.from('activity_log').select('id, created_at, target_label, metadata, user_id').eq('type', 'social.scheduled').order('created_at', { ascending: false }).limit(500),
    admin.from('activity_log').select('id, created_at, target_label, metadata, user_id').eq('type', 'social.schedule_canceled').order('created_at', { ascending: false }).limit(200),
  ]);

  const canceledIds = new Set<string>();
  for (const r of (canceledRows ?? []) as Row[]) {
    const id = ayrshareIdFromMetadata(r.metadata);
    if (id) canceledIds.add(id);
  }

  const now = Date.now();
  interface Item { logId: string; ayrshareId: string | null; scheduleDate: string; platforms: string[]; mediaUrls: string[]; caption: string; userId: string | null; createdByName: string | null }
  const items: Item[] = ((scheduledRows ?? []) as Row[])
    .map((r) => {
      const m = (r.metadata ?? {}) as { scheduleDate?: string | null; platforms?: unknown; mediaUrls?: unknown };
      return {
        logId: r.id,
        ayrshareId: ayrshareIdFromMetadata(r.metadata),
        scheduleDate: m.scheduleDate ?? '',
        platforms: Array.isArray(m.platforms) ? (m.platforms as string[]) : [],
        mediaUrls: Array.isArray(m.mediaUrls) ? (m.mediaUrls as unknown[]).filter((u): u is string => typeof u === 'string') : [],
        caption: r.target_label ?? '',
        userId: r.user_id,
        createdByName: null as string | null,
      };
    })
    .filter((p) => {
      if (!p.scheduleDate) return false;
      const t = Date.parse(p.scheduleDate);
      if (!Number.isFinite(t) || t <= now) return false;
      if (p.ayrshareId && canceledIds.has(p.ayrshareId)) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate));

  // Resolve scheduler / canceler names in one batch.
  const userIds = Array.from(new Set([
    ...items.map((p) => p.userId),
    ...((canceledRows ?? []) as Row[]).map((r) => r.user_id),
  ].filter((v): v is string => typeof v === 'string')));
  const nameById = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await admin.from('users').select('id, full_name, email').in('id', userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
      nameById.set(u.id, u.full_name || u.email || '');
    }
  }
  for (const p of items) p.createdByName = p.userId ? (nameById.get(p.userId) ?? null) : null;

  // Recover Ayrshare ids for posts scheduled before we recorded them, by
  // matching against Ayrshare /history (scheduleDate + caption prefix),
  // so those posts become cancelable in-app instead of dashboard-only.
  if (items.some((p) => !p.ayrshareId)) {
    try {
      const { status, body } = await ayrshareGet('/history', { lastRecords: 200 });
      if (status < 400) {
        const arr = Array.isArray(body)
          ? body
          : Array.isArray((body as { posts?: unknown[] }).posts) ? (body as { posts: unknown[] }).posts : [];
        const aySched = (arr as Array<Record<string, unknown>>)
          .map((x) => ({
            id: (typeof x.id === 'string' && x.id) || (typeof x.refId === 'string' && x.refId) || null,
            scheduleDate: typeof x.scheduleDate === 'string' ? x.scheduleDate : null,
            post: typeof x.post === 'string' ? x.post : '',
          }))
          .filter((x) => x.id && x.scheduleDate);
        for (const p of items) {
          if (p.ayrshareId) continue;
          const pt = Date.parse(p.scheduleDate);
          const cap = p.caption.slice(0, 24);
          const match = aySched.find((x) => {
            const xt = Date.parse(x.scheduleDate as string);
            return Number.isFinite(xt) && Math.abs(xt - pt) < 60_000
              && (cap.length === 0 || x.post.startsWith(cap) || p.caption.startsWith(x.post.slice(0, 24)));
          });
          if (match && !canceledIds.has(match.id as string)) p.ayrshareId = match.id as string;
        }
      }
    } catch { /* leave dashboard-only */ }
  }

  const posts = items.map(({ logId, ayrshareId, scheduleDate, platforms, mediaUrls, caption, createdByName }) => ({
    logId, ayrshareId, scheduleDate, platforms, mediaUrls, caption, createdByName,
  }));

  const recentlyCanceled = ((canceledRows ?? []) as Row[]).slice(0, 8).map((r) => {
    const m = (r.metadata ?? {}) as { ayrshareId?: string | null; caption?: string | null; scheduleDate?: string | null };
    return {
      at: r.created_at,
      caption: m.caption ?? r.target_label ?? '',
      scheduleDate: m.scheduleDate ?? null,
      canceledByName: r.user_id ? (nameById.get(r.user_id) ?? null) : null,
    };
  });

  return NextResponse.json({ posts, recentlyCanceled });
}
