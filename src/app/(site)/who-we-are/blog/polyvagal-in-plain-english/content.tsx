'use client';

import Link from 'next/link';
import PageHero from '@/components/PageHero';

// Episode 6 — Polyvagal in Plain English.
// Phase 1: scaffold (hero + intro + admissions CTA placeholder).
// Phases 2-9 fill in the body sections; Phase 10 polishes cross-links.

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 6 — The Recovery Roadmap"
        title="Polyvagal in Plain English: The Three States You Live In Every Day"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'Polyvagal in Plain English' },
        ]}
        description="Three states. One ladder. A vocabulary you can actually use in the middle of a craving — instead of the academic jargon polyvagal theory usually arrives in."
        image="https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=1600&q=80"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            If you&apos;ve been in any kind of trauma-informed therapy in
            the last decade, you&apos;ve probably heard the word
            &quot;polyvagal&quot; — usually attached to a chart, usually
            in a tone of voice that suggests you&apos;re supposed to nod
            knowingly. Most people don&apos;t. The theory is real and
            useful. The way it&apos;s typically explained is what makes
            it sound like academic vapor.
          </p>

          <p
            className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            This episode is the plain-English version we use with
            residents in their first week. It will not make you a
            polyvagal expert. It will, hopefully, give you three labels
            you can put on what your body is doing, in the moments when
            putting a label on it is the difference between making a
            choice and being run by one.
          </p>

          {/* ── Future phases land here, between the intro and the CTA ── */}

          <div className="mt-16 lg:mt-20 rounded-2xl bg-warm-bg p-8 lg:p-10 text-center">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Continue the Series
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              The rest of the Recovery Roadmap
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/who-we-are/recovery-roadmap" className="btn-primary">
                See all episodes
              </Link>
              <a href="tel:8669964308" className="btn-outline">
                Talk to admissions · (866) 996-4308
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
