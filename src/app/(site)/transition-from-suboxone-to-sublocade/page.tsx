import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transitioning from Suboxone to Sublocade | Seven Arrows Recovery',
  description:
    'A clinical, compassionate guide to switching from daily Suboxone to monthly Sublocade injections — what to expect, insurance coverage, and how Seven Arrows Recovery in Arizona supports you through every step.',
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
