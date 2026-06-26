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

// Collect every Ayrshare post id an activity_log metadata blob carries.
// For scheduled posts the cancelable id lives under raw.posts[].id (the
// top-level ayrshareId can be null), so we dig through there too — that's
// what makes posts logged before the capture fix cancelable in-app.
function ayrshareIdsFromMetadata(metadata: Record<string, unknown> | null): string[] {
  const m = (metadata ?? {}) as { ayrshareId?: unknown; ayrshareIds?: unknown; raw?: unknown };
  const ids = new Set<string>();
  const add = (v: unknown) => { if (typeof v === 'string' && v) ids.add(v); };
  add(m.ayrshareId);
  if (Array.isArray(m.ayrshareIds)) for (const v of m.ayrshareIds) add(v);
  const raw = (m.raw ?? {}) as { id?: unknown; refId?: unknown; posts?: Array<{ id?: unknown; refId?: unknown }>; postIds?: Array<{ id?: unknown; postId?: unknown }> };
  add(raw.id);
  if (Array.isArray(raw.posts)) for (const p of raw.posts) { add(p?.id); add(p?.refId); }
  if (Array.isArray(raw.postIds)) for (const p of raw.postIds) { add(p?.id); add(p?.postId); }
  if (ids.size === 0) add(raw.refId);
  return [...ids];
}

// A logical-post signature (schedule time + caption) used to (a) drop posts
// whose cancellation we recorded even if ids don't line up, and (b) merge a
// per-network post that was split into multiple Ayrshare calls into one row.
function sigOf(scheduleDate: string | null | undefined, caption: string | null | undefined): string {
  return `${scheduleDate ?? ''}|${(caption ?? '').slice(0, 40)}`;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();

  const [{ data: scheduledRows, error: scheduledErr }, { data: canceledRows, error: canceledErr }] = await Promise.all([
    admin.from('activity_log').select('id, created_at, target_label, metadata, user_id').eq('type', 'social.scheduled').order('created_at', { ascending: false }).limit(500),
    admin.from('activity_log').select('id, created_at, target_label, metadata, user_id').eq('type', 'social.schedule_canceled').order('created_at', { ascending: false }).limit(200),
  ]);

  // Surface a failed read instead of silently returning an empty list — an
  // empty "Scheduled posts" card on a DB blip looks exactly like "nothing is
  // scheduled," which is dangerously misleading for a publishing tool.
  if (scheduledErr) {
    console.error('[social-media/scheduled] failed to read scheduled posts', scheduledErr);
    return NextResponse.json({ error: 'Could not load scheduled posts. Try again.' }, { status: 502 });
  }
  if (canceledErr) {
    // Non-fatal: we just can't filter out cancellations this pass. Log it
    // rather than hide the whole list.
    console.error('[social-media/scheduled] failed to read cancellations', canceledErr);
  }

  const canceledIds = new Set<string>();
  const canceledSigs = new Set<string>();
  for (const r of (canceledRows ?? []) as Row[]) {
    for (const id of ayrshareIdsFromMetadata(r.metadata)) canceledIds.add(id);
    const m = (r.metadata ?? {}) as { caption?: string | null; scheduleDate?: string | null };
    canceledSigs.add(sigOf(m.scheduleDate, m.caption ?? r.target_label));
  }

  const now = Date.now();
  interface Item { logId: string; ayrshareIds: string[]; scheduleDate: string; platforms: string[]; mediaUrls: string[]; caption: string; userId: string | null; createdByName: string | null }
  const rawItems: Item[] = ((scheduledRows ?? []) as Row[])
    .map((r) => {
      const m = (r.metadata ?? {}) as { scheduleDate?: string | null; platforms?: unknown; mediaUrls?: unknown };
      return {
        logId: r.id,
        ayrshareIds: ayrshareIdsFromMetadata(r.metadata),
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
      // Drop anything we've recorded a cancellation for — by id, or by the
      // logical-post signature when ids don't line up.
      if (p.ayrshareIds.some((id) => canceledIds.has(id))) return false;
      if (canceledSigs.has(sigOf(p.scheduleDate, p.caption))) return false;
      return true;
    });

  // Merge per-network rows (same time + caption, split across Ayrshare calls)
  // into ONE cancelable row that carries every platform + every id.
  const grouped = new Map<string, Item>();
  for (const it of rawItems) {
    const key = sigOf(it.scheduleDate, it.caption);
    const g = grouped.get(key);
    if (!g) {
      grouped.set(key, { ...it, platforms: [...it.platforms], ayrshareIds: [...it.ayrshareIds], mediaUrls: [...it.mediaUrls] });
      continue;
    }
    for (const p of it.platforms) if (!g.platforms.includes(p)) g.platforms.push(p);
    for (const id of it.ayrshareIds) if (!g.ayrshareIds.includes(id)) g.ayrshareIds.push(id);
    if (g.mediaUrls.length === 0 && it.mediaUrls.length > 0) g.mediaUrls = it.mediaUrls;
    if (!g.userId && it.userId) g.userId = it.userId;
  }
  const items = [...grouped.values()].sort((a, b) => Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate));

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

  // Reconcile against Ayrshare's REAL scheduled queue — it's the source of
  // truth for what will actually post. We ALWAYS pull it (not just when an id
  // is missing) so Feather can never diverge from Ayrshare and let a post fire
  // unseen. From it we both:
  //   (a) recover ids for our own logged items, and
  //   (b) surface any scheduled Ayrshare post that ISN'T in our log — one
  //       scheduled directly in the Ayrshare dashboard, OR one whose in-app
  //       cancel never actually took (so the user can re-cancel it here).
  // Ayrshare's own status is authoritative for "is it still scheduled", so we
  // deliberately DON'T apply our local canceled-signatures to these — if it's
  // still in Ayrshare's queue, it still posts, and it must be visible.
  try {
    const { status, body } = await ayrshareGet('/history', { lastRecords: 200 });
    if (status < 400) {
      const arr = Array.isArray(body)
        ? body
        : Array.isArray((body as { posts?: unknown[] }).posts) ? (body as { posts: unknown[] }).posts : [];
      const ayrScheduled = (arr as Array<Record<string, unknown>>)
        .map((x) => {
          const st = (typeof x.status === 'string' ? x.status : '').toLowerCase();
          const t = typeof x.scheduleDate === 'string' ? Date.parse(x.scheduleDate) : NaN;
          return {
            id: (typeof x.id === 'string' && x.id) || (typeof x.refId === 'string' && x.refId) || '',
            scheduleDate: typeof x.scheduleDate === 'string' ? x.scheduleDate : '',
            caption: typeof x.post === 'string' ? x.post : '',
            platforms: Array.isArray(x.platforms) ? (x.platforms as unknown[]).filter((p): p is string => typeof p === 'string') : [],
            mediaUrls: Array.isArray(x.mediaUrls) ? (x.mediaUrls as unknown[]).filter((u): u is string => typeof u === 'string') : [],
            // Pending = future-dated and not in a terminal state.
            pending: Number.isFinite(t) && t > now
              && st !== 'error' && st !== 'deleted' && st !== 'canceled' && st !== 'cancelled' && st !== 'success',
          };
        })
        .filter((x) => x.pending && x.id);

      const matches = (a: { scheduleDate: string; caption: string }, p: Item): boolean => {
        const at = Date.parse(a.scheduleDate);
        const pt = Date.parse(p.scheduleDate);
        if (!Number.isFinite(at) || !Number.isFinite(pt) || Math.abs(at - pt) >= 60_000) return false;
        const ac = a.caption.slice(0, 24);
        const pc = p.caption.slice(0, 24);
        return ac.length === 0 || pc.length === 0 || a.caption.startsWith(pc) || p.caption.startsWith(ac);
      };

      // (a) recover ids for our logged items that don't carry one yet.
      for (const p of items) {
        if (p.ayrshareIds.length > 0) continue;
        const match = ayrScheduled.find((a) => matches(a, p));
        if (match) p.ayrshareIds = [match.id];
      }

      // (b) add Ayrshare-scheduled posts we have no row for, so the in-app
      // list always equals Ayrshare's queue.
      for (const a of ayrScheduled) {
        if (items.some((p) => matches(a, p) || p.ayrshareIds.includes(a.id))) continue;
        items.push({
          logId: `ayr:${a.id}`,
          ayrshareIds: [a.id],
          scheduleDate: a.scheduleDate,
          platforms: a.platforms,
          mediaUrls: a.mediaUrls,
          caption: a.caption,
          userId: null,
          createdByName: null,
        });
      }
      items.sort((x, y) => Date.parse(x.scheduleDate) - Date.parse(y.scheduleDate));
    }
  } catch {
    /* Ayrshare unreachable — fall back to our own records only. */
  }

  const posts = items.map(({ logId, ayrshareIds, scheduleDate, platforms, mediaUrls, caption, createdByName }) => ({
    logId, ayrshareId: ayrshareIds[0] ?? null, ayrshareIds, scheduleDate, platforms, mediaUrls, caption, createdByName,
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
