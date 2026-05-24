import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'What Actually Happens in Equine Therapy | Seven Arrows Recovery',
  description:
    'The honest, minute-by-minute version of equine therapy — what happens in the arena, why horses help, and what to expect if you have never done equine therapy before.',
  keywords: 'equine therapy, equine assisted therapy, horse therapy for addiction, equine therapy for trauma, what happens in equine therapy, equine therapy arizona',
};

import PageContent from './content';
import { BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import { EPISODES } from '@/lib/episodes';

const episode = EPISODES.find((e) => e.slug === 'what-actually-happens-in-equine-therapy')!;

export default function Page() {
  return (
    <>
      <BlogPostJsonLd episode={episode} />
      <PageContent />
    </>
  );
}
