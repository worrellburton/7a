'use client';

import { DepartmentPageNav } from '../DepartmentPageNav';

// Admissions page. Pared back to just the Gmail Templates launcher
// for now — the legacy arrivals timeline, status filters, stat cards,
// and origin-city map were removed when the team moved that workflow
// to Gmail. Templates here open a new compose tab pre-filled with the
// subject + body the team uses most.

export default function AdmissionsContent() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-3">
        <DepartmentPageNav />
      </div>
      <div className="px-4 sm:px-6 lg:px-10 pt-2 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Quick-launch Gmail templates for the admissions team.
        </p>
      </div>
      <div className="px-4 sm:px-6 lg:px-10 pb-10">
        <GmailTemplates />
      </div>
    </div>
  );
}

// Placeholder bodies — real PAA + Admissions Alert copy will replace
// these once the team finalizes the wording. The skeleton scaffolding
// (label, subject, gmailComposeUrl helper, button row) stays as is so
// swapping the copy is a one-field edit per template.
const GMAIL_TEMPLATES = [
  {
    id: 'paa',
    label: 'PAA',
    description: 'Pre-Admission Assessment intake',
    subject: 'test',
    body: 'test',
  },
  {
    id: 'admissions_alert',
    label: 'Admissions Alert',
    description: 'Heads-up to the team about an incoming arrival',
    subject: 'test',
    body: 'test',
  },
] as const;

function gmailComposeUrl(subject: string, body: string): string {
  // Gmail's compose-in-new-tab URL. `view=cm` opens compose, `fs=1`
  // forces fullscreen, `tf=1` flags it as a top-level frame so the
  // tab opens as a real compose window rather than an in-app modal.
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    tf: '1',
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function GmailTemplates() {
  return (
    <section
      className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5"
      aria-labelledby="gmail-templates-heading"
    >
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-foreground/55" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
        <h2
          id="gmail-templates-heading"
          className="text-[11px] uppercase tracking-[0.18em] font-bold text-foreground/55"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Start Gmail Templates
        </h2>
      </div>
      <p
        className="text-[12.5px] text-foreground/55 mb-3"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Each button opens a new Gmail tab with the subject and body pre-filled. Fields in [SQUARE BRACKETS] are placeholders to swap in.
      </p>
      <div className="flex flex-wrap gap-2">
        {GMAIL_TEMPLATES.map((t) => (
          <a
            key={t.id}
            href={gmailComposeUrl(t.subject, t.body)}
            target="_blank"
            rel="noreferrer"
            title={t.description}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-foreground text-white text-[12.5px] font-semibold hover:bg-foreground/85 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            {t.label}
          </a>
        ))}
      </div>
    </section>
  );
}
