import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Choose Our Arizona Rehab Center? | Seven Arrows Recovery',
  description:
    'Why Seven Arrows Recovery — holistic healing, equine therapy, and expert addiction care on 160 private acres in Cochise County, Arizona.',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
