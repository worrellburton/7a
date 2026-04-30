import { loadOutingsWithImages, type OutingWithImage } from '@/lib/outings-data';
import { getOutingImageOverride } from '@/lib/outings-variant-overrides';
import ExperientialVariant from './variants/Experiential';
import LandingVariant from './variants/Landing';
import TourVariant from './variants/Tour';

// Single server component that loads the outings catalog once and
// dispatches to one of three visual variants:
//
//   experiential — current image-led catalog with dark-scrim caption
//                  reveal on hover. Used on /our-program/holistic.
//   landing      — cinematic horizontal-scroll carousel with snap.
//                  Used at the bottom of the homepage.
//   tour         — magazine-style alternating list (image left, copy
//                  right; alternates row direction). Used on /tour.
//
// Each variant is a sibling component in /variants so the layouts
// stay independent — adding a fourth doesn't require unwinding a
// dense conditional, and tweaking one variant can't accidentally
// shift another.

export type OutingsSectionVariant = 'experiential' | 'landing' | 'tour';

export default async function OutingsSection({ variant }: { variant: OutingsSectionVariant }) {
  const base = await loadOutingsWithImages();
  // Apply per-(variant, slug) overrides — see /lib/outings-variant-overrides.
  // Most slugs pass through unchanged; an override swaps the image +
  // attribution so the homepage carousel and tour magazine can show
  // different photographs from the holistic grid.
  const outings: OutingWithImage[] = base.map((o) => {
    const override = getOutingImageOverride(variant, o.slug);
    if (!override) return o;
    return {
      ...o,
      image: {
        imageUrl: override.imageUrl,
        credit: override.credit,
        license: override.license,
        licenseUrl: override.licenseUrl,
      },
    };
  });
  return <Dispatch variant={variant} outings={outings} />;
}

function Dispatch({ variant, outings }: { variant: OutingsSectionVariant; outings: OutingWithImage[] }) {
  switch (variant) {
    case 'experiential':
      return <ExperientialVariant outings={outings} />;
    case 'landing':
      return <LandingVariant outings={outings} />;
    case 'tour':
      return <TourVariant outings={outings} />;
  }
}
