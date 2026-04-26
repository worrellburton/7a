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

          {/* ── Phase 2: The promise — vocabulary you can use mid-craving ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Why This Matters
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Naming the state changes what you can do about it
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every craving, every flare of anger, every quiet collapse
              into the couch is happening inside one of three nervous-
              system states. They are not moods. They are not personality
              flaws. They are physiological configurations your body shifts
              between many times an hour, mostly without telling you. The
              shift drives the urge. The urge then convinces you it&apos;s a
              decision.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The single most useful thing polyvagal theory gives you is a
              short vocabulary for those configurations. Once you can name
              them — even badly, even just to yourself — you&apos;ve
              inserted a half-second of awareness between the body&apos;s
              shift and the behavior that usually follows. That half-second
              is where most of recovery actually happens.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'Ventral',
                  hint: 'Curious. Connected. Grounded.',
                  tone: 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900',
                  dot: 'bg-emerald-500',
                },
                {
                  label: 'Sympathetic',
                  hint: 'Urgent. Jaw-clenched. Fight-or-flight.',
                  tone: 'bg-amber-50/60 border-amber-200/70 text-amber-900',
                  dot: 'bg-amber-500',
                },
                {
                  label: 'Dorsal',
                  hint: 'Numb. Foggy. Checked out.',
                  tone: 'bg-sky-50/60 border-sky-200/70 text-sky-900',
                  dot: 'bg-sky-500',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border p-5 ${s.tone}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} aria-hidden />
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.22em]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {s.label}
                    </p>
                  </div>
                  <p
                    className="text-sm leading-relaxed font-semibold"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.hint}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              That&apos;s the whole map. Three states. The next three
              sections walk through each one in detail — what it feels
              like from the inside, what it looks like from the outside,
              and the small tell-tales that mean you&apos;re in it.
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
