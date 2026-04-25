import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// PATCH /api/landing/heros/[id]
//   body: { name?: string, video_ids?: string[], display_order?: number }
// DELETE /api/landing/heros/[id]
//
// Both M&A-or-admin gated. PATCH validates that any video_ids
// reference existing playable site_videos rows.

export const dynamic = 'force-dynamic';

const VIDEO_SELECT =
  'id, source_image_id, filename, prompt, alt, seo_title, video_url, thumbnail_url, duration_seconds, resolution, aspect_ratio, created_at';

interface PatchBody {
  name?: unknown;
  video_ids?: unknown;
  display_order?: unknown;
  is_live?: unknown;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let body: PatchBody = {};
  try { body = (await req.json()) as PatchBody; } catch { /* default */ }

  const update: { name?: string; video_ids?: string[]; display_order?: number; updated_by: string } = {
    updated_by: user.id,
  };

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    update.name = trimmed.slice(0, 80);
  }

  if (Array.isArray(body.video_ids)) {
    if (body.video_ids.some((v) => typeof v !== 'string')) {
      return NextResponse.json({ error: 'video_ids must be an array of UUID strings' }, { status: 400 });
    }
    if (body.video_ids.length > 50) {
      return NextResponse.json({ error: `video_ids capped at 50; got ${body.video_ids.length}` }, { status: 400 });
    }
    update.video_ids = body.video_ids as string[];
  }

  if (typeof body.display_order === 'number' && Number.isFinite(body.display_order)) {
    update.display_order = Math.round(body.display_order);
  }

  // is_live is handled separately below — it requires an atomic
  // "set me to true and everyone else to false" pattern to honor
  // the partial unique index.
  const wantSetLive = body.is_live === true;
  const wantUnsetLive = body.is_live === false;

  const hasFieldUpdate =
    'name' in update || 'video_ids' in update || 'display_order' in update;
  if (!hasFieldUpdate && !wantSetLive && !wantUnsetLive) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  if (update.video_ids && update.video_ids.length > 0) {
    const { data: known } = await admin
      .from('site_videos')
      .select('id, status, video_url')
      .in('id', update.video_ids);
    const okIds = new Set(
      ((known ?? []) as Array<{ id: string; status: string; video_url: string | null }>)
        .filter((v) => v.status === 'completed' && !!v.video_url)
        .map((v) => v.id),
    );
    const missing = update.video_ids.filter((vid) => !okIds.has(vid));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Some video ids are missing or not playable: ${missing.join(', ')}` },
        { status: 409 },
      );
    }
  }

  // 1. Apply the regular field updates (name / video_ids / order).
  if (hasFieldUpdate) {
    const { error: fieldErr } = await admin
      .from('landing_heros')
      .update(update)
      .eq('id', id);
    if (fieldErr) {
      return NextResponse.json(
        { error: `landing_heros update failed: ${fieldErr.message}` },
        { status: 500 },
      );
    }
  }

  // 2. Live toggle. Two-step: clear everyone else first, then set
  //    the target. The partial unique index makes the order matter —
  //    going the other way would briefly leave two rows true and
  //    error. Concurrent set-live calls are still safe because the
  //    second one's clear-everyone-else step also clears whatever
  //    the first one just set.
  if (wantSetLive) {
    const { error: clearErr } = await admin
      .from('landing_heros')
      .update({ is_live: false })
      .neq('id', id);
    if (clearErr) {
      return NextResponse.json({ error: `set live (clear others) failed: ${clearErr.message}` }, { status: 500 });
    }
    const { error: setErr } = await admin
      .from('landing_heros')
      .update({ is_live: true, updated_by: user.id })
      .eq('id', id);
    if (setErr) {
      return NextResponse.json({ error: `set live failed: ${setErr.message}` }, { status: 500 });
    }
  } else if (wantUnsetLive) {
    const { error: unsetErr } = await admin
      .from('landing_heros')
      .update({ is_live: false, updated_by: user.id })
      .eq('id', id);
    if (unsetErr) {
      return NextResponse.json({ error: `unset live failed: ${unsetErr.message}` }, { status: 500 });
    }
  }

  // 3. Read back the canonical row to return.
  const { data: updated, error } = await admin
    .from('landing_heros')
    .select('id, name, video_ids, display_order, is_live, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !updated) {
    return NextResponse.json(
      { error: `landing_heros read-back failed: ${error?.message || 'not found'}` },
      { status: 500 },
    );
  }

  // Hydrate the videos so the client can update its in-memory copy
  // without a separate roundtrip.
  let videos: unknown[] = [];
  if (updated.video_ids?.length) {
    const { data } = await admin
      .from('site_videos')
      .select(VIDEO_SELECT)
      .in('id', updated.video_ids);
    const byId = new Map(((data ?? []) as Array<{ id: string }>).map((v) => [v.id, v]));
    videos = (updated.video_ids as string[]).map((vid) => byId.get(vid)).filter(Boolean);
  }

  return NextResponse.json({ hero: { ...updated, videos } });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getAdminSupabase();

  // Refuse to delete the last remaining hero — the editor always
  // needs at least one to render.
  const { count } = await admin
    .from('landing_heros')
    .select('id', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete the only hero. Create another first, then delete this one.' },
      { status: 409 },
    );
  }

  const { error } = await admin.from('landing_heros').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id });
}
