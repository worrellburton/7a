import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Holistic Approaches | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery offers holistic therapies including yoga, meditation, mindfulness, art therapy, music therapy, and nutritional wellness to support whole-person healing.',
};

import Link from 'next/link';
import HolisticHero from '@/components/holistic/HolisticHero';

const therapies = [
  {
    title: 'Yoga',
    description:
      'Yoga helps clients rebuild the connection between mind and body that addiction disrupts. Through guided movement and breathwork, clients develop body awareness, reduce stress, and cultivate inner calm.',
  },
  {
    title: 'Meditation & Mindfulness',
    description:
      'Meditation and mindfulness practices teach clients to observe their thoughts and emotions without reacting impulsively. These skills become essential tools for managing cravings, anxiety, and the daily challenges of recovery.',
  },
  {
    title: 'Art Therapy',
    description:
      'Art therapy provides a creative outlet for processing emotions that are difficult to express with words. Through painting, drawing, and other media, clients access deeper layers of self-understanding and healing.',
  },
  {
    title: 'Music Therapy',
    description:
      'Music has a unique power to reach people on an emotional and physiological level. Our music therapy sessions use rhythm, songwriting, and listening exercises to promote emotional expression, reduce stress, and foster connection.',
  },
  {
    title: 'Nutritional Wellness',
    description:
      'Addiction takes a heavy toll on the body. Our nutritional wellness program helps clients restore physical health through balanced meals, nutritional education, and an understanding of how diet supports mental and emotional well-being.',
  },
  {
    title: 'Breathwork & Grounding',
    description:
      'Breathwork and grounding exercises help regulate the nervous system, reduce anxiety, and bring clients into the present moment. These accessible techniques can be practiced anywhere and become lifelong tools for maintaining balance.',
  },
];

export default function HolisticApproachesPage() {
  return (
    <main>
      <HolisticHero />

      {/* Introduction */}
      <section id="practices" className="py-16 lg:py-24 bg-warm-bg scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Healing Beyond the Clinical
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              At Seven Arrows Recovery, we understand that lasting sobriety
              requires more than clinical therapy alone. Our holistic offerings
              complement evidence-based treatment by addressing the physical,
              emotional, creative, and spiritual dimensions of recovery.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Set against the backdrop of the Arizona high desert, these
              practices help clients discover new passions, develop healthy
              coping strategies, and reconnect with the joy of being fully
              present.
            </p>
          </div>

          {/* Therapies Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {therapies.map((item) => (
              <div
                key={item.title}
                className="bg-warm-card rounded-2xl p-8 shadow-sm"
              >
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
