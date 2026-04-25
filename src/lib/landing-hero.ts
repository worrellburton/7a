import { getAdminSupabase } from '@/lib/supabase-server';
import type { HeroSource } from '@/components/Hero';

// Fetch the live landing hero's video URLs and shape them as
// HeroSource[] so /(site)/page.tsx can pass them straight to
// <Hero />. Runs in an RSC, so we use the service-role admin
// client — anon reads against site_videos are restricted to
// authenticated roles, which would silently return zero rows
// and make the homepage fall back to its hardcoded set.
//
// Returns an empty array on failure — Hero falls back to its
// hardcoded source list, so the public site never breaks because
// the editor table is empty or the DB is briefly unavailable.

export async function fetchLiveHeroSources(): Promise<HeroSource[]> {
  try {
    const sb = getAdminSupabase();

    let videoIds: string[] | null = null;
    const live = await sb
      .from('landing_heros')
      .select('video_ids')
      .eq('is_live', true)
      .maybeSingle();
    if (live.data?.video_ids) {
      videoIds = live.data.video_ids as string[];
    } else {
      const fallback = await sb
        .from('landing_heros')
        .select('video_ids')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (fallback.data?.video_ids) {
        videoIds = fallback.data.video_ids as string[];
      }
    }
    if (!videoIds || videoIds.length === 0) return [];

    const { data: videos } = await sb
      .from('site_videos')
      .select('id, video_url, alt, seo_title, prompt, filename, status')
      .in('id', videoIds);
    const byId = new Map(((videos ?? []) as Array<{
      id: string;
      video_url: string | null;
      alt: string | null;
      seo_title: string | null;
      prompt: string | null;
      filename: string | null;
      status: string;
    }>).map((v) => [v.id, v]));

    return videoIds
      .map((id) => byId.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v && v.status === 'completed' && !!v.video_url)
      .map<HeroSource>((v) => ({
        kind: 'mp4',
        url: v.video_url as string,
        label: v.alt || v.seo_title || v.prompt || v.filename || 'Hero clip',
      }));
  } catch {
    // Anon RLS read failed or supabase down — let Hero use its
    // hardcoded fallback rather than 500ing the homepage.
    return [];
  }
}
