'use client';

import { useState } from 'react';

// Collapsible admissions call-flow reference for phone operators. Sits on
// the Calls page as a single "row" that drops down the full 13-step cheat
// sheet when pressed — so an operator can keep the script a click away
// while taking calls, without it crowding the live log.

// A step item is either a plain bullet or a verbatim script line (the
// quoted phrasing operators can lean on), which renders italic with a
// left accent rule.
type Item = string | { script: string };
interface Step { n: number; title: string; items: Item[]; }

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Initial Contact / Opening the Call',
    items: [
      'Warm greeting and introduction.',
      { script: 'Thank you for calling [Program Name], this is [Name], how can I help you today?' },
      'Build rapport quickly — tone matters more than script.',
      'Identify caller type: self (potential client) or family member / referral source.',
    ],
  },
  {
    n: 2,
    title: 'Immediate Needs & Safety Check',
    items: [
      'Assess urgency:',
      { script: 'Are you safe right now?' },
      { script: 'When was your last use?' },
      'Determine if detox is needed immediately.',
      'If crisis-level → escalate appropriately (911, crisis line, or immediate detox placement).',
    ],
  },
  {
    n: 3,
    title: 'Program Overview (If Appropriate)',
    items: [
      'Brief explanation of services: detox (if applicable), residential / inpatient.',
      'Keep it simple and tailored to what they shared.',
      { script: 'Based on what you’re telling me, we may be a good fit for…' },
    ],
  },
  {
    n: 4,
    title: 'Information Gathering (Soft Intake Start)',
    items: [
      'Collect essential details conversationally:',
      'Full name · DOB · contact information.',
      'Substance use history (type, frequency, amount).',
      'Mental health concerns (if disclosed).',
      'Current living situation.',
    ],
  },
  {
    n: 5,
    title: 'Insurance Collection (VOB Trigger)',
    items: [
      'Request insurance details: provider, member ID, group number (if applicable).',
      'Ask for insurance card (front & back):',
      { script: 'You can text or email it to us, whatever is easiest for you.' },
      'Action step: enter data into Dazos, then submit for VOB via the automated system (if integrated) or email to the VOB team.',
    ],
  },
  {
    n: 6,
    title: 'Set Expectations for VOB',
    items: [
      'Clearly explain next steps:',
      { script: 'We’re going to verify your insurance benefits now.' },
      { script: 'This usually takes about 20 min – 1 hr or so.' },
      'Reassure:',
      { script: 'As soon as we have answers, we’ll call you back and go over everything with you.' },
    ],
  },
  {
    n: 7,
    title: 'Engagement While Awaiting VOB',
    items: [
      'Keep them emotionally engaged:',
      { script: 'What made you reach out today?' },
      { script: 'What are you hoping your life looks like after treatment?' },
      'Initiate PAA (Pre-Authorization Assessment) if possible.',
      'Address concerns: cost fears, work / family obligations, fear of treatment.',
    ],
  },
  {
    n: 8,
    title: 'VOB Results Call (Follow-Up Call Flow)',
    items: [
      'Reconnect:',
      { script: 'Hi [Name], this is [Name] from [Program], I have your insurance results.' },
      'Review benefits: coverage details (keep it simple), any out-of-pocket costs, authorization requirements (if applicable).',
      'Financial discussion — if balance exists, introduce the Payment Arrangement Agreement. Be transparent but supportive.',
    ],
  },
  {
    n: 9,
    title: 'Clinical Recommendation',
    items: [
      'Based on substance use, withdrawal risk, mental health, and environment.',
      'Recommend detox, residential, or outpatient — or refer out if not appropriate.',
    ],
  },
  {
    n: 10,
    title: 'Close for Admission',
    items: [
      'Direct but supportive close:',
      { script: 'Based on everything, the best next step would be [level of care]. We can get you admitted as soon as today / tomorrow.' },
      'Handle objections. Reinforce urgency without pressure.',
    ],
  },
  {
    n: 11,
    title: 'Logistics & Intake Completion',
    items: [
      'If client agrees, schedule admission date / time.',
      'Provide what to bring, arrival instructions, and transportation options.',
      'Complete intake documentation in the system.',
    ],
  },
  {
    n: 12,
    title: 'If Not Admitting',
    items: [
      'Offer alternatives: a different level of care or referral partners.',
      'Leave the door open:',
      { script: 'If anything changes, we’re here for you.' },
    ],
  },
  {
    n: 13,
    title: 'Follow-Up Protocol',
    items: [
      'If no answer: call + text + email.',
      'Example cadence: same-day follow-up, next day, 48 hours.',
      'Keep tone supportive, not pushy.',
    ],
  },
];

const KEY_PRINCIPLES = ['Connection over script.', 'Clarity over complexity.', 'Speed matters (VOB turnaround).'];

function StepBlock({ step }: { step: Step }) {
  return (
    <div className="break-inside-avoid">
      <p className="flex items-baseline gap-1.5 text-sm font-semibold text-foreground">
        <span className="text-[11px] font-bold tabular-nums text-primary">{step.n}.</span>
        {step.title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {step.items.map((item, i) =>
          typeof item === 'string' ? (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground/70">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
              <span>{item}</span>
            </li>
          ) : (
            <li key={i} className="border-l-2 border-primary/30 pl-2 text-[13px] italic leading-snug text-foreground/55">
              “{item.script}”
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export function OperatorCheatSheet() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative rounded-3xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      {/* The "row" — press to drop the cheat sheet down. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 sm:px-7 py-4 text-left hover:bg-white/30 transition-colors"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold tracking-wide text-primary ring-2 ring-white shadow-sm">
          CF
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Operator cheat sheet</p>
          <p className="text-[11px] text-foreground/50">Admissions call flow · inbound &amp; outbound · {STEPS.length} steps</p>
        </div>
        <svg
          className={`w-4 h-4 text-foreground/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 sm:px-7 pb-6 pt-1">
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 border-t border-foreground/10 pt-4">
            {STEPS.map((step) => <StepBlock key={step.n} step={step} />)}
          </div>

          <div className="mt-6 border-t border-foreground/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Key principles</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
              {KEY_PRINCIPLES.map((p) => (
                <span key={p} className="flex items-center gap-1.5 text-[13px] text-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {p}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[12px] italic leading-snug text-foreground/45">
              This call flow is a guide. Every caller is different — use judgment, adapt to the conversation, and meet the
              caller where they are while still working toward the next step in the admissions process.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
