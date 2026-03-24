import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import PageHero from '~/components/PageHero';

export const meta: MetaFunction = () => [
  {
    title: 'Does Aetna Cover Drug & Alcohol Rehab? | Seven Arrows Recovery',
  },
  {
    name: 'description',
    content:
      'Yes — Seven Arrows Recovery accepts Aetna insurance for addiction treatment. Learn what Aetna covers for rehab including detox, residential, and therapy. Call (866) 996-4308 to verify benefits.',
  },
  {
    'script:ld+json': JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Does Aetna cover drug and alcohol rehab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Aetna provides coverage for substance abuse treatment under its behavioral health benefits. This typically includes medically supervised detox, residential inpatient treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery is an in-network provider with Aetna.',
            },
          },
          {
            '@type': 'Question',
            name: 'How much does rehab cost with Aetna insurance?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Your out-of-pocket cost depends on your specific Aetna plan, deductible, copay, and coinsurance amounts. Many Aetna members pay little to nothing out of pocket for addiction treatment. Call our admissions team at (866) 996-4308 for a free, confidential benefits verification.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long will Aetna cover rehab treatment?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The length of coverage varies by plan but Aetna typically covers 30 to 90 days of residential treatment based on medical necessity. Our clinical team works directly with Aetna to ensure you receive the full duration of care recommended for your recovery.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Aetna require pre-authorization for rehab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Most Aetna plans require pre-authorization for residential addiction treatment. Our admissions team handles the entire pre-authorization process on your behalf so you can focus on getting well.',
            },
          },
        ],
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
            name: 'Insurance',
            item: 'https://sevenarrowsrecovery.com/insurance',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Aetna',
            item: 'https://sevenarrowsrecovery.com/insurance/aetna',
          },
        ],
      },
    ]),
  },
];

const coverageItems = [
  {
    title: 'Medically Supervised Detox',
    description:
      'Aetna covers inpatient medical detoxification for safe withdrawal management under 24/7 clinical supervision.',
  },
  {
    title: 'Residential Inpatient Treatment',
    description:
      'Comprehensive residential care including individual therapy, group counseling, and holistic treatments at our Arizona campus.',
  },
  {
    title: 'Behavioral Health Therapy',
    description:
      'Evidence-based therapies such as CBT, DBT, trauma-focused therapy, and motivational interviewing are covered under Aetna behavioral health benefits.',
  },
  {
    title: 'Medication-Assisted Treatment',
    description:
      'Aetna covers FDA-approved medications like Suboxone, naltrexone, and Vivitrol as part of a comprehensive treatment plan.',
  },
  {
    title: 'Family Therapy',
    description:
      'Family involvement sessions and education programs to rebuild relationships and create a supportive recovery environment.',
  },
  {
    title: 'Aftercare Planning',
    description:
      'Discharge planning, alumni support, and relapse prevention programming to support long-term sobriety.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Call Our Admissions Team',
    description:
      'Reach us at (866) 996-4308. Share your Aetna member ID and we will begin the verification process immediately.',
  },
  {
    number: '02',
    title: 'Free Benefits Verification',
    description:
      'Our team contacts Aetna directly to verify your specific coverage, deductible status, copay amounts, and any pre-authorization requirements.',
  },
  {
    number: '03',
    title: 'Pre-Authorization Handled for You',
    description:
      'We manage all pre-authorization paperwork with Aetna so you can focus on preparing for treatment rather than dealing with insurance logistics.',
  },
  {
    number: '04',
    title: 'Begin Treatment',
    description:
      'Once approved, most clients arrive at our Cochise County campus within 24 to 48 hours. Your personalized treatment plan begins on day one.',
  },
];

export default function InsuranceAetnaPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title="Aetna Rehab Coverage"
        description="Seven Arrows Recovery is an in-network provider with Aetna. We accept most Aetna plans for drug and alcohol addiction treatment, and our admissions team will verify your benefits at no cost."
        image="/7a/images/embrace-connection.jpg"
      />

      {/* Aetna Coverage Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Aetna Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does Aetna Cover Drug &amp; Alcohol Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — Aetna provides comprehensive coverage for substance abuse treatment under the
                  Mental Health Parity and Addiction Equity Act (MHPAEA). This federal law requires
                  insurers like Aetna to cover addiction treatment at the same level as medical and
                  surgical care.
                </p>
                <p>
                  Seven Arrows Recovery is proud to be an in-network provider with Aetna. This means
                  lower out-of-pocket costs for you and a streamlined admissions process. Our team
                  works directly with Aetna to handle pre-authorizations and ongoing utilization
                  reviews.
                </p>
                <p>
                  Aetna covers a full continuum of care including medically supervised detoxification,
                  residential inpatient treatment, individual and group therapy, medication-assisted
                  treatment, and aftercare support — all services we provide at our campus in Cochise
                  County, Arizona.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Verify Your Aetna Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Every Aetna plan is different. Call our admissions team for a free, no-obligation
                benefits check. We will tell you exactly what your plan covers and what to expect
                for out-of-pocket costs.
              </p>
              <div className="space-y-4">
                <a href="tel:8669964308" className="btn-primary w-full text-center block">
                  Call (866) 996-4308
                </a>
                <Link to="/admissions" className="btn-outline w-full text-center block">
                  Verify Insurance Online
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Aetna Covers */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Aetna Addiction Treatment Coverage
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Aetna plans typically cover the following treatment services at Seven Arrows Recovery.
              Specific coverage depends on your individual plan.
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

      {/* Steps to Use Aetna */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label justify-center mb-4">How to Use Your Aetna Insurance</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using Aetna Insurance at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We make the insurance process simple so you can focus on recovery.
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
              Aetna Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does Aetna cover drug and alcohol rehab?',
                a: 'Yes. Aetna provides coverage for substance abuse treatment under its behavioral health benefits. This typically includes medically supervised detox, residential inpatient treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery is an in-network provider with Aetna.',
              },
              {
                q: 'How much does rehab cost with Aetna insurance?',
                a: 'Your out-of-pocket cost depends on your specific Aetna plan, deductible, copay, and coinsurance amounts. Many Aetna members pay little to nothing out of pocket for addiction treatment. Call our admissions team at (866) 996-4308 for a free, confidential benefits verification.',
              },
              {
                q: 'How long will Aetna cover rehab treatment?',
                a: 'The length of coverage varies by plan but Aetna typically covers 30 to 90 days of residential treatment based on medical necessity. Our clinical team works directly with Aetna to ensure you receive the full duration of care recommended for your recovery.',
              },
              {
                q: 'Does Aetna require pre-authorization for rehab?',
                a: 'Most Aetna plans require pre-authorization for residential addiction treatment. Our admissions team handles the entire pre-authorization process on your behalf so you can focus on getting well.',
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

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
            Use Your Aetna Insurance for Rehab Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Do not let insurance questions delay your recovery. Our admissions team verifies Aetna
            benefits within minutes and handles all the paperwork. Call now — we are available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link to="/admissions" className="btn-outline">
              Verify Insurance Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
