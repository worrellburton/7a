import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const services = [
  {
    title: 'Medical Detoxification',
    description:
      'Clinician-supervised detox with personalized medication protocols, 24/7 nursing, and a comfortable setting designed to ease the first and most difficult stage of recovery.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Intensive 30-to-90-day residential care with a 6:1 client-to-staff ratio, daily individual therapy, group sessions, and structured programming from morning to evening.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Coordinated psychiatric and addiction care for clients living with depression, anxiety, PTSD, ADHD, or other conditions that compound substance use disorders.',
  },
  {
    title: 'Holistic Recovery Practices',
    description:
      'Yoga, guided meditation, wilderness mindfulness, nutritional rehabilitation, and art therapy bring balance to the clinical work and support long-term well-being.',
  },
  {
    title: 'Equine-Assisted Therapy',
    description:
      'Working alongside horses in our outdoor program helps clients build emotional awareness, accountability, and confidence outside the therapy room.',
  },
  {
    title: 'Trauma Treatment',
    description:
      'Specialized modalities including EMDR, somatic experiencing, and cognitive processing therapy address childhood and adult trauma that frequently underlies addiction.',
  },
];

const insuranceProviders = [
  'Aetna',
  'Blue Cross Blue Shield',
  'Cigna',
  'UnitedHealthcare',
  'Tricare',
  'Beacon Health',
  'Magellan Health',
  'First Health Network',
];

export const meta: MetaFunction = () => [
  {
    title:
      'Drug Rehab in Mesa AZ | Addiction Treatment Mesa | Seven Arrows Recovery',
  },
  {
    name: 'description',
    content:
      'Drug rehab for Mesa, AZ residents at Seven Arrows Recovery. Our Cochise County campus offers medical detox, residential addiction treatment, dual diagnosis care, equine therapy, and trauma treatment. Call (866) 996-4308 today.',
  },
  {
    'script:ld+json': JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'Seven Arrows Recovery',
        description:
          'Drug and alcohol rehab serving Mesa, AZ with residential addiction treatment, detox, and holistic recovery programs.',
        telephone: '+18669964308',
        url: 'https://sevenarrowsrecovery.com/locations/mesa',
        areaServed: {
          '@type': 'City',
          name: 'Mesa',
          addressRegion: 'AZ',
        },
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'AZ',
          addressCountry: 'US',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://sevenarrowsrecovery.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Locations',
            item: 'https://sevenarrowsrecovery.com/locations',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Mesa',
            item: 'https://sevenarrowsrecovery.com/locations/mesa',
          },
        ],
      },
    ]),
  },
];

export default function LocationMesaPage() {
  return (
    <>
      <PageHero
        label="Drug Rehab in Mesa"
        title="Addiction Treatment for Mesa, Arizona's East Valley"
        description="Mesa is one of the largest cities in Arizona—and one of the hardest hit by the opioid and fentanyl crisis. Seven Arrows Recovery provides Mesa residents with a clear path from the East Valley to lasting recovery at our private campus in the Swisshelm Mountains."
        image="/images/sign-night-sky-milky-way.jpg"
      />

      {/* City Context */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">East Valley Recovery</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Mesa Residents Choose Seven Arrows
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Mesa is Arizona's third-largest city and the heart of the East Valley, home to
              more than half a million people. The community is known for its strong family
              values, outdoor recreation, and growing economic base. But like many fast-growing
              cities in the Southwest, Mesa has seen a sharp increase in substance abuse—particularly
              among young adults and working families who may not realize how quickly dependence
              can develop.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery is located roughly 190 miles southeast of Mesa in Cochise
              County—about a three-hour drive via US-60 and I-10 through the Apache Trail corridor
              and the grasslands of southern Arizona. That three-hour buffer between Mesa and
              our campus gives clients the separation they need from neighborhood triggers,
              familiar routines, and the social dynamics that can sabotage early recovery.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              For East Valley families, the logistics are straightforward. Our admissions team
              can coordinate same-day intake, and Phoenix-Mesa Gateway Airport is a convenient
              arrival point for out-of-state family members who want to participate in our
              family therapy program. We take care of the details so the focus stays where
              it belongs: on healing.
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Treatment Programs</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Evidence-Based Treatment for Mesa Families
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our clinical team builds each treatment plan from the ground up. Whether you are
              dealing with alcohol, opioids, stimulants, or prescription drugs, every modality
              is selected to address your specific situation—not a one-size-fits-all protocol.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white rounded-2xl p-8 hover:shadow-md transition-shadow duration-300"
              >
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {service.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Context */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Community Matters</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Returning Stronger to the East Valley
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Recovery does not end when treatment does. Before discharge, our clinical team
              works with each Mesa client to build a comprehensive aftercare plan that includes
              local support groups, outpatient referrals in the East Valley, sober living
              recommendations, and ongoing alumni support through Seven Arrows. The goal is to
              return you to your Mesa community with the tools, connections, and confidence
              needed to sustain long-term sobriety.
            </p>
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Insurance & Payment</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Insurance Options for Mesa Residents
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cost should never be a barrier to getting help. We accept most major insurance
              plans and can verify your benefits in minutes. Many Mesa residents are surprised
              to learn that their employer-sponsored health plan covers the majority of
              treatment costs.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {insuranceProviders.map((provider) => (
              <div
                key={provider}
                className="bg-white rounded-xl p-4 text-center text-foreground font-semibold text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {provider}
              </div>
            ))}
          </div>
          <p
            className="text-center text-foreground/60 mt-6 text-sm"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Not sure about your coverage? Call us for a free, no-obligation verification.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            The East Valley Has a Lifeline
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            If you or a loved one in Mesa is ready to break free from addiction, our admissions
            team is standing by. Same-day intake is available, and we can coordinate every
            step of the journey from the East Valley to our campus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link
              to="/contact"
              className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
            >
              Verify Your Insurance
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
