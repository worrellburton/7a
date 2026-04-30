import { OUTINGS, type Outing } from '@/lib/outings';
import { getServerSupabase } from '@/lib/supabase-server';

// Shared data layer for the outings catalog. Three pages render
// outing cards now (holistic, landing, tour) — each in a different
// visual style, but every variant needs the same data: the typed
// Outing record from /lib/outings.ts joined with the cached image +
// attribution row from public.outings_images.

export interface OutingImage {
  imageUrl: string;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
}

/** An Outing with the cached image (or null if the loader hasn't
 *  populated it for this slug yet). */
export interface OutingWithImage extends Outing {
  image: OutingImage | null;
}

interface OutingsImageRow {
  slug: string;
  image_url: string;
  credit: string | null;
  license: string | null;
  license_url: string | null;
}

/** Server-side. Joins OUTINGS (typed catalog) with outings_images
 *  (Supabase-stored photos + attribution). Returns one entry per
 *  outing in the original catalog order; rows without an image yet
 *  get image=null so the variant can render a placeholder. */
export async function loadOutingsWithImages(): Promise<OutingWithImage[]> {
  let map = new Map<string, OutingImage>();
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('outings_images')
      .select('slug, image_url, credit, license, license_url');
    for (const row of (data ?? []) as OutingsImageRow[]) {
      if (row.slug && row.image_url) {
        map.set(row.slug, {
          imageUrl: row.image_url,
          credit: row.credit,
          license: row.license,
          licenseUrl: row.license_url,
        });
      }
    }
  } catch {
    map = new Map();
  }
  return OUTINGS.map((o) => ({ ...o, image: map.get(o.slug) ?? null }));
}
