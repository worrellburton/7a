import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Indigenous Approach | Seven Arrows Recovery',
  description:
    'Experience traditional healing practices at Seven Arrows Recovery. Sweat lodge ceremonies, connection to the land, and culturally integrated recovery in the Arizona high desert.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

const practices = [
  {
    title: 'Sweat Lodge Ceremonies',
    description:
      'The sweat lodge is a sacred space for purification, prayer, and renewal. Guided by experienced practitioners, these ceremonies offer clients a profound opportunity for spiritual cleansing, emotional release, and connection to something greater than themselves.',
  },
  {
    title: 'Connection to the Land',
    description:
      'Nestled at the base of the Swisshelm Mountains in southern Arizona, our campus invites clients to reconnect with the natural world. Walking the desert trails, sitting beneath vast skies, and witnessing the rhythms of the land become powerful tools for grounding and healing.',
  },
  {
    title: 'Traditional Healing Practices',
    description:
      'Drawing from time-honored indigenous wisdom, we incorporate practices such as talking circles, smudging, drumming, and storytelling into our programming. These traditions foster community, self-reflection, and a deeper sense of meaning in the recovery journey.',
  },
  {
    title: 'Cultural Integration',
    description:
      'Our indigenous approach is woven respectfully throughout the treatment experience, not separated from clinical care. By integrating traditional wisdom with modern therapeutic methods, we honor the whole person \u2014 mind, body, spirit, and community.',
  },
];

export default function IndigenousApproachPage() {
  return (
    <main>
      <PageHero
        label="Indigenous Approach"
        title="Rooted in Ancient Wisdom"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Indigenous Approach' },
        ]}
        description="At Seven Arrows Recovery, we honor indigenous healing traditions as a vital part of the recovery journey. The land, the ceremonies, and the wisdom of generations past guide our clients toward deep, lasting transformation."
        image="/images/campfire-ceremony-circle.webp"
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Healing Through Tradition
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Long before modern medicine, indigenous peoples understood that
              true healing requires attention to the spirit as much as the body.
              At Seven Arrows Recovery, we carry this understanding into
              everything we do &mdash; creating space for clients to experience
              the transformative power of ceremony, community, and connection to
              the natural world.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our approach is guided by deep respect for the traditions we draw
              from and a commitment to offering these experiences in a way that
              is authentic, inclusive, and meaningful.
            </p>
          </div>

          {/* Practices */}
          <div className="grid md:grid-cols-2 gap-8">
            {practices.map((item) => (
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
            Experience the Healing Power of the Land
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Discover how indigenous healing traditions can open new pathways to
            recovery. Our admissions team is here to answer your questions.
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
