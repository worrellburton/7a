import type { Metadata } from 'next';

import CareersHero from '@/components/careers/CareersHero';

export const metadata: Metadata = {
  title: 'Careers | Arizona Addiction Treatment Jobs — Seven Arrows Recovery',
  description:
    'Join the team at Seven Arrows Recovery. We are hiring LCSWs, LPCs, LMFTs, LISACs, RNs, BHTs, yoga teachers, and admissions counselors at our 160-acre residential ranch in Cochise County, Arizona.',
  keywords:
    'Arizona rehab jobs, addiction counselor jobs Arizona, LCSW Arizona rehab, LMFT rehab, LISAC jobs, behavioral health tech jobs, RN rehab jobs Arizona, admissions counselor rehab, trauma therapist jobs, equine therapy jobs',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/who-we-are/careers',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/who-we-are/careers',
    title: 'Careers | Seven Arrows Recovery',
    description:
      'Hiring clinicians, counselors, nurses, BHTs, and holistic practitioners at our 160-acre residential ranch in Cochise County, Arizona.',
    images: [
      {
        url: '/images/covered-porch-desert-view.jpg',
        width: 1200,
        height: 630,
        alt: 'Covered porch at Seven Arrows Recovery in the Swisshelm Mountains',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers | Seven Arrows Recovery',
    description:
      'Hiring clinicians and support roles at a boutique residential ranch in Cochise County, Arizona.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Who We Are', item: 'https://sevenarrowsrecovery.com/who-we-are' },
    { '@type': 'ListItem', position: 3, name: 'Careers', item: 'https://sevenarrowsrecovery.com/who-we-are/careers' },
  ],
};

export default function CareersPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CareersHero />
    </main>
  );
}
