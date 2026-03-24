import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => [
  { title: "Dual Diagnosis Treatment | Seven Arrows Recovery" },
  { name: "description", content: "Integrated dual diagnosis treatment for co-occurring mental health and substance use disorders at Seven Arrows Recovery in Arizona. Call (866) 996-4308." },
];

export default function DualDiagnosisPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Dual Diagnosis Treatment"
        description="When mental health conditions and substance use disorders occur together, integrated treatment is essential. At Seven Arrows Recovery, we address both simultaneously for lasting healing."
        image="/7a/images/individual-therapy-session.jpg"
      />

      {/* Understanding Dual Diagnosis */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">Understanding Dual Diagnosis</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                What Is Dual Diagnosis?
              </h2>
              <div
                className="space-y-4 text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>
                  Dual diagnosis, also known as co-occurring disorders, refers to the presence of
                  both a mental health condition and a substance use disorder at the same time.
                  Research shows that nearly half of all individuals with a substance use disorder
                  also experience a co-occurring mental health condition.
                </p>
                <p>
                  Common co-occurring conditions include depression, anxiety disorders, PTSD,
                  bipolar disorder, and personality disorders. When these conditions go untreated,
                  they can fuel each other in a destructive cycle, making recovery from either
                  condition far more difficult.
                </p>
                <p>
                  At Seven Arrows Recovery, we understand that treating addiction alone is not
                  enough. Our integrated approach ensures that both the mental health condition and
                  the substance use disorder are addressed together, giving our clients the best
                  chance at sustained recovery.
                </p>
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Common Co-Occurring Conditions
              </h3>
              <ul
                className="space-y-4 text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {[
                  'Major Depressive Disorder',
                  'Generalized Anxiety Disorder',
                  'Post-Traumatic Stress Disorder (PTSD)',
                  'Bipolar Disorder',
                  'Panic Disorder',
                  'Obsessive-Compulsive Disorder',
                  'Borderline Personality Disorder',
                  'Attention-Deficit/Hyperactivity Disorder',
                ].map((condition) => (
                  <li key={condition} className="flex items-start gap-3">
                    <span className="text-[#a0522d] mt-1 font-bold">&#10003;</span>
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated Treatment Approach */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Our Approach</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Integrated Treatment for Lasting Recovery
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our clinical team develops individualized treatment plans that address both the
              addiction and the underlying mental health condition simultaneously.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Comprehensive Assessment',
                description:
                  'Thorough psychiatric and clinical evaluation to identify all co-occurring conditions and create a personalized treatment roadmap.',
              },
              {
                title: 'Individual Therapy',
                description:
                  'One-on-one sessions with licensed therapists using evidence-based modalities including CBT, DBT, and EMDR.',
              },
              {
                title: 'Medication Management',
                description:
                  'Psychiatric oversight to ensure safe, effective use of medication for mental health conditions during recovery.',
              },
              {
                title: 'Group Therapy',
                description:
                  'Specialized groups for dual-diagnosis clients that address the unique challenges of co-occurring disorders.',
              },
              {
                title: 'Trauma-Informed Care',
                description:
                  'Our TraumAddiction\u2122 approach addresses the role of trauma in both mental health conditions and substance use.',
              },
              {
                title: 'Aftercare Planning',
                description:
                  'Comprehensive discharge planning that includes ongoing mental health treatment, support groups, and relapse prevention.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-warm-card rounded-2xl p-8"
              >
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
            Get Help for Dual Diagnosis Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            If you or a loved one is struggling with both a mental health condition and addiction,
            integrated treatment can make all the difference. Reach out to our admissions team for a
            confidential assessment.
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
