'use client';

import Link from 'next/link';
import PageHero from '@/components/PageHero';

// Episode 4 — The Miracle Intervention Is Your Therapist's Nervous System.
//
// Phased build (this is Phase 1 — scaffolding):
//   Phase 1  ✓  Page exists, hero, intro, manifest entry surfacing on landing
//   Phase 2  ·  Co-regulation explained (your system reads theirs in milliseconds)
//   Phase 3  ·  Why our clinicians practice breathwork between sessions
//   Phase 4  ·  What "regulated presence" feels like in a session
//   Phase 5  ·  Regulated presence vs performing calm (comparison)
//   Phase 6  ·  Warning signs in therapists who aren't doing their own work
//   Phase 7  ·  Audience callout — for anyone who's felt worse after therapy
//   Phase 8  ·  Clinical authority block
//   Phase 9  ·  Internal links + admissions CTA
//   Phase 10 ·  SEO meta + JSON-LD + final proofread
//
// Each later phase adds a section between the intro and the CTA below.

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 4 — The Recovery Roadmap"
        title="The Miracle Intervention Is Your Therapist's Nervous System"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Your Therapist's Nervous System" },
        ]}
        description="When a clinician is grounded in their own body, their nervous system becomes the actual intervention. Co-regulation, regulated presence, and why therapy with a dysregulated therapist can leave you feeling worse than before you walked in."
        image="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1600&q=80"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You can have the right modality, the right diagnosis, the right
            evidence-based protocol — and still leave a therapy session more
            wound up than when you arrived. Most clients can&apos;t name why.
            They blame themselves, the room, the time of day. The honest
            answer is usually simpler and more uncomfortable: their
            therapist&apos;s nervous system was running the session, not their
            therapist&apos;s training.
          </p>

          <p
            className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            This episode is about the part of treatment we almost never talk
            about out loud — the part that decides whether the room feels safe
            enough for any of the techniques to actually work.
          </p>

          {/* ── Future phases land between this intro and the CTA below ── */}

          {/* CTA — kept here in Phase 1 so the page never feels stub-y. */}
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
            <p
              className="text-foreground/65 leading-relaxed max-w-2xl mx-auto mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Honest reporting from the inside of a clinical team — the
              science of addiction, what your first week of treatment really
              looks like, and what makes the difference between a program
              that holds and one that doesn&apos;t.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/who-we-are/recovery-roadmap"
                className="btn-primary"
              >
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
