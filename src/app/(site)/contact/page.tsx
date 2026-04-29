import type { Metadata } from 'next';

import PageHero from '@/components/PageHero';
import ContactAtAGlance from '@/components/contact/ContactAtAGlance';
import WaysToReach from '@/components/contact/WaysToReach';
import ContactForm from '@/components/contact/ContactForm';
import { RanchAddress, RanchMap } from '@/components/RanchAddress';

export const metadata: Metadata = {
  title: 'Contact Us | Seven Arrows Recovery',
  description:
    'Call, email, or message Seven Arrows Recovery. Admissions answers 24/7 — no gatekeeping, no sales script. Confidential. (866) 996-4308.',
  keywords:
    'contact Seven Arrows Recovery, rehab admissions phone 866-996-4308, rehab contact Arizona, confidential rehab contact, 24/7 rehab admissions',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/contact',
  },
  openGraph: {
    type: 'article',
    url: 'https://sevenarrowsrecoveryarizona.com/contact',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sevenarrowsrecoveryarizona.com' },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: 'https://sevenarrowsrecoveryarizona.com/contact' },
  ],
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Seven Arrows Recovery',
  url: 'https://sevenarrowsrecoveryarizona.com/contact',
  description:
    'Contact information and form for Seven Arrows Recovery — residential addiction treatment in Cochise County, Arizona. Admissions answers 24/7.',
  inLanguage: 'en-US',
  isPartOf: { '@id': 'https://sevenarrowsrecoveryarizona.com/#organization' },
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
      <PageHero
        label="Contact"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        title={[
          'A real person. ',
          { text: 'Any hour', accent: true },
          '.',
        ]}
        description="Call, email, or send a note from the form below. Our admissions team answers 24/7, every day of the year — no gatekeeping, no commitment, no sales script. Whether you're calling for yourself or someone you love."
      />
      <ContactAtAGlance />
      <WaysToReach />
      <ContactForm />
      {/* Visit-us section — campus address + interactive Google Map.
          Lazy-loaded iframe so it doesn't drag LCP on the form-
          first audience that landed for the contact form, not the
          map. Two-column layout collapses to stacked on mobile. */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),minmax(0,1.4fr)] gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">Visit us</p>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                160 acres at the base of the Swisshelm Mountains.
              </h2>
              <p className="text-foreground/70 leading-relaxed mb-5">
                The campus sits about an hour southeast of Tucson in Cochise
                County. We schedule on-site tours by appointment — call
                ahead so we can have someone meet you at the gate.
              </p>
              <RanchAddress />
            </div>
            <RanchMap className="aspect-video lg:aspect-square" ariaLabel="Map of Seven Arrows Recovery in Elfrida, Arizona" />
          </div>
        </div>
      </section>
    </main>
  );
}
