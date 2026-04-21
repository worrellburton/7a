import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Does UnitedHealthcare Cover Drug & Alcohol Rehab? | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery accepts UnitedHealthcare (UHC) insurance for addiction treatment. Learn what UHC covers for rehab including detox, residential, and therapy. Call (866) 996-4308.',
};

import Link from 'next/link';

import PageHero from '@/components/PageHero';

const coverageItems = [
  {
    title: 'Medical Detoxification',
    description:
      'UHC covers inpatient medical detox with 24/7 clinical supervision for safe withdrawal from alcohol, opioids, benzodiazepines, and stimulants.',
  },
  {
    title: 'Residential Inpatient Care',
    description:
      'Comprehensive residential treatment including structured clinical programming, individual therapy, group sessions, and holistic approaches.',
  },
  {
    title: 'Behavioral Health Therapy',
    description:
      'UHC covers evidence-based therapies including CBT, DBT, trauma-focused therapy, motivational enhancement, and experiential modalities.',
  },
  {
    title: 'Medication-Assisted Treatment',
    description:
      'Coverage for FDA-approved medications to treat opioid and alcohol use disorders, including Suboxone, Vivitrol, and naltrexone.',
  },
  {
    title: 'Dual Diagnosis Treatment',
    description:
      'Integrated treatment for co-occurring substance use and mental health disorders — a specialty at Seven Arrows that UHC recognizes as medically necessary.',
  },
  {
    title: 'Transition & Aftercare',
    description:
      'Step-down planning, continuing care recommendations, and support for transitioning from residential to outpatient or community-based recovery.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Call With Your UHC Member ID',
    description:
      'Reach our admissions team at (866) 996-4308 with your UnitedHealthcare member ID and group number. We are available around the clock.',
  },
  {
    number: '02',
    title: 'Free Benefits Verification',
    description:
      'We contact Optum Behavioral Health to verify your coverage, deductible status, copay amounts, and out-of-pocket maximum.',
  },
  {
    number: '03',
    title: 'Prior Authorization',
    description:
      'Our clinical team submits all required documentation to Optum for prior authorization, advocating for the appropriate level and duration of care.',
  },
  {
    number: '04',
    title: 'Begin Treatment',
    description:
      'With authorization secured, travel to our Cochise County campus and start your individualized recovery program.',
  },
];

export default function InsuranceUHCPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title="UnitedHealthcare Rehab Coverage"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Insurance' },
          { label: 'UnitedHealthcare' },
        ]}
        description="Seven Arrows Recovery accepts most UnitedHealthcare plans for drug and alcohol addiction treatment. As the largest health insurer in the U.S., UHC provides coverage for tens of millions of Americans seeking recovery."
        image="/images/embrace-connection.jpg"
      />

      {/* UHC Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">UnitedHealthcare Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does UnitedHealthcare Cover Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — UnitedHealthcare (UHC) provides coverage for substance abuse and addiction
                  treatment through Optum Behavioral Health, its behavioral health management division.
                  As the largest health insurance company in the United States, UHC covers over 50
                  million Americans and is required under federal law to cover addiction treatment at
                  parity with other medical conditions.
                </p>
                <p>
                  UnitedHealthcare plans typically cover the full continuum of addiction care — from
                  medically supervised detoxification through residential inpatient treatment and
                  aftercare planning. Coverage is based on medical necessity as determined by Optum
                  Behavioral Health clinical reviewers.
                </p>
                <p>
                  Seven Arrows Recovery works with most UHC plan types including Choice Plus, Options
                  PPO, Navigate, and a wide range of employer-sponsored plans. We also accept plans
                  administered by Optum and UMR, both part of the UnitedHealth Group family.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Check Your UHC Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                UnitedHealthcare plans vary significantly in coverage details. Let our team verify
                your specific behavioral health benefits and give you a clear cost estimate before
                you make any decisions.
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

      {/* What UHC Covers */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              UHC Addiction Treatment Coverage
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              UnitedHealthcare plans typically cover the following addiction treatment services at
              Seven Arrows Recovery.
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
            <p className="section-label justify-center mb-4">How to Use Your UHC Insurance</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using UnitedHealthcare at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our admissions team navigates the UHC and Optum system so you do not have to.
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
              UnitedHealthcare Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does UnitedHealthcare cover drug and alcohol rehab?',
                a: 'Yes. UnitedHealthcare covers substance abuse treatment through Optum Behavioral Health, its behavioral health management division. Coverage includes detox, residential treatment, therapy, and medication-assisted treatment. Seven Arrows Recovery accepts most UHC plans.',
              },
              {
                q: 'How much does rehab cost with UnitedHealthcare?',
                a: 'Costs depend on your UHC plan type, deductible, copay, and coinsurance. Many UnitedHealthcare members have significant coverage for addiction treatment with manageable out-of-pocket costs. Call (866) 996-4308 for a free benefits verification.',
              },
              {
                q: 'Does UHC require prior authorization for rehab?',
                a: 'Most UnitedHealthcare plans require prior authorization through Optum Behavioral Health before beginning residential treatment. Our admissions team handles the full authorization process, including clinical documentation and utilization review coordination.',
              },
              {
                q: 'What UHC plan types does Seven Arrows accept?',
                a: 'Seven Arrows Recovery works with most UnitedHealthcare plan types including Choice Plus, Options PPO, Navigate, and employer-sponsored plans. We also accept UHC plans administered through Optum and UMR. Call to verify your specific plan.',
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
            Use Your UHC Insurance for Rehab Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Your UnitedHealthcare insurance can cover addiction treatment at Seven Arrows Recovery.
            Our team verifies benefits in minutes and handles all Optum coordination. Call now — we
            are here 24/7.
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
