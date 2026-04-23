import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehab in Tucson AZ | Addiction Treatment Tucson | Seven Arrows Recovery',
  description:
    'Find drug rehab near Tucson, AZ. Seven Arrows Recovery is located just 90 miles from Tucson, offering residential treatment, trauma therapy, equine-assisted therapy, dual diagnosis care, and coordinated detox with partnered facilities. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

const services = [
  {
    title: 'Detox Coordination',
    description:
      'For clients who need medical detox first, our admissions team coordinates a short stay at a partnered detox facility and a warm hand-off into residential care — no scrambling for detox on your own.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Structured 30-to-90-day residential programs with an exceptionally low 6:1 client-to-staff ratio, allowing deeply personalized clinical attention.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Concurrent treatment for addiction and co-occurring conditions including depression, anxiety, PTSD, and bipolar disorder by our licensed psychiatric team.',
  },
  {
    title: 'Holistic Healing Modalities',
    description:
      'Desert-informed wellness practices including outdoor meditation, yoga, breathwork, sound healing, nutrition therapy, and creative expression sessions.',
  },
  {
    title: 'Equine-Assisted Therapy',
    description:
      'Hands-on work with our horses in the open Cochise County landscape fosters emotional awareness, responsibility, and non-verbal communication skills.',
  },
  {
    title: 'Trauma-Focused Treatment',
    description:
      'Evidence-based trauma protocols including EMDR, somatic experiencing, and prolonged exposure therapy to resolve the experiences underlying substance use.',
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

export default function LocationTucsonPage() {
  return (
    <>
      <PageHero
        label="Drug Rehab Near Tucson"
        title="Addiction Treatment Close to Home for Tucson Residents"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Locations' },
          { label: 'Tucson' },
        ]}
        description="As the closest major city to our campus, Tucson holds a special place in the Seven Arrows community. Just 90 miles separate you from a world-class recovery experience in the Swisshelm Mountains—close enough for family involvement, far enough for real change."
        image="/images/sign-night-sky-milky-way.jpg"
      />

      {/* City Context */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Your Nearest Ally in Recovery</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Tucson Families Choose Seven Arrows
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Tucson is a vibrant, culturally rich city—but it is not immune to the substance
              abuse epidemic affecting communities across Arizona. Opioid overdose rates in
              Pima County have risen sharply in recent years, and access to effective, personalized
              treatment remains a critical need for Tucson families.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery sits approximately 90 miles east of Tucson along I-10—about
              a ninety-minute drive through the rolling grasslands and sky islands of southeastern
              Arizona. This proximity is a meaningful advantage for Tucson residents: family
              members can participate in our family therapy program with regular weekend visits,
              and the Tucson International Airport makes travel straightforward for out-of-state
              loved ones joining the process.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Despite the short distance, our Cochise County campus feels like another world.
              The Swisshelm Mountains, the open desert, and the quiet of rural southeastern
              Arizona create a natural container for healing that the urban corridors of Tucson
              cannot replicate. Many of our Tucson clients describe arriving on campus as the
              first time they could truly breathe in months—or years.
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
              Full-Spectrum Addiction Care for Tucson Residents
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our clinical team develops an individualized treatment plan for every client,
              drawing from evidence-based, holistic, and experiential modalities to address
              the full complexity of addiction.
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

      {/* Family Involvement */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Family Program</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Close Enough for Family to Stay Involved
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Addiction affects the whole family. Because our campus is just 90 minutes from
              Tucson, family members can participate meaningfully in the recovery process—attending
              therapy sessions, joining educational workshops, and being part of structured
              family weekends without the burden of cross-state travel.
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
              Insurance Accepted for Tucson Area Clients
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We accept most major insurance plans and can verify your coverage quickly. Our
              team works directly with your provider to maximize your benefits and minimize
              out-of-pocket costs.
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
            AHCCCS and private pay options may also be available. Call to discuss.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ninety Miles Can Change Everything
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You do not have to travel far to find world-class addiction treatment. Our Tucson
            admissions team can have you on campus the same day. Call now or submit your
            insurance information online for a free, confidential verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link
              href="/contact"
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
