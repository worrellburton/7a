// Typed catalog of off-site experiential-therapy outings. Used by
// the public Holistic & Indigenous page (image-led tiles) and the
// admin preheat endpoint that runs each prompt through Gemini's
// image model to populate `outings_images`.
//
// The prompt is intentionally specific: real geographic features,
// time-of-day, mood, and instruction to render in a "photographic,
// editorial" style so the result reads as a documentary still
// rather than illustration. We avoid people in the frame so the
// imagery doesn't compete with the alumni-voices section that
// renders below.

export interface Outing {
  slug: string;
  name: string;
  body: string;
  href: string;
  /** A short geographic / cultural label that surfaces above the
   *  card title — gives the catalog a postcard-like rhythm. */
  region: string;
  /** Image prompt fed to the image-edit / generation model. */
  prompt: string;
}

export const OUTINGS: Outing[] = [
  {
    slug: 'chiricahua-national-monument',
    name: 'Chiricahua National Monument',
    region: 'Wonderland of Rocks · Cochise County',
    body: 'Towering rhyolite pinnacles and shaded canyon trails — a full-day hike that pairs movement with awe.',
    href: 'https://www.nps.gov/chir/index.htm',
    prompt:
      'A documentary photograph of the towering rhyolite hoodoo rock formations of Chiricahua National Monument in southeastern Arizona at golden hour, dramatic light, no people, photographic editorial style, deep shadows in the canyon, soft warm desert tones, ultra-realistic.',
  },
  {
    slug: 'amerind-museum-trails',
    name: 'Amerind Museum & Trails',
    region: 'Texas Canyon · Dragoon, AZ',
    body: 'A small, world-class museum of Indigenous art and archaeology with quiet desert trails out the back door.',
    href: 'https://amerind.org/',
    prompt:
      'A documentary photograph of the Amerind Museum building nestled among the giant boulders of Texas Canyon in Dragoon, Arizona at soft late-afternoon light, sandstone-pink architecture, no people, photographic editorial style, scattered juniper and oak, ultra-realistic.',
  },
  {
    slug: 'bisbee-mine-tour',
    name: 'Bisbee Mine Tour',
    region: 'Queen Mine · Bisbee, AZ',
    body: 'Underground at the historic Queen Mine — narrow lights, bracing temperatures, and the long shadow of Arizona industry.',
    href: 'https://queenminetour.com/',
    prompt:
      'A documentary photograph of the historic Queen Mine entrance in Bisbee, Arizona — wooden mine portal, narrow ore-cart rails leading into darkness, single warm headlight glow inside the tunnel, no people, photographic editorial style, dramatic chiaroscuro, ultra-realistic.',
  },
  {
    slug: 'tombstone',
    name: 'Tombstone',
    region: "The Town Too Tough to Die · Cochise County",
    body: 'A walking afternoon in the Old West — frontier streets, courthouse, and the boardwalk.',
    href: 'https://tombstonechamber.com/',
    prompt:
      'A documentary photograph of the wooden boardwalks and 19th-century false-front buildings on Allen Street in Tombstone, Arizona, late-afternoon dust-gold light, no people, photographic editorial style, hitching posts and frontier signage, ultra-realistic.',
  },
  {
    slug: 'sandhill-cranes-whitewater-draw',
    name: 'Sandhill Cranes at Whitewater Draw',
    region: 'Sulphur Springs Valley · Cochise County',
    body: 'Tens of thousands of cranes wintering in the Sulphur Springs Valley — a quiet pre-dawn outing with a long view.',
    href: 'https://www.azgfd.com/recreation/wildlife-viewing/whitewater-draw/',
    prompt:
      'A documentary photograph of thousands of sandhill cranes lifting off from the Whitewater Draw wetlands in southern Arizona at pre-dawn blue hour, mist rising off the water, distant Chiricahua mountains silhouetted, photographic editorial style, no people, ultra-realistic, soft purple and gold sky.',
  },
  {
    slug: 'kartchner-stargazing',
    name: 'Stargazing at Kartchner Caverns',
    region: 'International Dark Sky Park · Benson, AZ',
    body: 'Dark-sky observation in a state park renowned for both its underground formations and its night sky.',
    href: 'https://azstateparks.com/kartchner/',
    prompt:
      'A documentary photograph of the Milky Way galactic core arching over the dark-sky park at Kartchner Caverns in southeastern Arizona, silhouetted desert ridge in the foreground, deep navy and violet night sky with thousands of stars, no people, photographic editorial style, long-exposure feel, ultra-realistic.',
  },
  {
    slug: 'turkey-creek',
    name: 'Hiking Turkey Creek',
    region: 'Coronado National Forest · Chiricahua range',
    body: 'Cottonwood-lined canyon hikes east of the Chiricahuas — water year-round, bird-rich, low-traffic.',
    href: 'https://www.fs.usda.gov/coronado',
    prompt:
      'A documentary photograph of a clear cottonwood-shaded creek running through Turkey Creek canyon in the Chiricahua mountains of Arizona, dappled morning sunlight, lush riparian greenery against red rock, no people, photographic editorial style, ultra-realistic.',
  },
  {
    slug: 'cochise-stronghold',
    name: 'Cochise Stronghold & Campground',
    region: 'Dragoon Mountains · Coronado NF',
    body: "Granite domes and the protected canyon Cochise himself called home — day hikes, picnic lunches, and a real history walk.",
    href: 'https://www.fs.usda.gov/recarea/coronado/recreation/recarea/?recid=25502',
    prompt:
      "A documentary photograph of the granite dome formations of Cochise Stronghold in the Dragoon Mountains of Arizona at warm late-afternoon light, scattered oak and juniper, deep shadows in the protected canyon, no people, photographic editorial style, ultra-realistic.",
  },
];

export function findOutingBySlug(slug: string): Outing | null {
  return OUTINGS.find((o) => o.slug === slug) ?? null;
}
