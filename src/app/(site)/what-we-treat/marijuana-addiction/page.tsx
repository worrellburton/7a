import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marijuana Addiction Treatment | Seven Arrows Recovery',
  description:
    'Treatment for marijuana dependence addressing psychological reliance, withdrawal symptoms, and underlying emotional issues at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

export default function MarijuanaAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Marijuana Addiction Treatment"
        description="While often perceived as harmless, marijuana can create a powerful psychological dependence that disrupts daily life. At Seven Arrows Recovery, we help individuals break free from marijuana addiction and build a foundation for lasting wellness."
        image="/images/horses-grazing.jpg"
      />

      {/* Understanding Marijuana Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Understanding the Problem</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Is Marijuana Really Addictive?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Yes. While marijuana may not produce the severe physical withdrawal symptoms
                  associated with opioids or alcohol, it can lead to a significant psychological
                  dependence. The National Institute on Drug Abuse estimates that roughly 30% of
                  people who use marijuana develop some degree of marijuana use disorder.
                </p>
                <p>
                  Today&apos;s marijuana products are far more potent than those of previous decades.
                  Concentrates, edibles, and high-THC strains can accelerate the development of
                  tolerance and dependence, making it increasingly difficult for users to function
                  without the drug.
                </p>
                <p>
                  Many individuals who struggle with marijuana addiction also experience underlying
                  mental health conditions such as anxiety, depression, or trauma. At Seven Arrows
                  Recovery, we address these root causes alongside the addiction itself, providing a
                  comprehensive path to recovery.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Signs of Marijuana Dependence
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Using more marijuana than intended or for longer periods',
                  'Failed attempts to cut back or quit',
                  'Spending significant time obtaining, using, or recovering',
                  'Cravings or strong urges to use marijuana',
                  'Neglecting responsibilities at work, school, or home',
                  'Continued use despite social or relationship problems',
                  'Loss of interest in activities once enjoyed',
                  'Irritability, sleep difficulties, or restlessness when stopping',
                ].map((sign) => (
                  <li key={sign} className="flex items-start gap-3">
                    <span className="text-[#0071e3] mt-1 font-bold">&#10003;</span>
                    <span>{sign}</span>
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
              Personalized Marijuana Recovery Program
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our marijuana addiction treatment focuses on the psychological and emotional aspects of
              dependence, equipping you with the tools and strategies to maintain long-term sobriety.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Clinical Assessment',
                description:
                  'Comprehensive evaluation to understand the severity of dependence and identify any co-occurring mental health conditions.',
              },
              {
                title: 'Cognitive Behavioral Therapy',
                description:
                  'Evidence-based CBT to identify and change the thought patterns and behaviors that drive marijuana use.',
              },
              {
                title: 'Motivational Enhancement',
                description:
                  'Motivational interviewing techniques to strengthen your internal motivation and commitment to recovery.',
              },
              {
                title: 'Group Therapy',
                description:
                  'Supportive group sessions where you can share experiences, gain perspective, and build accountability with peers.',
              },
              {
                title: 'Holistic Therapies',
                description:
                  'Mindfulness, equine therapy, and outdoor experiential activities at our serene Arizona campus to promote natural well-being.',
              },
              {
                title: 'Relapse Prevention',
                description:
                  'Practical strategies and coping skills to manage triggers, handle cravings, and sustain a marijuana-free life after treatment.',
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
            Reclaim Your Life from Marijuana Dependence
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            If marijuana has taken control of your daily life, you deserve support. Our compassionate
            admissions team is available to answer your questions and help you take the first step
            toward recovery.
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
