import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transitioning from Suboxone to Sublocade: A Step-by-Step Guide | Seven Arrows Recovery',
  description:
    'A clinical, compassionate guide to switching from daily Suboxone to monthly Sublocade injections — eligibility, timing, what the first month feels like, and why it works.',
  keywords:
    'transition from Suboxone to Sublocade, Sublocade injection, buprenorphine extended release, Suboxone to Sublocade timeline, MAT for opioid use disorder, monthly buprenorphine injection, opioid addiction treatment Arizona',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/transition-from-suboxone-to-sublocade',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
