import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import CareersAtAGlance from '@/components/careers/CareersAtAGlance';
import WhyWorkHere from '@/components/careers/WhyWorkHere';
import Benefits from '@/components/careers/Benefits';
import OpenPositions from '@/components/careers/OpenPositions';
import LifeAtTheRanch from '@/components/careers/LifeAtTheRanch';
import OurValues from '@/components/careers/OurValues';
import HiringProcess from '@/components/careers/HiringProcess';
import TeamVoices from '@/components/careers/TeamVoices';
import CareersCTA from '@/components/careers/CareersCTA';

export const metadata: Metadata = {
  title: 'Careers · Arizona Rehab Jobs | Seven Arrows Recovery',
  description:
    'Now hiring at Seven Arrows Recovery — LCSWs, LPCs, LMFTs, LISACs, RNs, BHTs, yoga teachers, and admissions counselors at our Cochise County ranch.',
  keywords:
    'Arizona rehab jobs, addiction counselor jobs Arizona, LCSW Arizona rehab, LMFT rehab, LISAC jobs, behavioral health tech jobs, RN rehab jobs Arizona, admissions counselor rehab, trauma therapist jobs, equine therapy jobs',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/who-we-are/careers',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/who-we-are/careers',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com' },
    { '@type': 'ListItem', position: 2, name: 'Who We Are', item: 'https://sevenarrowsrecoveryarizona.com/who-we-are' },
    { '@type': 'ListItem', position: 3, name: 'Careers', item: 'https://sevenarrowsrecoveryarizona.com/who-we-are/careers' },
  ],
};

export default function CareersPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PageHero
        label="Careers at Seven Arrows"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who we are', href: '/who-we-are' },
          { label: 'Careers' },
        ]}
        title={[
          'Do the work you ',
          { text: 'came to do', accent: true },
          '.',
        ]}
        description="Seven Arrows Recovery is hiring clinicians, counselors, nurses, behavioral-health techs, and holistic practitioners for our 160-acre residential ranch in Cochise County, Arizona. Small caseloads, trauma-informed care, and a team that takes the work seriously."
      />
      <CareersAtAGlance />
      <WhyWorkHere />
      <Benefits />
      <OpenPositions />
      <LifeAtTheRanch />
      <OurValues />
      <HiringProcess />
      <TeamVoices />
      <CareersCTA />
    </main>
  );
}
