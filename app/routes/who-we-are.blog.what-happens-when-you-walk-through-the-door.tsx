import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import { useEffect, useRef, useState } from 'react';
import PageHero from '~/components/PageHero';

export const meta: MetaFunction = () => [
  { title: 'What Happens When You Walk Through the Door: Your First Week in Treatment | Seven Arrows Recovery' },
  {
    name: 'description',
    content:
      'Wondering what to expect in rehab? Walk through your first week of treatment at Seven Arrows Recovery day by day — from intake and detox to your first group session and meeting your care team.',
  },
  { name: 'keywords', content: 'what to expect in rehab, first week of treatment, substance abuse treatment process, detox timeline, what happens in rehab, medical detox, medication-assisted treatment' },
];

/* ── Day-by-Day Timeline ───────────────────────────────────────────── */

function WeekTimeline() {
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

  const days = [
    {
      day: 1,
      title: 'Arrival & Intake',
      desc: 'Welcome, orientation, personal belongings check-in, and a warm meal. You will meet your admissions coordinator who guides you through paperwork and answers every question.',
      icon: (
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
    {
      day: 2,
      title: 'Medical Assessment',
      desc: 'A comprehensive physical exam, lab work, and psychiatric evaluation. Our medical team creates your personalized detox protocol and identifies any co-occurring conditions.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M12 11v6M9 14h6" />
        </g>
      ),
    },
    {
      day: 3,
      title: 'Detox Begins',
      desc: 'Medically supervised detoxification with 24/7 nursing care. Medication-assisted treatment (MAT) eases withdrawal symptoms. Rest is encouraged and expected.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6l3 3" />
          <circle cx="12" cy="14" r="8" />
        </g>
      ),
    },
    {
      day: 4,
      title: 'Settling In',
      desc: 'Symptoms begin to stabilize. You explore the facility, meet fellow residents, and share your first meals together. The desert landscape starts to feel like a sanctuary.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </g>
      ),
    },
    {
      day: 5,
      title: 'First Group Session',
      desc: 'Your first therapeutic group — a safe space to listen or share. Led by a licensed clinician, group therapy helps you realize you are not alone in this experience.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="3" />
          <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
          <circle cx="5" cy="9" r="2" opacity="0.5" />
          <circle cx="19" cy="9" r="2" opacity="0.5" />
        </g>
      ),
    },
    {
      day: 6,
      title: 'Meet Your Care Team',
      desc: 'You are introduced to your primary counselor, psychiatrist, and case manager. Together, you begin building your individualized treatment plan focused on your specific needs.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </g>
      ),
    },
    {
      day: 7,
      title: 'Your New Rhythm',
      desc: 'A full day in the program: morning meditation, breakfast, individual therapy, equine-assisted session, lunch, group work, free time in nature, and evening reflection.',
      icon: (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </g>
      ),
    },
  ];

  return (
    <div ref={ref} className="my-12">
      {/* Mobile: vertical timeline. Desktop: keep vertical for readability */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200">
          <div
            className="w-full bg-primary transition-all duration-[2500ms] ease-out"
            style={{ height: visible ? '100%' : '0%' }}
          />
        </div>

        <div className="space-y-8">
          {days.map((day, i) => (
            <div
              key={day.day}
              className="relative pl-16"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-30px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.15}s`,
              }}
            >
              {/* Day circle */}
              <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ fontFamily: 'var(--font-body)' }}>
                D{day.day}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" aria-hidden="true">{day.icon}</svg>
                  <h4 className="font-bold text-foreground">{day.title}</h4>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{day.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-foreground/50 mt-6 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Alt text: An animated vertical timeline showing the day-by-day journey through the first week of treatment, from arrival and intake through medical assessment, detox, first group session, and establishing a daily rhythm.
      </p>
    </div>
  );
}

/* ── Withdrawal Curve Chart ────────────────────────────────────────── */

function WithdrawalCurve() {
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
      <div className="w-full max-w-2xl bg-warm-bg rounded-2xl p-6 lg:p-8">
        <h4 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>Typical Withdrawal Symptom Curve</h4>
        <svg viewBox="0 0 600 280" className="w-full h-auto" role="img" aria-label="Animated line chart showing withdrawal symptom intensity over 7 days, with medical intervention reducing severity">
          {/* Grid */}
          <line x1="60" y1="30" x2="60" y2="230" stroke="#d4c5b5" strokeWidth="1" />
          <line x1="60" y1="230" x2="570" y2="230" stroke="#d4c5b5" strokeWidth="1" />

          {/* Y-axis labels */}
          <text x="50" y="45" textAnchor="end" fill="#8a7a6a" fontSize="10" fontFamily="Inter, sans-serif">High</text>
          <text x="50" y="135" textAnchor="end" fill="#8a7a6a" fontSize="10" fontFamily="Inter, sans-serif">Moderate</text>
          <text x="50" y="225" textAnchor="end" fill="#8a7a6a" fontSize="10" fontFamily="Inter, sans-serif">Low</text>
          <text x="15" y="135" textAnchor="middle" fill="#8a7a6a" fontSize="9" fontFamily="Inter, sans-serif" transform="rotate(-90,15,135)">Symptom Intensity</text>

          {/* X-axis day labels */}
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <text key={d} x={60 + d * 70} y="250" textAnchor="middle" fill="#8a7a6a" fontSize="10" fontFamily="Inter, sans-serif">Day {d}</text>
          ))}

          {/* Without treatment curve (higher, sharper peak) */}
          <path
            d="M130 200 Q200 40 270 50 Q340 60 410 120 Q480 180 540 190"
            fill="none"
            stroke="#eb4d4b"
            strokeWidth="2.5"
            strokeDasharray="400"
            opacity="0.6"
          >
            <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2s" fill="freeze" begin={visible ? '0.3s' : 'indefinite'} />
          </path>

          {/* With MAT curve (lower, gentler) */}
          <path
            d="M130 200 Q200 110 270 120 Q340 125 410 160 Q480 190 540 195"
            fill="none"
            stroke="#a0522d"
            strokeWidth="3"
            strokeDasharray="400"
          >
            <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2s" fill="freeze" begin={visible ? '0.8s' : 'indefinite'} />
          </path>

          {/* Shaded area between curves */}
          <path
            d="M130 200 Q200 40 270 50 Q340 60 410 120 Q480 180 540 190 L540 195 Q480 190 410 160 Q340 125 270 120 Q200 110 130 200Z"
            fill="#a0522d"
            opacity="0"
          >
            <animate attributeName="opacity" values="0;0.08" dur="1s" fill="freeze" begin={visible ? '2s' : 'indefinite'} />
          </path>

          {/* Annotations */}
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="0.6s" fill="freeze" begin={visible ? '2.5s' : 'indefinite'} />

            {/* Peak annotation */}
            <line x1="270" y1="50" x2="270" y2="120" stroke="#a0522d" strokeWidth="1" strokeDasharray="3 2" />
            <rect x="275" y="70" width="130" height="36" rx="6" fill="white" stroke="#a0522d" strokeWidth="1" />
            <text x="340" y="85" textAnchor="middle" fill="#a0522d" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">MAT reduces peak by</text>
            <text x="340" y="98" textAnchor="middle" fill="#a0522d" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">40–60%</text>
          </g>

          {/* Legend */}
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="0.6s" fill="freeze" begin={visible ? '2.8s' : 'indefinite'} />
            <line x1="130" y1="268" x2="155" y2="268" stroke="#eb4d4b" strokeWidth="2.5" opacity="0.6" />
            <text x="160" y="271" fill="#8a7a6a" fontSize="9" fontFamily="Inter, sans-serif">Without treatment</text>
            <line x1="300" y1="268" x2="325" y2="268" stroke="#a0522d" strokeWidth="3" />
            <text x="330" y="271" fill="#8a7a6a" fontSize="9" fontFamily="Inter, sans-serif">With medical support (MAT)</text>
          </g>
        </svg>
        <p className="text-center text-xs text-foreground/50 mt-2 italic" style={{ fontFamily: 'var(--font-body)' }}>
          Alt text: An animated line chart comparing withdrawal symptom intensity over 7 days with and without medication-assisted treatment, showing MAT reduces peak severity by 40–60%.
        </p>
      </div>
    </div>
  );
}

/* ── Blog Post ─────────────────────────────────────────────────────── */

export default function BlogPost2() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Part 2"
        title="What Happens When You Walk Through the Door"
        description="Your first week in treatment, demystified. A day-by-day guide to what really happens when you arrive at Seven Arrows Recovery — written for anyone who is afraid to make the call."
        image="/7a/images/covered-porch-desert-view.jpg"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            {/* Opening */}
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              If you are reading this, there is a good chance you are afraid. Maybe you have been thinking about treatment for weeks, months, or even years — and every time you get close to picking up the phone, the fear of the unknown pulls you back. What will it be like? Will I be alone? Will they judge me? What if I cannot handle it?
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              We hear these questions every day at Seven Arrows Recovery, and we want to answer them honestly. Not with clinical jargon or corporate reassurances, but with the truth about what your first week in treatment actually looks like — the hard parts, the surprising parts, and the moments that our clients tell us changed everything.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              The short version: it is not what you think. And it might be the most important week of your life.
            </p>

            {/* Section: Day by Day */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Day by Day: Your First 7 Days
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Every person&apos;s experience is different, but there is a general rhythm to the first week that most of our clients follow. Understanding what to expect in rehab can transform paralyzing fear into manageable anticipation.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              At Seven Arrows, you are not processed through a system. You are welcomed into a small community — typically just 10 to 12 residents — where every staff member knows your name by the end of day one. Here is what that first week typically looks like in our substance abuse treatment process:
            </p>

            <WeekTimeline />

            <p className="text-foreground/80 leading-relaxed mb-4">
              By the end of your first week, something remarkable happens: the place that felt terrifying on Day 1 begins to feel like a refuge. The desert air, the mountain views, the horses grazing outside your window, the quiet rhythm of a structured day — it all starts to settle into your bones.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              Our clients often tell us that the hardest part was not the detox or the therapy sessions — it was making the phone call. Everything after that was more bearable than they imagined.
            </p>

            {/* Section: What Detox Really Feels Like */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              What Detox Really Feels Like
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Let us be honest: detox is not comfortable. Depending on the substance, withdrawal can bring nausea, insomnia, anxiety, muscle aches, restlessness, and emotional waves that feel overwhelming. We are not going to pretend otherwise.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              But here is what makes the detox timeline at Seven Arrows fundamentally different from trying to quit on your own: you are never alone, and you are never without medical support.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Our medical team uses <strong>medication-assisted treatment (MAT)</strong> — FDA-approved medications that are specifically designed to ease withdrawal symptoms and reduce cravings. Depending on your situation, this might include medications like buprenorphine, naltrexone, or other comfort medications for sleep, anxiety, and physical symptoms.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The difference is dramatic. Without medical support, withdrawal symptoms can peak at extreme levels — sometimes dangerously so. With MAT and 24/7 nursing care, those peaks are reduced by 40 to 60 percent, and the overall duration of acute symptoms is shortened significantly.
            </p>

            <WithdrawalCurve />

            <p className="text-foreground/80 leading-relaxed mb-4">
              Most of our clients tell us that by Day 4 or 5, the worst physical symptoms have passed. What remains is a kind of emotional rawness — feelings that have been suppressed by substances for months or years suddenly becoming accessible again. This is actually a good sign. It means your brain is beginning to heal, and it is also where the real therapeutic work begins.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              You will not go through any of this alone. Our 6:1 client-to-staff ratio means there is always someone available — a nurse to adjust your comfort medications at 3 AM, a counselor to sit with you when emotions feel overwhelming, or simply a peer who understands exactly what you are going through.
            </p>

            {/* Section: The People You'll Meet */}
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              The People You Will Meet
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-6">
              Recovery does not happen in isolation — it happens in relationship. From the moment you arrive, you will be surrounded by people whose entire purpose is to support your healing. Here are the key people you will meet during your first week:
            </p>

            <div className="space-y-4 mb-10">
              {[
                {
                  role: 'Your Primary Counselor',
                  desc: 'A licensed therapist who becomes your anchor throughout treatment. They lead your individual sessions, help you set treatment goals, and check in regularly to ensure you feel heard and supported. Many of our counselors are themselves in long-term recovery — they understand this journey from the inside.',
                },
                {
                  role: 'The Medical Team',
                  desc: 'A physician, psychiatrist, and nursing staff who oversee your physical health, manage detox protocols, and address any co-occurring mental health conditions. They are available around the clock — not just during business hours.',
                },
                {
                  role: 'The Residential Staff',
                  desc: 'The people who keep the facility running and make it feel like home. They prepare meals, coordinate daily schedules, and are often the first people you turn to when you need a glass of water at midnight or help finding a quiet place to sit.',
                },
                {
                  role: 'Your Peers',
                  desc: 'Perhaps the most unexpected source of support. The other residents — people from completely different backgrounds who are fighting the same battle — become some of the most important relationships you will build. There is a bond that forms between people in early recovery that is unlike anything else.',
                },
                {
                  role: 'The Horses',
                  desc: 'Yes, really. Our equine-assisted therapy program introduces you to horses that have an uncanny ability to reflect your emotional state back to you. Many clients say their first breakthrough in treatment came not in a therapy room, but in a pasture.',
                },
              ].map((person, i) => (
                <div key={person.role} className="bg-warm-bg rounded-xl p-5">
                  <h4 className="font-bold text-foreground mb-1">{person.role}</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">{person.desc}</p>
                </div>
              ))}
            </div>

            {/* Closing CTA */}
            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                The Hardest Part Is Already Behind You
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-6 max-w-xl mx-auto">
                Now that you know what the first week looks like, let us explore the evidence-based therapies that will power your recovery — the clinical tools and holistic practices that help you build a life you do not need to escape from.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/who-we-are/blog" className="btn-primary">
                  Continue Reading the Series
                </Link>
                <a href="tel:8669964308" className="btn-outline">
                  Call (866) 996-4308
                </a>
              </div>
            </div>

            {/* FAQ Schema Suggestions */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold text-foreground mb-6" style={{ fontFamily: 'var(--font-sans)' }}>Frequently Asked Questions</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">How long does detox usually take?</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    Detox timelines vary by substance, but most acute withdrawal symptoms resolve within 5 to 7 days with medical support. Alcohol and benzodiazepine detox may require closer monitoring. At Seven Arrows, our medical team personalizes every detox protocol.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Can I bring personal items to treatment?</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    Yes. You can bring comfortable clothing, toiletries, books, and personal photos. Electronics are limited during the first week to help you focus on early recovery. Our admissions team provides a detailed packing list before arrival.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">What if I am afraid to go to group therapy?</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    This is completely normal. In your first group session, you are welcome to simply listen. There is no pressure to share before you are ready. Most clients find that hearing others&apos; stories is both comforting and powerful — it dissolves the isolation that addiction thrives on.
                  </p>
                </div>
              </div>
            </div>

            {/* Internal links */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50 mb-4">
                <strong className="text-foreground/70">This is Part 2 of &ldquo;The Recovery Roadmap&rdquo;</strong> — a five-part series from Seven Arrows Recovery.
              </p>
              <p className="text-sm text-foreground/50 mb-2">
                <strong>Previous:</strong>{' '}
                <Link href="/who-we-are/blog/when-drinking-stops-working" className="text-primary hover:text-primary-dark underline">
                  Part 1 — When Drinking Stops Working: Recognizing the Signs of Addiction
                </Link>
              </p>
              <p className="text-sm text-foreground/50">
                <strong>Next:</strong>{' '}
                <span className="text-foreground/40">Part 3 — Coming Soon: The Therapies That Power Your Recovery</span>
              </p>
            </div>

          </div>
        </div>
      </article>
    </>
  );
}
