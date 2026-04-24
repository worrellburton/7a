import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Actually Happens in Equine Therapy | Seven Arrows Recovery',
  description:
    'The honest, minute-by-minute version of equine therapy — what happens in the arena, why horses help, and what to expect if you have never done equine therapy before.',
  keywords: 'equine therapy, equine assisted therapy, horse therapy for addiction, equine therapy for trauma, what happens in equine therapy, equine therapy arizona',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
