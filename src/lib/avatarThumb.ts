// Rewrite an avatar URL to a small, web-optimized variant suitable
// for the home orbit / chat rosters / any place we're rendering a
// 28-48px circle. Both URL families we actually use already serve
// resized variants directly from their CDNs — we just have to ask
// for them. No backend job, no new storage bucket, no DB migration.
//
//   googleusercontent.com → append `=s<size>-c` (square crop +
//     short-edge cap). Google's CDN serves the resized JPEG and
//     caches it globally. Existing `=sNNN-c` / `=wNNN` suffixes
//     are stripped first so we don't double-up the parameters.
//
//   supabase.co/storage/v1/object/public/<bucket>/<path>
//     → /storage/v1/render/image/public/<bucket>/<path>
//        ?width=<size>&height=<size>&resize=cover&quality=75
//     Supabase Image Transformations delivers a WebP at the
//     requested size. Requires the project to have transformations
//     enabled — if it's not, the URL still resolves (returns
//     original) so the orbit doesn't break, just doesn't shrink.
//
// Anything else (custom upload host, blob URL, etc.) passes through
// unchanged so we never accidentally break a user's avatar.

export function toAvatarThumb(url: string | null | undefined, size = 200): string | null {
  if (!url || typeof url !== 'string') return null;

  // Google OAuth photos.
  if (/googleusercontent\.com\//.test(url)) {
    // Strip any existing `=sNNN-cN-MMM` style query (Google's format
    // uses `=` as a parameter delimiter on the path, not `?`).
    const base = url.split('=')[0];
    return `${base}=s${size}-c`;
  }

  // Supabase Storage public-object URLs. The render-image endpoint
  // is path-compatible: swap `/object/public/` for
  // `/render/image/public/` and append the size querystring.
  const supabaseMatch = url.match(
    /^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/,
  );
  if (supabaseMatch) {
    const [, origin, bucketAndPath] = supabaseMatch;
    // Don't double-up if it's already pointing at /render/image/.
    if (url.includes('/storage/v1/render/image/')) return url;
    return `${origin}/storage/v1/render/image/public/${bucketAndPath}?width=${size}&height=${size}&resize=cover&quality=75`;
  }

  // Unknown host — pass through.
  return url;
}
