'use client';

import { useEffect, useRef, useState } from 'react';

interface Opening {
  title: string;
  category: 'Clinical' | 'Medical' | 'Direct care' | 'Holistic' | 'Operations';
  type: 'Full-time' | 'Part-time' | 'PRN';
  credentials: string;
  description: string;
}

const openings: Opening[] = [
  {
    title: 'Licensed Clinical Social Worker',
    category: 'Clinical',
    type: 'Full-time',
    credentials: 'LCSW · Arizona license required · EMDR/SE/IFS preferred',
    description:
      'Primary clinician role. Weekly individual therapy with a small caseload (4–6 clients), co-facilitated process groups, and EMDR/ART/IFS work as clinically indicated. Works alongside psychiatry, nursing, and BHT in weekly interdisciplinary rounds.',
  },
  {
    title: 'Licensed Professional Counselor',
    category: 'Clinical',
    type: 'Full-time',
    credentials: 'LPC / LMFT · Arizona license required · Trauma training preferred',
    description:
      'Primary clinician or co-clinician role depending on experience. Same small caseload model, full access to the interdisciplinary team, and meaningful say in treatment-planning decisions for your clients.',
  },
  {
    title: 'Licensed Independent Substance Abuse Counselor',
    category: 'Clinical',
    type: 'Full-time',
    credentials: 'LISAC / LASAC · Arizona license',
    description:
      'Addiction-focused clinical role. Leads process groups on relapse prevention, stage-of-change, and substance-specific psychoeducation. Carries a primary or co-primary caseload.',
  },
  {
    title: 'Registered Nurse',
    category: 'Medical',
    type: 'Full-time',
    credentials: 'RN · Current Arizona license · Behavioral health experience preferred',
    description:
      'Medication administration, medical monitoring, and coordination with the medical director. Shift work with a small team — days, evenings, and a weekend rotation. Behavioral-health background is a strong plus.',
  },
  {
    title: 'Behavioral Health Technician',
    category: 'Direct care',
    type: 'Full-time',
    credentials: 'BHT or CNA certification · On-the-job training provided',
    description:
      'The spine of day-to-day residential life. Supports clients through meals, groups, ranch activities, and evening milieu. No clinical role required — warmth, steadiness, and good boundaries are the job.',
  },
  {
    title: 'Admissions Counselor',
    category: 'Operations',
    type: 'Full-time',
    credentials: 'Admissions or healthcare intake experience · Licensed clinician a plus',
    description:
      'First point of contact for clients and families. Runs phone assessments, coordinates insurance verification, schedules intake, and arranges travel logistics. Rotates through a 24/7 coverage schedule.',
  },
  {
    title: 'Yoga & Mindfulness Teacher',
    category: 'Holistic',
    type: 'Part-time',
    credentials: 'E-RYT 500 or TCTSY-certified · Trauma-informed experience',
    description:
      'Leads trauma-informed hatha and restorative sessions several times a week. Familiarity with polyvagal framing and somatic cues is essential; specific lineage (Oakland, Bay Area, Insight) welcome.',
  },
  {
    title: 'Equine-Assisted Psychotherapy Facilitator',
    category: 'Holistic',
    type: 'Part-time',
    credentials: 'EAGALA / Natural Lifemanship or equivalent · Licensed co-facilitator',
    description:
      'Co-facilitates EAP sessions with a licensed therapist. Works with our resident herd on the ranch. Equine experience + certification in an EAP model is required.',
  },
];

export default function OpenPositions() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState<Opening['category'] | 'All'>('All');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const categories: ('All' | Opening['category'])[] = ['All', 'Clinical', 'Medical', 'Direct care', 'Holistic', 'Operations'];
  const shown = filter === 'All' ? openings : openings.filter((o) => o.category === filter);

  return (
    <section
      id="openings"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-white"
      aria-labelledby="openings-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Open positions</p>
          <h2
            id="openings-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Roles we&rsquo;re hiring <em className="not-italic text-primary">right now</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Eight current openings across clinical, medical, direct care,
            holistic, and operations. Don&rsquo;t see a match? Email us anyway
            &mdash; the list is never the whole list.
          </p>
        </div>

        <ul
          className="flex flex-wrap gap-2.5 mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.85s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}
        >
          {categories.map((c) => {
            const active = filter === c;
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setFilter(c)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-foreground/75 border-black/10 hover:text-primary hover:border-primary/30'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="space-y-4">
          {shown.map((o, i) => (
            <li
              key={o.title}
              className="rounded-2xl bg-warm-bg border border-black/5 p-6 lg:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.06}s`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p
                    className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span className="inline-block w-5 h-px bg-primary/70" aria-hidden="true" />
                    {o.category}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.1 }}
                  >
                    {o.title}
                  </h3>
                  <p
                    className="text-foreground/55 text-[11.5px] tracking-[0.1em] uppercase font-semibold"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {o.credentials}
                  </p>
                </div>
                <span
                  className="shrink-0 inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-semibold tracking-[0.18em] uppercase"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {o.type}
                </span>
              </div>
              <p
                className="text-foreground/70 leading-relaxed text-[15px] mt-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {o.description}
              </p>
              <a
                href={`mailto:careers@sevenarrowsrecovery.com?subject=${encodeURIComponent(o.title)}`}
                className="inline-flex items-center gap-1.5 mt-5 text-primary font-semibold border-b border-primary/40 pb-0.5 tracking-[0.1em] uppercase text-[11px] hover:text-primary-dark hover:border-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Apply for this role
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
