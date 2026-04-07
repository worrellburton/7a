import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQs',
  description:
    'Find answers to frequently asked questions about Seven Arrows Recovery, including insurance, treatment length, what to bring, family involvement, and the admissions process.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

import FAQAccordion from '@/components/FAQAccordion';

export default function FAQsPage() {
  return (
    <>
      <PageHero
        label="Frequently Asked Questions"
        title="FAQs"
        description="We understand that choosing a treatment center comes with many questions. Here are answers to the ones we hear most often. If you do not see your question below, please reach out directly."
        image="/images/common-area-living-room.jpg"
      />

      {/* FAQ List */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQAccordion />
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-4">Still Have Questions?</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            We Are Here to Help
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is available around the clock to answer your questions with
            compassion and confidentiality. No question is too small, and there is no obligation.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Learn More?
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions counselors can walk you through the process, verify your insurance, and
            answer any remaining questions you may have.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
