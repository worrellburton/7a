import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Heroin Addiction Treatment | Seven Arrows Recovery',
  description:
    'Specialized heroin addiction treatment with medically supervised detox and evidence-based therapy at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

export default function HeroinAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Heroin Addiction Treatment"
        description="Heroin addiction is a devastating and life-threatening condition, but recovery is possible with the right support. Seven Arrows Recovery provides medically supervised detox and comprehensive treatment in a safe, compassionate environment."
        image="/images/embrace-connection.jpg"
      />

      {/* Understanding Heroin Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">The Opioid Crisis</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Understanding Heroin Addiction
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Heroin is a highly addictive opioid that binds to receptors in the brain,
                  producing intense euphoria and pain relief. Over time, the brain becomes dependent
                  on the drug, requiring increasing amounts to achieve the same effect and causing
                  severe withdrawal symptoms when use stops.
                </p>
                <p>
                  The opioid crisis has devastated communities across America. Many heroin users
                  initially became dependent on prescription opioid painkillers before transitioning
                  to heroin as a cheaper, more accessible alternative. The rise of fentanyl-laced
                  heroin has made the drug even more dangerous and deadly.
                </p>
                <p>
                  At Seven Arrows Recovery, we understand the complexity of heroin addiction and the
                  courage it takes to seek help. Our medically supervised detox program ensures safe
                  withdrawal management, while our clinical team addresses the underlying causes of
                  addiction.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Dangers of Heroin Use
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'High risk of fatal overdose, especially with fentanyl',
                  'Severe physical dependence and painful withdrawal',
                  'Increased risk of infectious diseases (HIV, hepatitis)',
                  'Collapsed veins and cardiovascular damage',
                  'Respiratory depression and lung complications',
                  'Cognitive impairment and mental health deterioration',
                  'Destruction of relationships and social isolation',
                  'Legal consequences and financial devastation',
                ].map((danger) => (
                  <li key={danger} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
                    <span>{danger}</span>
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
              Comprehensive Heroin Recovery Program
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our heroin addiction treatment combines medical intervention with evidence-based
              therapy to address both the physical and psychological aspects of addiction.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Medically Supervised Detox',
                description:
                  'Round-the-clock medical monitoring during withdrawal with medication-assisted treatment to ease symptoms and ensure safety.',
              },
              {
                title: 'Medication-Assisted Treatment',
                description:
                  'FDA-approved medications to reduce cravings, prevent relapse, and support long-term recovery from opioid dependence.',
              },
              {
                title: 'Trauma-Informed Therapy',
                description:
                  'Our TraumAddiction\u2122 approach addresses the trauma that often underlies heroin addiction, promoting deep and lasting healing.',
              },
              {
                title: 'Behavioral Therapies',
                description:
                  'Evidence-based therapies including CBT and motivational interviewing to reshape thought patterns and build recovery skills.',
              },
              {
                title: 'Holistic Healing',
                description:
                  'Equine therapy, mindfulness practices, and outdoor experiential activities at our serene Arizona campus.',
              },
              {
                title: 'Continuing Care',
                description:
                  'Robust aftercare planning including referrals, alumni support, and relapse prevention strategies for sustained sobriety.',
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
            Break Free from Heroin Addiction
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You do not have to face heroin addiction alone. Our compassionate team is ready to help
            you through every step of recovery, from detox to aftercare. Call now for a confidential
            consultation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="btn-primary">
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
