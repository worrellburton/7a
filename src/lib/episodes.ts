// Single source of truth for the Recovery Roadmap series.
//
// Adding a new entry here makes it appear on:
//   - the public landing page (latest 3 surface in <BlogPreview />)
//   - /who-we-are/recovery-roadmap (full chronological list)
// without any other edits.
//
// Each episode still has its own MDX-style page under
// /who-we-are/blog/<slug>/content.tsx — this file is just the
// metadata index that powers the listings.

export interface Episode {
  number: number;
  slug: string;
  title: string;
  /** Short pitch, displayed under the title in listings. */
  blurb: string;
  /** ISO date — used for sorting. */
  publishedAt: string;
  /** Pretty date label shown in the UI ("April 24, 2026"). */
  publishedDisplay: string;
  image: string;
  imageAlt: string;
  /**
   * Optional override for the episode's URL. Most episodes live
   * under /who-we-are/blog/<slug> and use the default. A small set
   * of legacy SEO URLs (e.g. /transition-from-suboxone-to-sublocade)
   * are served at the top level instead — set `href` on those rows
   * so the listings link to the right place.
   */
  href?: string;
}

export const EPISODES: Episode[] = [
  {
    number: 1,
    slug: 'when-drinking-stops-working',
    title: 'When Drinking Stops Working: Recognizing the Signs of Addiction',
    blurb:
      'A compassionate guide to understanding when substance use has crossed from choice to compulsion.',
    publishedAt: '2026-03-24',
    publishedDisplay: 'March 24, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'When Drinking Stops Working',
  },
  {
    number: 2,
    slug: 'what-happens-first-week',
    title: 'What Happens When You Walk Through the Door: Your First Week in Treatment',
    blurb:
      'Your first week in treatment, demystified. A day-by-day guide for anyone afraid to make the call.',
    publishedAt: '2026-03-24',
    publishedDisplay: 'March 24, 2026',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    imageAlt: 'What Happens When You Walk Through the Door',
  },
  {
    number: 3,
    slug: 'what-actually-happens-in-equine-therapy',
    title: 'What Actually Happens in Equine Therapy',
    blurb:
      'The honest, minute-by-minute version of equine therapy — no marketing gloss, no horse-whispering mystique. Just what really happens in the arena and why it reaches places talk therapy sometimes cannot.',
    publishedAt: '2026-04-24',
    publishedDisplay: 'April 24, 2026',
    image: '/images/equine-therapy-portrait.jpg',
    imageAlt: 'What Actually Happens in Equine Therapy',
  },
  {
    number: 4,
    slug: 'your-therapists-nervous-system',
    title: "The Miracle Intervention Is Your Therapist's Nervous System",
    blurb:
      "Co-regulation, regulated presence, and the science of why a clinician who's done their own work makes therapy actually land. Plus the warning signs of a therapist performing calm.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&q=80',
    imageAlt: "A regulated therapist sitting calmly across from a client",
  },
  {
    number: 5,
    slug: 'salutogenic-not-pathological',
    title: "Salutogenic, Not Pathological: Rebuilding What's Right Instead of Chasing What's Wrong",
    blurb:
      "The DSM mindset says you are what's wrong with you. The salutogenic frame — built on Rhoton & Gentry's work — says you are what's underneath, still intact, waiting to surface. Why self-leadership beats symptom management for 5-year outcomes.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
    imageAlt: 'A wide horizon at first light — building toward something, not chasing what is broken',
  },
  {
    number: 6,
    slug: 'polyvagal-in-plain-english',
    title: "Polyvagal in Plain English: The Three States You Live In Every Day",
    blurb:
      "Ventral, sympathetic, dorsal — walked as a ladder, in language you can actually use mid-craving. Why addiction looks different in each state, and the two questions to ask yourself when you can't tell which one you're in.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=1200&q=80',
    imageAlt: 'A person at the foot of a long ladder — the polyvagal ladder you climb up and down all day',
  },
  {
    number: 7,
    slug: 'transition-from-suboxone-to-sublocade',
    title: 'Transitioning from Suboxone to Sublocade',
    blurb:
      'What to expect when switching from daily Suboxone to a monthly Sublocade injection — the four-step transition, insurance coverage, and how Seven Arrows Recovery walks alongside you the whole way.',
    publishedAt: '2026-04-28',
    publishedDisplay: 'April 28, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'A resident sitting quietly by a window — recovery on a monthly rhythm instead of a daily one',
    // Served at the top-level legacy URL instead of the standard
    // /who-we-are/blog/<slug> path so existing inbound links and
    // SEO equity from the WordPress era keep landing on the same
    // article.
    href: '/transition-from-suboxone-to-sublocade',
  },
  {
    number: 8,
    slug: 'signs-a-spouse-is-using-drugs',
    title: '5 Signs a Spouse Is Using Drugs',
    blurb:
      'The behavioral, financial, and physical patterns that show up when a partner is using drugs — what they look like in real life, and what to do next when you start to see them.',
    publishedAt: '2026-05-04',
    publishedDisplay: 'May 4, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'A spouse looking out a window at dusk — when small changes start to add up',
    href: '/signs-a-spouse-is-using-drugs',
  },
  {
    number: 9,
    slug: 'drug-rehabs-with-horses',
    title: 'Drug Rehabs with Horses',
    blurb:
      'How equine-assisted therapy supports recovery — what working with horses actually involves, the five core benefits, and how Seven Arrows builds equine work into our holistic program.',
    publishedAt: '2026-05-04',
    publishedDisplay: 'May 4, 2026',
    image: '/images/equine-therapy-portrait.jpg',
    imageAlt: 'A client and a horse in a quiet moment — reflective work in the arena',
    href: '/drug-rehabs-with-horses',
  },
];

/** Newest-first — drives the landing page's "latest" surfacing. */
export const EPISODES_NEWEST_FIRST: Episode[] = [...EPISODES].sort((a, b) => {
  if (a.publishedAt === b.publishedAt) return b.number - a.number;
  return a.publishedAt < b.publishedAt ? 1 : -1;
});

/** Episode-number ascending — the chronological "Series" view. */
export const EPISODES_BY_NUMBER: Episode[] = [...EPISODES].sort(
  (a, b) => a.number - b.number,
);

export function episodeHref(slug: string): string {
  const ep = EPISODES.find((e) => e.slug === slug);
  if (ep?.href) return ep.href;
  return `/who-we-are/blog/${slug}`;
}
