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

          {/* ── Phase 3: Ventral vagal — connected, curious, grounded ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-emerald-700 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              State One · Top of the Ladder
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Ventral vagal — the curious, connected, grounded you
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Ventral is the state your nervous system is built to spend
              most of its time in. It is the felt sense of being safe
              enough to be curious, connected enough to be honest, and
              grounded enough to make a slightly inconvenient decision
              without dissolving. Almost nothing about modern life is
              designed to keep you here. Spending more of your day here
              is most of what recovery is actually trying to accomplish.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              When people describe their best version of themselves, they
              are almost always describing a ventral version: the parent
              who can listen without interrupting, the friend who can
              sit through someone else&apos;s hard story, the worker who
              can take a piece of feedback and actually use it instead
              of bracing against it. None of those capacities are
              character. They are physiology — specifically, the
              physiology of a vagal system that&apos;s online and
              broadcasting safety.
            </p>

            <div className="mt-10 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 p-6 lg:p-8">
              <div className="flex items-baseline gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden />
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  How ventral feels and looks
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/70 mb-2">
                    From the inside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'Breath is slow and full, sitting low in the belly without anyone telling it to.',
                      'Time feels normal — not slow, not racing. You are in it.',
                      'You can hold two things at once: a hard topic and a gentle attitude toward it.',
                      'Curiosity comes easily. Questions feel interesting, not threatening.',
                      'You feel like yourself. The phrase doesn’t feel corny when you say it.',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-emerald-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/70 mb-2">
                    From the outside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'Your face has small, real movements — not frozen, not performing.',
                      'Your voice has prosody: it goes up and down naturally inside sentences.',
                      'You make and hold eye contact in rhythm — not avoiding, not staring.',
                      'You laugh in a way that lands in your body, not just in the room.',
                      'People sit closer to you and stay longer. That is not magic. That is co-regulation.',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-emerald-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              For people coming out of long stretches of dysregulation,
              ventral often feels suspicious at first. Quiet. A little
              boring. The body has been running on cortisol and
              constriction for so long that the absence of urgency
              registers as something being wrong. It isn&apos;t. That
              flatness is the floor of the new state. Stay with it long
              enough and the room comes back into colour.
            </p>
          </section>

          {/* ── Phase 4: Sympathetic — urgent, jaw-clenched, fight or flight ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-amber-700 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              State Two · Halfway Down the Ladder
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Sympathetic — the urgent, jaw-clenched, fight-or-flight you
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Sympathetic is the state most people in modern life
              accidentally live in for half their waking hours and call
              normal. Heart rate up. Cortisol up. Muscles slightly
              braced. Mind moving fast and skipping detail. It is the
              physiology your body uses when something is genuinely
              dangerous — and it is the physiology your body keeps using
              long after the danger is gone, because nobody taught it
              how to put the engine back in neutral.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The trick of sympathetic is that it can disguise itself as
              productivity, ambition, or being a high-functioning person
              with a lot on their plate. From the inside it can feel
              like you&apos;re &quot;getting things done.&quot; From the
              outside, the people who live with you can usually tell
              when you&apos;ve been in it for a while: you&apos;re
              shorter, faster, and a little sharper than the version of
              you they prefer.
            </p>

            <div className="mt-10 rounded-2xl bg-amber-50/40 border border-amber-200/60 p-6 lg:p-8">
              <div className="flex items-baseline gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden />
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  How sympathetic feels and looks
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80 mb-2">
                    From the inside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'Breath is shallow, riding high in the chest. You catch yourself holding it.',
                      "Time feels too fast — you're behind before the day starts.",
                      'Jaw, shoulders, or hands are quietly clenched without you choosing it.',
                      'Thoughts loop. The same problem keeps re-presenting in slightly different words.',
                      'Anything someone says lands as a thing you have to respond to, not consider.',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-amber-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80 mb-2">
                    From the outside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'You speak slightly faster and slightly louder than the room.',
                      'You interrupt — sometimes apologetically, but you interrupt.',
                      "You're moving even when you don't need to. Pacing, scrolling, opening tabs you won't read.",
                      'Your eye contact is harder, more locked, less rhythmic.',
                      'You make decisions that feel decisive in the moment and slightly regrettable later.',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-amber-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Sympathetic is not the enemy. The same activation that
              makes you snap at a partner is also what gets you out of
              a fire, finishes the deadline, defends a child. The
              problem is when it becomes home — when your nervous
              system doesn&apos;t know how to set the energy down and
              return to ventral, so it just stays braced and calls
              that life.
            </p>
          </section>

          {/* ── Phase 5: Dorsal vagal — numb, foggy, checked out ────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-sky-700 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              State Three · Bottom of the Ladder
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Dorsal vagal — the numb, foggy, checked-out you
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Dorsal is what the nervous system does when sympathetic
              hasn&apos;t worked and the threat is still there: it
              flips the breaker. Energy down. Heart rate down. Color
              drains out of the day. People who&apos;ve only learned
              about &quot;fight or flight&quot; tend to miss this state
              entirely — but for many people in long-term addiction or
              trauma history, dorsal is actually the home address.
              Sympathetic is the visit. Dorsal is where they wake up.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Because dorsal is quiet, the people around you often miss
              it too. They read the slowness as moodiness, the
              disengagement as laziness, the late-afternoon couch as a
              lifestyle choice. It is none of those. It is your body
              choosing the off-switch because the dial doesn&apos;t feel
              like it has anywhere safer to go.
            </p>

            <div className="mt-10 rounded-2xl bg-sky-50/40 border border-sky-200/60 p-6 lg:p-8">
              <div className="flex items-baseline gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" aria-hidden />
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  How dorsal feels and looks
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700/80 mb-2">
                    From the inside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'Breath is small. So shallow you stop noticing it altogether.',
                      "Time feels slow and slightly thick — hours can pass without registering.",
                      'You feel heavy. Not tired exactly; weighted, like the air is denser around you.',
                      "Things you usually care about feel distant — not painful, just dull.",
                      "You watch yourself live the day from a half-step behind your own eyes.",
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-sky-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700/80 mb-2">
                    From the outside
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {[
                      'Your face is flat — slack rather than serene.',
                      "Your voice is low and monotone, sentences trailing off rather than landing.",
                      "Eye contact is drifty. You're looking at people without quite seeing them.",
                      "You don't move much. The body has gone quiet on purpose.",
                      "You text 'I'm fine' and mean it the way a wall means it.",
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-sky-600 shrink-0">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Dorsal is also not the enemy. It&apos;s an old, deep
              survival strategy — the freeze of a possum in a road, the
              shutdown of a child in a household that wasn&apos;t safe.
              It saved a lot of people. The trouble is when it stops
              being a temporary visit and starts being the only state
              the body remembers how to come down to. The work then
              isn&apos;t to fight your way out of dorsal. It&apos;s to
              learn the small, specific cues that walk you back up the
              ladder, one rung at a time. Which is exactly what the
              next section is about.
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
