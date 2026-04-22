'use client';




import Link from 'next/link';

import { useEffect, useRef, useState } from 'react';
import PageHero from '@/components/PageHero';

/* ── Animated Spectrum Infographic ─────────────────────────────────── */

function SpectrumInfographic() {
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
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stages = [
    { label: 'Casual Use', color: '#6ab04c', desc: 'Social or occasional use with full control', markers: ['Can take it or leave it', 'No negative consequences', 'No cravings'] },
    { label: 'Misuse', color: '#f9ca24', desc: 'Using in risky situations or higher quantities', markers: ['Occasional regret', 'Using to cope with stress', 'Increasing tolerance'] },
    { label: 'Dependence', color: '#f0932b', desc: 'Body and mind begin to rely on the substance', markers: ['Withdrawal symptoms', 'Need more for same effect', 'Difficulty cutting back'] },
    { label: 'Addiction', color: '#eb4d4b', desc: 'Loss of control despite harmful consequences', markers: ['Compulsive use', 'Life revolves around substance', 'Continued use despite harm'] },
  ];

  return (
    <div ref={ref} className="my-12">
      <div className="relative">
        {/* Background gradient bar */}
        <div className="h-4 rounded-full bg-gray-100 overflow-hidden mb-8">
          <div
            className="h-full rounded-full transition-all duration-[2000ms] ease-out"
            style={{
              width: visible ? '100%' : '0%',
              background: 'linear-gradient(to right, #6ab04c, #f9ca24, #f0932b, #eb4d4b)',
            }}
          />
        </div>

        {/* Stage cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stage, i) => (
            <div
              key={stage.label}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.2}s`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                <h4 className="font-bold text-foreground text-sm">{stage.label}</h4>
              </div>
              <p className="text-foreground/60 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>{stage.desc}</p>
              <ul className="space-y-1">
                {stage.markers.map((m) => (
                  <li key={m} className="text-xs text-foreground/70 flex items-start gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                    <span style={{ color: stage.color }}>&#9679;</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: An illustrated spectrum showing the progression from casual substance use through misuse and dependence to addiction, with behavioral markers at each stage.
      </p>
    </div>
  );
}

/* ── Self-Assessment Checklist ─────────────────────────────────────── */

function SelfAssessment() {
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

  const signs = [
    'You use more of the substance, or for longer, than you intended.',
    'You have tried to cut down or stop but could not.',
    'You spend a lot of time getting, using, or recovering from the substance.',
    'You experience cravings or strong urges to use.',
    'Your use interferes with responsibilities at work, school, or home.',
    'You continue using even though it causes problems in relationships.',
    'You have given up activities you once enjoyed because of substance use.',
    'You use in situations where it is physically dangerous.',
    'You continue despite knowing it is causing physical or psychological harm.',
    'You need more of the substance to feel the same effect (tolerance).',
  ];

  return (
    <div ref={ref} className="my-12 bg-warm-bg rounded-2xl p-6 lg:p-8">
      <h4 className="text-lg font-bold text-foreground mb-2">How Many Apply to You?</h4>
      <p className="text-sm text-foreground/60 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
        This is not a diagnosis — it is a starting point for honest self-reflection. Based on DSM-5 criteria for substance use disorders.
      </p>
      <div className="space-y-3">
        {signs.map((sign, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
            }}
          >
            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              {i + 1}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed pt-1" style={{ fontFamily: 'var(--font-body)' }}>{sign}</p>
          </div>
        ))}
      </div>
      <div
        className="mt-6 bg-primary/5 rounded-xl p-5 border border-primary/10"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1s',
        }}
      >
        <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          <strong className="text-foreground">2–3 signs</strong> may indicate a mild substance use disorder.{' '}
          <strong className="text-foreground">4–5 signs</strong> suggest moderate severity.{' '}
          <strong className="text-foreground">6 or more</strong> is considered severe. If any of these resonate, reaching out for a confidential conversation can be the most important step you take.
        </p>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: An interactive self-assessment checklist showing ten signs of addiction based on DSM-5 criteria, with severity guidance.
      </p>
    </div>
  );
}

/* ── Dopamine Pathway Diagram ──────────────────────────────────────── */

function DopaminePathway() {
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
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="my-12 flex justify-center">
      <div className="w-full max-w-2xl">
        <svg viewBox="0 0 600 320" className="w-full h-auto" role="img" aria-label="Animated diagram showing how substances hijack the brain's dopamine reward pathway">
          {/* Brain outline */}
          <ellipse cx="300" cy="160" rx="200" ry="140" fill="#f5f0eb" stroke="#a0522d" strokeWidth="2" opacity="0.3">
            <animate attributeName="opacity" values="0;0.3" dur="1s" fill="freeze" begin={visible ? '0s' : 'indefinite'} />
          </ellipse>

          {/* VTA region */}
          <ellipse cx="220" cy="200" rx="40" ry="25" fill="#a0522d" opacity="0.2">
            <animate attributeName="opacity" values="0;0.2" dur="0.8s" fill="freeze" begin={visible ? '0.3s' : 'indefinite'} />
          </ellipse>
          <text x="220" y="205" textAnchor="middle" fill="#a0522d" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
            <tspan>VTA</tspan>
          </text>
          <text x="220" y="218" textAnchor="middle" fill="#a0522d" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.7">
            (Reward Center)
          </text>

          {/* Nucleus Accumbens */}
          <ellipse cx="370" cy="140" rx="45" ry="25" fill="#c67a4a" opacity="0.2">
            <animate attributeName="opacity" values="0;0.2" dur="0.8s" fill="freeze" begin={visible ? '0.5s' : 'indefinite'} />
          </ellipse>
          <text x="370" y="138" textAnchor="middle" fill="#c67a4a" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Nucleus</text>
          <text x="370" y="150" textAnchor="middle" fill="#c67a4a" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Accumbens</text>

          {/* Prefrontal Cortex */}
          <ellipse cx="370" cy="70" rx="50" ry="22" fill="#3d1a0e" opacity="0.1">
            <animate attributeName="opacity" values="0;0.1" dur="0.8s" fill="freeze" begin={visible ? '0.7s' : 'indefinite'} />
          </ellipse>
          <text x="370" y="68" textAnchor="middle" fill="#3d1a0e" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Prefrontal</text>
          <text x="370" y="80" textAnchor="middle" fill="#3d1a0e" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Cortex</text>

          {/* Normal dopamine path */}
          <path d="M255 190 Q300 160 330 145" fill="none" stroke="#a0522d" strokeWidth="2" strokeDasharray="6 3" opacity="0.5">
            <animate attributeName="stroke-dashoffset" from="100" href="0" dur="2s" fill="freeze" begin={visible ? '0.8s' : 'indefinite'} />
          </path>
          <text x="280" y="155" fill="#a0522d" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.7" transform="rotate(-20,280,155)">dopamine</text>

          {/* Hijacked path — substance surge */}
          <path d="M255 190 Q300 140 330 130" fill="none" stroke="#eb4d4b" strokeWidth="3" opacity="0">
            <animate attributeName="opacity" values="0;0.8" dur="1s" fill="freeze" begin={visible ? '1.5s' : 'indefinite'} />
            <animate attributeName="stroke-dashoffset" from="100" href="0" dur="1.5s" fill="freeze" begin={visible ? '1.5s' : 'indefinite'} />
          </path>

          {/* Dopamine dots flowing */}
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx="255" cy="190" r="3" fill="#eb4d4b" opacity="0">
              <animate attributeName="opacity" values="0;0.8;0" dur="2s" begin={visible ? `${2 + i * 0.4}s` : 'indefinite'} repeatCount="indefinite" />
              <animateMotion dur="2s" begin={visible ? `${2 + i * 0.4}s` : 'indefinite'} repeatCount="indefinite">
                <mpath href="#dopaminePath" />
              </animateMotion>
            </circle>
          ))}
          <path id="dopaminePath" d="M255 190 Q300 140 330 130" fill="none" opacity="0" />

          {/* Labels */}
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="0.8s" fill="freeze" begin={visible ? '2.5s' : 'indefinite'} />
            <rect x="420" y="110" width="160" height="70" rx="8" fill="white" stroke="#eb4d4b" strokeWidth="1" opacity="0.9" />
            <text x="500" y="130" textAnchor="middle" fill="#eb4d4b" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">Substance Hijack</text>
            <text x="500" y="145" textAnchor="middle" fill="#1a1a1a" fontSize="9" fontFamily="Inter, sans-serif">Floods 2–10x normal</text>
            <text x="500" y="158" textAnchor="middle" fill="#1a1a1a" fontSize="9" fontFamily="Inter, sans-serif">dopamine levels</text>
            <text x="500" y="171" textAnchor="middle" fill="#1a1a1a" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.6">Brain adapts → needs more</text>
          </g>

          {/* Normal reward label */}
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="0.8s" fill="freeze" begin={visible ? '1s' : 'indefinite'} />
            <rect x="120" y="240" width="160" height="50" rx="8" fill="white" stroke="#a0522d" strokeWidth="1" opacity="0.9" />
            <text x="200" y="260" textAnchor="middle" fill="#a0522d" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">Normal Reward</text>
            <text x="200" y="275" textAnchor="middle" fill="#1a1a1a" fontSize="9" fontFamily="Inter, sans-serif">Food, connection, exercise</text>
          </g>
        </svg>
        <p className="text-center text-xs text-foreground/50 mt-2 italic" style={{ fontFamily: 'var(--font-body)' }}>
          Alt text: An animated diagram of the brain showing how substances flood the dopamine reward pathway with 2–10 times normal dopamine levels, leading to neurological adaptation and dependence.
        </p>
      </div>
    </div>
  );
}

/* ── Blog Post ─────────────────────────────────────────────────────── */

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 1"
        title="When Drinking Stops Working: Recognizing the Signs of Addiction"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'When Drinking Stops Working' },
        ]}
        description="A compassionate guide to understanding when substance use has crossed from choice to compulsion — and why reaching out is an act of courage, not weakness."
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Body font for the article */}
          <div style={{ fontFamily: 'var(--font-body)' }}>

            {/* Opening */}
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              There is a moment that many of our clients describe — a quiet, private moment — when something shifts. Maybe it was waking up after another night you cannot fully remember. Maybe it was watching your hands shake before your first drink of the day. Or perhaps it was the look on someone&apos;s face when they realized you were not okay.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              Whatever that moment looked like for you, we want you to know: recognizing it is not a sign of failure. It is, in fact, the very beginning of something brave. At Seven Arrows Recovery, we have walked alongside hundreds of people who stood exactly where you might be standing right now — wondering whether what they are experiencing is &ldquo;bad enough&rdquo; to warrant help.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              The answer is simpler than you think: if you are asking the question, the answer matters. Let us walk through what addiction actually looks like — not the Hollywood version, but the real, human version.
            </p>

            {/* Section: The Spectrum */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              The Spectrum of Substance Use
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              One of the most important things to understand about addiction is that it does not appear overnight. It exists on a spectrum — a gradual progression that often happens so slowly that it is nearly invisible to the person experiencing it.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We understand this at Seven Arrows Recovery because many of our clients tell us the same thing: &ldquo;I never thought it would get this far.&rdquo; That is not a personal failing — it is the nature of how substance use disorders develop.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Substance use generally progresses through four stages, each one building quietly on the last. Understanding where you or a loved one falls on this spectrum can bring clarity to a confusing situation.
            </p>

            <SpectrumInfographic />

            <p className="text-foreground/80 leading-relaxed mb-4">
              The progression from casual use to addiction is not a moral failing — it is a neurobiological process. As use increases, the brain physically changes how it processes reward, motivation, and decision-making. This is why so many people feel trapped: by the time they recognize the problem, their brain chemistry has already shifted.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              If you recognize yourself somewhere on this spectrum, that awareness itself is powerful. Whether you are in the early stages of misuse or deep in active addiction, there is always a path forward — and it does not have to be walked alone. Substance abuse help is available no matter where you are in this journey, and addiction treatment near me is often closer than you think.
            </p>

            {/* Section: 10 Signs */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              10 Signs It Might Be Time to Ask for Help
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The clinical world uses specific criteria to evaluate substance use disorders, drawn from the Diagnostic and Statistical Manual of Mental Disorders (DSM-5). But behind every clinical criterion is a deeply human experience. Below are ten signs, written not as a diagnosis but as an invitation for honest self-reflection.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              As you read through these, be gentle with yourself. This is not about shame — it is about clarity. Many of our clients at Seven Arrows find that simply naming what they have been experiencing brings a profound sense of relief.
            </p>

            <SelfAssessment />

            <p className="text-foreground/80 leading-relaxed mb-4">
              If you found yourself recognizing three, five, or even all ten of these signs, please know that you are not alone. These patterns are remarkably common, and they are remarkably treatable. The warning signs of drug addiction or alcohol dependence are not a life sentence — they are a signpost pointing toward the help that is waiting for you.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              At Seven Arrows Recovery, we have seen people arrive carrying every single one of these burdens — and leave months later with a clarity and peace they had forgotten was possible.
            </p>

            {/* Section: Why It's Not About Willpower */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Why It Is Not About Willpower
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Perhaps the most damaging myth about addiction is that it is a choice — that people who struggle with substance use simply lack the willpower or moral character to stop. This could not be further from the truth, and modern neuroscience has made this abundantly clear.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Addiction is a brain disease. Not metaphorically, not loosely — literally. Substances hijack the brain&apos;s reward system, specifically the dopamine pathway that evolved to reinforce behaviors essential for survival like eating, bonding, and resting.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              When a substance enters the brain, it can flood the system with two to ten times the amount of dopamine that natural rewards produce. Over time, the brain adapts: it produces less dopamine naturally and becomes less sensitive to it. The result is that a person needs the substance just to feel normal — and the things that once brought joy (relationships, hobbies, career) lose their ability to register as rewarding.
            </p>

            <DopaminePathway />

            <p className="text-foreground/80 leading-relaxed mb-4">
              This is why telling someone with an addiction to &ldquo;just stop&rdquo; is like telling someone with a broken leg to &ldquo;just walk.&rdquo; The machinery is compromised. Recovery requires professional support — medical, therapeutic, and often spiritual — to help the brain and body heal.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              At Seven Arrows Recovery, our TraumAddiction&trade; approach recognizes that addiction almost always has deeper roots: unresolved trauma, untreated mental health conditions, chronic stress, or a combination of all three. We do not just treat the symptoms of substance use — we help our clients understand and heal the underlying pain that drove them to use in the first place.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              Understanding that addiction is a disease — not a defect of character — can be one of the most liberating realizations in early recovery. It means that what you are experiencing is not your fault, but what you do next is within your power.
            </p>

            {/* Closing CTA */}
            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                You Have Already Taken the First Step
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-6 max-w-xl mx-auto">
                By reading this far, you have done something many people never do: you have allowed yourself to consider the possibility that things could be different. That takes courage.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
                Now that you have recognized the signs, let us talk about what treatment actually looks like. It is not what you see in movies — and it might be exactly what you need.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:8669964308" className="btn-primary">
                  Call (866) 996-4308
                </a>
                <Link href="/who-we-are/recovery-roadmap" className="btn-outline">
                  View Full Series
                </Link>
              </div>
            </div>

            {/* Series navigation */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50 mb-4">
                <strong className="text-foreground/70">This is Episode 1 of &ldquo;The Recovery Roadmap&rdquo;</strong> — an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
              </p>
              <Link
                href="/who-we-are/blog/what-happens-first-week"
                className="group flex items-stretch gap-4 p-4 rounded-xl border border-primary/25 hover:border-primary/55 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="shrink-0 w-24 sm:w-32 aspect-[4/3] rounded-lg overflow-hidden bg-warm-bg">
                  <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80"
                    alt="What Happens When You Walk Through the Door — Your First Week in Treatment"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Episode 2
                    <span className="w-5 h-px bg-primary/40" aria-hidden="true" />
                    Next up
                  </span>
                  <p
                    className="text-foreground font-bold leading-snug group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    What Happens When You Walk Through the Door — Your First Week in Treatment
                  </p>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Read Episode 2
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
