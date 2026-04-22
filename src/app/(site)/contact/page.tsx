import type { Metadata } from 'next';

import ContactHero from '@/components/contact/ContactHero';
import ContactAtAGlance from '@/components/contact/ContactAtAGlance';

export const metadata: Metadata = {
  title: 'Contact Us | Seven Arrows Recovery',
  description:
    'Call, email, or message Seven Arrows Recovery. Admissions answers 24/7 — no gatekeeping, no sales script. Real-person, confidential, zero pressure. (866) 996-4308.',
  keywords:
    'contact Seven Arrows Recovery, rehab admissions phone 866-996-4308, rehab contact Arizona, confidential rehab contact, 24/7 rehab admissions',
  alternates: {
    canonical: 'https://sevenarrowsrecovery.com/contact',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecovery.com/contact',
    title: 'Contact Us | Seven Arrows Recovery',
    description:
      'Call, email, or send a note. Admissions answers 24/7 — a real person, confidential, zero pressure.',
    images: [
      {
        url: '/images/covered-porch-desert-view.jpg',
        width: 1200,
        height: 630,
        alt: 'Covered porch at Seven Arrows Recovery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Seven Arrows Recovery',
    description:
      'Admissions answers 24/7. Call (866) 996-4308, email, or send a note via the form.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecovery.com' },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: 'https://sevenarrowsrecovery.com/contact' },
  ],
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com/contact',
  description:
    'Contact information and form for Seven Arrows Recovery — residential addiction treatment in Cochise County, Arizona. Admissions answers 24/7.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
  lastReviewed: '2026-04-22',
};

export default function ContactPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      <ContactHero />
      <ContactAtAGlance />
    </main>
  );
}
