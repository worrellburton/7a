import PageHero from '~/components/PageHero';
import MedicalDisclaimer from '~/components/MedicalDisclaimer';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const programs = [
  {
    title: 'Trauma Treatment',
    href: '/our-program/trauma-treatment',
    description:
      'Our TraumAddiction\u2122 specialty combines EMDR, somatic experiencing, and body-based interventions to address the root causes of addiction.',
  },
  {
    title: 'Indigenous Approach',
    href: '/our-program/indigenous-approach',
    description:
      'Sweat lodge ceremonies, connection to the land, and traditional healing practices integrated into a culturally respectful recovery experience.',
  },
  {
    title: 'Family Program',
    href: '/our-program/family-program',
    description:
      'Family therapy, education, and weekly sessions designed to heal relationships and build a strong foundation for lasting recovery.',
  },
  {
    title: 'Holistic Approaches',
    href: '/our-program/holistic-approaches',
    description:
      'Yoga, meditation, mindfulness, art therapy, music therapy, and nutritional wellness to nurture the whole person.',
  },
  {
    title: 'Equine-Assisted Experience',
    href: '/our-program/equine-assisted',
    description:
      'Horse therapy that fosters emotional regulation, trust building, and healing in the great outdoors of southern Arizona.',
  },
  {
    title: 'Evidence-Based Treatment',
    href: '/our-program/evidence-based',
    description:
      'CBT, DBT, motivational interviewing, group therapy, and individual therapy grounded in proven clinical methods.',
  },
  {
    title: 'Who We Help',
    href: '/our-program/who-we-help',
    description:
      'Adults 18 and older, men and women from all backgrounds, seeking recovery from various substance addictions.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Our Program | Seven Arrows Recovery" },
  { name: "description", content: "Explore the unique Seven Arrows Recovery approach to addiction treatment. Trauma-focused care, indigenous healing, family programs, holistic therapies, and evidence-based treatment in Arizona." },
];

export default function OurProgramPage() {
  return (
    <main>
      <PageHero
        label="Our Program"
        title="A Different Kind of Recovery"
        description="At Seven Arrows Recovery, we blend clinical excellence with the healing power of the land, indigenous wisdom, and trauma-focused care. Our intimate, boutique setting ensures every client receives deeply personalized treatment."
        image="/7a/images/sound-healing-session.jpg"
      />

      {/* Overview */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              The Seven Arrows Approach
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Recovery is not one-size-fits-all. Our program weaves together
              trauma-informed clinical care, time-honored indigenous practices,
              holistic therapies, and evidence-based modalities into a cohesive
              journey of transformation. Set at the base of the Swisshelm
              Mountains, every element of our program is designed to reconnect
              you with yourself, your family, and the world around you.
            </p>
          </div>

          {/* Program Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((program) => (
              <Link
                key={program.href}
                href={program.href}
                className="group bg-warm-card rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-[#a0522d] transition-colors">
                  {program.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {program.description}
                </p>
                <span
                  className="text-[#a0522d] font-semibold text-sm"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Learn more &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-warm-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Begin Your Healing Journey
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is available around the clock to answer your
            questions and help you take the first step toward recovery. Call us
            today or reach out online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link
              href="/contact"
              className="btn-primary"
            >
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <MedicalDisclaimer />
      </div>
    </main>
  );
}
