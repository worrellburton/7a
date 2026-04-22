import type { Metadata } from 'next';

import AlumniHero from '@/components/alumni/AlumniHero';
import AlumniAtAGlance from '@/components/alumni/AlumniAtAGlance';

export const metadata: Metadata = {
  title: 'Alumni & Aftercare | Seven Arrows Recovery',
  description:
    'Continuing care for Seven Arrows alumni: individualized aftercare plans, IOP and PHP step-down referrals, sober-living placement, alumni community, relapse-prevention toolkit, and 24/7 crisis support. The first 90 days after discharge are the hardest — we stay close.',
  keywords:
    'alumni program Arizona rehab, aftercare planning residential, sober living placement Arizona, IOP step-down, PHP step-down, relapse prevention, recovery community Arizona, post-rehab support, continuing care Seven Arrows',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/treatment/alumni-aftercare',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/treatment/alumni-aftercare',
    title: 'Alumni & Aftercare | Seven Arrows Recovery',
    description:
      'Continuing care for alumni: aftercare plans, step-down referrals, sober-living placement, alumni community, and 24/7 crisis support.',
    images: [
      {
        url: '/images/group-gathering-pavilion.jpg',
        width: 1200,
        height: 630,
        alt: 'Seven Arrows alumni gathering at the ranch pavilion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alumni & Aftercare | Seven Arrows Recovery',
    description:
      'Continuing care built around the hardest 90 days: plans, step-down referrals, sober living, alumni, 24/7 support.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Our Program', item: 'https://sevenarrowsrecovery.com/our-program' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Alumni & Aftercare',
      item: 'https://sevenarrowsrecovery.com/treatment/alumni-aftercare',
    },
  ],
};

const medicalWebPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Alumni & Aftercare — Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/treatment/alumni-aftercare',
  description:
    'Continuing care and alumni support program at Seven Arrows Recovery — aftercare plans, IOP/PHP step-down, sober-living placement, alumni community, and relapse-prevention resources.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  about: [
    { '@type': 'MedicalTherapy', name: 'Continuing Care' },
    { '@type': 'MedicalTherapy', name: 'Intensive Outpatient Program' },
    { '@type': 'MedicalTherapy', name: 'Partial Hospitalization Program' },
    { '@type': 'MedicalProcedure', name: 'Relapse Prevention Planning' },
  ],
  mainContentOfPage: { '@type': 'WebPageElement', cssSelector: 'main' },
  lastReviewed: '2026-04-22',
};

export default function AlumniAftercarePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema) }}
      />
      <AlumniHero />
      <AlumniAtAGlance />
    </main>
  );
}
