import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Opioid Addiction Treatment | Seven Arrows Recovery',
  description:
    'Comprehensive opioid addiction treatment for prescription painkillers, fentanyl, and other opioids at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

export default function OpioidAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Opioid Addiction Treatment"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: 'Opioid Addiction' },
        ]}
        description="Opioid addiction has become one of the most devastating public health crises in American history. At Seven Arrows Recovery, we provide comprehensive, trauma-informed residential treatment to help individuals overcome opioid dependence and rebuild their lives."
        image="/images/group-therapy-room.jpg"
      />

      {/* Understanding Opioid Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">The Opioid Epidemic</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Understanding Opioid Addiction
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Opioids include both prescription painkillers such as oxycodone, hydrocodone, and
                  morphine, as well as illicit substances like heroin and illegally manufactured
                  fentanyl. These drugs bind to opioid receptors in the brain, producing pain relief
                  and euphoria while rapidly building physical dependence.
                </p>
                <p>
                  Many people who develop opioid addiction began with a legitimate prescription for
                  pain management. As tolerance builds, individuals may increase their dosage, seek
                  multiple prescriptions, or turn to cheaper illicit opioids. The introduction of
                  fentanyl into the drug supply has made opioid use more dangerous than ever, with
                  overdose deaths continuing to rise nationwide.
                </p>
                <p>
                  At Seven Arrows Recovery, we understand the powerful grip of opioid addiction and
                  provide a compassionate, evidence-based path to recovery. If you still need acute
                  detox, our admissions team coordinates a short stay at a partnered detox facility
                  so you arrive medically stable — then our residential program addresses both the
                  physical dependence and the underlying factors that drive opioid use.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Types of Opioids We Treat
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Oxycodone (OxyContin, Percocet)',
                  'Hydrocodone (Vicodin, Norco)',
                  'Morphine and codeine',
                  'Fentanyl and fentanyl analogs',
                  'Heroin',
                  'Tramadol and tapentadol',
                  'Methadone (when misused)',
                  'Other synthetic and semi-synthetic opioids',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
                    <span>{item}</span>
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
              Comprehensive Opioid Recovery Program
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our opioid addiction treatment program combines medical intervention,
              medication-assisted treatment, and evidence-based therapy for complete recovery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Medically Supervised Detox',
                description:
                  'Safe, comfortable detoxification with 24/7 medical monitoring and medication support to manage withdrawal symptoms effectively.',
              },
              {
                title: 'Medication-Assisted Treatment',
                description:
                  'FDA-approved medications including buprenorphine and naltrexone to reduce cravings and support long-term recovery.',
              },
              {
                title: 'Individual Therapy',
                description:
                  'One-on-one counseling with licensed therapists to address the root causes of addiction and develop healthy coping mechanisms.',
              },
              {
                title: 'Trauma-Informed Care',
                description:
                  'Our proprietary TraumAddiction\u2122 approach addresses the trauma that frequently underlies opioid addiction.',
              },
              {
                title: 'Group & Peer Support',
                description:
                  'Small-group therapy sessions and peer support activities that build connection, accountability, and shared recovery wisdom.',
              },
              {
                title: 'Aftercare & Continuing Support',
                description:
                  'Comprehensive discharge planning with alumni programming, relapse prevention strategies, and community resource referrals.',
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
            Overcome Opioid Addiction Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Opioid addiction is treatable, and recovery is within reach. Our admissions team is
            available around the clock to answer your questions and guide you toward the care you
            deserve.
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
