// Topical tags for every root-level article — the relatedness source
// for the <RelatedArticles> module at the bottom of each article page.
//
// Neither the static articles nor the `blogs` table carry tags, so this
// map IS the taxonomy. Keep it coarse: tags exist only to pick 3-4
// sensible "keep reading" cards, not to power a public category system.
// When a new article ships (static folder or DB publish), add its slug
// here — and, if it isn't a Recovery Roadmap EPISODES entry, add a card
// to EXTRA_ARTICLES so the module can render its thumbnail/title.
//
// Client-safe: episodes.ts is pure data (no server imports).

import { EPISODES, episodeHref, episodeImage } from './episodes';

export interface ArticleCard {
  slug: string;
  href: string;
  title: string;
  image: string;
  imageAlt: string;
  publishedAt: string; // ISO — recency tiebreak
}

// Articles that aren't in the EPISODES index: the DB-published posts
// (their metadata lives in the blogs table, snapshotted here so the
// module stays synchronous and client-safe) plus the one editorial
// piece that never got an EPISODES row.
const EXTRA_ARTICLES: ArticleCard[] = [
  {
    slug: 'what-makes-treatment-actually-work',
    href: '/what-makes-treatment-actually-work',
    title: 'What Actually Makes Treatment Work: The Therapeutic Alliance',
    image: '/hero/individual-therapy-session.jpg',
    imageAlt: 'A clinician and client in conversation during an individual therapy session at Seven Arrows Recovery.',
    publishedAt: '2026-07-14',
  },
  {
    slug: 'how-much-does-drug-rehab-cost',
    href: '/how-much-does-drug-rehab-cost',
    title: 'How Much Does Drug Rehab Cost? A Complete Breakdown by Program Type',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/aa75b50e-92db-4fe5-b182-daaf4fefabc6/3-nano-banana-2.png',
    imageAlt: 'How much does drug rehab cost',
    publishedAt: '2026-07-08',
  },
  {
    slug: 'what-is-drug-rehab-like',
    href: '/what-is-drug-rehab-like',
    title: 'What Is Drug Rehab Really Like? An Honest Day-by-Day Look',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/06511a21-aded-4a21-a550-a0ec9180ee22/2-gpt-image-2.png',
    imageAlt: 'What drug rehab is really like',
    publishedAt: '2026-07-08',
  },
  {
    slug: 'insurance-coverage-for-drug-rehab',
    href: '/insurance-coverage-for-drug-rehab',
    title: 'Which Insurance Plans Cover Drug Rehab',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/b26c3b09-23c3-48d6-85f7-2858e17f69c1/1-nano-banana-2.png',
    imageAlt: 'Insurance coverage for drug rehab',
    publishedAt: '2026-06-29',
  },
  {
    slug: 'how-long-is-drug-rehab-timeline',
    href: '/how-long-is-drug-rehab-timeline',
    title: 'How Long Is Drug Rehab? A Week-by-Week Timeline for Each Program Type',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/fc9b2198-1075-4d79-80e0-c36fad44e4e0/0-gpt-image-2.png',
    imageAlt: 'How long drug rehab takes, week by week',
    publishedAt: '2026-06-16',
  },
  {
    slug: 'recovery-through-self-connection',
    href: '/recovery-through-self-connection',
    title: 'Recovery Through Self-Connection',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/702783a6-ee05-4a57-afa9-94bece978053/0-gpt-image-2.png',
    imageAlt: 'Recovery through self-connection',
    publishedAt: '2026-05-27',
  },
  {
    slug: 'forward-facing-recovery-building-a-life-you-dont',
    href: '/forward-facing-recovery-building-a-life-you-dont',
    title: 'Forward-FacingⓇ Recovery: Building a Life You Don’t Want to Escape',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/blog-images/8813c506-e5cc-45ba-a495-514475ac43a3/7-nano-banana-2.png',
    imageAlt: 'Forward-facing recovery',
    publishedAt: '2026-05-20',
  },
];

export const ARTICLE_TOPICS: Record<string, string[]> = {
  // Rehab basics / choosing / logistics
  'how-much-does-drug-rehab-cost': ['rehab-basics', 'cost-insurance'],
  'what-is-drug-rehab-like': ['rehab-basics', 'first-steps'],
  'insurance-coverage-for-drug-rehab': ['rehab-basics', 'cost-insurance'],
  'how-long-is-drug-rehab-timeline': ['rehab-basics', 'treatment-quality'],
  'what-happens-first-week': ['rehab-basics', 'first-steps'],
  'how-to-go-to-rehab-without-loosing-your-job': ['rehab-basics', 'work-life'],
  'should-i-travel-for-addiction-treatment': ['rehab-basics'],
  'force-someone-to-go-to-rehab': ['family', 'first-steps'],
  'why-does-longer-treatment-lead-to-better-outcomes-addiction-recovery-with-sustainable-results': ['rehab-basics', 'treatment-quality'],
  'inpatient-mental-health-facilities-in-arizona': ['mental-health', 'rehab-basics'],
  'what-to-look-for-in-local-detox-centers': ['detox', 'rehab-basics'],
  'what-to-look-for-local-detox-center': ['detox', 'rehab-basics'],
  'what-to-look-for-in-a-heroin-rehab': ['opioids', 'rehab-basics'],
  'using-insurance-to-cover-detox-for-cocaine': ['cost-insurance', 'detox'],

  // Equine & animal-assisted
  'what-actually-happens-in-equine-therapy': ['equine', 'animal'],
  'how-can-equine-therapy-benefit-addiction-recovery': ['equine', 'animal'],
  'drug-rehabs-with-horses': ['equine', 'animal'],
  'benefits-of-animal-assisted-therapies': ['animal', 'equine'],
  'pets-role-in-addiction-recovery-unconditional-support-love': ['animal'],

  // Nervous system / trauma / somatic
  'polyvagal-in-plain-english': ['nervous-system', 'somatic'],
  'your-therapists-nervous-system': ['nervous-system', 'treatment-quality'],
  'salutogenic-not-pathological': ['nervous-system', 'treatment-quality'],
  'what-makes-treatment-actually-work': ['treatment-quality', 'nervous-system'],
  'understanding-the-impact-trauma-has-on-addiction': ['trauma'],
  'what-is-trauma-informed-addiction-treatment': ['trauma', 'treatment-quality'],
  'unlocking-healing-understanding-trauma-informed-yoga-for-addiction-recovery': ['trauma', 'holistic'],
  'nature-versus-nurture-explaining-the-link-between-epigenetics-and-addiction': ['brain', 'trauma'],
  'recovery-through-self-connection': ['somatic', 'recovery-life'],
  'forward-facing-recovery-building-a-life-you-dont': ['recovery-life', 'treatment-quality'],

  // Alcohol & family
  'when-drinking-stops-working': ['alcohol', 'first-steps'],
  'how-to-help-your-alcoholic-spouse': ['alcohol', 'family'],
  'signs-a-spouse-is-using-drugs': ['family'],
  'addiction-in-a-coworker': ['family', 'work-life'],

  // Detox & substances
  'detox-for-benzodiazepine-withdrawal': ['detox', 'benzos'],
  'how-to-safely-detox-from-xanax': ['detox', 'benzos'],
  'what-to-expect-during-meth-withdrawal': ['detox', 'stimulants'],
  'how-long-does-meth-stay-in-your-system': ['stimulants', 'detox'],
  'symptoms-of-fentanyl-addiction': ['opioids'],
  'how-do-opioids-affect-the-body': ['opioids'],
  'transition-from-suboxone-to-sublocade': ['mat', 'opioids'],
  'medication-assisted-treatment-long-term': ['mat', 'opioids'],

  // Holistic & wellness
  'sound-therapy-and-addiction-treatment': ['holistic'],
  'the-integration-of-cultural-and-holistic-healing-in-recovery': ['holistic'],
  'what-makes-a-rehab-holistic': ['holistic', 'treatment-quality'],
  'the-benefits-of-meditation-for-addiction-recovery': ['holistic', 'stress'],
  'farm-to-table-to-healing-a-conversation-about-food-and-the-recovery-process-with-chef-sandra-bradley': ['nutrition', 'holistic'],
  'the-power-of-nutrition-in-early-recovery': ['nutrition', 'wellness'],
  'boost-your-brain-health-increasing-serotonin-in-addiction-recovery': ['brain', 'wellness'],
  'exercise-and-addiction-recovery-4-ways-to-rewire-your-brain': ['brain', 'wellness'],
  'how-to-practice-self-care': ['wellness', 'stress'],
  'manage-stress-and-burnout': ['stress', 'wellness'],
  'dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills': ['stress', 'wellness'],
  'sober-summer-activities': ['recovery-life', 'wellness'],
  'rebuilding-and-restoring-your-life-in-addiction-recovery': ['recovery-life'],

  // Community & clinical
  'guide-to-12-step-meetings': ['community'],
  'role-of-support-groups-in-addiction-recovery': ['community'],
  'what-to-expect-during-dbt-sessions': ['mental-health', 'treatment-quality'],
  'dynamics-of-healing-co-occurring-disorders-and-how-to-address-them': ['mental-health'],
};

// Articles that must never be dealt out as a related card:
//   - transition-from-suboxone-to-sublocade: its URL is intercepted by
//     an enabled redirects-table row (301 → the opioid money page), so
//     a card titled one thing would land on a page titled another.
//   - forward-facing-recovery…: flagged hidden in blog_visibility —
//     the listing pipeline hides it everywhere else, and this static
//     pool must not resurface it.
// (This is a static snapshot, like EXTRA_ARTICLES itself — if a post's
// visibility or redirect state changes, update this set with it.)
const EXCLUDED_SLUGS = new Set([
  'transition-from-suboxone-to-sublocade',
  'forward-facing-recovery-building-a-life-you-dont',
]);

// Full card pool: every EPISODES entry + the extras above.
function allCards(): ArticleCard[] {
  const cards: ArticleCard[] = EPISODES.filter((ep) => !EXCLUDED_SLUGS.has(ep.slug)).map((ep) => ({
    slug: ep.slug,
    href: episodeHref(ep.slug),
    title: ep.title,
    image: episodeImage(ep),
    imageAlt: ep.imageAlt,
    publishedAt: ep.publishedAt,
  }));
  const seen = new Set(cards.map((c) => c.slug));
  for (const extra of EXTRA_ARTICLES) {
    if (!seen.has(extra.slug) && !EXCLUDED_SLUGS.has(extra.slug)) cards.push(extra);
  }
  return cards;
}

/** 3-4 related articles for a slug: most shared topic tags first,
 *  newest first on ties. If fewer than `max` share a tag, the newest
 *  remaining articles fill the gap so the module never looks sparse.
 *  Unknown slugs (e.g. a DB post published after this map) return []
 *  and the module renders nothing. */
export function relatedFor(slug: string, max = 4): ArticleCard[] {
  const myTags = ARTICLE_TOPICS[slug];
  if (!myTags || myTags.length === 0) return [];
  const mine = new Set(myTags);
  const scored = allCards()
    .filter((c) => c.slug !== slug)
    .map((c) => ({
      card: c,
      score: (ARTICLE_TOPICS[c.slug] ?? []).reduce((n, t) => n + (mine.has(t) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || b.card.publishedAt.localeCompare(a.card.publishedAt));
  const related = scored.filter((s) => s.score > 0).map((s) => s.card);
  if (related.length < max) {
    for (const s of scored) {
      if (related.length >= max) break;
      if (s.score === 0) related.push(s.card);
    }
  }
  return related.slice(0, max);
}
