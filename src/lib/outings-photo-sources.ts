// Curated public-domain / CC photo sources for the outings catalog.
// Used by /api/outings/load-photos to populate public.outings_images
// with real photographs (sourced from Wikipedia / Wikimedia Commons,
// NPS, and USFS) instead of AI illustrations.
//
// The loader route resolves each Wikipedia article's lead image at
// runtime via the REST summary API, downloads the file, uploads it
// to Supabase storage at public-images/outings/<slug>.jpg, and
// writes the row with the attribution metadata below.
//
// Fallback license/credit values stay conservative (CC BY-SA 4.0 +
// "Wikimedia Commons") because the lead image of a Wikipedia article
// is almost always one of: Public Domain (NPS/USFS work), CC BY-SA,
// or CC BY. The loader inspects the file's actual license via the
// Commons API and overrides these fallbacks when possible.

export interface OutingPhotoSource {
  /** outings_images.slug — must match an entry in /lib/outings.ts. */
  outingSlug: string;
  /** Wikipedia article path on en.wikipedia.org. The lead image is
   *  fetched via /api/rest_v1/page/summary/<slug>. */
  wikipediaSlug: string;
  /** Fallback credit if the file's CommonsAPI artist field is empty. */
  fallbackCredit: string;
  /** Fallback license short name. Most NPS/USFS work is Public Domain;
   *  most Wikipedia article leads are CC BY-SA 4.0. */
  fallbackLicense: string;
  /** Fallback license URL. */
  fallbackLicenseUrl: string;
}

const PD_NPS_USFS = {
  fallbackCredit: 'U.S. National Park Service / Forest Service — Public Domain',
  fallbackLicense: 'Public Domain (US Government work)',
  fallbackLicenseUrl: 'https://en.wikipedia.org/wiki/Public_domain',
};

const CC_BY_SA_4 = {
  fallbackCredit: 'Wikimedia Commons',
  fallbackLicense: 'CC BY-SA 4.0',
  fallbackLicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

export const OUTING_PHOTO_SOURCES: OutingPhotoSource[] = [
  {
    outingSlug: 'chiricahua-national-monument',
    wikipediaSlug: 'Chiricahua_National_Monument',
    ...PD_NPS_USFS,
  },
  {
    outingSlug: 'amerind-museum-trails',
    wikipediaSlug: 'Texas_Canyon',
    ...CC_BY_SA_4,
  },
  {
    outingSlug: 'bisbee-mine-tour',
    wikipediaSlug: 'Bisbee,_Arizona',
    ...CC_BY_SA_4,
  },
  {
    outingSlug: 'tombstone',
    wikipediaSlug: 'Tombstone,_Arizona',
    ...CC_BY_SA_4,
  },
  {
    outingSlug: 'sandhill-cranes-whitewater-draw',
    wikipediaSlug: 'Sandhill_crane',
    fallbackCredit: 'U.S. Fish & Wildlife Service / Wikimedia Commons',
    fallbackLicense: 'Public Domain (US Government work)',
    fallbackLicenseUrl: 'https://en.wikipedia.org/wiki/Public_domain',
  },
  {
    outingSlug: 'kartchner-stargazing',
    wikipediaSlug: 'Kartchner_Caverns_State_Park',
    ...CC_BY_SA_4,
  },
  {
    outingSlug: 'turkey-creek',
    wikipediaSlug: 'Coronado_National_Forest',
    ...PD_NPS_USFS,
  },
  {
    outingSlug: 'cochise-stronghold',
    wikipediaSlug: 'Cochise_Stronghold',
    ...PD_NPS_USFS,
  },
];
