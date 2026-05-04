import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehabs with Horses: How Equine Therapy Supports Recovery | Seven Arrows Recovery',
  description:
    'How drug rehabs with horses use equine-assisted therapy to support recovery — what the program involves, the five core benefits, and how Seven Arrows Recovery in Arizona integrates equine work into our treatment.',
  keywords:
    'drug rehabs with horses, equine drug rehab, equine therapy addiction, equine-assisted therapy Arizona, horse therapy for addiction, equine assisted recovery, holistic drug rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/drug-rehabs-with-horses',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
