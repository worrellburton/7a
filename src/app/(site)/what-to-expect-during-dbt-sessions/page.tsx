import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What to Expect During Dbt Sessions | Seven Arrows Recovery',
  description:
    'Addiction is powerful, and its impact can overwhelm an individual, altering their mental and physical health, relationships, and overall quality of life.',
  keywords:
    'what to expect during dbt sessions, what to expect during dbt sessions, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/what-to-expect-during-dbt-sessions',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
