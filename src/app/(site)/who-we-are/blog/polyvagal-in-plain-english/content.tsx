'use client';

import Link from 'next/link';
import PageHero from '@/components/PageHero';
import { EPISODES_BY_NUMBER, episodeHref } from '@/lib/episodes';

const CURRENT_SLUG = 'polyvagal-in-plain-english';

// Episode 6 — Polyvagal in Plain English.
//
// Section order (top → bottom):
//   1. Hero + intro
//   2. Why This Matters — naming the state changes what you can do
//   3. Ventral — the curious, connected, grounded you
//   4. Sympathetic — the urgent, jaw-clenched, fight-or-flight you
//   5. Dorsal — the numb, foggy, checked-out you
//   6. The Ladder — walking up and down it
//   7. Why White-Knuckle It Fails — addiction's different shape per state
//   8. The Practical Takeaway — two questions to ask mid-craving
//   9. If This Sounds Like You — for "I've never understood dysregulated"
//   10. Continue the Series + admissions CTA

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

          {/* ── Phase 6: The ladder — walking up and down between states ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Ladder
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              You don&apos;t jump states. You walk them, one rung at a time.
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The most useful image for what these three states are doing
              is a ladder. Ventral is at the top. Sympathetic is in the
              middle. Dorsal is at the bottom. Your nervous system moves
              up and down it all day. The crucial detail — the one most
              clients are surprised by — is that you generally cannot
              skip rungs. To get from dorsal back up to ventral, you have
              to come up through sympathetic. There is no helicopter.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              That detail explains a lot of recoveries that look like
              backsliding from the outside. Someone who has been numb in
              dorsal for months will, on the way up, pass through irritability,
              tears, restlessness, even rage. Those are not relapses. They are
              rungs. The body is finding its way back to ventral through the
              middle floor of the ladder, exactly as it&apos;s built to.
            </p>

            <div className="mt-10 rounded-2xl bg-white border border-black/10 shadow-sm p-6 lg:p-8">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                The polyvagal ladder, top to bottom
              </p>

              <div className="relative">
                {/* The vertical rail */}
                <div
                  className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 to-sky-400"
                  aria-hidden
                />

                <ol className="space-y-5 relative">
                  {[
                    {
                      label: 'VENTRAL',
                      sub: 'Connected · curious · grounded',
                      gloss: "You're available. The room feels open. You can choose, not just react.",
                      ring: 'ring-emerald-300 bg-emerald-500',
                      tone: 'text-emerald-700',
                    },
                    {
                      label: 'SYMPATHETIC',
                      sub: 'Urgent · braced · fight-or-flight',
                      gloss: "Energy is up but the threat doesn't have a clear edge. Move, push, fix, escape.",
                      ring: 'ring-amber-300 bg-amber-500',
                      tone: 'text-amber-700',
                    },
                    {
                      label: 'DORSAL',
                      sub: 'Numb · foggy · checked out',
                      gloss: 'The breaker has flipped. Energy down, edges soft, life happening one room over.',
                      ring: 'ring-sky-300 bg-sky-500',
                      tone: 'text-sky-700',
                    },
                  ].map((s) => (
                    <li key={s.label} className="flex gap-4 relative">
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full ring-4 ring-offset-2 ring-offset-white ${s.ring}`}
                        aria-hidden
                      />
                      <div>
                        <p
                          className={`text-[11px] font-bold uppercase tracking-[0.22em] ${s.tone}`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {s.label} <span className="text-foreground/35 ml-1.5 tracking-normal normal-case font-normal">— {s.sub}</span>
                        </p>
                        <p
                          className="mt-1 text-sm text-foreground/75 leading-relaxed"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {s.gloss}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Two practical implications. <span className="font-semibold">First:</span>{' '}
              when you find yourself in sympathetic and try to force
              your way to ventral by gritting your teeth, your nervous
              system reads the gritting itself as more sympathetic and
              digs in. The way up is to spend the energy on something
              that lets the body discharge — a walk, a run, a hard
              clean of the kitchen, a few sets of pushups — and only
              then try to settle.
              {' '}
              <span className="font-semibold">Second:</span> when
              you&apos;re stuck in dorsal, a friend trying to coach
              you straight into ventral (&quot;come on, snap out of
              it&quot;) is well-meaning and almost always wrong. What
              you need is a small dose of activating energy first —
              cold water on the face, a ten-minute walk, a phone call
              with someone whose voice has prosody — so the body has
              a sympathetic rung to step onto on its way up.
            </p>
          </section>

          {/* ── Phase 7: Addiction's different shape in each state ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Why &quot;White-Knuckle It&quot; Fails
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Addiction wears a different mask in each state
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The single biggest reason willpower-based recovery
              advice gives so many people the impression they&apos;ve
              failed is that it ignores the state the urge is coming
              out of. A craving in sympathetic is a different animal
              than a craving in dorsal. Treat them the same and you
              can be doing exactly the &quot;right&quot; thing for
              your physiology and still feel like you&apos;re losing.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Here&apos;s the same urge, the same person, in each
              state — and what actually helps in each one.
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  state: 'Ventral',
                  shade: 'border-emerald-200/60 bg-emerald-50/30',
                  pill: 'text-emerald-700 bg-emerald-100/70',
                  shape:
                    "An urge here is rare and feels almost like a memory — a thought passes through, you notice it, and it doesn&apos;t hijack the next 20 minutes. The body is regulated; there's no internal hole to fill.",
                  helps:
                    "Almost anything works because nothing is fighting you. Take a breath, name it, keep walking. This is the state most recovery advice was written by people who happened to be in.",
                },
                {
                  state: 'Sympathetic',
                  shade: 'border-amber-200/60 bg-amber-50/30',
                  pill: 'text-amber-700 bg-amber-100/70',
                  shape:
                    "An urge in sympathetic is hot. Fast. There&apos;s an edge of agitation underneath it — a sense that if you don&apos;t do something right now, the energy is going to come out somewhere worse. The substance is reaching for the volume knob, not the off switch.",
                  helps:
                    'Movement. Real movement. Walk hard, run, lift, scrub a counter, swing a hammer. The body needs to discharge the activation before it can hear any other instruction. Trying to talk yourself out of it while the engine is redlining is mostly noise.',
                },
                {
                  state: 'Dorsal',
                  shade: 'border-sky-200/60 bg-sky-50/30',
                  pill: 'text-sky-700 bg-sky-100/70',
                  shape:
                    "An urge in dorsal is quiet and matter-of-fact. It doesn&apos;t feel urgent; it feels inevitable. You&apos;re not even sure you want to use — you&apos;re just sure you&apos;re going to, in about an hour, and it would be easier to stop pretending. The substance here is reaching for any signal of life.",
                  helps:
                    'Connection first, not content. A phone call to a real human, cold water, a five-minute walk in actual daylight. You need a small dose of sympathetic energy before any reasoning will land — the body has to feel its way back up to the middle rung before it can hear an argument from ventral.',
                },
              ].map((row) => (
                <div
                  key={row.state}
                  className={`rounded-xl border p-5 lg:p-6 ${row.shade}`}
                >
                  <span
                    className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.22em] px-2 py-0.5 rounded ${row.pill}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {row.state}
                  </span>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55 mb-1">
                        How the craving shows up
                      </p>
                      <p
                        className="text-sm text-foreground/75 leading-relaxed"
                        style={{ fontFamily: 'var(--font-body)' }}
                        dangerouslySetInnerHTML={{ __html: row.shape }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55 mb-1">
                        What actually helps
                      </p>
                      <p
                        className="text-sm text-foreground/85 leading-relaxed"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {row.helps}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              &quot;Just white-knuckle it&quot; is, in polyvagal terms,
              an instruction that only really works for people already
              in the top half of the ladder. For someone in deep dorsal,
              white-knuckling means asking a body that&apos;s already
              turned its energy down to defeat a craving by force —
              with no force available. They aren&apos;t weak. They&apos;re
              two rungs lower than the advice was designed for.
              Recovery that lasts is mostly a matter of giving people
              the right intervention for the rung they&apos;re actually
              standing on.
            </p>
          </section>

          {/* ── Phase 8: Two questions to ask mid-craving ───────────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Practical Takeaway
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Two questions to ask in the middle of a craving
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              You don&apos;t need to remember any of the vocabulary in
              this article in the moment something hard is happening.
              You need two questions, simple enough that you can ask
              them while your hands are shaking or while you&apos;re
              staring at a wall in dorsal. Run them in order. They
              are designed to give you a usable answer in about ten
              seconds.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Question 1 */}
              <div className="rounded-2xl bg-foreground text-white p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(60,48,42,0.5)]">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80 mb-3"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Question 1
                </p>
                <p className="text-xl lg:text-2xl font-bold leading-snug mb-4">
                  Is my body up or down right now?
                </p>
                <p
                  className="text-sm text-white/75 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Don&apos;t overthink it. Notice the obvious. Heart
                  pounding, jaw tight, mind racing, can&apos;t sit
                  still — that&apos;s up. Heavy, slow, foggy, far
                  away, watching from behind your eyes — that&apos;s
                  down. If you genuinely can&apos;t tell, the answer
                  is almost always down. Up is rarely subtle.
                </p>
                <p
                  className="mt-5 text-[11px] uppercase tracking-wider text-white/50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  → If up: sympathetic. If down: dorsal.
                </p>
              </div>

              {/* Question 2 */}
              <div className="rounded-2xl bg-foreground text-white p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(60,48,42,0.5)]">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80 mb-3"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Question 2
                </p>
                <p className="text-xl lg:text-2xl font-bold leading-snug mb-4">
                  What does my body need to spend, or to find?
                </p>
                <p
                  className="text-sm text-white/75 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  If you&apos;re up, you need to <span className="text-white font-semibold">spend</span>{' '}
                  the energy that&apos;s already running — walk fast,
                  lift, scrub, shake, get the activation out before
                  you reason. If you&apos;re down, you need to{' '}
                  <span className="text-white font-semibold">find</span>{' '}
                  some — cold water on the face, a real human voice,
                  ten minutes outside in actual light. Then, and only
                  then, the next decision becomes a thing you can
                  actually make.
                </p>
                <p
                  className="mt-5 text-[11px] uppercase tracking-wider text-white/50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  → Match the action to the state, not the urge.
                </p>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              That&apos;s it. <span className="font-semibold">Up or down? Spend or find?</span>{' '}
              Two questions, ten seconds, and you have a working
              answer about what your physiology is actually asking
              for. Not a perfect one — your body will sometimes
              surprise you, and over months of practice the answers
              become more subtle. But for the situation you&apos;re
              in right now, with a craving in front of you and an
              article&apos;s worth of theory you don&apos;t feel
              like reciting, those two are enough.
            </p>
          </section>

          {/* ── Phase 9: Audience callout — "what does dysregulated even mean?" ── */}

          <section className="mt-16">
            <div className="rounded-2xl bg-foreground text-white p-8 lg:p-10 shadow-[0_20px_60px_-20px_rgba(60,48,42,0.5)]">
              <p
                className="text-xs font-semibold tracking-[0.22em] uppercase text-primary/80 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                If This Sounds Like You
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold mb-5">
                For the &quot;I&apos;ve never understood what &lsquo;dysregulated&rsquo; means&quot; reader
              </h2>

              <p
                className="text-white/85 leading-relaxed text-base lg:text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                The word &quot;dysregulated&quot; gets thrown around in
                therapy spaces as if everyone was issued a glossary on
                arrival. Most people weren&apos;t. They nod, leave the
                session, and quietly Google it later — and the
                definitions they find sound like they were written for
                a textbook nobody is going to read.
              </p>

              <p
                className="mt-5 text-white/85 leading-relaxed text-base lg:text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                If that&apos;s you — if you&apos;ve been told
                you&apos;re dysregulated, or that recovery requires
                regulating your nervous system, and the words have
                slid off you because nobody made them concrete — the
                short version is this. Dysregulated just means your
                body is stuck in sympathetic or dorsal too much of the
                time, and can&apos;t find its way back to ventral on
                its own. That&apos;s it. It is not a character flaw.
                It is not a diagnosis. It is a description of where
                on the ladder your nervous system has gotten too
                comfortable.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "You&apos;ve been called &quot;reactive&quot; or &quot;intense&quot; and never felt the labels fit, but couldn&apos;t name what did.",
                  "You&apos;ve been called &quot;avoidant&quot; or &quot;shut down&quot; and the labels stung but didn&apos;t help.",
                  "You&apos;ve read self-help books and absorbed the vocabulary intellectually without the body actually changing.",
                  "Your therapist uses words like &quot;ventral&quot; and you&apos;ve been smiling and nodding for six sessions.",
                ].map((s) => (
                  <div
                    key={s}
                    className="flex gap-3 items-start rounded-xl bg-white/5 border border-white/10 p-4"
                  >
                    <span className="text-primary text-lg leading-none mt-0.5">•</span>
                    <p
                      className="text-sm text-white/80 leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)' }}
                      dangerouslySetInnerHTML={{ __html: s }}
                    />
                  </div>
                ))}
              </div>

              <p
                className="mt-8 text-white/70 leading-relaxed text-sm lg:text-base"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                If any of those land — you&apos;re not behind. You
                were just handed the right idea inside the wrong
                package. The map in this episode is the version we
                give residents in their first week. It will not make
                you fluent. It will give you three labels, a ladder,
                and two questions — which is enough to start noticing
                what your body is doing, instead of just being run by
                it.
              </p>
            </div>
          </section>

          {/* ── Phase 10: Cross-links + admissions CTA ─────────────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Continue the Series
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">
              More from the Recovery Roadmap
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {EPISODES_BY_NUMBER.filter((ep) => ep.slug !== CURRENT_SLUG).map((ep) => (
                <Link
                  key={ep.slug}
                  href={episodeHref(ep.slug)}
                  className="group block rounded-xl overflow-hidden bg-white border border-black/5 shadow-sm hover:shadow-[0_8px_30px_rgba(160,82,45,0.18)] hover:-translate-y-1 transition-all duration-300 no-underline"
                >
                  <div className="relative">
                    <img
                      src={ep.image}
                      alt={ep.imageAlt}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Episode {ep.number}
                    </div>
                  </div>
                  <div className="p-5">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {ep.publishedDisplay}
                    </p>
                    <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                      {ep.title}
                    </h3>
                    <p
                      className="text-sm text-foreground/65 leading-relaxed line-clamp-3"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {ep.blurb}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Admissions CTA */}
          <div className="mt-12 lg:mt-16 rounded-2xl bg-foreground text-white p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
              <div className="max-w-xl">
                <p
                  className="text-xs font-semibold tracking-[0.22em] uppercase text-primary/80 mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Want to learn the ladder in your own body?
                </p>
                <h3 className="text-xl lg:text-2xl font-bold mb-3">
                  Our admissions line is staffed by humans who know which rung they&apos;re on.
                </h3>
                <p
                  className="text-white/75 leading-relaxed text-sm lg:text-base"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Call any time — confidential, free, no-obligation.
                  We&apos;ll talk about what your nervous system is
                  actually doing, where on the ladder you keep getting
                  stuck, and whether what we offer is the right next
                  step for the version of you who&apos;s reading this.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href="tel:8669964308"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  (866) 996-4308
                </a>
                <Link
                  href="/admissions"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Begin admissions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
