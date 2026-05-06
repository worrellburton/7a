'use client';

// Operator Guide — single-viewport admissions call playbook.
// Locked to one viewport (no scroll) so an operator can keep this open
// on a second monitor or split-screen while taking the call. Every
// step from the Admissions Call Flow lives in its own dense card; the
// Key Principles strip stays pinned along the bottom.
//
// Layout: 4-column CSS grid, four rows.
//   Rows 1-3: steps 1-12, four per row.
//   Row 4:    step 13 (col 1) + Key Principles (cols 2-4).
// The grid itself uses min-h-0 + auto-rows-fr so cards split the
// remaining height evenly regardless of how much copy each holds.

import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';

interface Step {
  n: string;
  title: string;
  // Short opener under the title — the "what is this step" line.
  lead?: string;
  // Bullets the operator scans during the call. Keep these short.
  points: string[];
  // Optional verbatim phrase the operator can read aloud. Rendered
  // in italics with a quote glyph so it stands out from the bullets.
  say?: string;
  // Optional action / system step (e.g. "Enter into Dazos") rendered
  // as a stand-out chip.
  action?: string;
  accent: 'blue' | 'rose' | 'amber' | 'emerald' | 'violet' | 'orange';
}

const STEPS: Step[] = [
  {
    n: '1',
    title: 'Open the Call',
    lead: 'Warm greeting · identify the caller',
    say: 'Thank you for calling [Program], this is [Name], how can I help you today?',
    points: ['Tone matters more than script', 'Self · Family · Referral source', 'Build rapport in the first 10 seconds'],
    accent: 'blue',
  },
  {
    n: '2',
    title: 'Safety & Urgency',
    lead: 'Quick clinical check before anything else',
    points: ['"Are you safe right now?"', '"When was your last use?"', 'Detox needed immediately?', 'Crisis-level → 911 / crisis line / immediate detox'],
    accent: 'rose',
  },
  {
    n: '3',
    title: 'Program Overview',
    lead: 'Brief, tailored to what they shared',
    points: ['Detox · Residential · Inpatient', 'Keep it simple', 'Frame against their need, not a menu'],
    say: 'Based on what you’re telling me, we may be a good fit for…',
    accent: 'amber',
  },
  {
    n: '4',
    title: 'Soft Intake',
    lead: 'Gather essentials conversationally',
    points: ['Full name · DOB · Contact', 'Substance use: type, frequency, amount', 'Mental health concerns', 'Living situation'],
    accent: 'emerald',
  },
  {
    n: '5',
    title: 'Insurance · VOB Trigger',
    lead: 'Capture insurance to verify benefits',
    points: ['Provider · Member ID · Group #', 'Card front + back via text or email'],
    say: 'You can text or email it to us, whatever is easiest for you.',
    action: 'Enter in Dazos → submit VOB (auto or email)',
    accent: 'violet',
  },
  {
    n: '6',
    title: 'Set VOB Expectations',
    lead: 'Tell them what happens next',
    points: ['"We’re verifying your benefits now"', 'Expect ~20 min – 1 hr', '"As soon as we have answers, we’ll call back"'],
    accent: 'blue',
  },
  {
    n: '7',
    title: 'Engagement While Waiting',
    lead: 'Keep them connected, surface concerns',
    points: ['"What made you reach out today?"', '"What do you hope life looks like after?"', 'Address: cost · work · family · fear', 'Initiate PAA if possible'],
    accent: 'amber',
  },
  {
    n: '8',
    title: 'VOB Results Call',
    lead: 'Reconnect → review → financials',
    points: ['"Hi [Name], I have your insurance results"', 'Coverage · out-of-pocket · auth req’d', 'If balance: introduce Payment Arrangement Agreement', 'Transparent but supportive'],
    accent: 'emerald',
  },
  {
    n: '9',
    title: 'Clinical Recommendation',
    lead: 'Match level of care to the picture',
    points: ['Substance use · withdrawal risk', 'Mental health · environment', 'Detox · Residential · Outpatient', 'Refer out if not appropriate'],
    accent: 'rose',
  },
  {
    n: '10',
    title: 'Close for Admission',
    lead: 'Direct, supportive, urgent — not pushy',
    say: 'Based on everything, the best next step would be [LOC]. We can get you admitted as soon as today/tomorrow.',
    points: ['Handle objections', 'Reinforce urgency without pressure'],
    accent: 'violet',
  },
  {
    n: '11',
    title: 'Logistics & Intake',
    lead: 'If they agree to admit',
    points: ['Schedule admission date/time', 'What to bring · arrival · transport', 'Complete intake docs in system'],
    accent: 'blue',
  },
  {
    n: '12',
    title: 'If Not Admitting',
    lead: 'Leave the door open',
    points: ['Offer alternative LOCs', 'Hand off to referral partners', '"If anything changes, we’re here for you"'],
    accent: 'orange',
  },
  {
    n: '13',
    title: 'Follow-Up Protocol',
    lead: 'Cadence when there’s no answer',
    points: ['Same day · next day · 48 hr', 'Call + text + email', 'Tone: supportive, not pushy'],
    accent: 'amber',
  },
];

const ACCENT: Record<Step['accent'], { ring: string; chip: string; numBg: string }> = {
  blue:    { ring: 'border-sky-200/70',    chip: 'bg-sky-50 text-sky-800',       numBg: 'bg-sky-100 text-sky-700' },
  rose:    { ring: 'border-rose-200/70',   chip: 'bg-rose-50 text-rose-800',     numBg: 'bg-rose-100 text-rose-700' },
  amber:   { ring: 'border-amber-200/80',  chip: 'bg-amber-50 text-amber-900',   numBg: 'bg-amber-100 text-amber-800' },
  emerald: { ring: 'border-emerald-200/70',chip: 'bg-emerald-50 text-emerald-800', numBg: 'bg-emerald-100 text-emerald-700' },
  violet:  { ring: 'border-violet-200/70', chip: 'bg-violet-50 text-violet-800', numBg: 'bg-violet-100 text-violet-700' },
  orange:  { ring: 'border-orange-200/80', chip: 'bg-orange-50 text-orange-900', numBg: 'bg-orange-100 text-orange-800' },
};

function StepCard({ step }: { step: Step }) {
  const c = ACCENT[step.accent];
  return (
    <article
      className={`flex flex-col h-full min-h-0 rounded-xl border ${c.ring} bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur shadow-[0_4px_14px_-10px_rgba(60,48,42,0.25)] p-2.5 overflow-hidden`}
    >
      <header className="flex items-baseline gap-2 mb-1">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 ${c.numBg}`}>
          {step.n}
        </span>
        <h3 className="text-[12px] font-semibold text-foreground leading-tight tracking-tight truncate">{step.title}</h3>
      </header>
      {step.lead && (
        <p className="text-[10.5px] text-foreground/55 leading-snug mb-1.5">{step.lead}</p>
      )}
      {step.say && (
        <p className={`text-[10.5px] italic leading-snug rounded-md px-1.5 py-1 mb-1.5 ${c.chip}`}>
          <span aria-hidden="true" className="mr-0.5 opacity-60">&ldquo;</span>
          {step.say}
          <span aria-hidden="true" className="ml-0.5 opacity-60">&rdquo;</span>
        </p>
      )}
      <ul className="text-[10.5px] text-foreground/75 leading-snug space-y-0.5 list-disc pl-3.5 marker:text-foreground/30 min-h-0 overflow-hidden">
        {step.points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      {step.action && (
        <p className="mt-auto pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          ↳ {step.action}
        </p>
      )}
    </article>
  );
}

export default function OperatorGuideContent() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div
      className="h-[100dvh] flex flex-col gap-2 px-3 sm:px-5 py-3 sm:py-4 overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Compact header — back link, title, two-line pitch. */}
      <header className="flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex items-center gap-3">
          <Link
            href="/app/calls"
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55 hover:text-foreground transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Calls
          </Link>
          <span className="text-foreground/20">/</span>
          <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
            Operator Guide · Admissions Call Flow
          </h1>
        </div>
        <p className="hidden md:block text-[11px] text-foreground/45 italic shrink-0">
          Connection over script · Clarity over complexity · Speed matters
        </p>
      </header>

      {/* Step grid — fills the rest of the viewport. min-h-0 + auto-rows-fr
          is what actually divides the leftover height into equal rows. */}
      <div className="grid flex-1 min-h-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 grid-rows-[repeat(7,minmax(0,1fr))] sm:grid-rows-[repeat(5,minmax(0,1fr))] lg:grid-rows-4 gap-2">
        {STEPS.slice(0, 12).map((s) => (
          <StepCard key={s.n} step={s} />
        ))}

        {/* Step 13 sits in column 1 of the last row; principles fill 2-4. */}
        <StepCard step={STEPS[12]} />

        <section
          className="lg:col-span-3 sm:col-span-2 rounded-xl border border-primary/25 bg-gradient-to-br from-white/85 to-orange-50/60 supports-[backdrop-filter]:from-white/70 backdrop-blur shadow-[0_4px_14px_-10px_rgba(188,107,74,0.35)] p-2.5 flex flex-col overflow-hidden"
        >
          <header className="flex items-center gap-2 mb-1">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
            </svg>
            <h3 className="text-[12px] font-semibold text-foreground tracking-tight">Key Principles</h3>
          </header>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px] text-foreground/75 leading-snug">
            <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span><strong className="text-foreground">Connection</strong> over script.</span></li>
            <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span><strong className="text-foreground">Clarity</strong> over complexity.</span></li>
            <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span><strong className="text-foreground">Speed matters</strong> — VOB turnaround wins admits.</span></li>
            <li className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span>Adapt to the caller — meet them where they are.</span></li>
          </ul>
          <p className="mt-auto pt-1.5 text-[10px] text-foreground/45 italic leading-snug">
            This guide structures the call. Every caller is different — use judgment, respond to the conversation, and still work toward the next step.
          </p>
        </section>
      </div>
    </div>
  );
}
