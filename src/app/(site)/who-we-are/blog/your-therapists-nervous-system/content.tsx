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

          {/* ── Phase 2: Co-regulation explained ───────────────────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Mechanism
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Your system reads theirs in milliseconds
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Co-regulation is the technical name for something every mammal
              already does on autopilot: two nervous systems in the same room
              read each other and, within seconds, start to match. Your
              breathing rate, your heart rate variability, the tension in your
              jaw — all of it nudges toward whatever the other person&apos;s
              body is doing. Polyvagal researchers measure the handoff in
              tenths of a second. You don&apos;t consent to it. You can&apos;t
              opt out of it. It is happening before your therapist&apos;s
              first sentence finishes.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              That&apos;s the part of treatment we don&apos;t put on the
              brochure. The intake paperwork lists the modality — CBT, EMDR,
              somatic experiencing, motivational interviewing — as if the
              modality is what does the work. The modality matters. But the
              modality is being delivered through a body. If that body is
              braced, performing, or quietly running its own crisis in the
              background, the technique lands in a room that doesn&apos;t feel
              safe. And a nervous system that doesn&apos;t feel safe can&apos;t
              integrate anything, no matter how clinically correct the
              intervention is.
            </p>

            {/* Three quick cards: what your body is reading, what it does
                with that read, and why it matters more than the technique. */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'What your body reads',
                  body:
                    'Micro-expressions, vocal prosody, breath rhythm, eye-contact pattern, the speed and weight of movement. Most of it never reaches conscious awareness — your vagal system is already deciding "safe" or "not safe" before your prefrontal cortex weighs in.',
                },
                {
                  title: 'What it does with that read',
                  body:
                    'If their system reads as regulated, yours starts to settle: heart rate slows, the muscles around your eyes soften, your breath drops into your belly. If theirs reads as braced or performative, yours stays on guard — even if the words being said are perfectly correct.',
                },
                {
                  title: 'Why it outranks the technique',
                  body:
                    'A safe nervous system is the precondition for any therapeutic work to land. Until your body believes the room is safe, the brain treats every insight as a threat to defend against, not a tool to use.',
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="bg-warm-bg/50 rounded-xl p-6 border border-black/5"
                >
                  <h3 className="font-bold text-foreground mb-2">{c.title}</h3>
                  <p
                    className="text-sm text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {c.body}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The implication is uncomfortable for our profession: a clinician
              who hasn&apos;t done their own nervous-system work is broadcasting
              that fact every minute of every session, and the client&apos;s
              body is receiving the broadcast whether either party realizes
              it. The next sections are about what we do about that — starting
              with the unglamorous work between sessions.
            </p>
          </section>

          {/* ── Phase 3: Why we make our clinicians practice breathwork ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Inside the Practice
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Why we make our clinicians practice breathwork between sessions
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The two-minute walk between rooms is not a break. It is a
              transition. A clinician who finishes a difficult trauma session
              and walks straight into a new intake is carrying the previous
              client&apos;s nervous-system residue into the next encounter —
              and the next client&apos;s body will read it as theirs. Most
              programs treat this as inevitable, an unavoidable cost of a
              full caseload. We treat it as a clinical hazard with a
              protocol.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every Seven Arrows clinician has a between-session reset they
              are expected to use. It is not optional and it is not a
              suggestion. The practice itself is short — usually under three
              minutes — but the discipline is non-negotiable.
            </p>

            <div className="mt-10 rounded-2xl bg-warm-bg/50 border border-black/5 p-6 lg:p-8">
              <h3 className="font-bold text-foreground mb-4">
                The between-session reset, in order
              </h3>
              <ol className="space-y-4">
                {[
                  {
                    step: '1',
                    title: 'Physically leave the room',
                    body:
                      'Step outside, even for thirty seconds. Cold air, sunlight on the face, feet on a different surface. The nervous system uses environment to mark a transition; if every session happens in the same chair without that cue, the previous client is still in the room.',
                  },
                  {
                    step: '2',
                    title: 'Three rounds of 4-7-8 breathing',
                    body:
                      'Inhale through the nose for four counts, hold for seven, exhale through the mouth for eight. The lengthened exhale is the actual mechanism — it engages the vagal brake and pulls heart rate down. Three rounds is the floor; six is better when the previous session was hard.',
                  },
                  {
                    step: '3',
                    title: 'Body scan, head to toe',
                    body:
                      'Where is the residue actually held — jaw, shoulders, gut? Name it silently. The naming itself starts the release; you cannot regulate what you have not noticed.',
                  },
                  {
                    step: '4',
                    title: 'Set a one-line intention',
                    body:
                      'Not a treatment plan. A single sentence about how you want to be in the room with the next person. "Slow." "Curious." "Less interpretation." It anchors the prefrontal cortex without crowding the body out.',
                  },
                ].map((s) => (
                  <li key={s.step} className="flex gap-4">
                    <span
                      className="shrink-0 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold inline-flex items-center justify-center"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {s.step}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{s.title}</p>
                      <p
                        className="text-sm text-foreground/70 leading-relaxed mt-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Asked privately, most clinicians will admit this is the part of
              the day they are most likely to skip when caseloads spike. The
              honest reason is professional pride: it can feel like an
              admission of weakness to need three minutes of breathwork to
              recover from a hard hour. We frame it differently in our team
              meetings — as the same kind of professional hygiene a surgeon
              uses when they scrub between cases. You are not being
              self-indulgent. You are protecting the next person from the
              residue of the last one.
            </p>
          </section>

          {/* ── Phase 4: What "regulated presence" feels like in session ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              From the Client&apos;s Side
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              What &quot;regulated presence&quot; feels like in a session
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most clients can&apos;t name it. They describe a session with a
              regulated clinician in soft language — &quot;it just felt
              easier,&quot; &quot;I cried more than I expected,&quot; &quot;I
              don&apos;t know why but I told her things I&apos;ve never said
              out loud.&quot; The shared denominator under all of those is
              that the client&apos;s body decided the room was safe enough
              to drop its guard. That decision happened beneath language. The
              specific things the client noticed — even if they couldn&apos;t
              articulate them — are usually some combination of these.
            </p>

            <div className="mt-10 space-y-3">
              {[
                {
                  cue: 'The clinician&apos;s breathing is slow and visible',
                  detail:
                    "You can see their chest move, low and steady. They are not holding their breath while you speak — a tiny micro-stillness most people read as judgment without knowing they're reading it.",
                },
                {
                  cue: 'There are pauses, and the pauses don&apos;t feel awkward',
                  detail:
                    'A regulated clinician can sit in three or four seconds of silence without rushing to fill it. The pause is where your nervous system catches up to what you just said — most therapeutic insight actually surfaces in the pause, not the question.',
                },
                {
                  cue: 'Their face has small, real movements',
                  detail:
                    'Brow softens at a hard moment, the corner of the mouth lifts at something tender. Not performed; metabolised. A clinician with a frozen face is usually braced. Your body reads the freeze and braces back.',
                },
                {
                  cue: 'Their voice drops at the end of sentences',
                  detail:
                    'A grounded vocal pattern lands downward. A dysregulated one lifts upward — every statement subtly framed as a question, asking for reassurance from you. The downward landing is what tells your system they can hold what you are saying.',
                },
                {
                  cue: 'They notice your body before they notice your words',
                  detail:
                    '"You shifted when you said that" — said quietly, without making it a confrontation. That kind of noticing only comes from a clinician who has the bandwidth to track somebody else&apos;s body, which only happens when their own is settled.',
                },
              ].map((c) => (
                <div
                  key={c.cue}
                  className="rounded-xl bg-white border border-black/5 shadow-sm p-5 lg:p-6"
                >
                  <p
                    className="font-semibold text-foreground"
                    dangerouslySetInnerHTML={{ __html: c.cue }}
                  />
                  <p
                    className="text-sm text-foreground/70 leading-relaxed mt-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {c.detail}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              None of this is on the intake checklist and none of it is in
              the treatment plan. But if you have ever left a session and
              thought &quot;something landed today that didn&apos;t land
              before&quot; — these are usually the variables that changed.
              They are also why the difference between a regulated clinician
              and a competent-but-braced clinician shows up in outcomes the
              insurance companies eventually notice and the modality
              researchers can&apos;t quite explain.
            </p>
          </section>

          {/* ── Phase 5: Regulated presence vs performing calm ─────── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Counterfeit
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Regulated presence vs performing calm
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Performing calm looks identical to regulated presence on the
              outside for about ninety seconds, which is why it&apos;s so
              dangerous. The vocabulary is the same. The body language has
              been studied. The pacing has been rehearsed. But your nervous
              system is reading something the clinician&apos;s training
              cannot mask: whether the calm is being held in their body or
              held over the top of it. Underneath is usually a clinician
              with their own untreated activation, working very hard to
              keep it offstage.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The cost lands on you. A nervous system that is being held
              shut still leaks — through tight breath, frozen face, a voice
              that is just slightly too smooth. Your body reads the leak as
              danger and braces. You walk out tired and a little
              demoralized and you blame yourself for &quot;not being open
              enough.&quot; You were open. The room wasn&apos;t.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Regulated */}
              <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/70 p-6 lg:p-7">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 mb-3"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Regulated presence
                </p>
                <ul className="space-y-3 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {[
                    'Breath is slow and visible — chest moves, low and steady, even when you say something hard.',
                    'Pauses are comfortable. They wait three seconds without flinching and the silence does work.',
                    "Face has small real movements that match what you're saying — brow softens, mouth lifts.",
                    "Voice lands downward at the end of sentences. They don't need reassurance from you.",
                    'They notice your body before they notice your words and name it gently.',
                    'When they don&apos;t know, they say "I don&apos;t know" without scrambling to recover.',
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-emerald-600 shrink-0">●</span>
                      <span dangerouslySetInnerHTML={{ __html: line }} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Performing calm */}
              <div className="rounded-2xl bg-rose-50/60 border border-rose-200/70 p-6 lg:p-7">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700 mb-3"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Performing calm
                </p>
                <ul className="space-y-3 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {[
                    'Breath is shallow and held high in the chest — they look still because they&apos;ve braced, not because they&apos;ve settled.',
                    'Silence is filled instantly with the next prompt. The pause never gets to do its job.',
                    'Face is smooth and almost frozen — the "therapist face." Reads as evaluation, not reception.',
                    "Voice lifts at the end of sentences. Every statement subtly framed as a question, looking for confirmation.",
                    'They reach for the technique — a worksheet, a reframe, a script — when the moment actually wanted them to stay.',
                    'When you say something hard, the response is fast and clean. Too fast. The room moves on before you have.',
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-rose-600 shrink-0">●</span>
                      <span dangerouslySetInnerHTML={{ __html: line }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The hardest part of this for our profession is that performing
              calm often gets rewarded. Clients describe a smooth, frictionless
              session as &quot;professional.&quot; Supervisors compliment a
              clinician for &quot;holding the room.&quot; The leak only shows
              up later — in the client who quietly disengages between
              sessions, the one who reports therapy &quot;isn&apos;t doing
              much,&quot; the one who keeps starting over with new providers.
              None of those clients knew what they were tracking. Their
              bodies did.
            </p>
          </section>

          {/* CTA — kept here so the page never feels stub-y. */}
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
