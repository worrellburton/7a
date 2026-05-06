import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What is Trauma Informed Addiction Treatment | Seven Arrows Recovery',
  description:
    'Addiction is a deeply complex and multifaceted challenge, and it is often intertwined with a history of trauma.',
  keywords:
    'what is trauma informed addiction treatment, what is trauma informed addiction treatment, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/what-is-trauma-informed-addiction-treatment',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
