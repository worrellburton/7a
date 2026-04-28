'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PageHero from '@/components/PageHero';

/* ── Suboxone vs Sublocade Comparison ─────────────────────────────── */

function ComparisonCards() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows: { label: string; suboxone: string; sublocade: string }[] = [
    { label: 'Form', suboxone: 'Sublingual film or tablet', sublocade: 'Subcutaneous abdominal injection' },
    { label: 'How often', suboxone: 'Once or twice daily', sublocade: 'Once a month' },
    { label: 'What you carry', suboxone: 'A bottle, a script, a pharmacy run', sublocade: 'Nothing — the medication lives under your skin' },
    { label: 'Missed dose risk', suboxone: 'Withdrawal within 24 hours', sublocade: 'Steady levels for ~28 days' },
    { label: 'Diversion / theft risk', suboxone: 'Real — film is portable, valuable', sublocade: 'None — cannot be diverted' },
    { label: 'Stigma at the pharmacy', suboxone: 'Monthly counter conversations', sublocade: 'A clinic visit every 28 days' },
    { label: 'Active ingredient', suboxone: 'Buprenorphine + naloxone', sublocade: 'Buprenorphine (extended-release depot)' },
  ];

  return (
    <div ref={ref} className="my-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suboxone column */}
        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            <h4 className="font-bold text-foreground text-base">Suboxone</h4>
          </div>
          <p className="text-xs text-foreground/60 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Daily sublingual buprenorphine + naloxone
          </p>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45 mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {r.label}
                </p>
                <p className="text-foreground/80 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                  {r.suboxone}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Sublocade column */}
        <div
          className="bg-white rounded-2xl border-2 border-primary/30 shadow-md p-6 relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
          }}
        >
          <span className="absolute -top-3 right-4 inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-body)' }}>
            Monthly
          </span>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true" />
            <h4 className="font-bold text-foreground text-base">Sublocade</h4>
          </div>
          <p className="text-xs text-foreground/60 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Monthly extended-release buprenorphine
          </p>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70 mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {r.label}
                </p>
                <p className="text-foreground/80 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                  {r.sublocade}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: Side-by-side comparison of Suboxone (daily sublingual) and Sublocade (monthly injection) showing form, frequency, missed-dose risk, and diversion risk.
      </p>
    </div>
  );
}

/* ── Transition Timeline ──────────────────────────────────────────── */

function TransitionTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const steps: { when: string; title: string; detail: string; tone: string }[] = [
    {
      when: 'Days 1–7',
      title: 'Stabilize on Suboxone',
      detail: 'You take 8 mg or more of Suboxone daily for at least seven days. Your team is watching for steady cravings, no withdrawal, and a stable dose — that is the runway Sublocade needs.',
      tone: '#a0522d',
    },
    {
      when: 'Day 8',
      title: 'First Sublocade injection — 300 mg',
      detail: 'A clinician administers the loading dose under the skin of your abdomen. It forms a small depot that releases buprenorphine slowly. You take your last Suboxone dose the day before.',
      tone: '#c67a4a',
    },
    {
      when: 'Days 9–28',
      title: 'No more daily film',
      detail: 'Daily Suboxone stops. Levels in your bloodstream stay steady from the depot. Most people describe the first month as oddly quiet — the morning routine of dosing, gone.',
      tone: '#d4915a',
    },
    {
      when: 'Day 28+',
      title: 'Second injection — 300 mg',
      detail: 'A second 300 mg loading dose builds your steady-state levels. Some clinicians use one loading dose, some use two — your team picks based on your response.',
      tone: '#e6a872',
    },
    {
      when: 'Month 3 onward',
      title: 'Maintenance — 100 mg monthly',
      detail: 'You drop to a 100 mg maintenance injection every 28 days. This is the rhythm most people stay on long-term: one clinic visit a month, no daily medication management.',
      tone: '#6ab04c',
    },
  ];

  return (
    <div ref={ref} className="my-12">
      <ol className="relative border-l-2 border-warm-bg pl-6 space-y-6">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="relative"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-16px)',
              transition: `all 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + i * 0.18}s`,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow"
              style={{ backgroundColor: s.tone }}
            />
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: s.tone, fontFamily: 'var(--font-body)' }}
            >
              {s.when}
            </p>
            <h4 className="text-lg font-bold text-foreground mt-1 mb-1.5">{s.title}</h4>
            <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              {s.detail}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-center text-xs text-foreground/50 mt-6 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: A vertical timeline showing the five stages of switching from daily Suboxone to monthly Sublocade — stabilize, first injection, no more film, second loading dose, maintenance.
      </p>
    </div>
  );
}

/* ── Eligibility Self-Check ───────────────────────────────────────── */

function EligibilityCheck() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const items: string[] = [
    'You have been on Suboxone for at least seven consecutive days.',
    'Your daily dose is 8 mg or higher and has been stable.',
    'You are not currently in withdrawal and your cravings are manageable.',
    'You have a clinician who can administer Sublocade or refer you to one.',
    'You can commit to a clinic visit every 28 days for the injection.',
    'You are not pregnant or planning a pregnancy in the next month.',
    'You have not had a serious allergic reaction to buprenorphine.',
    'You are open to talking to your team about whether monthly is the right rhythm for you.',
  ];

  return (
    <div ref={ref} className="my-12 bg-warm-bg rounded-2xl p-6 lg:p-8">
      <h4 className="text-lg font-bold text-foreground mb-2">Are You a Candidate?</h4>
      <p className="text-sm text-foreground/60 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
        This is not a clinical evaluation — it is a conversation starter. If most of these are true, ask your team about Sublocade. If only a few are, that is useful information too.
      </p>
      <div className="space-y-3">
        {items.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
            }}
          >
            <div
              className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {i + 1}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed pt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {line}
            </p>
          </div>
        ))}
      </div>
      <div
        className="mt-6 bg-primary/5 rounded-xl p-5 border border-primary/10"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 1s' }}
      >
        <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          The candidacy decision is always made with a clinician, not from a checklist. Bring this list to your next appointment — it is a faster way to start the conversation than starting from zero.
        </p>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: An eight-item self-check that helps a Suboxone patient decide whether to ask their clinician about Sublocade.
      </p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 7"
        title="Transitioning from Suboxone to Sublocade"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'Transitioning from Suboxone to Sublocade' },
        ]}
        description="A clinical, plain-English guide to switching from daily Suboxone to a monthly Sublocade injection — who it is for, how the timing works, and what the first month actually feels like."
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            {/* Opening */}
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              For a lot of people on Suboxone, the medication is working — and the routine around it is wearing them out. The morning film. The pharmacy line at the end of every month. The careful planning before a trip. The quiet calculation every time the bottle gets low.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              Sublocade is a different shape of the same answer. Same active ingredient, same stabilizing effect on cravings and withdrawal — delivered as a monthly injection instead of a daily film. For the right person at the right time, it is the difference between managing recovery every morning and getting your mornings back.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              This guide walks through what that transition actually looks like — the eligibility, the timing, the first month, and the questions worth bringing to your clinician. It is written for the person doing the work, not for a textbook.
            </p>

            {/* Section: Same medicine, different rhythm */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Same Medicine, Different Rhythm
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Suboxone and Sublocade share an active ingredient: buprenorphine. It is a partial opioid agonist that binds to the same brain receptors opioids do, takes up the seat, and quiets cravings without producing the same high. That mechanism is what makes both medications effective for opioid use disorder.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The difference is delivery. Suboxone is a film or tablet that dissolves under the tongue and lasts about a day. Sublocade is a 300 mg or 100 mg injection that forms a small depot under the skin of your abdomen and releases buprenorphine slowly for roughly 28 days. One asks for daily attention; the other asks for one clinic visit a month.
            </p>

            <ComparisonCards />

            <p className="text-foreground/80 leading-relaxed mb-4">
              Neither is better in the abstract. Daily dosing gives some people a useful sense of agency — a small ritual that anchors recovery in the morning. For others, the daily handling is the part that keeps the substance psychologically present. The rhythm that fits is the one that lets the rest of life take up the foreground.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              If you have been on Suboxone for a while and find yourself still organizing the day around the film, that is worth saying out loud to your team. It is often the first signal that the monthly rhythm might fit you better.
            </p>

            {/* Section: Timing */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              How the Transition Actually Works
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The transition itself is straightforward, but the timing matters. Sublocade is not a starter medication — it is given to people who are already stable on a sublingual buprenorphine product. That stability is what tells your team your body is tolerating buprenorphine well and is ready to receive a much larger, slow-release dose.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Most clinicians follow the same shape: at least seven days of stable Suboxone at 8 mg or higher, then the first 300 mg loading injection, then no more daily Suboxone. A second 300 mg injection one month later, and then maintenance at 100 mg every 28 days from there.
            </p>

            <TransitionTimeline />

            <p className="text-foreground/80 leading-relaxed mb-4">
              The first injection is the part most people are nervous about. It takes a few minutes. The clinician numbs the area, injects under the skin of the abdomen, and you walk out. There is usually a small lump or tenderness at the site for a few days — that is the depot doing its job. It softens and disappears as the medication releases.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              The first 24 to 72 hours after the loading dose are when most people notice the difference. There is a sense of levelness — no morning peak, no late-evening trough. Some people describe it as the cravings going from a hum to silence. Others describe it more simply: they stopped thinking about the medication.
            </p>

            {/* Section: Are you ready? */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Is Now the Right Time?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Sublocade works best when the rest of your recovery is steady — when you are not actively in crisis, when your dose has been stable, and when monthly clinic visits feel doable. That does not mean you have to be perfect. It means the medication change is being layered onto a foundation, not used as a foundation by itself.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The checklist below is not a diagnostic tool — it is a way to walk into your next appointment with your thoughts already organized. If most of it is true for you, the conversation with your clinician will be a short one.
            </p>

            <EligibilityCheck />

            <p className="text-foreground/80 leading-relaxed mb-10">
              If only some of it is true — say, you are stable on Suboxone but a monthly clinic visit feels logistically impossible right now — that is also worth naming. The honest answer might be &ldquo;not yet,&rdquo; and that is a useful answer to have.
            </p>

            {/* Section: First month */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              What the First Month Feels Like
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The most consistent thing we hear from clients during the first month on Sublocade is that nothing dramatic happens — and that is the point. Cravings stay quiet. Withdrawal does not appear. The mental space the daily medication used to occupy starts to fill with other things.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Some side effects do show up. Mild constipation, headache, and tenderness at the injection site are the most common. Most are short-lived and improve after the first few weeks. Anything more than mild gets reported back to your clinician right away — not to alarm anyone, but because adjustments are easier early than late.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The psychological transition can be just as real as the physical one. Daily medication often becomes a small loop in the day — a moment of attention to recovery. When that loop disappears, some people feel unmoored at first. The work in early Sublocade often involves replacing that loop with intentional check-ins of a different kind: a morning walk, a brief journaling prompt, a recovery meeting, a call to a sponsor.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              At Seven Arrows Recovery, our TraumAddiction&trade; approach treats the medication change as one thread in a larger weave. We are looking at sleep, nervous system regulation, relationships, and the underlying experiences that drove use in the first place. The medication holds the floor steady; the rest of the work happens on top of it.
            </p>

            {/* Section: Why us */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Why the Setting Matters
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Sublocade is administered by a clinician — that part is identical across providers. What is not identical is what the clinic does with the time you are no longer spending on a daily film. A medication change without supportive work around it is a partial answer.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              At Seven Arrows Recovery, the transition is integrated into the broader recovery plan: medical management, individual therapy, group work, family involvement when it helps, and the experiential work — equine therapy, mindful movement, nature-based therapy — that helps the nervous system actually settle. Monthly Sublocade gives you the calendar back. We help you decide what to put in it.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              If you are already a client and want to talk about Sublocade, ask your team at your next session. If you are coming from outside and Sublocade is part of why you are reaching out, mention it on the first call — we will route you to the right clinician.
            </p>

            {/* Closing CTA */}
            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                The Conversation Is Worth Having
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-6 max-w-xl mx-auto">
                If daily Suboxone is working but the routine is wearing thin, Sublocade might be the next step. The only way to know is to talk it through with a clinician who knows your full picture.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
                Call us. We will walk you through eligibility, timing, and what the first month would look like — without pressure, and without assuming the answer is yes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:8669964308" className="btn-primary">
                  Call (866) 996-4308
                </a>
                <Link href="/admissions" className="btn-outline">
                  Start Admissions
                </Link>
              </div>
            </div>

            {/* Series navigation */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50 mb-4">
                <strong className="text-foreground/70">This is Episode 7 of &ldquo;The Recovery Roadmap&rdquo;</strong> — an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
              </p>
              <Link
                href="/who-we-are/recovery-roadmap"
                className="group flex items-stretch gap-4 p-4 rounded-xl border border-primary/25 hover:border-primary/55 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="shrink-0 w-24 sm:w-32 aspect-[4/3] rounded-lg overflow-hidden bg-warm-bg flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary/60" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="8" y1="14" x2="16" y2="14" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    The Series
                    <span className="w-5 h-px bg-primary/40" aria-hidden="true" />
                    All episodes
                  </span>
                  <p
                    className="text-foreground font-bold leading-snug group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    The Recovery Roadmap — every episode in order
                  </p>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Browse the full series
                    <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </article>
    </>
  );
}
