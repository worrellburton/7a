// Rewrites Supabase storage URLs to the on-the-fly transform endpoint
// (/storage/v1/render/image/public/...) and appends width/quality so
// the CDN delivers a properly-sized, WebP-when-the-browser-asks-for-it
// version instead of the original full-resolution upload.
//
// Why this matters:
// - AI-generated outing images come back from Gemini as raw PNG and
//   land in storage at full quality (often 1–3 MB).
// - Gallery uploads are compressed client-side, but the same uploaded
//   asset is rendered everywhere from a hero collage to a thumbnail —
//   one size does not fit all.
// - Supabase serves WebP automatically when the request carries
//   Accept: image/webp (every modern browser), so we don't need to
//   pre-encode the file to get the savings.
//
// Pass any URL — non-Supabase URLs (or already-transformed URLs) pass
// through unchanged so this is safe to apply blanket-style.

const OBJECT_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

export interface CdnImageOpts {
  width?: number;
  height?: number;
  /** 20–100. Defaults to 72 — a good balance for hero/grid imagery. */
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

export function cdnImage(url: string, opts: CdnImageOpts = {}): string {
  if (!url) return url;
  const idx = url.indexOf(OBJECT_SEGMENT);
  if (idx === -1) return url;

  const base = url.slice(0, idx) + RENDER_SEGMENT + url.slice(idx + OBJECT_SEGMENT.length);
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(Math.round(opts.width)));
  if (opts.height) params.set('height', String(Math.round(opts.height)));
  params.set('quality', String(opts.quality ?? 72));
  if (opts.resize) params.set('resize', opts.resize);

  return `${base}?${params.toString()}`;
}
