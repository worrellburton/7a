import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Xanax Addiction Treatment | Seven Arrows Recovery',
  description:
    'Safe, medically supervised Xanax and benzodiazepine detox with individualized tapering protocols and therapeutic support at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

export default function XanaxAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Xanax Addiction Treatment"
        description="Xanax is one of the most commonly prescribed and widely misused benzodiazepines in America. At Seven Arrows Recovery, we provide safe, medically supervised detox and comprehensive treatment to help you overcome Xanax dependence."
      />

      {/* Understanding Xanax Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Understanding the Risks</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                The Dangers of Xanax Dependence
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Xanax (alprazolam) is a fast-acting benzodiazepine prescribed for anxiety and panic
                  disorders. While effective for short-term use, Xanax produces rapid tolerance and
                  physical dependence, often within just a few weeks of regular use. This makes it one
                  of the most addictive prescription medications available.
                </p>
                <p>
                  Xanax withdrawal is medically serious and can be life-threatening if not properly
                  managed. Abrupt cessation can trigger seizures, severe anxiety, psychosis, and other
                  dangerous complications. For this reason, a carefully supervised tapering protocol is
                  essential for anyone who has developed a Xanax dependence.
                </p>
                <p>
                  At Seven Arrows Recovery, our medical team specializes in safe benzodiazepine
                  detoxification. We use individualized tapering schedules, 24/7 medical monitoring,
                  and supportive therapies to ensure the safest and most comfortable withdrawal
                  experience possible.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Xanax Withdrawal Symptoms
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Severe anxiety and panic attacks',
                  'Insomnia and sleep disturbances',
                  'Tremors and muscle tension',
                  'Seizures (potentially life-threatening)',
                  'Nausea, vomiting, and sweating',
                  'Irritability and agitation',
                  'Difficulty concentrating and memory problems',
                  'Perceptual disturbances and hypersensitivity',
                ].map((symptom) => (
                  <li key={symptom} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
                    <span>{symptom}</span>
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
              Safe Xanax Detox and Recovery
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our Xanax addiction treatment program prioritizes safety with a medically supervised
              tapering protocol, combined with comprehensive therapy to address the underlying anxiety
              and emotional issues that led to dependence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Individualized Tapering Protocol',
                description:
                  'A carefully designed, gradual dose reduction schedule tailored to your specific usage history, ensuring the safest possible withdrawal process.',
              },
              {
                title: '24/7 Medical Monitoring',
                description:
                  'Round-the-clock medical supervision during the critical detox period, with immediate intervention available for any complications.',
              },
              {
                title: 'Anxiety Management',
                description:
                  'Evidence-based techniques and non-addictive medications to manage the rebound anxiety that commonly accompanies Xanax withdrawal.',
              },
              {
                title: 'Cognitive Behavioral Therapy',
                description:
                  'CBT sessions to develop healthy coping strategies for anxiety and panic, reducing the need for benzodiazepine medication.',
              },
              {
                title: 'Holistic Stress Relief',
                description:
                  'Mindfulness meditation, breathwork, equine therapy, and other holistic approaches to naturally manage stress and anxiety.',
              },
              {
                title: 'Long-Term Recovery Planning',
                description:
                  'Comprehensive aftercare planning including coordination with psychiatrists for non-addictive anxiety treatment and ongoing therapeutic support.',
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
            Safely Overcome Xanax Dependence
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Xanax withdrawal requires professional medical supervision. Do not attempt to quit on
            your own. Contact our admissions team today for a confidential assessment and learn how
            our medically supervised program can help you safely taper off Xanax.
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
