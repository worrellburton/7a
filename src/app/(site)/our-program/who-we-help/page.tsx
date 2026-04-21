import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Who We Help | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery helps adults 18 and older, men and women from all backgrounds, seeking recovery from alcohol, opioids, stimulants, and other substance addictions.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

const audiences = [
  {
    title: 'Adults 18 and Older',
    description:
      'Our program is designed for adults of all ages who are ready to make a change. Whether you are in your twenties and facing addiction early in life, or you have been struggling for decades, Seven Arrows Recovery provides a safe and supportive environment tailored to your stage of life and recovery needs.',
  },
  {
    title: 'Men and Women',
    description:
      'We welcome both men and women into our program. Our clinical team understands that addiction affects men and women differently, and we tailor our therapeutic approach to address the unique biological, psychological, and social factors that each individual brings to treatment.',
  },
  {
    title: 'All Backgrounds',
    description:
      'Addiction does not discriminate, and neither do we. Seven Arrows Recovery serves individuals from every walk of life, culture, and background. Our inclusive environment honors diversity and ensures that every client feels seen, respected, and valued throughout their recovery journey.',
  },
  {
    title: 'Alcohol Addiction',
    description:
      'Alcohol use disorder is one of the most common and devastating forms of addiction. Our program addresses the physical, psychological, and social dimensions of alcohol dependency, providing medically supervised detox when needed and a comprehensive treatment plan for lasting sobriety.',
  },
  {
    title: 'Opioid and Heroin Addiction',
    description:
      'The opioid crisis has affected millions of families. Whether the addiction involves prescription painkillers, heroin, or synthetic opioids like fentanyl, our clinical team has the expertise and compassion to guide clients through withdrawal and into a meaningful recovery.',
  },
  {
    title: 'Stimulant and Other Substance Addictions',
    description:
      'From methamphetamine and cocaine to benzodiazepines and polydrug use, we treat a wide range of substance use disorders. Our individualized treatment plans ensure that the specific challenges of each substance are addressed with the appropriate clinical strategies.',
  },
];

export default function WhoWeHelpPage() {
  return (
    <main>
      <PageHero
        label="Who We Help"
        title="Recovery for Every Story"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Who We Help' },
        ]}
        description="At Seven Arrows Recovery, we serve adults from all backgrounds who are ready to break free from addiction. Our intimate, personalized program meets you wherever you are in your journey."
        image="/images/individual-therapy-session.jpg"
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              You Are Not Alone
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Addiction can make anyone feel isolated, but the truth is that
              millions of people share this struggle. At Seven Arrows Recovery,
              we have helped individuals from every background and every stage
              of addiction find their way back to a life of purpose and
              connection.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our boutique setting and small client census mean that no one
              gets lost in the crowd. Every person who walks through our doors
              receives a treatment plan built specifically for them, addressing
              their unique history, needs, and goals.
            </p>
          </div>

          {/* Audience Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {audiences.map((item) => (
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
            Your Recovery Starts Here
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No matter your background or the substance you are struggling
            with, our admissions team is here to help. Call us today to learn
            how Seven Arrows Recovery can support your journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
