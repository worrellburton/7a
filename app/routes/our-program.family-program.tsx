import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const features = [
  {
    title: 'Family Therapy',
    description:
      'Our licensed therapists facilitate structured family sessions that address communication breakdowns, unresolved resentments, codependency patterns, and the impact of addiction on every member of the family system. These sessions create a safe space for honest dialogue and mutual understanding.',
  },
  {
    title: 'Family Education',
    description:
      'Addiction is a family disease, and education is a critical part of healing. We provide families with a clear understanding of the neuroscience of addiction, the role of trauma, healthy boundary-setting, and practical tools for supporting their loved one\u2019s recovery without sacrificing their own well-being.',
  },
  {
    title: 'Healing Together',
    description:
      'Recovery does not happen in isolation. Our program creates opportunities for families to rebuild trust, practice vulnerability, and begin to repair the bonds that addiction has strained. Through shared experiences and guided exercises, families learn to grow together rather than apart.',
  },
  {
    title: 'Weekly Sessions',
    description:
      'Consistency matters. Our weekly family sessions ensure that progress is sustained throughout the treatment process. Whether participating in person or virtually, families stay connected and engaged in their loved one\u2019s recovery journey from the very beginning.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Family Program | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery\u2019s family program offers therapy, education, and weekly sessions to help families heal together and build a strong foundation for lasting recovery." },
];

export default function FamilyProgramPage() {
  return (
    <main>
      <PageHero
        label="Family Program"
        title="Healing the Whole Family"
        description="Addiction affects everyone in the family. At Seven Arrows Recovery, our family program brings loved ones into the healing process through therapy, education, and ongoing connection."
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Family Involvement Matters
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Studies show that family involvement in treatment significantly
              improves recovery outcomes. When the entire family system heals,
              the person in recovery has a stronger support network, and family
              members gain the tools they need to take care of themselves.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              At Seven Arrows Recovery, we believe that the family is not just a
              bystander in the recovery process &mdash; they are an essential
              part of it.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((item) => (
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
            Bring Your Family Into the Healing Process
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Learn how our family program can help your entire family begin to
            heal. Our admissions team is ready to walk you through the process.
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
