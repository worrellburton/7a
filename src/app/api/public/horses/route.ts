import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/public/horses — public-safe projection of the `equine` table for
// the marketing site. Only returns horses that have a photo, and only
// includes fields that are appropriate to expose publicly (no weight,
// body_score, ownership papers, or internal notes).

export const dynamic = 'force-dynamic';

interface PublicHorse {
  id: string;
  name: string;
  age: number | null;
  works_in: string | null;
  rideable: string | null;
  behavior: string | null;
  notes: string | null;
  image_url: string | null;
  // Phase 3 of the equine-page upgrade: additional portrait shots +
  // an optional short clip per horse, fed to the carousel in the
  // detail modal and the page-level "Watch the herd" video reel.
  // Both default to empty so the public payload stays well-typed
  // even when migrations haven't shipped yet.
  gallery_urls: string[];
  video_url: string | null;
}

export async function GET() {
  const supabase = getAdminSupabase();
  // Try the FULL select first (with gallery_urls + video_url). If
  // the columns aren't there yet (migration mid-deploy), fall back
  // to the original projection so the marketing page keeps working
  // through the rollout window.
  let { data, error } = await supabase
    .from('equine')
    .select('id, name, age, works_in, rideable, notes, image_url, gallery_urls, video_url')
    .not('image_url', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.info('[api/public/horses] gallery_urls/video_url select failed; falling back to legacy projection.', error.message);
    const fallback = await supabase
      .from('equine')
      .select('id, name, age, works_in, rideable, notes, image_url')
      .not('image_url', 'is', null)
      .order('name', { ascending: true });
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    // Re-shape the legacy projection so the downstream map() doesn't
    // care which select succeeded.
    data = (fallback.data || []).map((h) => ({ ...h, gallery_urls: [], video_url: null }));
  }

  const rows = (data || [])
    .filter((h) => (h.image_url || '').trim() !== '')
    .map((h): PublicHorse => ({
      id: h.id,
      name: h.name,
      age: h.age ?? null,
      works_in: h.works_in ?? null,
      rideable: h.rideable ?? null,
      behavior: (h as { behavior?: string | null }).behavior ?? null,
      notes: h.notes ?? null,
      image_url: h.image_url ?? null,
      gallery_urls: Array.isArray((h as { gallery_urls?: string[] }).gallery_urls)
        ? ((h as { gallery_urls?: string[] }).gallery_urls as string[]).filter((u) => (u || '').trim() !== '')
        : [],
      video_url: ((h as { video_url?: string | null }).video_url ?? null) || null,
    }));
  return NextResponse.json({ horses: rows });
}
