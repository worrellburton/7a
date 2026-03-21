import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trauma Treatment | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery specializes in TraumAddiction\u2122, combining EMDR, somatic experiencing, and body-based interventions to treat trauma and addiction together.',
};

const modalities = [
  {
    title: 'TraumAddiction\u2122 Specialty',
    description:
      'Our proprietary TraumAddiction\u2122 model recognizes that trauma and addiction are deeply intertwined. By treating both simultaneously, we address the root causes of substance use rather than just the symptoms. This integrated approach leads to more meaningful and lasting recovery.',
  },
  {
    title: 'EMDR Therapy',
    description:
      'Eye Movement Desensitization and Reprocessing (EMDR) is a powerful, evidence-based therapy that helps the brain reprocess traumatic memories. By reducing the emotional charge of painful experiences, EMDR allows clients to move forward without being held captive by their past.',
  },
  {
    title: 'Somatic Experiencing',
    description:
      'Trauma lives in the body as much as in the mind. Somatic Experiencing helps clients tune into physical sensations, release stored tension, and restore the nervous system\u2019s natural capacity for self-regulation. This gentle, body-first approach is especially effective for complex trauma.',
  },
  {
    title: 'Body-Based Interventions',
    description:
      'From breathwork and movement therapy to sensory grounding techniques, our body-based interventions help clients reconnect with their physical selves. These practices build resilience, reduce anxiety, and create a felt sense of safety that supports the entire recovery process.',
  },
];

export default function TraumaTreatmentPage() {
  return (
    <main>
      <PageHero
        label="Trauma Treatment"
        title="Healing Trauma at the Root"
        description="Addiction rarely exists in isolation. At Seven Arrows Recovery, our TraumAddiction\u2122 approach treats trauma and substance use as one integrated condition, unlocking deeper and more lasting healing."
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Trauma-Informed Care Matters
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Research consistently shows that the vast majority of people
              struggling with addiction have experienced significant trauma.
              Without addressing these underlying wounds, traditional treatment
              often falls short. At Seven Arrows Recovery, trauma treatment is
              not an add-on &mdash; it is the foundation of everything we do.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our clinical team is specially trained in trauma-focused modalities
              and creates a safe, compassionate environment where clients can
              begin to process painful experiences at their own pace.
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
            Start Healing Today
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You don&apos;t have to carry the weight of trauma alone. Reach out
            to our compassionate admissions team to learn how our
            TraumAddiction&trade; approach can help you reclaim your life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </Link>
            <Link href="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
