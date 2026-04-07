import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Recovery Roadmap — An Investigative Series | Seven Arrows Recovery',
  description:
    'An in-depth investigative series exploring addiction, recovery, and the journey to lasting healing. From the clinical team at Seven Arrows Recovery.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

export default function BlogPage() {
  return (
    <>
      <PageHero
        label="Investigative Series"
        title="The Recovery Roadmap"
        description="An in-depth investigative series exploring the reality of addiction, treatment, and recovery — told with honesty, science, and compassion by the clinical team at Seven Arrows Recovery."
        image="/images/resident-reading-window.jpg"
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

          {/* Episode 2 — Coming Soon (Glowing) */}
          <div
            className="relative flex flex-col md:flex-row rounded-2xl overflow-hidden mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(160,82,45,0.06), rgba(160,82,45,0.02))',
            }}
          >
            {/* Glowing border */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none z-10"
              style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(135deg, #a0522d, #c67a4a, #a0522d)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                animation: 'glowPulse 2.5s ease-in-out infinite',
              }}
            />
            <div className="relative md:w-80 shrink-0 h-56 md:h-auto bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="inline-block text-primary text-sm font-bold uppercase tracking-widest mb-2 px-5 py-2 rounded-full border border-primary/30"
                  style={{
                    fontFamily: 'var(--font-body)',
                    animation: 'glowPulse 2.5s ease-in-out infinite',
                    boxShadow: '0 0 25px rgba(160,82,45,0.2)',
                  }}
                >
                  Coming Soon
                </div>
                <p className="text-foreground/40 text-sm mt-1" style={{ fontFamily: 'var(--font-body)' }}>Episode 2</p>
              </div>
            </div>
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-primary/70 text-xs font-semibold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Recovery Roadmap
                </span>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-foreground/70 mb-3">
                What Happens When You Walk Through the Door: Your First Week in Treatment
              </h3>
              <p
                className="text-foreground/60 leading-relaxed text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Your first week in treatment, demystified. A day-by-day investigative look at what really happens when you arrive — written for anyone who is afraid to make the call.
              </p>
            </div>
          </div>

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

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 15px rgba(160,82,45,0.1); }
          50% { opacity: 1; box-shadow: 0 0 30px rgba(160,82,45,0.25); }
        }
      `}</style>
    </>
  );
}
