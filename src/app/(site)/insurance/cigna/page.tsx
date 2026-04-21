import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Does Cigna Cover Drug & Alcohol Rehab? | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery accepts Cigna insurance for addiction treatment. Learn what Cigna covers for rehab including detox, residential, and therapy. Call (866) 996-4308 to verify.',
};

import Link from 'next/link';

import PageHero from '@/components/PageHero';

const coverageItems = [
  {
    title: 'Medically Managed Detox',
    description:
      'Cigna covers inpatient detoxification services with 24/7 medical monitoring to ensure safe, comfortable withdrawal management.',
  },
  {
    title: 'Residential Treatment',
    description:
      'Structured residential programs with around-the-clock care, including clinical assessments, therapy, and recovery-focused activities.',
  },
  {
    title: 'Evidence-Based Therapies',
    description:
      'Cigna behavioral health benefits cover CBT, DBT, EMDR, motivational interviewing, and other proven therapeutic approaches for addiction.',
  },
  {
    title: 'Medication-Assisted Treatment (MAT)',
    description:
      'Coverage for FDA-approved medications including buprenorphine, methadone, naltrexone, and Vivitrol to support recovery from opioid and alcohol addiction.',
  },
  {
    title: 'Co-Occurring Disorder Treatment',
    description:
      'Integrated care for substance abuse alongside mental health conditions such as anxiety, depression, PTSD, and trauma disorders.',
  },
  {
    title: 'Relapse Prevention & Aftercare',
    description:
      'Discharge planning, continuing care coordination, and alumni support to protect your sobriety after completing residential treatment.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Share Your Cigna Details',
    description:
      'Call (866) 996-4308 with your Cigna member ID and group number. Our admissions team is available 24 hours a day, 7 days a week.',
  },
  {
    number: '02',
    title: 'We Verify Your Benefits',
    description:
      'We contact Cigna and Evernorth Behavioral Health directly to determine your coverage level, deductible status, and any cost-sharing requirements.',
  },
  {
    number: '03',
    title: 'Authorization & Coordination',
    description:
      'Our team secures any required pre-certifications from Cigna and coordinates your travel and intake logistics.',
  },
  {
    number: '04',
    title: 'Start Your Recovery',
    description:
      'Arrive at our campus in the Swisshelm Mountains of Arizona and begin your personalized treatment plan within hours of arrival.',
  },
];

export default function InsuranceCignaPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title="Cigna Rehab Coverage"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Insurance' },
          { label: 'Cigna' },
        ]}
        description="Seven Arrows Recovery accepts most Cigna and Evernorth Behavioral Health plans for drug and alcohol addiction treatment. Let our team verify your coverage and handle all the insurance details."
        image="/images/embrace-connection.jpg"
      />

      {/* Cigna Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Cigna Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does Cigna Cover Drug &amp; Alcohol Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — Cigna provides coverage for substance abuse and addiction treatment through its
                  behavioral health division, Evernorth Behavioral Health (formerly Cigna Behavioral
                  Health). Under the Mental Health Parity and Addiction Equity Act, Cigna is required to
                  cover addiction treatment at the same level as other medical and surgical services.
                </p>
                <p>
                  Cigna covers approximately 190 million customer relationships worldwide and is one of
                  the most widely accepted insurance providers for addiction treatment. Seven Arrows
                  Recovery works with most Cigna plan types including Open Access Plus (OAP), PPO, HMO,
                  and employer-sponsored plans.
                </p>
                <p>
                  Our clinical team collaborates with Cigna throughout the treatment process, providing
                  documentation for medical necessity reviews and advocating for the appropriate length
                  of stay. This partnership ensures you receive the full scope of care your recovery
                  requires.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Verify Your Cigna Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Cigna plans vary widely in coverage levels and cost-sharing. Our team will verify
                your exact benefits, explain what is covered, and give you a clear picture of any
                out-of-pocket costs before you commit.
              </p>
              <div className="space-y-4">
                <a href="tel:8669964308" className="btn-primary w-full text-center block">
                  Call (866) 996-4308
                </a>
                <Link href="/admissions" className="btn-outline w-full text-center block">
                  Verify Insurance Online
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Cigna Covers */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Cigna Addiction Treatment Coverage
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most Cigna plans cover the following treatment services. Your specific coverage depends
              on your plan type and employer benefits package.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coverageItems.map((item) => (
              <div key={item.title} className="bg-warm-card rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
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

      {/* Steps */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label justify-center mb-4">How to Use Your Cigna Insurance</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using Cigna Insurance at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We simplify the insurance process so nothing stands between you and treatment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl bg-warm-card p-8 shadow-sm"
              >
                <span
                  className="text-5xl font-bold text-primary/20 absolute top-4 right-6"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.number}
                </span>
                <h3 className="text-xl font-bold text-foreground mb-3 mt-2">
                  {step.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-4">Frequently Asked Questions</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Cigna Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does Cigna cover drug and alcohol rehab?',
                a: 'Yes. Cigna covers substance abuse treatment as part of its behavioral health benefits. This includes medically supervised detox, residential treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery accepts most Cigna plans.',
              },
              {
                q: 'How much does rehab cost with Cigna?',
                a: 'Your cost depends on your Cigna plan details including your deductible, copay, coinsurance, and out-of-pocket maximum. Many Cigna members pay a fraction of the total treatment cost. Call (866) 996-4308 for a free benefits check.',
              },
              {
                q: 'Does Cigna cover residential rehab?',
                a: 'Yes. Most Cigna plans cover residential inpatient treatment for substance use disorders when deemed medically necessary. Cigna uses Evernorth Behavioral Health (formerly Cigna Behavioral Health) to manage these benefits.',
              },
              {
                q: 'Will Cigna cover rehab in Arizona if I live in another state?',
                a: 'In most cases, yes. Cigna operates a national provider network, and many plans include out-of-area coverage for residential treatment. Our admissions team can verify whether your specific plan covers treatment at our Arizona campus.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-warm-card rounded-2xl p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">{faq.q}</h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
            Use Your Cigna Insurance for Rehab Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cigna insurance can cover most or all of the cost of addiction treatment at Seven Arrows
            Recovery. Call now to verify your benefits — our admissions team is available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/admissions" className="btn-outline">
              Verify Insurance Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
