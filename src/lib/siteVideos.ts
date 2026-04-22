/**
 * Keyed catalog of public-bucket Supabase videos we surface in the
 * marketing site. Keeping them in one file means we can swap a URL
 * (or upgrade to a DB-backed fetch of the `site_videos` table) in a
 * single place without chasing hard-coded URLs through components.
 *
 * All of these live in the `public-images/site-videos/` path of our
 * Supabase storage bucket and are served via the public CDN URL, so
 * no auth is required to render them on the marketing site.
 */

const BUCKET_BASE =
  'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-videos';

function url(id: string) {
  return `${BUCKET_BASE}/${id}`;
}

export const siteVideos = {
  /** Looping backdrop used across inner-page heroes (Swisshelm Mountains). */
  swisshelm: url('9c83abff-3c23-47a6-a407-467dd6d4dec4.mp4'),
  /** Ranch / Sonoran desert establishing shot — used behind the
      "Healing sanctuary in the Sonoran Desert" section. */
  sonoranRanch: url('e2553f79-28a2-49d1-a854-71497d464658.mp4'),
} as const;

export type SiteVideoKey = keyof typeof siteVideos;

export function getSiteVideo(key: SiteVideoKey): string {
  return siteVideos[key];
}
