'use client';




import Link from 'next/link';

import { useEffect, useRef, useState } from 'react';
import PageHero from '@/components/PageHero';

/* ── Animated Timeline ────────────────────────────────────────────── */

const days = [
  {
    day: 1,
    title: 'Arrival & Intake',
    desc: 'You\'re welcomed by our admissions team. A thorough medical and psychological assessment sets the foundation for your personalized treatment plan.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M16 4v24M8 12l8-8 8 8" />
        <rect x="6" y="22" width="20" height="6" rx="2" />
      </svg>
    ),
  },
  {
    day: 2,
    title: 'Medical Stabilization',
    desc: 'Our medical team monitors your vitals, manages withdrawal symptoms with MAT if needed, and ensures your physical safety around the clock.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M16 6v20M6 16h20" />
        <rect x="4" y="4" width="24" height="24" rx="4" />
      </svg>
    ),
  },
  {
    day: 3,
    title: 'Meeting Your Team',
    desc: 'You\'ll meet your primary counselor, psychiatrist, and the clinical team. Together you\'ll review your treatment plan and set goals for the week.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="16" cy="10" r="5" />
        <circle cx="6" cy="14" r="3" />
        <circle cx="26" cy="14" r="3" />
        <path d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    ),
  },
  {
    day: 4,
    title: 'First Group Session',
    desc: 'Join your first group therapy session. You\'ll find a safe space where others understand exactly what you\'re going through — no judgment.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="10" cy="12" r="4" />
        <circle cx="22" cy="12" r="4" />
        <path d="M4 28c0-3.3 2.7-6 6-6h2M20 22h2c3.3 0 6 2.7 6 6" />
        <path d="M16 16v8" />
      </svg>
    ),
  },
  {
    day: 5,
    title: 'Holistic Activities Begin',
    desc: 'Yoga, breathwork, equine therapy, or a walk in the Swisshelm Mountains. Your body begins to heal alongside your mind.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 28 L14 12 L18 20 L22 14 L26 28" />
        <circle cx="24" cy="8" r="3" />
      </svg>
    ),
  },
  {
    day: 6,
    title: 'Deeper Therapeutic Work',
    desc: 'Individual therapy sessions begin in earnest. Your counselor helps you explore the roots of your addiction using Forward-Facing Freedom® techniques.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="16" cy="16" r="10" />
        <path d="M16 10v6l4 2" />
        <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    day: 7,
    title: 'Finding Your Rhythm',
    desc: 'By now you have a routine, a support network, and the first signs of hope. The hardest part is behind you — and the real work of recovery begins.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M16 4l3 7h7l-5.5 4.5 2 7.5L16 19l-6.5 4 2-7.5L6 11h7z" />
      </svg>
    ),
  },
];

function TimelineInfographic() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="my-12">
      {/* Desktop: horizontal path */}
      <div className="hidden lg:block relative">
        {/* Connecting line */}
        <div className="absolute top-10 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-primary transition-all ease-out"
            style={{ width: visible ? '100%' : '0%', transitionDuration: '2500ms' }}
          />
        </div>
        <div className="grid grid-cols-7 gap-3 relative">
          {days.map((d, i) => (
            <div
              key={d.day}
              className="flex flex-col items-center text-center transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 200}ms`,
              }}
            >
              <div className="w-20 h-20 rounded-full bg-white border-2 border-primary/30 flex items-center justify-center text-primary mb-3 relative z-10">
                {d.icon}
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                Day {d.day}
              </span>
              <h4 className="text-xs font-bold text-foreground mb-1">{d.title}</h4>
              <p className="text-[10px] text-foreground/60 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                {d.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="lg:hidden space-y-6">
        {days.map((d, i) => (
          <div
            key={d.day}
            className="flex gap-4 transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-20px)',
              transitionDelay: `${i * 150}ms`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {d.icon}
              </div>
              {i < days.length - 1 && <div className="w-0.5 flex-1 bg-primary/20 mt-2" />}
            </div>
            <div className="pb-6">
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary" style={{ fontFamily: 'var(--font-body)' }}>Day {d.day}</span>
              <h4 className="text-sm font-bold text-foreground">{d.title}</h4>
              <p className="text-sm text-foreground/70 leading-relaxed mt-1" style={{ fontFamily: 'var(--font-body)' }}>{d.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Withdrawal Curve Chart ───────────────────────────────────────── */

function WithdrawalChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="my-12 bg-warm-bg rounded-2xl p-6 lg:p-10">
      <h3 className="text-lg font-bold text-foreground mb-2">Typical Withdrawal Symptom Curve</h3>
      <p className="text-sm text-foreground/60 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
        Intensity over time — with and without medical support
      </p>
      <svg viewBox="0 0 600 250" className="w-full" aria-label="Withdrawal symptom intensity chart">
        {/* Grid lines */}
        {[50, 100, 150, 200].map((y) => (
          <line key={y} x1="60" y1={y} x2="580" y2={y} stroke="#e0d6cc" strokeWidth="0.5" strokeDasharray="4 4" />
        ))}
        {/* X axis labels */}
        {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'].map((label, i) => (
          <text key={label} x={90 + i * 72} y={235} textAnchor="middle" fill="#8b7355" fontSize="11" fontFamily="var(--font-body)">{label}</text>
        ))}
        {/* Y axis */}
        <text x="15" y="55" fill="#8b7355" fontSize="10" fontFamily="var(--font-body)">High</text>
        <text x="15" y="205" fill="#8b7355" fontSize="10" fontFamily="var(--font-body)">Low</text>

        {/* Without treatment curve (higher, red) */}
        <path
          d="M90 180 Q160 40 230 50 Q310 55 380 80 Q450 110 520 130 Q550 140 560 145"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="800"
          strokeDashoffset={visible ? '0' : '800'}
          style={{ transition: 'stroke-dashoffset 2s ease-out' }}
        />
        {/* With MAT curve (lower, green) */}
        <path
          d="M90 185 Q160 110 230 120 Q310 125 380 140 Q450 160 520 175 Q550 180 560 182"
          fill="none"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="800"
          strokeDashoffset={visible ? '0' : '800'}
          style={{ transition: 'stroke-dashoffset 2s ease-out 0.5s' }}
        />

        {/* Annotation: peak */}
        <circle cx="230" cy="50" r="4" fill="#dc2626" opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 1.5s' }} />
        <text x="235" y="38" fill="#dc2626" fontSize="10" fontWeight="600" opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 1.5s' }}>Peak without support</text>

        {/* Annotation: MAT */}
        <circle cx="230" cy="120" r="4" fill="#16a34a" opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 2s' }} />
        <text x="235" y="112" fill="#16a34a" fontSize="10" fontWeight="600" opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.5s ease 2s' }}>With medical support (MAT)</text>

        {/* Legend */}
        <line x1="400" y1="20" x2="420" y2="20" stroke="#dc2626" strokeWidth="2" />
        <text x="425" y="24" fill="#666" fontSize="10">Without treatment</text>
        <line x1="400" y1="36" x2="420" y2="36" stroke="#16a34a" strokeWidth="2" />
        <text x="425" y="40" fill="#666" fontSize="10">With MAT support</text>
      </svg>
    </div>
  );
}

/* ── Care Team Section ────────────────────────────────────────────── */

const teamRoles = [
  {
    title: 'Primary Counselor',
    desc: 'Your anchor through treatment. They lead your individual therapy sessions, track your progress, and advocate for your needs. You\'ll meet weekly, sometimes more.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <circle cx="20" cy="14" r="6" />
        <path d="M8 36c0-6.6 5.4-12 12-12s12 5.4 12 12" />
        <path d="M20 26v4" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    title: 'Medical Team',
    desc: 'Nurses, physicians, and psychiatrists who manage your physical health, oversee detox, prescribe MAT when appropriate, and monitor your wellbeing 24/7.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <rect x="8" y="8" width="24" height="24" rx="4" />
        <path d="M20 14v12M14 20h12" />
      </svg>
    ),
  },
  {
    title: 'Clinical Team',
    desc: 'Your primary clinician plus the trauma-informed group facilitators who hold process work, psychoeducation, and one-on-one sessions through the week.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <circle cx="14" cy="14" r="5" />
        <circle cx="26" cy="14" r="5" />
        <path d="M6 34c0-4.4 3.6-8 8-8M26 26c4.4 0 8 3.6 8 8" />
        <path d="M20 22v10" />
      </svg>
    ),
  },
  {
    title: 'Holistic Facilitators',
    desc: 'Yoga instructors, equine specialists, breathwork guides, and expressive arts and music-for-healing facilitators who help you reconnect with your body in ways that don\'t require words.',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M20 8 Q8 20 20 32 Q32 20 20 8Z" />
        <circle cx="20" cy="20" r="4" />
      </svg>
    ),
  },
];

/* ── Main Page ────────────────────────────────────────────────────── */

export default function PageContent() {
  return (
    <>
      <PageHero
        label="Episode 2 — The Recovery Roadmap"
        title="What Happens When You Walk Through the Door"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'What Happens Your First Week' },
        ]}
        description="Your first week in treatment, demystified. A day-by-day guide for anyone afraid to make the call."
        image="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80"
        width="narrow"
      />

      <article className="py-16 lg:py-24">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link href="/who-we-are/blog/when-drinking-stops-working" className="text-primary text-sm font-semibold hover:underline mb-8 inline-block" style={{ fontFamily: 'var(--font-body)' }}>
            &larr; Episode 1: When Drinking Stops Working
          </Link>

          {/* Opening */}
          <p className="text-lg text-foreground/80 leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            If you&apos;re reading this, there&apos;s a good chance you&apos;re terrified. Maybe you&apos;re sitting in a parking lot, scrolling on your phone, wondering what would happen if you actually made the call. Maybe a loved one sent you this link. Maybe it&apos;s 3 a.m. and you can&apos;t sleep again.
          </p>
          <p className="text-lg text-foreground/80 leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Whatever brought you here — <strong>you&apos;re not alone, and you&apos;re not too far gone.</strong>
          </p>
          <p className="text-lg text-foreground/80 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
            The unknown is the scariest part. So let&apos;s take it away. Here&apos;s exactly what your first week at Seven Arrows Recovery looks like — day by day, hour by hour. No sugarcoating, no clinical jargon. Just the truth, told with compassion.
          </p>

          {/* Quote */}
          <blockquote className="border-l-4 border-primary pl-6 py-4 my-10 bg-warm-bg/50 rounded-r-xl">
            <p className="text-foreground/80 text-lg italic leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              &ldquo;The wound is the place where the Light enters you.&rdquo;
            </p>
            <cite className="text-primary text-sm font-semibold mt-2 block not-italic">— Rumi</cite>
          </blockquote>

          {/* Day by Day Section */}
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
            Day by Day: Your First 7 Days
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Every person&apos;s experience is different, but here&apos;s the general arc of your first week. Think of it as a map — not a script. Your care team will adjust everything to fit you.
          </p>
        </div>

        {/* Full-width timeline */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <TimelineInfographic />
        </div>

        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Image break */}
          <div className="my-12 rounded-2xl overflow-hidden aspect-[16/7]">
            <img
              src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80"
              alt="Peaceful meditation in nature"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Detox — coordinated, not on-site */}
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
            If detox is part of the picture
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Seven Arrows is a residential treatment program, not a detox facility. If the clinical team determines you need medical detox before admission, our admissions team coordinates a short stay at a trusted detox partner so you arrive at the ranch medically stable and ready for the work.
          </p>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Withdrawal symptoms typically peak between days 2–3 and begin to subside by days 5–7. With medical support at our partner detox, that peak is significantly lower and shorter — the difference between white-knuckling a storm and having shelter. Once detox is complete, your first day at Seven Arrows begins.
          </p>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Medication-assisted treatment (MAT) for opioid use is continued here in coordination with an addiction-medicine physician when clinically appropriate. We do not require clients to discontinue MAT as a condition of admission.
          </p>

          {/* Withdrawal Chart */}
          <WithdrawalChart />

          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Common experiences include anxiety, insomnia, sweating, nausea, and irritability. Some people describe it as a bad flu. Others say it&apos;s more emotional than physical — waves of sadness, anger, or overwhelming relief. All of it is normal. All of it passes.
          </p>

          {/* Quote */}
          <blockquote className="border-l-4 border-primary pl-6 py-4 my-10 bg-warm-bg/50 rounded-r-xl">
            <p className="text-foreground/80 text-lg italic leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              &ldquo;Trauma is not what happens to you. Trauma is what happens inside you as a result of what happens to you.&rdquo;
            </p>
            <cite className="text-primary text-sm font-semibold mt-2 block not-italic">— Dr. Gabor Maté</cite>
          </blockquote>

          {/* Image break */}
          <div className="my-12 rounded-2xl overflow-hidden aspect-[16/7]">
            <img
              src="/images/group-gathering-pavilion.jpg"
              alt="Residents and clinicians gathered at the Seven Arrows pavilion."
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* The People You'll Meet */}
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
            The People You&apos;ll Meet
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
            Recovery doesn&apos;t happen in isolation. From the moment you arrive, you&apos;ll be surrounded by people whose entire purpose is helping you heal. Here&apos;s who you&apos;ll meet:
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {teamRoles.map((role) => (
              <div key={role.title} className="bg-warm-bg rounded-2xl p-6 flex gap-4">
                <div className="shrink-0 text-primary">{role.icon}</div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{role.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{role.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            And then there are the other clients — people just like you, at different stages of the same journey. Many of our alumni say the friendships they formed in treatment are the most honest relationships they&apos;ve ever had. When you&apos;re stripped of all pretense, what&apos;s left is real.
          </p>

          {/* Image break - community */}
          <div className="my-12 rounded-2xl overflow-hidden aspect-[16/7]">
            <img
              src="/images/group-gathering-pavilion.jpg"
              alt="Group gathering at Seven Arrows Recovery"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Closing */}
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mt-14 mb-4">
            The Hardest Part Is Already Behind You
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            By the end of your first week, something will have shifted. It won&apos;t be dramatic — no Hollywood moment. But you&apos;ll notice that you slept a little better. That your hands are steadier. That you laughed at something someone said in group and it surprised you.
          </p>
          <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            The fear that kept you from calling? It&apos;s still there, but it&apos;s smaller now. And in its place, something new is growing. Not confidence exactly — more like a quiet willingness to keep going.
          </p>
          <p className="text-lg text-foreground font-semibold leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
            Now that you know what the first week looks like, let&apos;s explore the evidence-based therapies that will power your recovery.
          </p>

          {/* Next/Prev Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-gray-100 pt-8 mt-12">
            <Link
              href="/who-we-are/blog/when-drinking-stops-working"
              className="text-primary text-sm font-semibold hover:underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              &larr; Episode 1: When Drinking Stops Working
            </Link>
            <Link
              href="/who-we-are/recovery-roadmap"
              className="text-primary text-sm font-semibold hover:underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Back to the Recovery Roadmap &rarr;
            </Link>
          </div>

          {/* CTA */}
          <div className="mt-16 bg-dark-section rounded-2xl p-8 lg:p-12 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Take the First Step?</h3>
            <p className="text-white/70 leading-relaxed mb-6 max-w-lg mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
              Our admissions team is available 24/7 to walk you through the process. The call is free, confidential, and there&apos;s zero pressure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:8669964308" className="btn-primary">Call (866) 996-4308</a>
              <Link href="/admissions" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">Start Admissions</Link>
            </div>
          </div>

          {/* FAQ Schema */}
          <div className="mt-16">
            <h2 className="text-xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'How long does detox take?',
                  a: 'Detox typically lasts 5-7 days depending on the substance, duration of use, and individual factors. With medical support and MAT, symptoms are managed to keep you safe and as comfortable as possible.',
                },
                {
                  q: 'Can I bring my phone to rehab?',
                  a: 'Phone policies vary by facility. At Seven Arrows, we allow limited phone access during designated times so you can stay connected with family while focusing on recovery.',
                },
                {
                  q: 'What if I\'m not ready for group therapy?',
                  a: 'That\'s completely normal. Nobody is forced to share before they\'re ready. In your first sessions, you\'re welcome to simply listen. Most people find that hearing others\' stories helps them feel less alone.',
                },
              ].map((faq, i) => (
                <div key={i} className="bg-warm-bg rounded-xl p-6">
                  <h3 className="font-bold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Schema structured data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  { '@type': 'Question', name: 'How long does detox take?', acceptedAnswer: { '@type': 'Answer', text: 'Detox typically lasts 5-7 days depending on the substance, duration of use, and individual factors. With medical support and MAT, symptoms are managed to keep you safe and as comfortable as possible.' } },
                  { '@type': 'Question', name: 'Can I bring my phone to rehab?', acceptedAnswer: { '@type': 'Answer', text: 'Phone policies vary by facility. At Seven Arrows, we allow limited phone access during designated times so you can stay connected with family while focusing on recovery.' } },
                  { '@type': 'Question', name: 'What if I\'m not ready for group therapy?', acceptedAnswer: { '@type': 'Answer', text: 'That\'s completely normal. Nobody is forced to share before they\'re ready. In your first sessions, you\'re welcome to simply listen. Most people find that hearing others\' stories helps them feel less alone.' } },
                ],
              }),
            }}
          />
        </div>
      </article>
    </>
  );
}
