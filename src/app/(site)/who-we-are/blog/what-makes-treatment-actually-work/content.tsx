'use client';

import Link from 'next/link';
import PageHero from '@/components/PageHero';

/* ── Episode 4 — The Recovery Roadmap ──────────────────────────────
 *
 * "Modalities Support the Process. Relationship Drives the Outcome."
 *
 * This file is built phase-by-phase; Phase 1 establishes the route,
 * hero, and the opening narrative. Subsequent phases drop in:
 *   • Phase 2 — Alliance vs Modality animated bar chart
 *   • Phase 3 — Modality-vs-relationship comparison toggle
 *   • Phase 4 — Intake / group / 1:1 cadence visualizer
 *   • Phase 5 — Tour-day signal checklist
 *   • Phase 6 — Tour-day signal detector quiz
 *   • Phase 7 — Pull-quotes and citation block
 *   • Phase 8 — Clinician training / regulation infographic
 *   • Phase 9 — Relationship-strength scroll gauge
 *   • Phase 10 — FAQ accordion
 *   • Phase 11 — JSON-LD structured data
 *   • Phase 12 — Internal cross-links
 *   • Phase 13–20 — Polish, a11y, deploy
 * ───────────────────────────────────────────────────────────────── */

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 4 — The Recovery Roadmap"
        title={[
          { text: 'What Actually ' },
          { text: 'Makes Treatment Work', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'What Actually Makes Treatment Work' },
        ]}
        description="Decades of research point to one finding more consistent than any other: the therapeutic relationship predicts recovery outcomes more powerfully than the modality mix. Here is why programs that lead with their modality list have it backwards — and how to spot a real alliance on a tour."
        image="/images/individual-therapy-session.jpg"
        width="narrow"
        meta={[
          { icon: 'author', label: 'By', value: 'The Clinical Team' },
          { icon: 'published', label: 'Published', value: 'April 25, 2026' },
          { icon: 'reading', label: 'Read', value: '14 min' },
        ]}
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link
            href="/who-we-are/blog/what-actually-happens-in-equine-therapy"
            className="text-primary text-sm font-semibold hover:underline mb-8 inline-block"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            &larr; Episode 3: What Actually Happens in Equine Therapy
          </Link>

          <div style={{ fontFamily: 'var(--font-body)' }}>

            {/* Opening */}
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              Comparing rehabs is, for most families, a spreadsheet exercise. CBT. DBT. EMDR. Somatic experiencing. Equine. Brainspotting. Twelve-step. SMART. Maybe a yoga column. You count the modalities, weight them by what you have read about online, and try to pick the program with the longest list.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              We understand the impulse. When you are scared, a list feels like control. But it is the wrong unit of measurement, and we say that as the program with the list.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              The single most-replicated finding in psychotherapy outcome research is not that one modality is best. It is that the quality of the relationship between the client and the clinician — what researchers call the <em>therapeutic alliance</em> — predicts whether someone gets better, regardless of the modality on the door. In a field that loves to argue about acronyms, this is one of the few things almost everyone agrees on.
            </p>

            {/* Pull-quote */}
            <blockquote className="border-l-4 border-primary pl-6 py-4 my-10 bg-warm-bg/50 rounded-r-xl">
              <p className="text-foreground/85 text-xl italic leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                Modalities support the process.
              </p>
              <p className="text-foreground text-xl leading-snug mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                Relationship drives the outcome.
              </p>
              <cite className="text-primary text-sm font-semibold mt-3 block not-italic" style={{ fontFamily: 'var(--font-body)' }}>
                — The thesis of our clinical model
              </cite>
            </blockquote>

            {/* Section: What the research actually says */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              What the Research Actually Says
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Across more than a thousand studies and several meta-analyses spanning fifty years of psychotherapy research, the same pattern keeps emerging. Different therapy modalities — when delivered competently — tend to produce roughly equivalent outcomes. The variable that consistently moves the needle is something subtler: the strength of the working alliance between the person seeking help and the person providing it.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Bruce Wampold&apos;s contextual model, John Norcross&apos;s task force on evidence-based therapy relationships, and the body of work loosely called the <em>common factors</em> tradition all point at the same thing from different angles: the modality is the vehicle. The relationship is the road.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              In a moment, we will show you what the effect sizes look like side by side. They are not subtle.
            </p>

            {/* PHASE 2 — Alliance vs Modality animated bar chart goes here */}
            <PlaceholderSlot phase={2} label="Alliance vs Modality — animated effect-size chart" />

            {/* Section: Why programs lead with modality */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              Why Programs Lead With Their Modality Mix Anyway
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              If the relationship is what works, why does every brochure read like a Scrabble bag of acronyms?
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Because modalities are <em>legible</em>. They fit on a comparison chart. They reassure the part of you that wants to be sure you are buying the best version of the thing. Relationship quality, by contrast, is harder to advertise — and harder to fake on a website.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              So the industry optimizes for what families count, not for what the research says actually heals. Lists get longer. Programs collect certifications. And the question that matters most — <em>will the people in this room be able to be present with me?</em> — gets buried under a feature comparison.
            </p>

            {/* PHASE 3 — Spreadsheet vs alliance toggle goes here */}
            <PlaceholderSlot phase={3} label="Spreadsheet vs Alliance — interactive comparison" />

            {/* Section: What authentic connection actually looks like */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              What Authentic Connection Actually Looks Like
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We talk a lot about &ldquo;authentic connection, humility, and consistency&rdquo; — and we know how easy it is for those words to land as marketing. So here is what we mean, in concrete operational terms, in the cadence of an actual week of treatment.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              The week below is not a sales pitch. It is the rhythm our clinicians design around precisely because the relational work is what we believe is doing the heaviest lifting.
            </p>

            {/* PHASE 4 — Intake / group / 1:1 cadence visualizer */}
            <PlaceholderSlot phase={4} label="Cadence of a week — intake, group, individual" />

            {/* Section: How to tell on a tour */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              How to Tell, on a Tour, Whether the Alliance Is Real
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              You are about to walk into a building where every staff member has been trained, at least a little, on how to talk to a family on a tour. That is fine — they should be. But it does mean you need a sharper set of questions than the ones the brochure is preparing them for.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              The next two sections give you exactly that: a checklist of signals that distinguish advertised connection from real connection, and a short interactive that helps you size up a program in real time, on the floor, while you are there.
            </p>

            {/* PHASE 5 — Tour signal checklist */}
            <PlaceholderSlot phase={5} label="Tour-day signal checklist" />

            {/* PHASE 6 — Tour-day signal detector quiz */}
            <PlaceholderSlot phase={6} label="Tour-day signal detector — interactive" />

            {/* PHASE 7 — Pull-quotes & research callouts go here */}
            <PlaceholderSlot phase={7} label="Pull-quotes and research callouts" />

            {/* PHASE 8 — Clinician training / regulation infographic */}
            <PlaceholderSlot phase={8} label="What &ldquo;regulated, present clinician&rdquo; actually means" />

            {/* PHASE 9 — Relationship-strength scroll gauge */}
            <PlaceholderSlot phase={9} label="Relationship-strength gauge" />

            {/* Closing — to be polished in Phase 13 */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              The Bottom Line
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Pick the modality mix that matches your situation, sure. Trauma-focused programs for trauma. Dual-diagnosis programs for dual diagnosis. But once you are inside the short list of clinically appropriate options, the question that should decide it is not <em>which one has the longest list of acronyms</em>.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              It is, <em>where will the human in the chair across from me be most able to be present?</em> Because that — far more than the modality on the door — is the variable that your outcomes are riding on.
            </p>

            {/* PHASE 10 — FAQ accordion */}
            <PlaceholderSlot phase={10} label="FAQ accordion (long-tail SEO)" />

            {/* PHASE 13 — Closing CTA + series navigation */}
            <PlaceholderSlot phase={13} label="Closing CTA + series navigation" />

            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50">
                <strong className="text-foreground/70">This is Episode 4 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
              </p>
            </div>

          </div>
        </div>
      </article>
    </>
  );
}

/* ── Phase placeholder ─────────────────────────────────────────────
 * Small scaffolding component used during phased build. Each later
 * phase replaces one of these slots with a finished interactive
 * component. The placeholder is intentionally subtle so an early
 * deploy reads as a draft rather than a broken page.
 * ─────────────────────────────────────────────────────────────── */
function PlaceholderSlot({ phase, label }: { phase: number; label: string }) {
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div
      className="my-10 rounded-xl border border-dashed border-primary/30 bg-warm-bg/40 px-5 py-4 text-xs text-foreground/50"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-hidden="true"
    >
      <span className="font-semibold tracking-[0.18em] uppercase text-primary/70 mr-2">
        Phase {phase}
      </span>
      {label}
    </div>
  );
}
