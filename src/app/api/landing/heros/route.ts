import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/landing/heros — list every hero with its videos hydrated
//   in display_order then created_at.
// POST /api/landing/heros — body: { name?: string }
//   Creates a new empty hero, appended to the end of the list.

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

interface HeroRow {
  id: string;
  name: string;
  video_ids: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();
  const { data: heroRows } = await admin
    .from('landing_heros')
    .select('id, name, video_ids, display_order, created_at, updated_at')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  const heros = (heroRows ?? []) as HeroRow[];

  // Hydrate every referenced video in a single query, then map back
  // per-hero preserving order.
  const allIds = Array.from(new Set(heros.flatMap((h) => h.video_ids)));
  let byId = new Map<string, VideoRow>();
  if (allIds.length > 0) {
    const { data: videos } = await admin
      .from('site_videos')
      .select(VIDEO_SELECT)
      .in('id', allIds);
    byId = new Map(((videos ?? []) as VideoRow[]).map((v) => [v.id, v]));
  }

  const shaped = heros.map((h) => ({
    ...h,
    videos: h.video_ids
      .map((id) => byId.get(id))
      .filter((v): v is VideoRow => !!v),
  }));

  return NextResponse.json({ heros: shaped });
}

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  let body: { name?: unknown };
  try { body = (await req.json()) as { name?: unknown }; } catch { body = {}; }
  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const name = rawName.slice(0, 80) || 'Untitled hero';

  const admin = getAdminSupabase();

  // Append to the end — find the current max display_order so the
  // new one slots after every existing entry.
  const { data: maxRow } = await admin
    .from('landing_heros')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.display_order ?? -1) + 1;

  const { data: created, error } = await admin
    .from('landing_heros')
    .insert({
      name,
      video_ids: [],
      display_order: nextOrder,
      updated_by: user.id,
    })
    .select('id, name, video_ids, display_order, created_at, updated_at')
    .single();
  if (error || !created) {
    return NextResponse.json(
      { error: `landing_heros insert failed: ${error?.message || 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ hero: { ...created, videos: [] } });
}
