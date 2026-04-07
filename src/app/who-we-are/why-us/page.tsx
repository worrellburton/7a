import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Choose Our Arizona Rehab Center? | Seven Arrows Recovery',
  description:
    'Discover why Seven Arrows Recovery is a leading addiction treatment center in AZ. We offer holistic healing, equine therapy, and expert care on 160 private acres.',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
