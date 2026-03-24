import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const services = [
  {
    title: 'Medical Detoxification',
    description:
      'Round-the-clock medically supervised detox with physician oversight, ensuring a safe and comfortable withdrawal process tailored to each substance type.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Immersive 30-to-90-day programs with a 6:1 client-to-staff ratio in our intimate Cochise County campus, far removed from Phoenix\'s urban triggers.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Integrated care for co-occurring mental health conditions such as anxiety, depression, PTSD, and bipolar disorder alongside substance use disorders.',
  },
  {
    title: 'Holistic Therapies',
    description:
      'Yoga, meditation, breathwork, nutritional counseling, and art therapy complement clinical modalities to heal the whole person—mind, body, and spirit.',
  },
  {
    title: 'Equine-Assisted Therapy',
    description:
      'Our on-site equine program uses the natural connection between humans and horses to build trust, emotional regulation, and self-awareness.',
  },
  {
    title: 'Trauma-Informed Treatment',
    description:
      'EMDR, somatic experiencing, and trauma-focused CBT address the root causes that often drive substance use, helping clients process and release deep-seated pain.',
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
      'Drug Rehab in Phoenix AZ | Addiction Treatment Phoenix | Seven Arrows Recovery',
  },
  {
    name: 'description',
    content:
      'Looking for drug rehab in Phoenix, AZ? Seven Arrows Recovery offers personalized addiction treatment for Phoenix residents including detox, residential care, dual diagnosis, and equine therapy at our private Cochise County campus. Call (866) 996-4308.',
  },
  {
    'script:ld+json': JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'Seven Arrows Recovery',
        description:
          'Drug and alcohol rehab serving Phoenix, AZ with detox, residential, and holistic addiction treatment.',
        telephone: '+18669964308',
        url: 'https://sevenarrowsrecovery.com/locations/phoenix',
        areaServed: {
          '@type': 'City',
          name: 'Phoenix',
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
            name: 'Phoenix',
            item: 'https://sevenarrowsrecovery.com/locations/phoenix',
          },
        ],
      },
    ]),
  },
];

export default function LocationPhoenixPage() {
  return (
    <>
      <PageHero
        label="Drug Rehab in Phoenix"
        title="Addiction Treatment for Phoenix, Arizona Residents"
        description="Phoenix is Arizona's largest city—and one of the most impacted by the substance abuse crisis. Seven Arrows Recovery gives Phoenix residents a private, evidence-based path to lasting recovery at our boutique campus in the Swisshelm Mountains."
        image="/7a/images/sign-night-sky-milky-way.jpg"
      />

      {/* City Context */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Serving the Valley of the Sun</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Phoenix Residents Choose Seven Arrows
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              As Arizona's capital and the fifth-largest city in the United States, Phoenix faces
              substance abuse challenges on a massive scale. Fentanyl, methamphetamine, and alcohol
              remain the most commonly treated substances among Valley residents seeking help.
              The sheer size of the metro area—spanning more than 500 square miles—can make it
              difficult to escape the environments and social circles tied to active use.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery is located approximately 200 miles southeast of Phoenix in
              Cochise County—roughly a three-and-a-half-hour drive through the Sonoran Desert.
              That distance is intentional. Leaving the density, noise, and triggers of the
              Phoenix metro behind allows our clients to focus entirely on the work of recovery
              in a peaceful, distraction-free setting at the base of the Swisshelm Mountains.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our admissions team coordinates transportation from Phoenix, including pickup
              from Phoenix Sky Harbor International Airport for out-of-state family members
              attending our family program. We handle the logistics so you can focus on
              the decision that matters most.
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
              Comprehensive Addiction Treatment for Phoenix Residents
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              From the moment you arrive, every element of your care plan is built around
              your unique history, substance use patterns, and goals. Our boutique model
              means you will never feel like a number.
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

      {/* Insurance */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Insurance & Payment</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Insurance Accepted for Phoenix Area Clients
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We work with most major insurance carriers and can verify your benefits quickly—often
              within minutes. Many Phoenix residents discover that a significant portion of their
              treatment is covered by their existing health plan.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {insuranceProviders.map((provider) => (
              <div
                key={provider}
                className="bg-warm-bg rounded-xl p-4 text-center text-foreground font-semibold text-sm"
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
            Don't see your provider? Call us—we may still be able to help.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Phoenix Deserves Better Than the Status Quo
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            If you or someone you love in the Phoenix area is struggling with drugs or alcohol,
            one phone call can change everything. Our admissions counselors are available 24/7
            to walk you through the next steps.
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
