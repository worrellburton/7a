import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Alcohol Addiction Treatment | Seven Arrows Recovery',
  description:
    'Comprehensive alcohol addiction treatment including medically supervised detox, therapy, and aftercare at Seven Arrows Recovery in Arizona. Call (866) 996-4308.',
};

export default function AlcoholAddictionPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Alcohol Addiction Treatment"
        description="Alcohol use disorder is one of the most common and dangerous forms of addiction. At Seven Arrows Recovery, we provide comprehensive, medically supervised treatment to help you reclaim your life."
      />

      {/* Understanding Alcohol Addiction */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Understanding the Problem</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Recognizing Alcohol Addiction
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Alcohol addiction, clinically known as alcohol use disorder (AUD), is a chronic
                  condition characterized by an inability to control drinking despite negative
                  consequences. It affects millions of Americans and can lead to devastating health,
                  social, and legal problems.
                </p>
                <p>
                  Because alcohol is legal and socially accepted, many people struggle to recognize
                  when casual drinking has crossed the line into dependence. Warning signs include
                  increased tolerance, withdrawal symptoms, failed attempts to cut back, and
                  continued use despite relationship or health issues.
                </p>
                <p>
                  Alcohol withdrawal can be medically dangerous and even life-threatening in severe
                  cases. Professional, medically supervised detox is essential for safe recovery from
                  alcohol dependence.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Signs of Alcohol Addiction
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Drinking more or longer than intended',
                  'Unsuccessful attempts to cut down or stop',
                  'Spending significant time drinking or recovering',
                  'Experiencing cravings or strong urges to drink',
                  'Neglecting responsibilities at work, home, or school',
                  'Continuing to drink despite relationship problems',
                  'Needing more alcohol to achieve the same effect',
                  'Experiencing withdrawal symptoms when not drinking',
                ].map((sign) => (
                  <li key={sign} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
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
              Your Path to Recovery from Alcohol
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our alcohol addiction treatment program combines medically supervised detox with
              evidence-based therapy and holistic care for complete healing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Medically Supervised Detox',
                description:
                  'Safe, comfortable detoxification under 24/7 medical supervision to manage withdrawal symptoms and prevent complications.',
              },
              {
                title: 'Individual Counseling',
                description:
                  'One-on-one therapy sessions to uncover the root causes of addiction and develop healthy coping strategies.',
              },
              {
                title: 'Group Therapy',
                description:
                  'Small-group sessions that provide peer support, accountability, and shared wisdom on the recovery journey.',
              },
              {
                title: 'Holistic Therapies',
                description:
                  'Experiential approaches including equine therapy, mindfulness, and outdoor activities at our Swisshelm Mountains campus.',
              },
              {
                title: 'Family Involvement',
                description:
                  'Family education and therapy sessions to repair relationships and build a strong support system for recovery.',
              },
              {
                title: 'Aftercare & Relapse Prevention',
                description:
                  'Comprehensive discharge planning with ongoing support, alumni programming, and relapse prevention strategies.',
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
            Take the First Step Toward Sobriety
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Recovery from alcohol addiction is possible. Our compassionate admissions team is
            available around the clock to answer your questions and help you begin the journey to a
            healthier, alcohol-free life.
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
