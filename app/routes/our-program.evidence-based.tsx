import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const modalities = [
  {
    title: 'Cognitive Behavioral Therapy (CBT)',
    description:
      'CBT helps clients identify and change the negative thought patterns that fuel addictive behavior. By learning to recognize distorted thinking and develop healthier responses, clients build practical skills for managing triggers, cravings, and the stressors of everyday life. CBT is one of the most widely researched and effective therapies for substance use disorders.',
  },
  {
    title: 'Dialectical Behavior Therapy (DBT)',
    description:
      'DBT teaches clients to balance acceptance and change through four core skill areas: mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness. Originally developed for individuals with intense emotional experiences, DBT is highly effective for those in recovery who struggle with mood swings, impulsivity, and difficulty maintaining stable relationships.',
  },
  {
    title: 'Motivational Interviewing',
    description:
      'Motivational interviewing is a collaborative, client-centered approach that strengthens a person&apos;s own motivation for change. Rather than confronting resistance, our therapists guide clients to explore their ambivalence about recovery and discover their own reasons for pursuing a sober life. This respectful approach builds autonomy and lasting commitment.',
  },
  {
    title: 'Group Therapy',
    description:
      'Group therapy provides a supportive community where clients learn from one another, practice social skills, and experience the healing power of shared vulnerability. Facilitated by licensed clinicians, our groups cover topics such as relapse prevention, emotional processing, life skills, and building a recovery identity. The small size of our program ensures every voice is heard.',
  },
  {
    title: 'Individual Therapy',
    description:
      'Each client at Seven Arrows receives regular one-on-one sessions with a dedicated therapist. Individual therapy provides the space to explore personal history, process trauma, set goals, and develop a customized relapse prevention plan. This deeply personal work forms the backbone of the treatment experience.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Evidence-Based Treatment | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery provides evidence-based addiction treatment including CBT, DBT, motivational interviewing, group therapy, and individual therapy for lasting recovery." },
];

export default function EvidenceBasedPage() {
  return (
    <main>
      <PageHero
        label="Evidence-Based Treatment"
        title="Grounded in Proven Science"
        description="At Seven Arrows Recovery, our clinical programming is built on therapies that decades of research have shown to be effective. We combine these proven methods with our unique setting and philosophy to deliver treatment that is both rigorous and deeply human."
        image="/7a/images/group-therapy-room.jpg"
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Clinical Excellence, Personal Touch
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Evidence-based treatment means using therapeutic approaches that
              have been rigorously studied and proven to produce positive
              outcomes. At Seven Arrows Recovery, we never ask clients to rely
              on hope alone &mdash; we equip them with clinically validated
              tools and strategies that work.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our clinical team holds advanced credentials and ongoing training
              in the most effective modalities for addiction and co-occurring
              mental health conditions. Every treatment plan is individualized,
              ensuring that each client receives the right combination of
              therapies for their unique needs.
            </p>
          </div>

          {/* Modalities */}
          <div className="grid md:grid-cols-2 gap-8">
            {modalities.map((item) => (
              <div
                key={item.title}
                className="bg-warm-card rounded-2xl p-8 shadow-sm"
              >
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h3>
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

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-warm-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Get the Treatment That Works
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team can walk you through our evidence-based
            approach and help you determine the right path forward. Reach out
            today to take the first step.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link to="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
