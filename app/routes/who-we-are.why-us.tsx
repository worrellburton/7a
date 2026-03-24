import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const differentiators = [
  {
    title: 'Boutique Setting',
    description:
      'Unlike large, institutional facilities, Seven Arrows Recovery maintains a deliberately small census. This means more one-on-one time with clinicians, deeper therapeutic relationships, and a pace of care tailored to your needs rather than a corporate schedule.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    title: 'Small Group Sizes',
    description:
      'Our intentionally limited client count ensures that every individual receives the attention they deserve. Group therapy sessions are intimate and focused, fostering genuine connection and accountability among peers.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Swisshelm Mountains',
    description:
      'Our campus is situated at the base of Arizona\'s Swisshelm Mountains, surrounded by sweeping desert vistas and open skies. The natural environment provides a powerful backdrop for reflection, grounding, and renewal far from the triggers of daily life.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17.25L9 3l4.5 9 3-4.5L21 17.25H3z" />
      </svg>
    ),
  },
  {
    title: 'Holistic + Evidence-Based',
    description:
      'We combine clinically proven modalities like CBT, DBT, EMDR, and motivational interviewing with holistic practices including yoga, meditation, equine therapy, and nutritional counseling. The result is a treatment experience that addresses the whole person.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    title: 'TraumAddiction\u2122',
    description:
      'Our proprietary TraumAddiction\u2122 approach recognizes the deep connection between unresolved trauma and addictive behavior. By combining body-based interventions with traditional psychotherapy, we treat the root causes of addiction rather than just the symptoms.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    title: '24/7 Clinical Support',
    description:
      'Recovery does not follow a 9-to-5 schedule. Our clinical and medical staff provide round-the-clock support, ensuring that clients have access to care whenever they need it, including overnight and weekends.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const meta: MetaFunction = () => [
  { title: "Why Us?" },
  { name: "description", content: "Discover what sets Seven Arrows Recovery apart: boutique setting, small groups, Swisshelm Mountains location, holistic and evidence-based treatment, and our proprietary TraumAddiction approach." },
];

export default function WhyUsPage() {
  return (
    <>
      <PageHero
        label="Why Choose Us"
        title="Why Us?"
        description="Choosing a treatment center is one of the most important decisions you will ever make. Here is why individuals and families across Arizona and beyond trust Seven Arrows Recovery."
        image="/7a/images/facility-exterior-mountains.jpg"
      />

      {/* Differentiators */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="bg-warm-bg rounded-2xl p-8 hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                  {item.icon}
                </div>
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

      {/* Results Statement */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-4">Results That Speak</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Recovery Is Personal. So Is Our Approach.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            At Seven Arrows Recovery, we do not believe in one-size-fits-all treatment. Every client
            receives a customized care plan designed by our clinical team, refined throughout
            treatment, and supported by a continuum of aftercare. Our boutique model means we can
            adapt quickly, respond to individual needs, and maintain the kind of therapeutic
            environment where real transformation happens.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Experience the Seven Arrows Difference
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Speak with our admissions team to learn how our boutique approach can support your
            recovery or the recovery of someone you love.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link to="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
