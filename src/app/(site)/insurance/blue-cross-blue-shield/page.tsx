import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Does Blue Cross Blue Shield Cover Rehab? | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery accepts Blue Cross Blue Shield (BCBS) insurance for drug and alcohol rehab. Learn what BCBS covers for addiction treatment. Call (866) 996-4308.',
};

import Link from 'next/link';

import PageHero from '@/components/PageHero';

const coverageItems = [
  {
    title: 'Coordinated Detox',
    description:
      'BCBS covers medically supervised detox at partnered facilities when clinically needed before residential admission.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Comprehensive 24/7 residential care including structured therapy, clinical programming, and a supportive recovery environment.',
  },
  {
    title: 'Individual & Group Therapy',
    description:
      'Evidence-based therapeutic approaches including cognitive behavioral therapy (CBT), dialectical behavior therapy (DBT), and trauma-informed care.',
  },
  {
    title: 'Medication-Assisted Treatment',
    description:
      'BCBS covers FDA-approved medications for opioid and alcohol dependence, including buprenorphine, naltrexone, and acamprosate.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Integrated treatment for co-occurring mental health conditions such as depression, anxiety, PTSD, and bipolar disorder alongside addiction.',
  },
  {
    title: 'Continuing Care',
    description:
      'Aftercare planning, alumni programming, and step-down support to maintain recovery momentum after residential treatment.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Call With Your BCBS Info',
    description:
      'Contact us at (866) 996-4308 with your BCBS member ID, group number, and plan type. Our team begins verifying benefits right away.',
  },
  {
    number: '02',
    title: 'Complimentary Benefits Check',
    description:
      'We contact BCBS to determine your exact coverage including deductible status, copay or coinsurance rates, and any out-of-pocket maximums.',
  },
  {
    number: '03',
    title: 'We Handle Pre-Authorization',
    description:
      'Our admissions team manages all BCBS pre-certification and prior authorization requirements — no insurance calls for you.',
  },
  {
    number: '04',
    title: 'Arrive & Start Treatment',
    description:
      'With benefits confirmed, travel to our campus in Cochise County, Arizona. Your individualized treatment plan starts immediately upon arrival.',
  },
];

export default function InsuranceBCBSPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title={[
          { text: 'Rehab coverage with ' },
          { text: 'Blue Cross Blue Shield', accent: true },
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
          { label: 'Blue Cross Blue Shield' },
        ]}
        description="Seven Arrows Recovery accepts most Blue Cross Blue Shield plans for drug and alcohol addiction treatment. As one of the nation's largest insurers, BCBS provides coverage for millions of Americans seeking recovery."
        image="/images/embrace-connection.jpg"
      />

      {/* BCBS Coverage Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">BCBS Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does Blue Cross Blue Shield Cover Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — Blue Cross Blue Shield provides coverage for drug and alcohol rehabilitation
                  under its behavioral health benefits. As the largest health insurance provider in the
                  United States, BCBS covers over 115 million Americans through its network of 34
                  independent companies operating in all 50 states.
                </p>
                <p>
                  Thanks to the BCBS Blue Card Program, your plan from any state can be used at
                  participating treatment facilities nationwide — including Seven Arrows Recovery in
                  Arizona. This means you can access high-quality addiction treatment regardless of
                  where your plan originated.
                </p>
                <p>
                  Under the Mental Health Parity and Addiction Equity Act, BCBS is required to cover
                  substance abuse treatment at the same level as other medical conditions. Seven Arrows
                  Recovery works with all major BCBS plan types including PPO, HMO, EPO, and POS plans.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Check Your BCBS Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                BCBS coverage varies significantly by plan type and state. Our admissions team
                verifies your specific benefits and explains your coverage in plain language — at no
                cost and with no obligation.
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

      {/* What BCBS Covers */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              BCBS Addiction Treatment Coverage
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most Blue Cross Blue Shield plans cover the following services at Seven Arrows Recovery.
              Your specific benefits depend on your plan type and state of origin.
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
            <p className="section-label justify-center mb-4">How to Use Your BCBS Insurance</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using Blue Cross Blue Shield at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our admissions team removes the insurance burden so you can focus entirely on recovery.
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
              BCBS Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does Blue Cross Blue Shield cover drug and alcohol rehab?',
                a: 'Yes. Blue Cross Blue Shield plans provide coverage for substance abuse treatment including detox, residential inpatient rehab, therapy, and medication-assisted treatment. Coverage details vary by state and plan type. Seven Arrows Recovery accepts most BCBS plans.',
              },
              {
                q: 'How much does rehab cost with BCBS insurance?',
                a: 'Costs vary depending on your BCBS plan, deductible, copay, and out-of-network benefits. Seven Arrows works with most BCBS plans as an out-of-network provider. Call (866) 996-4308 for a free benefits verification before you commit.',
              },
              {
                q: 'Does BCBS cover out-of-state rehab?',
                a: 'Most BCBS plans include the Blue Card Program, which provides coverage at participating facilities nationwide. This means your BCBS plan from any state can typically be used at Seven Arrows Recovery in Arizona.',
              },
              {
                q: 'How long will Blue Cross Blue Shield cover rehab?',
                a: 'BCBS typically covers 30 to 90 days of residential addiction treatment based on medical necessity. Our clinical team conducts regular utilization reviews with BCBS to advocate for the full length of stay your recovery requires.',
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
            Use Your BCBS Insurance for Rehab Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Your Blue Cross Blue Shield insurance can cover the cost of life-changing addiction
            treatment. Our admissions team is available around the clock to verify your benefits and
            get you started.
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
