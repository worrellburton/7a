import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/sidebar/visit
//
// Phase 2 of the sidebar recency overhaul. Records that the
// authenticated user just clicked a sidebar entry by pushing the
// path onto users.sidebar_recent_paths (newest first), removing any
// earlier occurrence so the same path can't appear twice, capping
// the array at MAX_RECENT entries, and incrementing
// sidebar_click_count. Phase 7 reads click_count to decide whether
// the sidebar renders in alpha or recency mode.
//
// Why server-side dedupe + cap (instead of letting the client write
// freely): the column is the source of truth for every device the
// rep signs into. Doing this in one place means a stale tab or
// half-implemented mobile client can't corrupt the order.

export const dynamic = 'force-dynamic';

const MAX_RECENT = 30;

// Reject paths that don't look like a real /app route. Keeps a
// misbehaving / malicious client from filling the array with junk
// URLs or external links.
const PATH_RE = /^\/app(?:\/[a-zA-Z0-9_\-/.]*)?$/;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { path?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body → 400 below */ }

  const path = typeof body.path === 'string' ? body.path.trim() : '';
  if (!path || !PATH_RE.test(path) || path.length > 200) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  // Read-modify-write. The recency list is small (≤30) so two round
  // trips is cheap and the alternative — a Postgres function — adds
  // deployment churn for no real win.
  const { data: existing, error: readErr } = await admin
    .from('users')
    .select('sidebar_recent_paths, sidebar_click_count')
    .eq('id', user.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const prev = Array.isArray(existing?.sidebar_recent_paths) ? existing.sidebar_recent_paths as string[] : [];
  const deduped = prev.filter((p) => p !== path);
  const next = [path, ...deduped].slice(0, MAX_RECENT);
  const nextCount = (existing?.sidebar_click_count ?? 0) + 1;

  const { error: writeErr } = await admin
    .from('users')
    .update({ sidebar_recent_paths: next, sidebar_click_count: nextCount })
    .eq('id', user.id);
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });

  return NextResponse.json({
    sidebar_recent_paths: next,
    sidebar_click_count: nextCount,
  });
}
