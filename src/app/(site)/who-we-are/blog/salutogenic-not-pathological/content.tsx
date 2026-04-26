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

          {/* ── Phase 2: The DSM mindset ────────────────────────────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Dominant Frame
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              The DSM mindset: you are what&apos;s wrong with you
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Diagnostic and Statistical Manual is, in its own
              vocabulary, a &quot;classification of mental disorders.&quot;
              That&apos;s honest about what it is. The trouble is what
              happens when an entire field of treatment quietly inherits the
              manual&apos;s frame and starts to talk about people the way
              the manual talks about pathology — as collections of
              symptoms, criteria thresholds, and code numbers to be
              suppressed.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              When a person walks into an intake under the pathology frame,
              the implicit conversation is roughly: &quot;Tell me your
              symptoms, I&apos;ll tell you which disorder you have, we&apos;ll
              choose interventions designed to reduce those symptoms, and
              we&apos;ll measure progress by how much the symptoms have
              dropped.&quot; It is a tidy loop. It is also a frame in
              which the person is, conceptually, equal to their
              dysfunction. Every assessment confirms it. Every
              intervention answers to it. The healthy parts of the person
              don&apos;t show up on the chart because the chart isn&apos;t
              shaped to see them.
            </p>

            <div className="mt-10 rounded-2xl bg-rose-50/40 border border-rose-200/60 p-6 lg:p-8">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                What the pathology frame quietly teaches
              </p>
              <ul className="space-y-3 text-sm lg:text-base text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {[
                  'Your identity is your worst symptom. "I am an addict" gets repeated until it stops being a statement and starts being a self-concept.',
                  'Recovery is the absence of a problem, not the presence of a life. Success is measured in negatives — days clean, fewer episodes, lower scores — rather than in capacity gained.',
                  'Vigilance is the strategy. You stay well by watching constantly for the disease to come back. Hyper-monitoring becomes the price of stability.',
                  'Authority lives outside you. The clinician, the counsellor, the program holds the map of your wellness. You are the patient inside their framework, not the leader of your own recovery.',
                  'The story ends when symptoms are quiet. Once acute distress drops, the system loses interest, and the harder work of building a life capable of holding wellness gets quietly outsourced to "aftercare."',
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span className="text-rose-600 shrink-0">●</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              None of this is anyone&apos;s fault, exactly. The DSM frame
              dominates because it&apos;s how insurance reimburses, how
              outcomes get reported, how programs justify themselves to
              regulators. But it produces a particular kind of recovery —
              fragile, vigilant, externally referenced — and the relapse
              statistics it generates have not improved much in three
              decades. That stagnation is the clue. The frame is missing
              something.
            </p>
          </section>

          {/* ── Phase 3: The salutogenic mindset ────────────────────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Older Frame
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              The salutogenic mindset: you are what&apos;s underneath, still intact
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Salutogenesis is a word the medical sociologist Aaron Antonovsky
              coined in the late 1970s, and it has aged better than most of
              the addiction theory that surrounds it. The pathological
              question is &quot;What makes people sick?&quot; The salutogenic
              question is the inverse — &quot;What keeps people well, and
              how do we build more of it?&quot; The two frames seem like
              flip sides of the same coin. They aren&apos;t. They produce
              entirely different programs.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Underneath the symptoms a person walks in with — the using,
              the avoidance, the dysregulation, the survival behaviors that
              have been coded as a disorder — there is, almost always, a
              part of the person that is still intact. Curious. Capable.
              Already tired of the way things are. The salutogenic frame
              treats that intact part as the actual client. The symptoms
              are real, and they get attended to. But they are not the
              center of the work. The center of the work is making the
              conditions under which the intact part can take the wheel.
            </p>

            <div className="mt-10 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 p-6 lg:p-8">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                What the salutogenic frame quietly teaches
              </p>
              <ul className="space-y-3 text-sm lg:text-base text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {[
                  'Your identity is what is underneath the symptom — the steady part that has watched all of this happen and never lost the plot. The symptom is something you have, not something you are.',
                  'Recovery is the presence of a life you would not trade. Success is measured in capacity gained: trust, agency, relationships, work that means something, the ability to sit inside discomfort without dissolving.',
                  'Coherence is the strategy, not vigilance. Antonovsky called the lever a "sense of coherence" — the felt sense that your life is comprehensible, manageable, and meaningful. Build that, and the wellness lasts on its own.',
                  'Authority is repatriated. The clinician is a guide and a holder; the map of your wellness lives in you and is reclaimed in stages over the course of treatment.',
                  'The story keeps going long after symptoms quiet. The hard, productive years are the ones after acute distress drops — when self-leadership either gets practiced into permanence or quietly atrophies. The program is responsible for that bridge.',
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span className="text-emerald-600 shrink-0">●</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The work in our program is salutogenic in this specific sense:
              we do not skip the diagnosis, we do not pretend symptoms
              don&apos;t need clinical attention, and we do not romanticise
              suffering as something noble to leave alone. We treat what
              needs treating. We just don&apos;t organise the program around
              the diagnosis. We organise it around the part of you that
              isn&apos;t the diagnosis, and we spend the bulk of treatment
              giving that part repetitions in the open.
            </p>
          </section>

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
