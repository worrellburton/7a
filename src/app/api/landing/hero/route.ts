import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/landing/hero — admin + Marketing & Admissions only.
// Returns the timeline as { videos: SiteVideo[] } in the configured
// order so the editor can render thumbnails and the public hero can
// reuse the same shape. The public hero may also read the timeline
// directly via the Supabase anon RLS-readable table.
//
// POST /api/landing/hero — admin + Marketing & Admissions only.
// Body: { videoIds: string[] }
// Replaces the singleton's video_ids array atomically.

export const dynamic = 'force-dynamic';

interface VideoRow {
  id: string;
  source_image_id: string | null;
  filename: string | null;
  prompt: string | null;
  alt: string | null;
  seo_title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  created_at: string;
}

const VIDEO_SELECT =
  'id, source_image_id, filename, prompt, alt, seo_title, video_url, thumbnail_url, duration_seconds, resolution, aspect_ratio, created_at';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();
  const { data: row } = await admin
    .from('landing_hero_timeline')
    .select('video_ids, updated_at')
    .eq('id', 'primary')
    .maybeSingle();
  const videoIds = (row?.video_ids as string[] | null | undefined) ?? [];

  let videos: VideoRow[] = [];
  if (videoIds.length > 0) {
    const { data } = await admin
      .from('site_videos')
      .select(VIDEO_SELECT)
      .in('id', videoIds);
    const byId = new Map(((data ?? []) as VideoRow[]).map((v) => [v.id, v]));
    // Preserve the configured order; drop any ids that no longer
    // exist (e.g. a referenced video was deleted). The editor will
    // surface the discrepancy on next save.
    videos = videoIds
      .map((id) => byId.get(id))
      .filter((v): v is VideoRow => !!v);
  }

  return NextResponse.json({
    videoIds,
    videos,
    updated_at: row?.updated_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  let body: { videoIds?: unknown };
  try { body = (await req.json()) as { videoIds?: unknown }; } catch { body = {}; }
  const ids = Array.isArray(body.videoIds) ? body.videoIds : null;
  if (!ids || ids.some((v) => typeof v !== 'string')) {
    return NextResponse.json(
      { error: 'videoIds must be an array of UUID strings' },
      { status: 400 },
    );
  }
  // Sanity: cap at 50 entries so an accidental loop can't write
  // megabytes of ids into the singleton.
  if (ids.length > 50) {
    return NextResponse.json(
      { error: `videoIds is capped at 50; received ${ids.length}` },
      { status: 400 },
    );
  }

  const admin = getAdminSupabase();
  // Verify every id resolves to a completed playable site_video. This
  // keeps the public hero from rendering ghost rows.
  if (ids.length > 0) {
    const { data: known } = await admin
      .from('site_videos')
      .select('id, status, video_url')
      .in('id', ids as string[]);
    const okIds = new Set(
      ((known ?? []) as Array<{ id: string; status: string; video_url: string | null }>)
        .filter((v) => v.status === 'completed' && !!v.video_url)
        .map((v) => v.id),
    );
    const missing = (ids as string[]).filter((id) => !okIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Some video ids are missing or not playable: ${missing.join(', ')}` },
        { status: 409 },
      );
    }
  }

  const { error: upErr } = await admin
    .from('landing_hero_timeline')
    .upsert(
      { id: 'primary', video_ids: ids as string[], updated_by: user.id },
      { onConflict: 'id' },
    );
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, videoIds: ids });
}
