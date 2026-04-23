import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Does Humana Cover Drug & Alcohol Rehab? | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery accepts Humana insurance for addiction treatment. Learn what Humana covers for rehab including detox, residential care, and therapy. Call (866) 996-4308.',
};

import Link from 'next/link';

import PageHero from '@/components/PageHero';

const coverageItems = [
  {
    title: 'Medically Supervised Detox',
    description:
      'Humana covers inpatient detoxification with around-the-clock medical supervision to manage withdrawal safely and comfortably.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Full residential care at our Arizona campus including clinical assessments, structured daily programming, and a therapeutic recovery environment.',
  },
  {
    title: 'Individual & Group Therapy',
    description:
      'Humana behavioral health benefits cover evidence-based therapies including CBT, DBT, trauma-informed care, and process groups.',
  },
  {
    title: 'Medication-Assisted Treatment',
    description:
      'Coverage for FDA-approved addiction medications including buprenorphine, naltrexone, and acamprosate as part of a comprehensive treatment plan.',
  },
  {
    title: 'Holistic & Experiential Therapies',
    description:
      'Complementary approaches including equine-assisted therapy, mindfulness, art therapy, and outdoor therapeutic activities unique to our Swisshelm Mountains setting.',
  },
  {
    title: 'Discharge & Continuing Care',
    description:
      'Comprehensive aftercare planning, relapse prevention education, alumni support, and coordination with local providers for ongoing recovery.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Call With Your Humana Info',
    description:
      'Contact our admissions team at (866) 996-4308 with your Humana member ID. We are available 24 hours a day, 365 days a year.',
  },
  {
    number: '02',
    title: 'Complimentary Benefits Review',
    description:
      'We contact Humana directly to verify your behavioral health coverage, deductible status, copay structure, and any out-of-pocket cost estimates.',
  },
  {
    number: '03',
    title: 'Pre-Authorization Support',
    description:
      'Our clinical team handles all pre-authorization requirements with Humana, submitting necessary documentation and clinical justification.',
  },
  {
    number: '04',
    title: 'Arrive & Begin Recovery',
    description:
      'Once approved, most clients are welcomed to our Cochise County campus within 24 to 48 hours. Your personalized treatment plan starts on day one.',
  },
];

export default function InsuranceHumanaPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title={[
          { text: 'Rehab coverage with ' },
          { text: 'Humana', accent: true },
          { text: '.' },
        ]}
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Verify benefits · 24/7',
          },
          { kind: 'link', href: '/admissions#verify', label: 'Verify online' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Insurance' },
          { label: 'Humana' },
        ]}
        description="Seven Arrows Recovery accepts most Humana plans for drug and alcohol addiction treatment. Our admissions team verifies your behavioral health benefits at no cost and handles all insurance coordination."
        image="/images/embrace-connection.jpg"
      />

      {/* Humana Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Humana Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does Humana Cover Drug &amp; Alcohol Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — Humana provides coverage for substance abuse and addiction treatment as part of
                  its behavioral health benefits. As one of the largest health insurance companies in the
                  United States, Humana serves over 17 million members through its commercial, Medicare
                  Advantage, and military (TRICARE) plans.
                </p>
                <p>
                  Under the Mental Health Parity and Addiction Equity Act, Humana is required to cover
                  addiction treatment at the same level as medical and surgical services. This means your
                  Humana plan likely includes coverage for detoxification, residential inpatient
                  treatment, therapy, and medication-assisted treatment.
                </p>
                <p>
                  Seven Arrows Recovery works with most Humana plan types including HMO, PPO, POS, and
                  employer-sponsored plans. Humana is also well-known for its Medicare Advantage
                  offerings, many of which include behavioral health coverage for addiction treatment.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Verify Your Humana Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Humana plan details vary by type and employer. Let our team check your exact
                behavioral health benefits and provide a clear estimate of your coverage and costs.
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

      {/* What Humana Covers */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Humana Addiction Treatment Coverage
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most Humana plans cover the following services at Seven Arrows Recovery. Specific
              benefits depend on your plan type and coverage tier.
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
            <p className="section-label justify-center mb-4">How to Use Your Humana Insurance</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using Humana Insurance at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We take the complexity out of insurance so you can concentrate on healing.
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
              Humana Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does Humana cover drug and alcohol rehab?',
                a: 'Yes. Humana covers substance abuse treatment as part of its behavioral health benefits. This includes medically supervised detox (at partnered facilities), residential treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery accepts most Humana plans.',
              },
              {
                q: 'How much does rehab cost with Humana insurance?',
                a: 'Your out-of-pocket cost depends on your specific Humana plan, deductible, copay, and coinsurance. Humana members with strong behavioral health benefits often pay a small fraction of total treatment costs. Call (866) 996-4308 for a free benefits check.',
              },
              {
                q: 'Does Humana cover residential inpatient rehab?',
                a: 'Yes. Most Humana commercial and Medicare Advantage plans cover residential inpatient treatment for substance use disorders when determined to be medically necessary. Our team works with Humana to secure the appropriate level of care authorization.',
              },
              {
                q: 'Does Humana Military/TRICARE cover rehab?',
                a: 'Humana Military manages the TRICARE East Region. If you have TRICARE through Humana Military, please see our dedicated TRICARE coverage page or call (866) 996-4308 for specific benefits information.',
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
            Use Your Humana Insurance for Rehab Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Your Humana insurance can help cover the cost of addiction treatment at Seven Arrows
            Recovery. Our admissions team verifies benefits quickly and handles all insurance
            coordination. Call now — we are available 24/7.
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
