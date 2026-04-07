import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admissions | Seven Arrows Recovery',
  description:
    'Begin your recovery journey at Seven Arrows Recovery. Our streamlined admissions process includes insurance verification, a brief phone assessment, and transportation coordination — most clients arrive within 24-48 hours.',
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
