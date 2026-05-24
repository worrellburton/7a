import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'What Happens When You Walk Through the Door: Your First Week in Treatment | Seven Arrows Recovery',
  description:
    'A day-by-day guide to your first week in rehab at Seven Arrows Recovery. Learn what to expect during intake, detox, your first group session, and meeting your care team.',
  keywords: 'what to expect in rehab, first week of treatment, substance abuse treatment process, detox timeline, what happens in rehab, rehab first day',
};

import PageContent from './content';
import { BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import { EPISODES } from '@/lib/episodes';

const episode = EPISODES.find((e) => e.slug === 'what-happens-first-week')!;

export default function Page() {
  return (
    <>
      <BlogPostJsonLd episode={episode} />
      <PageContent />
    </>
  );
}
