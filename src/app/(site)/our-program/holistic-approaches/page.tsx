import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Holistic Approaches | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery offers holistic therapies including yoga, meditation, mindfulness, art therapy, music therapy, and nutritional wellness to support whole-person healing.',
};

import Link from 'next/link';
import HolisticHero from '@/components/holistic/HolisticHero';
import WhyHolistic from '@/components/holistic/WhyHolistic';
import FourDimensions from '@/components/holistic/FourDimensions';
import ModalitiesBento from '@/components/holistic/ModalitiesBento';

export default function HolisticApproachesPage() {
  return (
    <main>
      <HolisticHero />
      <WhyHolistic />
      <FourDimensions />
      <div id="practices" className="scroll-mt-20" />
      <ModalitiesBento />

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-warm-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Discover a Holistic Path to Recovery
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Experience how holistic therapies can transform your recovery
            journey. Call us today to learn more about our comprehensive
            approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
