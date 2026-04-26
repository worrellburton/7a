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
  return `/who-we-are/blog/${slug}`;
}
