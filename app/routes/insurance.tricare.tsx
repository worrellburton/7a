import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import PageHero from '~/components/PageHero';

export const meta: MetaFunction = () => [
  {
    title: 'Does TRICARE Cover Drug & Alcohol Rehab? | Seven Arrows Recovery',
  },
  {
    name: 'description',
    content:
      'Seven Arrows Recovery accepts TRICARE insurance for military addiction treatment. Learn what TRICARE covers for rehab including detox, residential, and therapy. Call (866) 996-4308.',
  },
  {
    'script:ld+json': JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Does TRICARE cover drug and alcohol rehab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. TRICARE covers substance use disorder treatment for active duty service members, retirees, and their dependents. Coverage includes inpatient detox, residential treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery accepts most TRICARE plans.',
            },
          },
          {
            '@type': 'Question',
            name: 'How much does rehab cost with TRICARE?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TRICARE Prime members typically have no out-of-pocket costs for substance abuse treatment at network facilities. TRICARE Select members may have copays or cost-shares depending on their plan and sponsor status. Active duty members pay nothing. Call (866) 996-4308 for details.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does TRICARE require a referral for rehab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TRICARE Prime requires a referral from your primary care manager (PCM) for substance abuse treatment. TRICARE Select does not require a referral but may need prior authorization. Our admissions team can guide you through the referral or authorization process.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Seven Arrows treat veterans and active duty military?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Seven Arrows Recovery welcomes active duty service members, veterans, retirees, and military dependents. Our clinical team understands military culture and the unique challenges service members face, including combat-related trauma, moral injury, and military sexual trauma.',
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
            name: 'TRICARE',
            item: 'https://sevenarrowsrecovery.com/insurance/tricare',
          },
        ],
      },
    ]),
  },
];

const coverageItems = [
  {
    title: 'Medical Detoxification',
    description:
      'TRICARE covers inpatient medical detox for safe, medically supervised withdrawal from alcohol, opioids, and other substances.',
  },
  {
    title: 'Residential Treatment',
    description:
      'Comprehensive residential care including structured therapy, clinical programming, and a healing environment for military members and their families.',
  },
  {
    title: 'Trauma-Focused Therapy',
    description:
      'TRICARE covers evidence-based trauma therapies including EMDR, CPT (Cognitive Processing Therapy), and prolonged exposure — critical for service members with combat-related PTSD.',
  },
  {
    title: 'Medication-Assisted Treatment',
    description:
      'Coverage for FDA-approved medications to support recovery from opioid and alcohol dependence, including naltrexone, buprenorphine, and acamprosate.',
  },
  {
    title: 'Dual Diagnosis Care',
    description:
      'Integrated treatment for co-occurring PTSD, depression, anxiety, TBI, and substance use disorders — conditions that frequently overlap in military populations.',
  },
  {
    title: 'Transition & Aftercare',
    description:
      'Discharge planning coordinated with military support systems, VA resources, and community providers for sustained recovery after treatment.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Call Our Military Admissions Line',
    description:
      'Contact us at (866) 996-4308. Let us know you have TRICARE and share your sponsor information. We understand the military system and will guide you.',
  },
  {
    number: '02',
    title: 'Benefits Verification',
    description:
      'We verify your TRICARE plan type (Prime, Select, Reserve Select, etc.), determine your coverage level, and identify any referral or authorization requirements.',
  },
  {
    number: '03',
    title: 'Referral & Authorization',
    description:
      'For TRICARE Prime, we help coordinate the referral from your PCM. For TRICARE Select, we handle prior authorization directly with your regional contractor.',
  },
  {
    number: '04',
    title: 'Begin Treatment',
    description:
      'With authorization complete, travel to our campus in Cochise County, Arizona. Your individualized treatment plan — informed by military cultural competence — begins immediately.',
  },
];

export default function InsuranceTRICAREPage() {
  return (
    <>
      <PageHero
        label="Insurance Coverage"
        title="TRICARE Rehab Coverage"
        description="Seven Arrows Recovery accepts TRICARE insurance for active duty service members, veterans, retirees, and military dependents seeking drug and alcohol addiction treatment. We understand military culture and the unique challenges of service."
        image="/7a/images/embrace-connection.jpg"
      />

      {/* TRICARE Overview */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">TRICARE Insurance</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Does TRICARE Cover Drug &amp; Alcohol Rehab?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes — TRICARE provides comprehensive coverage for substance use disorder treatment
                  for active duty service members, retirees, National Guard and Reserve members, and
                  their eligible dependents. TRICARE recognizes that addiction is a medical condition
                  that requires professional treatment and covers the full continuum of care.
                </p>
                <p>
                  Substance abuse rates among military populations are significant. The stresses of
                  deployment, combat exposure, physical injuries, and the challenges of military life
                  can contribute to problematic substance use. TRICARE understands this reality and
                  provides robust coverage for evidence-based addiction treatment.
                </p>
                <p>
                  Seven Arrows Recovery welcomes TRICARE beneficiaries and has clinical experience
                  working with service members and military families. Our trauma-informed approach is
                  particularly relevant for those dealing with combat-related PTSD, moral injury,
                  military sexual trauma, and the adjustment challenges that accompany service.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Verify Your TRICARE Benefits — Free &amp; Confidential
              </h3>
              <p
                className="text-foreground/70 mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                TRICARE coverage varies by plan type and beneficiary category. Active duty members
                typically pay nothing out of pocket. Our military-knowledgeable admissions team can
                verify your specific benefits and walk you through the process.
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

      {/* TRICARE Plan Types */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">TRICARE Plans We Accept</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Coverage by TRICARE Plan Type
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery works with multiple TRICARE plan types. Here is a general
              overview of coverage by plan.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'TRICARE Prime',
                description:
                  'Lowest out-of-pocket costs. Active duty members pay nothing. Retirees and dependents have minimal copays. Requires a referral from your primary care manager.',
              },
              {
                title: 'TRICARE Select',
                description:
                  'More flexibility in choosing providers without a referral. Cost-shares apply based on sponsor status (active duty family vs. retiree). Prior authorization may be required.',
              },
              {
                title: 'TRICARE Reserve Select',
                description:
                  'Available to qualified National Guard and Reserve members. Similar coverage to TRICARE Select with applicable cost-shares for substance abuse treatment.',
              },
              {
                title: 'TRICARE For Life',
                description:
                  'Wraparound coverage for Medicare-eligible military retirees. Works alongside Medicare to cover addiction treatment costs with minimal out-of-pocket expense.',
              },
              {
                title: 'TRICARE Young Adult',
                description:
                  'Coverage for adult dependents ages 21-26. Provides substance abuse treatment benefits similar to the sponsor\'s TRICARE plan.',
              },
              {
                title: 'Active Duty Service Members',
                description:
                  'Active duty members receive full coverage with no out-of-pocket costs for substance abuse treatment. Command referral or self-referral pathways are available.',
              },
            ].map((plan) => (
              <div key={plan.title} className="bg-warm-card rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-3">{plan.title}</h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {plan.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What TRICARE Covers */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">What&apos;s Covered</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              TRICARE Addiction Treatment Services
            </h2>
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
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label justify-center mb-4">How to Use Your TRICARE Benefits</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Using TRICARE at Seven Arrows
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our team understands the TRICARE system and will guide you through every step.
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
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-4">Frequently Asked Questions</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              TRICARE Rehab Coverage FAQs
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Does TRICARE cover drug and alcohol rehab?',
                a: 'Yes. TRICARE covers substance use disorder treatment for active duty service members, retirees, and their dependents. Coverage includes inpatient detox, residential treatment, outpatient therapy, and medication-assisted treatment. Seven Arrows Recovery accepts most TRICARE plans.',
              },
              {
                q: 'How much does rehab cost with TRICARE?',
                a: 'TRICARE Prime members typically have no out-of-pocket costs for substance abuse treatment at network facilities. TRICARE Select members may have copays or cost-shares depending on their plan and sponsor status. Active duty members pay nothing. Call (866) 996-4308 for details.',
              },
              {
                q: 'Does TRICARE require a referral for rehab?',
                a: 'TRICARE Prime requires a referral from your primary care manager (PCM) for substance abuse treatment. TRICARE Select does not require a referral but may need prior authorization. Our admissions team can guide you through the referral or authorization process.',
              },
              {
                q: 'Does Seven Arrows treat veterans and active duty military?',
                a: 'Yes. Seven Arrows Recovery welcomes active duty service members, veterans, retirees, and military dependents. Our clinical team understands military culture and the unique challenges service members face, including combat-related trauma, moral injury, and military sexual trauma.',
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
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
            You Served Your Country — Now Let Us Serve You
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Your TRICARE benefits can cover addiction treatment at Seven Arrows Recovery. Our
            admissions team understands military insurance and is ready to help you navigate the
            process. Call now — confidential, no obligation.
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
