import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Recovery Roadmap | Seven Arrows Recovery',
  description:
    'An in-depth investigative series exploring addiction, recovery, and the journey to lasting healing. From the clinical team at Seven Arrows Recovery.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';
import { EPISODES_BY_NUMBER, episodeHref } from '@/lib/episodes';

export default function RecoveryRoadmapPage() {
  return (
    <>
      <PageHero
        label="Investigative Series"
        title={[
          { text: 'The Recovery ' },
          { text: 'Roadmap', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap' },
        ]}
        description="An in-depth investigative series exploring the reality of addiction, treatment, and recovery — told with honesty, science, and compassion by the clinical team at Seven Arrows Recovery."
        image="/images/resident-reading-window.jpg"
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Series Grid — sourced from src/lib/episodes.ts so a new
          entry there auto-appears here in chronological order. */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {EPISODES_BY_NUMBER.map((ep) => (
            <Link
              key={ep.slug}
              href={episodeHref(ep.slug)}
              className="flex flex-col md:flex-row bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group no-underline mb-8"
            >
              <div className="relative md:w-80 shrink-0">
                <img
                  src={ep.image}
                  alt={ep.imageAlt}
                  className="h-56 md:h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute top-4 left-4 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Episode {ep.number}
                </div>
              </div>
              <div className="p-6 lg:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-primary text-xs font-semibold uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Recovery Roadmap
                  </span>
                  <span className="text-foreground/40 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    {ep.publishedDisplay}
                  </span>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {ep.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed text-sm mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {ep.blurb}
                </p>
                <span
                  className="inline-block text-primary font-semibold text-sm tracking-wide uppercase"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Read Episode {ep.number} &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Have Questions About Recovery?
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is here to provide answers, guidance, and support. Reach out
            today to start a confidential conversation about treatment options.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
