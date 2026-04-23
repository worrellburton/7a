import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Recovery Roadmap — An Investigative Series | Seven Arrows Recovery',
  description:
    'An in-depth investigative series exploring addiction, recovery, and the journey to lasting healing. From the clinical team at Seven Arrows Recovery.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

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

      {/* Series Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Episode 1 — Published */}
          <Link
            href="/who-we-are/blog/when-drinking-stops-working"
            className="flex flex-col md:flex-row bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group no-underline mb-8"
          >
            <div className="relative md:w-80 shrink-0">
              <img src="/images/resident-reading-window.jpg" alt="When Drinking Stops Working" className="h-56 md:h-full w-full object-cover" loading="lazy" />
              <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md" style={{ fontFamily: 'var(--font-body)' }}>
                Episode 1
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
                  March 24, 2026
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                When Drinking Stops Working: Recognizing the Signs of Addiction
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-sm mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                A compassionate guide to understanding when substance use has crossed from choice to compulsion — the first step on the Recovery Roadmap. Featuring interactive self-assessment tools, the neuroscience of addiction, and expert insight from the Seven Arrows clinical team.
              </p>
              <span
                className="inline-block text-primary font-semibold text-sm tracking-wide uppercase"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Read Episode 1 &rarr;
              </span>
            </div>
          </Link>

          {/* Episode 2 — Published */}
          <Link
            href="/who-we-are/blog/what-happens-first-week"
            className="flex flex-col md:flex-row bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group no-underline mb-8"
          >
            <div className="relative md:w-80 shrink-0">
              <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80" alt="What Happens When You Walk Through the Door" className="h-56 md:h-full w-full object-cover" loading="lazy" />
              <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md" style={{ fontFamily: 'var(--font-body)' }}>
                Episode 2
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
                  March 24, 2026
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                What Happens When You Walk Through the Door: Your First Week in Treatment
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-sm mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Your first week in treatment, demystified. A day-by-day investigative look at what really happens when you arrive — written for anyone who is afraid to make the call.
              </p>
              <span
                className="inline-block text-primary font-semibold text-sm tracking-wide uppercase"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Read Episode 2 &rarr;
              </span>
            </div>
          </Link>

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
