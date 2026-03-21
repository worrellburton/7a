import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Philosophy',
  description:
    'Discover the mind, body, and spirit philosophy behind Seven Arrows Recovery. Our seven core principles guide every aspect of treatment, from clinical care to holistic healing.',
};

const principles = [
  {
    number: 1,
    title: 'Treat the Whole Person',
    description:
      'Addiction is never just about the substance. We address the underlying trauma, mental health conditions, relational wounds, and spiritual disconnection that fuel addictive behavior.',
  },
  {
    number: 2,
    title: 'Honor Individual Stories',
    description:
      'No two paths to addiction are the same, and no two paths to recovery should be either. Every treatment plan at Seven Arrows is built around the individual, not a template.',
  },
  {
    number: 3,
    title: 'Heal Through Connection',
    description:
      'Isolation is a hallmark of addiction. Recovery happens in community. We cultivate authentic relationships between clients, staff, families, and the natural world around us.',
  },
  {
    number: 4,
    title: 'Integrate Mind, Body, and Spirit',
    description:
      'Clinical therapy addresses the mind. Movement, nutrition, and somatic work heal the body. Mindfulness, purpose, and meaning restore the spirit. All three must be engaged for lasting recovery.',
  },
  {
    number: 5,
    title: 'Root Out the Cause',
    description:
      'Symptom management is not enough. Through our TraumAddiction\u2122 approach, we help clients uncover and process the root causes of their addiction so that healing happens at the deepest level.',
  },
  {
    number: 6,
    title: 'Build for the Long Term',
    description:
      'Treatment is the beginning, not the end. We equip every client with relapse prevention skills, aftercare planning, and a support network designed to sustain recovery for years to come.',
  },
  {
    number: 7,
    title: 'Let the Land Heal',
    description:
      'The Swisshelm Mountains, the open desert sky, and the quiet of southeastern Arizona are not just a backdrop. Nature is an active part of the therapeutic process, grounding clients in something larger than themselves.',
  },
];

export default function OurPhilosophyPage() {
  return (
    <>
      <PageHero
        label="Our Philosophy"
        title="Our Philosophy"
        description="At Seven Arrows Recovery, we believe lasting recovery requires a unified approach that addresses the mind, body, and spirit. Our seven core principles guide everything we do."
      />

      {/* Mind Body Spirit */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Mind, Body, Spirit</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Recovery Beyond the Surface
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most treatment programs focus on stopping substance use. We go further. True recovery
              means rebuilding every dimension of a person&apos;s life. Clinical therapy heals the mind.
              Movement, nutrition, and body-based therapies restore physical health. Mindfulness,
              connection to nature, and purposeful living reawaken the spirit. When all three are
              aligned, transformation becomes possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Mind',
                description:
                  'Evidence-based therapies including CBT, DBT, EMDR, and motivational interviewing address cognitive patterns, emotional regulation, and trauma processing.',
                gradient: 'from-primary/20 to-accent/10',
              },
              {
                title: 'Body',
                description:
                  'Yoga, fitness programming, nutritional counseling, somatic experiencing, and equine-assisted therapy reconnect clients with their physical selves.',
                gradient: 'from-accent/20 to-primary/10',
              },
              {
                title: 'Spirit',
                description:
                  'Meditation, breathwork, time in nature at the Swisshelm Mountains, and guided reflection cultivate meaning, purpose, and inner peace.',
                gradient: 'from-primary/15 to-warm-card',
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className={`bg-gradient-to-br ${pillar.gradient} rounded-2xl p-8 text-center`}
              >
                <h3 className="text-2xl font-bold text-foreground mb-4">{pillar.title}</h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Core Principles */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Guiding Principles</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              The Seven Arrows
            </h2>
          </div>
          <div className="space-y-6 max-w-4xl mx-auto">
            {principles.map((principle) => (
              <div
                key={principle.number}
                className="bg-white rounded-2xl p-8 shadow-sm flex gap-6 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-lg">{principle.number}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{principle.title}</h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {principle.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Begin Your Healing Journey
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our philosophy is not just words on a page. It is the lived experience of every client
            who walks through our doors. Reach out today to learn how our approach can support your
            recovery.
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
