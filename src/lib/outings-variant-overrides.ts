import type { OutingsSectionVariant } from '@/components/outings/OutingsSection';

// Per-(variant, slug) image overrides so each page can show a
// different photograph for the same outing. The Wikipedia-sourced
// images in `outings_images` are the default — variants only need
// an override when the same picture would feel repetitive across
// pages, or when a paid Unsplash/owned shot reads better in a
// specific layout (e.g. a landscape Unsplash photo for the wide
// landing-carousel cards vs. the squarer Wikipedia thumbnail used
// on the holistic grid).
//
// Add an entry only when the variant should DEPART from the
// default. Empty entries pass through to the cached row.
//
// Unsplash usage notes: hot-linking images.unsplash.com is allowed
// under the Unsplash license. Credit + license_url should reflect
// the photographer's profile when known. For pure decoration with
// no commercial branding there's no strict attribution requirement,
// but we keep credits visible on hover for honesty.

export interface OutingImageOverride {
  imageUrl: string;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
}

type OverrideMap = Partial<Record<string, OutingImageOverride>>;

const OVERRIDES: Record<OutingsSectionVariant, OverrideMap> = {
  // Holistic page — defaults (Wikipedia / NPS / USFS).
  experiential: {},

  // Landing page — Unsplash-friendly slot. Add variant photos here
  // so the homepage carousel feels distinct from the holistic grid.
  // Empty by default; defaults from outings_images render until an
  // override is added.
  landing: {},

  // Tour page — defaults. The magazine layout uses 16:10 framing,
  // so landscape-oriented photos work best. Add an override here if
  // a Wikipedia portrait crops awkwardly.
  tour: {},
};

export function getOutingImageOverride(
  variant: OutingsSectionVariant,
  slug: string,
): OutingImageOverride | null {
  return OVERRIDES[variant][slug] ?? null;
}
