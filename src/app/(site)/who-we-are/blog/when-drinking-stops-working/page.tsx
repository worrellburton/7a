import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'When Drinking Stops Working: Recognizing the Signs of Addiction | Seven Arrows Recovery',
  description:
    'Recognize the signs of addiction — and understand when substance use crosses from choice to compulsion. A compassionate guide from Seven Arrows Recovery.',
  keywords: 'signs of addiction, am I an alcoholic, when to get help for substance abuse, warning signs of drug addiction, addiction treatment near me, substance abuse help',
};

import PageContent from './content';
import StaticBlogStructuredData from '@/components/blog/StaticBlogStructuredData';
import { EPISODES } from '@/lib/episodes';

const episode = EPISODES.find((e) => e.slug === 'when-drinking-stops-working')!;

export default function Page() {
  return (
    <>
      <StaticBlogStructuredData episode={episode} />
      <PageContent />
    </>
  );
}
