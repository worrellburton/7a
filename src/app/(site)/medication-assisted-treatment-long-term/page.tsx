import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medication Assisted Treatment Long Term | Seven Arrows Recovery',
  description:
    'In the battle against addiction, one of the most effective and research-backed approaches is medication-assisted treatment, also known as MAT.',
  keywords:
    'medication assisted treatment long term, medication assisted treatment long term, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/medication-assisted-treatment-long-term',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
