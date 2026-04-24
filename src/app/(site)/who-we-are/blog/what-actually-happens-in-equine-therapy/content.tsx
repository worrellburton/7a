'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PageHero from '@/components/PageHero';

/* ── Why Horses: Reveal cards ─────────────────────────────────────── */

function WhyHorsesReveal() {
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
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      title: 'Prey-animal attunement',
      body: 'Horses survive by reading the nervous systems of everything around them. A 1,200-pound animal that has stayed alive for 55 million years notices things about you that people miss.',
    },
    {
      title: 'No performance possible',
      body: 'A horse does not care what you do for a living, what you have lost, or what you came here to hide. They respond to what is actually happening inside you, right now.',
    },
    {
      title: 'Nonverbal feedback loop',
      body: 'When your breath changes, the horse’s body changes. That immediate mirror is what makes equine therapy land in places that talk therapy sometimes cannot reach.',
    },
  ];

  return (
    <div ref={ref} className="my-12 grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + i * 0.2}s`,
          }}
        >
          <h4 className="font-bold text-foreground mb-2">{c.title}</h4>
          <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Session Timeline (minute-by-minute) ──────────────────────────── */

const sessionSteps = [
  {
    stamp: '0:00',
    title: 'Arrive at the arena',
    body: 'You walk in with your group and a licensed clinician. Nobody tells you what to do yet. The horses are already there, doing what horses do.',
  },
  {
    stamp: '0:05',
    title: 'Ground yourself',
    body: 'A short breathing exercise. Feet on the dirt. The therapist asks, without pressure, what you are bringing into the arena today.',
  },
  {
    stamp: '0:15',
    title: 'Observe the herd',
    body: 'You watch. Which horse looks at you. Which turns its back. Which one you feel drawn to. This part tells the therapist more than a whole intake form.',
  },
  {
    stamp: '0:30',
    title: 'Approach and connect',
    body: 'You walk toward the horse you chose — or the one that chose you. No riding. Just proximity, breath, and whatever arrives when a prey animal decides whether to trust you.',
  },
  {
    stamp: '0:50',
    title: 'A simple task',
    body: 'Lead the horse around a cone. Ask it to step back. Something small that surfaces exactly how you ask for what you need in the rest of your life.',
  },
  {
    stamp: '1:15',
    title: 'Process and integrate',
    body: 'Back in the circle. The therapist helps you translate what happened with the horse into language your talk-therapy sessions can use all week.',
  },
];

function SessionTimeline() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="my-12">
      <div className="relative pl-6 sm:pl-8">
        <div className="absolute left-2 sm:left-3 top-2 bottom-2 w-0.5 bg-primary/20 overflow-hidden">
          <div
            className="w-full bg-primary origin-top transition-transform ease-out"
            style={{
              transitionDuration: '2200ms',
              transform: visible ? 'scaleY(1)' : 'scaleY(0)',
              height: '100%',
            }}
          />
        </div>
        <ol className="space-y-6">
          {sessionSteps.map((s, i) => (
            <li
              key={s.stamp}
              className="relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.18}s`,
              }}
            >
              <span
                className="absolute -left-[22px] sm:-left-[28px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-primary"
                aria-hidden="true"
              />
              <div className="bg-warm-bg rounded-xl p-5">
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.stamp}
                  </span>
                  <h4 className="text-sm font-bold text-foreground">{s.title}</h4>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: A minute-by-minute timeline of a typical 90-minute equine therapy session, from grounding through observation, approach, a shared task, and processing.
      </p>
    </div>
  );
}

/* ── What Equine Therapy Asks of You (Checklist) ──────────────────── */

function AsksOfYouChecklist() {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const asks = [
    'Willingness to be seen — horses do not respond to the version of you that works in meetings.',
    'Honesty about your body — a fast heart or shallow breath is data, not a failure.',
    'Patience with silence — most of the first session is not talking.',
    'Permission to not know — you do not have to come in with the right words.',
    'Respect for the animal — no punishment, no dominance, no forcing.',
    'Trust in your clinician — the therapist is there to help you translate, not to judge.',
  ];

  return (
    <div ref={ref} className="my-12 bg-warm-bg rounded-2xl p-6 lg:p-8">
      <h4 className="text-lg font-bold text-foreground mb-2">What the work asks of you</h4>
      <p className="text-sm text-foreground/60 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
        None of these require skill. They require willingness.
      </p>
      <div className="space-y-3">
        {asks.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
            }}
          >
            <div
              className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="4 11 8 15 16 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed pt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              {a}
            </p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: A six-item checklist describing what equine therapy asks of a participant — willingness, honesty, patience, and trust rather than skill.
      </p>
    </div>
  );
}

/* ── Blog Post ────────────────────────────────────────────────────── */

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 3 — The Recovery Roadmap"
        title="What Actually Happens in Equine Therapy"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'What Actually Happens in Equine Therapy' },
        ]}
        description="The honest, minute-by-minute version of equine therapy — no marketing gloss, no horse-whispering mystique. Just what really happens in the arena and why it so often reaches places talk therapy cannot."
        image="/images/equine-therapy-portrait.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link
            href="/who-we-are/blog/what-happens-first-week"
            className="text-primary text-sm font-semibold hover:underline mb-8 inline-block"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            &larr; Episode 2: What Happens Your First Week
          </Link>

          <div style={{ fontFamily: 'var(--font-body)' }}>

            {/* Opening */}
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              If you&apos;re reading this, there&apos;s a good chance equine therapy shows up somewhere in the brochure for a place you&apos;re considering, and you have no idea what to picture. Maybe you&apos;re wondering if it&apos;s riding lessons in disguise. Maybe you&apos;ve seen a photo of someone crying into a horse&apos;s neck on Instagram and felt suspicious, or moved, or both.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              You deserve the real, human version — the one nobody puts in the marketing. So let&apos;s take the mystery out of it.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              Equine therapy is not a metaphor, a photo opportunity, or a spiritual test you have to pass. It&apos;s a structured clinical session — licensed therapist, evidence-based model, specific goals — that happens to take place on the ground, next to a horse. Here is what actually happens in it, and why we keep seeing it move people who have been stuck for years.
            </p>

            {/* Quote */}
            <blockquote className="border-l-4 border-primary pl-6 py-4 my-10 bg-warm-bg/50 rounded-r-xl">
              <p className="text-foreground/80 text-lg italic leading-relaxed">
                &ldquo;In riding a horse, we borrow freedom.&rdquo;
              </p>
              <cite className="text-primary text-sm font-semibold mt-2 block not-italic">— Helen Thompson</cite>
            </blockquote>

            {/* Section: Why Horses */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              Why Horses, of All Things
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              It&apos;s a fair question. Dogs are friendlier. Therapy rooms are warmer. Why does equine therapy keep showing up in trauma and addiction treatment, from VA hospitals to residential programs across Arizona?
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The short answer is that horses are prey animals. They&apos;ve survived for millions of years by reading the nervous systems of the animals around them — including you. They don&apos;t respond to your résumé or your story. They respond to your body: your breath, your micro-tension, the thing you&apos;re pretending not to feel.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              That makes a horse one of the most honest mirrors in clinical practice. And for people whose trauma or addiction has taught them to live at a careful distance from their own body, that mirror is often where the real work finally becomes possible.
            </p>

            <WhyHorsesReveal />

            <p className="text-foreground/80 leading-relaxed mb-10">
              You don&apos;t have to be a &ldquo;horse person&rdquo; for any of this to work. Most of our clients walk into their first equine therapy session having never touched a horse in their lives. That&apos;s fine. That&apos;s the point.
            </p>

            {/* Section: Arena Before */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              The Arena Before the Work Begins
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The first thing you notice is that nobody rushes you. You walk into a covered arena — dust, soft light, a few horses already out — with your group and a licensed clinician. Sometimes a certified equine specialist is there too, to read the horses the way the therapist reads you.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              You&apos;re told, right away, what this isn&apos;t. It isn&apos;t riding. It isn&apos;t a test. The horses don&apos;t need you to be brave, or spiritual, or good. They just need you to be where your feet are.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              Then the clinician does something small that matters more than it looks like it does: they ask how you actually are, and they wait for the real answer. That pause — before any horse is involved — is the first move of the session.
            </p>

            {/* Image break */}
            <div className="my-12 rounded-2xl overflow-hidden aspect-[16/7]">
              <img
                src="/images/horses-grazing.jpg"
                alt="Horses grazing in the pasture at Seven Arrows Recovery, where equine therapy sessions take place."
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Section: A Typical Equine Therapy Session */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              A Typical Equine Therapy Session, Minute by Minute
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Sessions run about 90 minutes. No two are identical — the therapist follows what&apos;s alive in the group on a given day — but the arc tends to look like this.
            </p>

            <SessionTimeline />

            <p className="text-foreground/80 leading-relaxed mb-10">
              Notice what isn&apos;t on that list: lectures, homework, lengthy explanations. The whole session is organized around one question the therapist is quietly helping you answer — what does this horse&apos;s response to me show me about how I move through the world?
            </p>

            {/* Section: What the horse is actually doing */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              What the Horse Is Actually Doing
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Here&apos;s the piece that sounds mystical and isn&apos;t. Horses are exquisitely sensitive to the autonomic nervous system — the part of your body that runs fight, flight, freeze, and the quieter states of safety and connection. When you&apos;re dysregulated, the horse reads it immediately and responds, usually by moving away, tensing, or losing interest.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              When you settle — when your breath drops, your shoulders soften, your attention widens — the horse notices that too. They come closer. They exhale. Sometimes they rest their head against you, which is what a prey animal only does when it genuinely feels safe.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Researchers call this co-regulation. Polyvagal theory, heart-rate variability studies, and trauma-informed clinical work all point to the same thing: our nervous systems learn to calm down by being near calmer nervous systems. A horse, by virtue of being a horse, has a nervous system worth borrowing from for 90 minutes.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              That is the core mechanism of equine therapy. Not magic. Biology, in a context gentle enough for the body to trust it.
            </p>

            {/* Section: What it asks of you */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              What Equine Therapy Asks of You
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              People come into their first session worried they&apos;ll do it wrong. They won&apos;t. The work doesn&apos;t require skill with horses, or any particular emotional performance. It requires something simpler and, for some people, much harder: being honest about what&apos;s actually happening in your body.
            </p>

            <AsksOfYouChecklist />

            <p className="text-foreground/80 leading-relaxed mb-10">
              If any of that sounds impossible right now, that is itself useful information. The work is often precisely the distance between where you are and that list — and the horse is there, patiently, while you close it.
            </p>

            {/* Quote */}
            <blockquote className="border-l-4 border-primary pl-6 py-4 my-10 bg-warm-bg/50 rounded-r-xl">
              <p className="text-foreground/80 text-lg italic leading-relaxed">
                &ldquo;The body keeps the score. If the memory of trauma is encoded in the body, then the healing has to happen there too.&rdquo;
              </p>
              <cite className="text-primary text-sm font-semibold mt-2 block not-italic">— Dr. Bessel van der Kolk</cite>
            </blockquote>

            {/* Section: What it is not */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              What Equine Therapy Is Not
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Let&apos;s clear a few things off the table, because the language around this work has gotten loose and it matters that you know what you&apos;re signing up for.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              It is not riding lessons. You stay on the ground. It is not horse whispering. There is no spiritual credential required, and your therapist is not going to tell you what the horse is thinking. It is not a replacement for individual or group therapy; it&apos;s a complement that makes the other modalities land deeper.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              It is also not a test. You cannot fail a session by being scared, shut down, numb, dissociated, or angry. Those are the states the work is for.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              And it is not a cure on its own. Equine therapy is one modality inside a full trauma-informed program. It works because it sits alongside individual therapy, group work, medical care, and the rest of your day.
            </p>

            {/* Section: Why it works for trauma & addiction */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              Why It Works for Trauma and Addiction
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Most of our clients are not dealing with &ldquo;just&rdquo; a substance. Underneath the drinking, the pills, the stimulants, there is almost always unprocessed trauma — and trauma lives in the body long after the mind has built its stories around it. That&apos;s the premise of our TraumAddiction&trade; model, and it&apos;s why body-based modalities matter in recovery.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Talk therapy gives you language. Equine therapy gives you feedback from outside your own head — an immediate, non-judgmental response to the state your nervous system is actually in. For people whose trauma taught them to override their body&apos;s signals, that feedback can be the first time in years they&apos;ve felt accurate.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              And for anyone whose shame tells them they&apos;re beyond help, there is something irreducibly disarming about a 1,200-pound animal choosing to stand next to them on purpose.
            </p>

            {/* Section: When the session ends */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
              When the Session Ends
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              You&apos;ll walk back toward the rest of your day quieter than you came in. Sometimes people cry on the way out of the arena. Sometimes they laugh. Sometimes they don&apos;t know what to call what just happened, and that&apos;s fine — your individual therapist will help you unpack it in the days that follow.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Over weeks of equine therapy, something cumulative happens. You start to notice, faster, when your body is in fight-or-flight. You get more practiced at coming back. You learn, in a deeply embodied way, that calm is a thing you can choose — and that other beings respond to it.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              That skill comes with you everywhere. Into hard conversations. Into cravings. Into the first awkward holiday after treatment. It is, in the most literal sense, the nervous system you get to take home.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              What brought you here is not your fault — but what you do next is within your power. That is, in the end, what a horse is quietly helping you remember.
            </p>

            {/* Closing CTA */}
            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                If Equine Therapy Is Part of the Reason You&apos;re Curious
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-6 max-w-xl mx-auto">
                You don&apos;t have to decide anything today. A confidential conversation with our admissions team is the next step — free, unhurried, and entirely yours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:8669964308" className="btn-primary">
                  Call (866) 996-4308
                </a>
                <Link href="/admissions" className="btn-outline">
                  Start Admissions
                </Link>
              </div>
              <p className="mt-6 text-sm text-foreground/60">
                Prefer to write first? <Link href="/contact" className="text-primary font-semibold hover:underline">Reach us through Contact</Link> and we&apos;ll follow up on your timeline.
              </p>
            </div>

            {/* Series navigation */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-gray-100 pt-8 mt-12">
              <Link
                href="/who-we-are/blog/what-happens-first-week"
                className="text-primary text-sm font-semibold hover:underline"
              >
                &larr; Episode 2: What Happens Your First Week
              </Link>
              <Link
                href="/who-we-are/recovery-roadmap"
                className="text-primary text-sm font-semibold hover:underline"
              >
                Back to the Recovery Roadmap &rarr;
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50">
                <strong className="text-foreground/70">This is Episode 3 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
              </p>
            </div>

          </div>
        </div>
      </article>
    </>
  );
}
