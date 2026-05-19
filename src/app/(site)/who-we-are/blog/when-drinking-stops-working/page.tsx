import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'When Drinking Stops Working: Recognizing the Signs of Addiction | Seven Arrows Recovery',
  description:
    'Recognize the signs of addiction — and understand when substance use crosses from choice to compulsion. A compassionate guide from Seven Arrows Recovery.',
  keywords: 'signs of addiction, am I an alcoholic, when to get help for substance abuse, warning signs of drug addiction, addiction treatment near me, substance abuse help',
};

import PageContent from './content';
import { BlogPostJsonLd } from '@/components/blog/BlogPostMeta';
import { EPISODES } from '@/lib/episodes';

const episode = EPISODES.find((e) => e.slug === 'when-drinking-stops-working')!;

export default function Page() {
  return (
    <>
      <BlogPostJsonLd episode={episode} />
      <PageContent />
    </>
  );
}
