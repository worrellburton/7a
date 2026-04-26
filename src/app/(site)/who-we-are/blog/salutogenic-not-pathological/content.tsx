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

          {/* ── Phase 4: The shift glyph — pathology vs salutogenesis ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Shift, Side-by-Side
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              The same person, two frames
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The cleanest way to feel the difference is to take a single
              person walking into treatment and run them through both
              frames in parallel. Same intake. Same history. Two
              fundamentally different programs result.
            </p>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
              {/* Pathology side */}
              <div className="rounded-2xl bg-rose-50/40 border border-rose-200/60 p-6 lg:p-7">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700 mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Pathology frame
                </p>
                <dl className="space-y-4 text-sm text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
                  {[
                    ['First question', '"What is wrong with you?"'],
                    ['Center of the work', 'Symptoms, criteria thresholds, diagnoses to suppress.'],
                    ['Vocabulary', '"Disorder," "deficit," "relapse," "compliance."'],
                    ['Locus of expertise', "The clinician holds the map. You're the patient inside it."],
                    ['Definition of progress', 'Fewer symptoms, lower scores, more days clean.'],
                    ['When it ends', 'When the acute episode is quiet enough to discharge.'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-rose-700/70">{k}</dt>
                      <dd className="mt-1 leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* The arrow / shift glyph */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Shift
                  </span>
                </div>
              </div>

              {/* Mobile-only divider arrow */}
              <div className="lg:hidden flex items-center justify-center">
                <svg className="w-8 h-8 text-primary rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </div>

              {/* Salutogenic side */}
              <div className="rounded-2xl bg-emerald-50/40 border border-emerald-200/60 p-6 lg:p-7">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Salutogenic frame
                </p>
                <dl className="space-y-4 text-sm text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
                  {[
                    ['First question', '"What is still working in you, and how do we build on it?"'],
                    ['Center of the work', 'The intact part — its capacity, its repetitions, its return to leadership.'],
                    ['Vocabulary', '"Resource," "coherence," "self-leadership," "resilience."'],
                    ['Locus of expertise', "You hold the map; the clinician helps you read it more clearly."],
                    ['Definition of progress', 'Capacity gained: trust, agency, work, relationships, tolerance for discomfort.'],
                    ['When it ends', "When the part of you that runs your life is the part you'd actually want running it."],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/70">{k}</dt>
                      <dd className="mt-1 leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              These two columns describe two different people leaving
              treatment. The pathology-frame graduate is symptom-quiet,
              externally referenced, and managing. The salutogenic-frame
              graduate is symptom-quiet, self-led, and building. Both look
              the same on a 30-day discharge survey. They diverge sharply
              somewhere around month nine, and they look like entirely
              different lives by year five.
            </p>
          </section>

          {/* ── Phase 5: Self-leadership beats symptom management long-tail ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Five-Year View
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Why self-leadership beats symptom management — eventually
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Symptom management works. Inside a structured environment, with
              external supports, with the person&apos;s focus pointed at the
              symptom, you can keep most things quiet for ninety days. The
              field publishes those ninety-day numbers because they look
              good. The honest measurement question is what happens at year
              one, year three, year five — when the structure has been
              removed, the supports have thinned, and the original
              motivation has dimmed.
            </p>

            <p
              className="mt-5 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Symptom-managed graduates tend to do well right up until
              they don&apos;t. The trigger is rarely dramatic. A move. A
              relationship. A boss who&apos;s a problem. A shoulder injury
              with a prescription. Their recovery was always external
              scaffolding around a self that hadn&apos;t fully reclaimed
              the wheel — and when the scaffolding shifts, the self
              wasn&apos;t practiced enough to compensate. That&apos;s the
              pattern behind a lot of relapses that look mysterious from
              the outside but feel inevitable from the inside.
            </p>

            <div className="mt-10 rounded-2xl bg-warm-bg/50 border border-black/5 p-6 lg:p-8">
              <h3 className="font-bold text-foreground mb-4">
                What self-leadership actually means in practice
              </h3>
              <ol className="space-y-4">
                {[
                  {
                    n: '1',
                    title: 'You can name your own state without help',
                    body:
                      'Not "I\'m fine." Specifically: regulated, activated, shut down, hungry, lonely, ashamed, hopeful. The capacity to label your inside in real time is the precondition for everything else, and most people leave conventional treatment without it.',
                  },
                  {
                    n: '2',
                    title: 'You make the call about your own care',
                    body:
                      'You know when you need a meeting, when you need a session, when you need to call your sponsor, when you need to go for a long walk and not pick up the phone. The decision lives in you — supports are tools you reach for, not authorities you outsource to.',
                  },
                  {
                    n: '3',
                    title: "You hold a coherent story about your own life",
                    body:
                      "Not a polished one. A coherent one — where the past makes sense as a sequence, where the present is connected to it, and where the future has at least a few real things you're moving toward. Coherence, as Antonovsky meant it, is the central protective factor.",
                  },
                  {
                    n: '4',
                    title: 'You can sit inside discomfort for longer than you used to',
                    body:
                      'The window of tolerance is the technical term. Symptom management borrows somebody else\'s window. Self-leadership widens your own. The difference is that the wider window persists when nobody is watching.',
                  },
                  {
                    n: '5',
                    title: 'You hold relationships that survive your honesty',
                    body:
                      "Not relationships that manage you, and not relationships that you manage. Mutual ones. People who can hear hard things without needing you to soften them. Building this requires risk that the symptom-management frame never asks of you.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span
                      className="shrink-0 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold inline-flex items-center justify-center"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {s.n}
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
              These five capacities are unsexy. They don&apos;t show up on
              insurance claim forms and they don&apos;t make for compelling
              before-and-after photos. They&apos;re also the only things
              that reliably predict whether a recovery survives the
              ordinary turbulence of a normal adult life. That is the
              salutogenic bet — that we&apos;re willing to look modest at
              30 days in exchange for being unmistakably better at year
              five.
            </p>
          </section>

          {/* ── Phase 6: Three Rhoton/Gentry concepts our day actually runs on ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Active Ingredients
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              Three Rhoton &amp; Gentry concepts our day-to-day actually runs on
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The clinical literature behind the salutogenic frame is large
              and uneven. Most of it is academic in a way that doesn&apos;t
              survive contact with a treatment day. The exceptions —
              specifically the &quot;active ingredients&quot; work coming
              out of Rhoton, Gentry, and the broader resilience-research
              tradition — translate cleanly into things a clinical team
              can actually do on a Tuesday afternoon. Three of those
              concepts run through almost every hour of our program. We
              try to call them by their plain names rather than the
              jargon, but the lineage is worth naming.
            </p>

            <div className="mt-10 space-y-5">
              {[
                {
                  number: '01',
                  jargon: 'Active ingredients',
                  plain: 'What is actually doing the work',
                  body:
                    'The premise is simple and slightly subversive: a treatment program contains many activities, but only a few of them are doing the heavy lifting. The rest is structure around the few. The discipline is to keep asking — about every group, every modality, every ritual — "is this an active ingredient or is this filler?" Filler isn\'t bad; it can hold the day together. But filler that gets mistaken for an active ingredient is how programs grow expensive without growing more effective.',
                  show:
                    'In practice: every six months we audit the schedule and ask the team and the alumni which moments mattered. The answers are surprising. A small handful of recurring formats consistently show up as the things that actually moved people. We protect those, and we let the rest stay light.',
                },
                {
                  number: '02',
                  jargon: 'Sense of coherence',
                  plain: 'A life that adds up to something you can hold',
                  body:
                    'Antonovsky\'s original three-part construct: comprehensibility (the world makes sense), manageability (you have what you need to navigate it), and meaningfulness (the navigation is worth the effort). Recovery is not the absence of disorder — it\'s the slow assembly of a coherent enough story that ordinary stress stops being annihilating.',
                  show:
                    'In practice: most of our individual sessions are quietly aimed at coherence rather than insight. We\'re not chasing the perfect interpretation of the past. We\'re helping you build a version of your story that you can carry into the next room without it knocking you over.',
                },
                {
                  number: '03',
                  jargon: 'Self-leadership',
                  plain: "The part of you that runs your life is the part you'd choose",
                  body:
                    'Borrowed loosely from the IFS / parts-work tradition that overlaps the resilience literature. There are many parts of you and they all have their reasons. Self-leadership isn\'t about silencing the noisy ones — it\'s about which part is actually steering. The salutogenic claim is that the steering part is, almost always, already in there and intact, and the program\'s job is to give it repetitions until it can take the wheel without prompting.',
                  show:
                    "In practice: we end most groups with the same quiet question — \"who in you was leading just now?\" Over weeks, the answer changes. Clients catch themselves. The first time a person reports that an old reactive part showed up but they noticed it without becoming it, the work has crossed a real line. Most of the rest of treatment is about widening the gap between noticing and becoming.",
                },
              ].map((c) => (
                <div
                  key={c.number}
                  className="rounded-2xl bg-white border border-black/5 shadow-sm p-6 lg:p-7"
                >
                  <div className="flex items-baseline gap-4 mb-3">
                    <span
                      className="text-2xl font-bold text-primary tabular-nums"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {c.number}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/40">
                        {c.jargon}
                      </p>
                      <h3 className="text-lg lg:text-xl font-bold text-foreground">
                        {c.plain}
                      </h3>
                    </div>
                  </div>
                  <p
                    className="text-sm lg:text-base text-foreground/75 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {c.body}
                  </p>
                  <p
                    className="mt-4 text-sm text-foreground/65 leading-relaxed border-l-2 border-primary/40 pl-4"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span className="font-semibold text-foreground/80">In our program: </span>
                    {c.show}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              None of these are exotic. None of them require buying a new
              modality. They are organising principles — the things we hold
              the schedule, the staff hiring, and the clinical decisions
              against. When we drift from them, the program gets busier and
              less effective. When we hold them, the program gets quieter
              and the alumni outcomes get longer.
            </p>
          </section>

          {/* ── Phase 7: Audience callout — for readers put off by clinical framing ── */}

          <section className="mt-16">
            <div className="rounded-2xl bg-foreground text-white p-8 lg:p-10 shadow-[0_20px_60px_-20px_rgba(60,48,42,0.5)]">
              <p
                className="text-xs font-semibold tracking-[0.22em] uppercase text-primary/80 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                If This Sounds Like You
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold mb-5">
                For readers put off by the clinical, pathology framing of most rehab marketing
              </h2>

              <p
                className="text-white/85 leading-relaxed text-base lg:text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                If you&apos;ve looked at treatment websites and felt a quiet
                aversion you couldn&apos;t quite name — pages full of disease
                language, dual-diagnosis acronyms, before-and-after images
                that look like medication ads, &quot;levels of care&quot;
                charts that make recovery sound like a graded illness —
                you&apos;ve been reading the pathology frame correctly. The
                aversion is data. It&apos;s your nervous system noticing
                that the program is going to talk about you the way the
                website talks about you.
              </p>

              <p
                className="mt-5 text-white/85 leading-relaxed text-base lg:text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                We get that pushback constantly from a particular kind of
                person we tend to do well with. They are usually high-
                functioning by external measures. They have a vocabulary.
                They&apos;ve read a few books. They are not in denial about
                what&apos;s happening to them — they are in a different
                kind of resistance: an unwillingness to let their identity
                be reduced to a diagnostic label they don&apos;t actually
                think describes them. The instinct is sound. The diagnosis
                rarely describes anyone fully. The salutogenic frame
                doesn&apos;t require it to.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "You read AA's first chapter and felt the spirit of it but couldn&apos;t make peace with the language about yourself.",
                  "You&apos;ve been told you&apos;re &quot;in denial&quot; for not embracing a label you simply don&apos;t recognise as the whole story.",
                  "You suspect something is wrong, but you don&apos;t want to organise the rest of your life around what&apos;s wrong with you.",
                  "You want a program that takes your suffering seriously without making it the centerpiece of your identity.",
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
                If two or more of those land — you are not difficult, and
                you are not in denial. You are reading the room, and the
                room you&apos;ve been shown is the wrong one. The frame that
                fits you exists. It&apos;s older than the marketing language.
                It&apos;s what we organise our days around.
              </p>
            </div>
          </section>

          {/* ── Phase 8: How this shows up in our day at Seven Arrows ── */}

          <section className="mt-16">
            <p
              className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              On the Ground
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-5">
              What this looks like on a Tuesday at Seven Arrows
            </h2>

            <p
              className="text-base lg:text-lg text-foreground/75 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Theory is cheap. The honest test of any clinical philosophy is
              whether it shows up in the small choices a program makes when
              nobody is watching — what gets put on the schedule, what
              language clinicians use unprompted, what gets celebrated and
              what gets quietly tolerated. Below are five places the
              salutogenic frame is visible in our day-to-day, not because
              we&apos;re performing it, but because the frame quietly
              decides which option we pick when there are two.
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  area: 'The first session',
                  pathology: 'Symptom inventory, criteria check, treatment-plan draft.',
                  salutogenic:
                    'Yes, intake gets the symptoms recorded — but the working session asks "What in your life right now is still standing? Who do you trust? When was the last time you felt like yourself?" The first session is for finding the intact part, not cataloguing the broken parts.',
                },
                {
                  area: 'The schedule',
                  pathology: 'Stacked therapy hours, psycho-education modules, group after group.',
                  salutogenic:
                    'Generous unstructured time, on purpose. Long meals together. Equine sessions. Walks in the desert. Half the program is the things in between the sessions — because that\'s where coherence gets built.',
                },
                {
                  area: 'The language',
                  pathology: '"Patient," "compliance," "non-adherent," "high-utilizer," "treatment-resistant."',
                  salutogenic:
                    '"Resident." "What\'s under that?" "Which part is leading right now?" "What did you notice?" Clinicians who lean reflexively on diagnostic labels in team meetings get warmly redirected. The vocabulary forms the frame.',
                },
                {
                  area: 'How progress is measured',
                  pathology: 'PHQ-9, GAD-7, days-clean count.',
                  salutogenic:
                    'We use the assessments — they\'re the lingua franca with insurance and we don\'t pretend otherwise. We just don\'t make them the centerpiece. We track capacity: can you name your state, can you sit in discomfort, do you have one relationship you didn\'t have on day one. The narrative is what the discharge meeting actually centers on.',
                },
                {
                  area: 'How we describe alumni',
                  pathology: '"X months sober," "remained abstinent through Y stressor."',
                  salutogenic:
                    "Sober, yes — but also: built a business, repaired a relationship with a daughter, started coaching at the gym, stopped white-knuckling and started actually living. The shift in metric is the shift in identity. Clients become alumni become humans whose lives we can describe in present tense.",
                },
              ].map((row) => (
                <div
                  key={row.area}
                  className="rounded-xl bg-warm-bg/50 border border-black/5 p-5 lg:p-6"
                >
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-3"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {row.area}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700/80 mb-1">
                        Pathology default
                      </p>
                      <p
                        className="text-sm text-foreground/70 leading-relaxed"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {row.pathology}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 mb-1">
                        How we do it
                      </p>
                      <p
                        className="text-sm text-foreground/85 leading-relaxed"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {row.salutogenic}
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
              None of these choices show up on the website&apos;s service
              list. They&apos;re not modalities. They&apos;re the hundred
              small decisions per day that quietly answer the question
              &quot;is this program organised around what&apos;s wrong with
              the person, or around what&apos;s underneath that the person
              is trying to get back to?&quot; The answer is the program.
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
