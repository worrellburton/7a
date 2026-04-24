'use client';

import { useEffect, useRef, useState } from 'react';
import { usePersona, type Persona } from './PersonaContext';

/**
 * Phase 9 — FAQ by persona (tabbed).
 *
 * Three tabs, three sets of questions. Each tab addresses the
 * objections the persona actually raises on admissions calls. The
 * active tab syncs with the global persona selection when possible
 * (so choosing "for a loved one" in the splitter lights the matching
 * tab here), and an inline tap-to-call CTA lives inside each answer
 * so the FAQ converts rather than just informs.
 *
 * SEO note: we emit Schema.org FAQPage markup for the *active* tab
 * each render. Emitting all tabs at once produces duplicate-question
 * markup that search engines can downrank. The active tab still
 * carries the keyword-rich answers, and switching tabs swaps the
 * structured data live.
 */

type Tab = 'self' | 'loved_one' | 'professional';

interface QA {
  q: string;
  a: string;
}

const faqs: Record<Tab, { label: string; hint: string; items: QA[] }> = {
  self: {
    label: 'For yourself',
    hint: 'The person who\'d be in treatment.',
    items: [
      {
        q: 'Will I be able to keep my job or obligations during treatment?',
        a: 'Most clients take a medical leave under FMLA or equivalent state protection. We coordinate with HR and legal support when needed, write employer letters, and help you plan the conversation with your employer. Short-term disability often covers residential treatment too.',
      },
      {
        q: 'How fast can I actually get in?',
        a: 'Most clients admit within 24 to 48 hours of their first call. Medical detox coordination can add a few days if needed. When the situation is urgent, we flex the intake window aggressively.',
      },
      {
        q: 'What if I\'m still using when I call?',
        a: 'That\'s the expected starting point for most admissions calls. We\'ll talk with you right where you are, coordinate medical detox if needed, and build an admission plan that accounts for the reality of today, not some hypothetical clean version of you.',
      },
      {
        q: 'Do I need to have already tried outpatient or rehab before?',
        a: 'No. Residential is often the right first step — especially when trauma is involved or the home environment won\'t support recovery. Skipping straight to residential is not "overkill"; it\'s often the difference between working and not.',
      },
      {
        q: 'What does a typical day look like?',
        a: 'Morning practice (yoga, breathwork, or quiet), individual therapy with your primary clinician, group therapy, lunch together, equine or experiential work, free time on the land, dinner together, evening circle or reflection. Structure heavy, not stifling.',
      },
      {
        q: 'How long is the program?',
        a: '30, 60, or 90+ days depending on clinical needs. Most clients benefit from at least 60. We won\'t hold you longer than you need, and we won\'t discharge you before you\'re ready.',
      },
    ],
  },
  loved_one: {
    label: 'For a loved one',
    hint: 'A family member, partner, or close friend.',
    items: [
      {
        q: 'My loved one says they don\'t need treatment. What do we do?',
        a: 'That\'s the most common starting point in our admissions calls. We can walk you through a compassionate conversation, and when it\'s warranted we coordinate a professional interventionist who holds the room. Details on /treatment/interventions.',
      },
      {
        q: 'How often will I be able to communicate with them?',
        a: 'Phone contact is structured starting in the first week; in-person visits begin after the initial stabilization window (typically week two). Family support sessions are weekly. We don\'t go dark — we set intentional rhythms that support the clinical work.',
      },
      {
        q: 'Is there support for us, the family?',
        a: 'Yes — weekly family support sessions, open-enrollment family education groups, quarterly family weekends on the ranch, and a clear family track in our alumni community after discharge. The family is part of the patient system, not an afterthought.',
      },
      {
        q: 'What should I do tonight, before anything else happens?',
        a: 'Sleep. Eat. Stop negotiating with the addiction. Call us tomorrow — or tonight if it\'s urgent. The situation has been building for months or years; a calm night of rest won\'t make it worse, and you\'ll be more effective with the conversation in the morning.',
      },
      {
        q: 'What if my loved one relapses after?',
        a: 'Relapse is not failure, and it is not the end of care. Our alumni line is open 24/7, re-admission is streamlined, and every returning client gets a clinical review rather than a sales call. Most lasting recovery journeys include at least one slip.',
      },
      {
        q: 'Can I pay anonymously or keep this off my insurance records?',
        a: 'Private pay is available and fully confidential. Insurance treatment is also covered by federal privacy law (42 CFR Part 2), which provides stronger protection than standard HIPAA. We can walk you through both paths.',
      },
    ],
  },
  professional: {
    label: 'For referrers',
    hint: 'Clinicians, interventionists, EAPs, attorneys, case managers.',
    items: [
      {
        q: 'What\'s your intake bandwidth right now?',
        a: 'We maintain small-census residential on purpose (low client-to-staff ratio, 1:1 primary-clinician care). Availability varies by week. Call admissions directly — we\'ll give you an accurate intake window rather than a sales answer.',
      },
      {
        q: 'Do you accept medical-hold or commitment referrals?',
        a: 'Case-by-case. We\'re equipped for voluntary adult residential care. Referrals involving court commitment, active psychosis, or acute medical instability are assessed with our medical director for appropriate fit or a warm handoff to a suitable partner.',
      },
      {
        q: 'What\'s your MAT stance?',
        a: 'Fully MAT-supportive. Buprenorphine, methadone-continuation, and naltrexone protocols are managed by an addiction-medicine physician. We do not require clients to discontinue MAT to admit.',
      },
      {
        q: 'Do you coordinate directly with outside clinicians post-discharge?',
        a: 'Yes — we build the aftercare plan with the receiving clinician rather than at them. Discharge summaries, treatment plan rationale, and ROI-authorized clinical contact are standard.',
      },
      {
        q: 'What\'s your outcomes data?',
        a: 'Happy to share on a referral-by-referral basis. Small-census environments produce different numbers than large-volume programs; we\'ll walk you through our measurement approach and what it tracks rather than pretend to industry-standard comparability.',
      },
      {
        q: 'What\'s the best way to reach your clinical leadership directly?',
        a: 'Call admissions and ask for the clinical director or medical director. Referring professionals get a direct line rather than the main funnel — we take the relationship seriously.',
      },
    ],
  },
};

export default function PersonaFAQ() {
  const { persona } = usePersona();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const initialTab: Tab =
    persona === 'self' ? 'self' : persona === 'loved_one' ? 'loved_one' : 'self';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  // Keep tab in sync when the global persona changes (splitter, ribbon).
  useEffect(() => {
    if (persona === 'self') setTab('self');
    else if (persona === 'loved_one') setTab('loved_one');
  }, [persona]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = faqs[tab];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: active.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section
      ref={ref}
      id="landing-faq"
      className="py-24 lg:py-32 bg-white scroll-mt-20"
      aria-labelledby="faq-heading"
    >
      <script
        type="application/ld+json"
        // Active-tab schema only, re-emitted per tab change.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="text-center mb-10 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label justify-center mb-4">Frequently Asked</p>
          <h2
            id="faq-heading"
            className="text-foreground font-bold tracking-tight mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            The questions we actually get — <em className="not-italic text-primary">sorted by who&rsquo;s asking.</em>
          </h2>
          <p
            className="text-foreground/65 leading-relaxed max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Pick the tab that fits. Each answer is written in the voice
            of the admissions team you&rsquo;ll actually talk to.
          </p>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="FAQ categories"
          className="grid sm:grid-cols-3 gap-2 mb-8 lg:mb-10 p-1.5 rounded-2xl bg-warm-bg border border-black/5"
        >
          {(Object.keys(faqs) as Tab[]).map((key) => {
            const selected = key === tab;
            const meta = faqs[key];
            return (
              <button
                key={key}
                role="tab"
                aria-selected={selected}
                aria-controls={`faq-panel-${key}`}
                onClick={() => {
                  setTab(key);
                  setOpenIdx(0);
                }}
                className={`relative rounded-xl px-4 py-3 text-left transition-all ${
                  selected ? 'bg-white shadow-sm border border-primary/20' : 'hover:bg-white/60'
                }`}
              >
                <p
                  className={`text-[11px] tracking-[0.22em] uppercase font-bold ${
                    selected ? 'text-primary' : 'text-foreground/50'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {meta.label}
                </p>
                <p
                  className={`text-[13px] mt-0.5 ${selected ? 'text-foreground/75' : 'text-foreground/55'}`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {meta.hint}
                </p>
              </button>
            );
          })}
        </div>

        {/* Q&A list */}
        <div id={`faq-panel-${tab}`} role="tabpanel" className="space-y-3">
          {active.items.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <article
                key={item.q}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'bg-warm-bg border-primary/30 shadow-sm' : 'bg-white border-black/5 hover:border-primary/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 lg:p-6 text-left"
                  aria-expanded={isOpen}
                >
                  <h3
                    className="text-foreground font-bold pr-4"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.05rem, 1.3vw, 1.2rem)',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.q}
                  </h3>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-primary/30 text-primary transition-transform ${
                      isOpen ? 'rotate-45 bg-primary text-white' : 'bg-white'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-500 ease-out"
                  style={{ maxHeight: isOpen ? '500px' : '0px', opacity: isOpen ? 1 : 0 }}
                >
                  <div className="px-5 lg:px-6 pb-5 lg:pb-6 -mt-1">
                    <p
                      className="text-foreground/75 leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {item.a}
                    </p>
                    <p
                      className="mt-3 text-[13px]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <a
                        href="tel:+18669964308"
                        className="text-primary font-semibold underline decoration-primary/30 hover:decoration-primary"
                      >
                        Call admissions to ask more
                      </a>
                      {' · '}
                      <a
                        href="/admissions"
                        className="text-foreground/60 hover:text-primary underline decoration-foreground/20 hover:decoration-primary"
                      >
                        verify insurance
                      </a>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
