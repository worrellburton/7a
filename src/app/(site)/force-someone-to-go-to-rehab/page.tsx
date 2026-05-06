import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Can I Force Someone to Go to Rehab? | Seven Arrows Recovery',
  description:
    'Watching someone you love struggle with addiction is one of the most painful experiences you can go through.',
  keywords:
    'can i force someone to go to rehab, force someone to go to rehab, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/force-someone-to-go-to-rehab',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
