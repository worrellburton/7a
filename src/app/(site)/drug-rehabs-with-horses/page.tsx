import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehabs with Horses | Seven Arrows Recovery',
  description:
    'Finding the right path to recovery is a deeply personal journey that touches every aspect of an individual’s life.',
  keywords:
    'drug rehabs with horses, drug rehabs with horses, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/drug-rehabs-with-horses',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
