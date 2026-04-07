import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehab in Scottsdale AZ | Addiction Treatment Scottsdale | Seven Arrows Recovery',
  description:
    'Seeking drug rehab in Scottsdale, AZ? Seven Arrows Recovery provides discreet, luxury-level addiction treatment for Scottsdale residents including medical detox, residential programs, equine therapy, and dual diagnosis care. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

const services = [
  {
    title: 'Medical Detoxification',
    description:
      'Physician-led detox with continuous monitoring, medication-assisted comfort protocols, and individualized care from the first hour of admission.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'A fully immersive 30-to-90-day residential experience with a 6:1 client-to-staff ratio, private and semi-private rooms, and chef-prepared meals.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Simultaneous treatment for substance use disorders and co-occurring mental health conditions like anxiety, depression, and PTSD by licensed clinicians.',
  },
  {
    title: 'Holistic & Wellness Therapies',
    description:
      'Mindfulness meditation, yoga, breathwork, nutritional restoration, and creative expression therapies designed to restore balance across every dimension of wellness.',
  },
  {
    title: 'Equine-Assisted Therapy',
    description:
      'Experiential sessions with our horses on-site help clients develop emotional regulation, boundary-setting, and authentic connection in a non-clinical setting.',
  },
  {
    title: 'Trauma-Informed Treatment',
    description:
      'Specialized EMDR, somatic experiencing, and trauma-focused cognitive-behavioral therapy to address the underlying experiences that fuel addictive patterns.',
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

export default function LocationScottsdalePage() {
  return (
    <>
      <PageHero
        label="Drug Rehab in Scottsdale"
        title="Private Addiction Treatment for Scottsdale, Arizona"
        description="Scottsdale's reputation for wellness and luxury extends to how its residents approach recovery. Seven Arrows Recovery offers discreet, clinically rigorous treatment in a serene mountain setting where privacy and personal attention come standard."
        image="/images/sign-night-sky-milky-way.jpg"
      />

      {/* City Context */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-label mb-4">Discreet, Personalized Care</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Scottsdale Residents Trust Seven Arrows
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Scottsdale is a city that values quality, discretion, and results. For professionals,
              executives, and families in the Scottsdale area, the decision to seek addiction
              treatment is deeply personal—and the standard for care is high. Seven Arrows
              Recovery was built to meet that standard. Our boutique campus never houses more than
              a small number of clients at once, ensuring the kind of individualized attention
              that larger facilities simply cannot provide.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Located approximately 210 miles southeast of Scottsdale in Cochise County, our
              campus sits at the base of the Swisshelm Mountains—a roughly three-and-a-half-hour
              drive through Arizona's dramatic desert landscape. The distance from Scottsdale's
              social scene, high-end nightlife, and professional pressures is a clinical
              advantage: research consistently shows that separating from familiar environments
              improves long-term recovery outcomes.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Many Scottsdale residents tell us they chose Seven Arrows specifically because
              of our emphasis on privacy. There are no large group intakes, no institutional
              hallways, and no crowded common rooms. Instead, you will find a thoughtfully
              designed environment where healing happens in open desert air, alongside horses
              in our equine program, and in one-on-one sessions with experienced clinicians.
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
              Boutique Rehab Services for Scottsdale Clients
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every treatment plan is crafted by our clinical team after a thorough assessment
              of your history, goals, and co-occurring conditions. We combine gold-standard
              clinical protocols with experiential and holistic modalities.
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
              Insurance Verification for Scottsdale Residents
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Quality addiction treatment should not require financial guesswork. Our admissions
              team verifies your insurance benefits confidentially—often within minutes—so you
              know exactly what is covered before making any commitment.
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
            We also offer private pay options. Contact us for a confidential consultation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Recovery on Your Terms, With the Privacy You Expect
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Whether you are a Scottsdale professional seeking confidential care or a family
            member looking for answers, our admissions team is available around the clock.
            Every conversation is private.
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
