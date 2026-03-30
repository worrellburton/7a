import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => [
  { title: "Prescription Drug Addiction Treatment | Seven Arrows Recovery" },
  { name: "description", content: "Specialized treatment for addiction to benzodiazepines, stimulants, pain medications, and other prescription substances at Seven Arrows Recovery in Arizona. Call (866) 996-4308." },
];

export default function PrescriptionDrugAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Prescription Drug Addiction Treatment"
        description="Prescription drug addiction can develop quickly and quietly, even when medications are taken as directed. At Seven Arrows Recovery, we provide specialized treatment for all forms of prescription drug dependence in a safe, compassionate environment."
        image="/images/covered-porch-desert-view.jpg"
      />

      {/* Understanding Prescription Drug Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Understanding the Problem</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                How Prescription Drug Addiction Develops
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Prescription drug addiction occurs when a person becomes physically or
                  psychologically dependent on a medication, often one that was originally prescribed
                  by a doctor for a legitimate medical condition. The three most commonly misused
                  categories are opioid painkillers, benzodiazepines, and stimulants.
                </p>
                <p>
                  Because these medications are prescribed by healthcare professionals, many people
                  assume they are safe. However, tolerance can develop rapidly, leading individuals to
                  take higher doses, use medications more frequently, or combine them with other
                  substances. This escalation can quickly spiral into a full-blown addiction.
                </p>
                <p>
                  At Seven Arrows Recovery, we understand the unique challenges of prescription drug
                  addiction. Our clinical team creates individualized treatment plans that address the
                  specific substance involved, the severity of dependence, and any co-occurring mental
                  health conditions.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Commonly Misused Prescription Drugs
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Opioid painkillers (OxyContin, Vicodin, Percocet)',
                  'Benzodiazepines (Xanax, Valium, Klonopin, Ativan)',
                  'Stimulants (Adderall, Ritalin, Concerta)',
                  'Sleep medications (Ambien, Lunesta)',
                  'Muscle relaxants (Soma, Flexeril)',
                  'Barbiturates and sedatives',
                  'Gabapentin and pregabalin',
                  'Cough suppressants containing codeine or DXM',
                ].map((drug) => (
                  <li key={drug} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
                    <span>{drug}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Approach */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Treatment Approach</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Tailored Prescription Drug Recovery
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Each class of prescription drug requires a unique treatment approach. Our clinical team
              designs individualized protocols based on the specific substance, duration of use, and
              your personal health history.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Safe Medical Detox',
                description:
                  'Medically supervised detoxification with individualized tapering protocols to safely manage withdrawal from prescription medications.',
              },
              {
                title: 'Psychiatric Evaluation',
                description:
                  'Comprehensive assessment to identify co-occurring mental health conditions and determine if alternative, non-addictive medications are appropriate.',
              },
              {
                title: 'Individual Counseling',
                description:
                  'One-on-one therapy to explore the circumstances that led to prescription drug misuse and develop healthier coping strategies.',
              },
              {
                title: 'Pain Management Alternatives',
                description:
                  'For those addicted to pain medications, we work with you to develop non-addictive pain management strategies and referrals.',
              },
              {
                title: 'Behavioral Therapies',
                description:
                  'Evidence-based approaches including CBT and DBT to address the thought patterns and behaviors associated with prescription drug misuse.',
              },
              {
                title: 'Aftercare Planning',
                description:
                  'Coordination with your prescribing physicians and comprehensive discharge planning to prevent relapse and ensure continuity of care.',
              },
            ].map((item) => (
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

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
            Get Help for Prescription Drug Addiction
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Prescription drug addiction is treatable, and asking for help is the first step. Our
            admissions team is available to provide a confidential assessment and guide you toward the
            right level of care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="btn-primary">
              Contact Us
            </Link>
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
