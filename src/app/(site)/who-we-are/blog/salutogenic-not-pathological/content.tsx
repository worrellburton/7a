'use client';

import Link from 'next/link';
import PageHero from '@/components/PageHero';

// Episode 5 — Salutogenic, Not Pathological.
// Phase 1: scaffold (hero + intro + admissions CTA placeholder).
// Phases 2-9 fill in the body sections; Phase 10 polishes SEO.

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 5 — The Recovery Roadmap"
        title="Salutogenic, Not Pathological: Rebuilding What's Right Instead of Chasing What's Wrong"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'Salutogenic, Not Pathological' },
        ]}
        description="The dominant frame in addiction treatment is pathology — what's wrong, what's broken, what to suppress. There's a quieter, older frame that pulls in the opposite direction: salutogenesis. It asks what's underneath the symptom that is still intact, and how to build the conditions for that part to take the wheel."
        image="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Most rehab marketing leads with the diagnosis. The DSM code, the
            dual-disorder label, the trauma category — as if the path forward
            is to know precisely what is wrong with you and then assemble a
            treatment plan to defeat it. We don&apos;t think that frame is
            wrong, exactly. We think it&apos;s incomplete in a way that
            quietly limits what recovery is allowed to mean.
          </p>

          <p
            className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            This episode is about the other frame — the one our day-to-day
            program actually runs on, even when the intake paperwork uses
            the standard pathology vocabulary. It&apos;s called
            salutogenesis, and once you see it, the difference between
            programs that hold for five years and programs that don&apos;t
            starts to look less mysterious.
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
