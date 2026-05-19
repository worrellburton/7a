import type { Metadata } from 'next';

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
