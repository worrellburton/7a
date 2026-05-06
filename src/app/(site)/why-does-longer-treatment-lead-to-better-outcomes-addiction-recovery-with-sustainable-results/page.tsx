import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Does Longer Treatment Lead to Better Outcomes? Addiction Recovery with Sustainable Results | Seven Arrows Recovery',
  description:
    'Many people approach addiction recovery as though it’s a microwave: systematic, straightforward, and—above all else—fast. The “30-day treatment” myth doesn’t help with these misconceptions either.',
  keywords:
    'why does longer treatment lead to better outcomes? addiction recovery with sustainable results, why does longer treatment lead to better outcomes addiction recovery with sustainable results, addiction recovery, Seven Arrows Recovery, Arizona rehab',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/why-does-longer-treatment-lead-to-better-outcomes-addiction-recovery-with-sustainable-results',
  },
};

import PageContent from './content';

export default function Page() {
  return <PageContent />;
}
