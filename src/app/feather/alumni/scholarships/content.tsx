'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Scholarship {
  id: string;
  name: string;
  description: string | null;
  eligibility: string | null;
  deadline: string | null;
  contact_email: string | null;
}

export default function ScholarshipsContent() {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alumni_scholarships')
      .select('id, name, description, eligibility, deadline, contact_email')
      .eq('is_active', true)
      .order('deadline', { ascending: true, nullsFirst: false });
    setRows((data ?? []) as Scholarship[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Scholarships</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Help with what comes after treatment.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          Continuing-care, education, and sober-living awards from Seven Arrows + partner foundations.
          Contact the coordinator listed on each card for next steps.
        </p>
      </header>

      {/* Alumni Re-Entry Scholarship — a featured, content-driven
          panel that sits above the dynamic award cards. It documents
          the long-standing Seven Arrows policy for alumni who have
          relapsed and want to return to treatment. Kept as static
          editorial rather than a row in alumni_scholarships because
          it's a perennial program with prose (commitment list +
          letter framing) rather than a date-bound award. */}
      <ReEntryScholarshipPanel />

      {/* Section header for the dynamic list — only renders when
          there's at least one other scholarship to show, so the
          re-entry panel above can carry the page by itself when
          the partner-foundation list is empty. */}
      {!loading && rows.length > 0 && (
        <div className="mt-10 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground/50 mb-1">Other awards</p>
          <p className="text-[13px] text-foreground/55">Open scholarships from Seven Arrows and partner foundations.</p>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-[13px] text-foreground/55 italic">Loading other awards…</p>
      ) : rows.length === 0 ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((s) => (
            <article key={s.id} className="rounded-2xl border border-primary/20 bg-white p-5">
              <h2 className="text-[16px] font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</h2>
              {s.description && <p className="mt-2 text-[13px] text-foreground/70 leading-relaxed">{s.description}</p>}
              {s.eligibility && (
                <p className="mt-2 text-[12px] text-foreground/55">
                  <strong className="text-foreground/75 font-semibold">Eligibility: </strong>{s.eligibility}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                {s.deadline ? (
                  <span className="text-foreground/55">
                    Deadline: <span className="font-semibold text-foreground/75">{new Date(s.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                ) : <span className="text-foreground/45">Rolling</span>}
                {s.contact_email && (
                  <a href={`mailto:${s.contact_email}`} className="text-primary font-semibold hover:underline">Apply →</a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// Static editorial panel for the alumni relapse re-entry scholarship.
// Lives in this file rather than the alumni_scholarships table because
// it's a perennial program with prose (a letter framing + a
// commitment checklist) instead of a date-bound award. Designed to
// anchor the page even when no other awards are open — the gradient
// border + checklist + CTA make it read as a featured offer.
const COMMITMENTS = [
  'Attend all required groups',
  'Arrive on time and participate consistently',
  'Follow program expectations',
  'Immerse themselves completely in the treatment process',
  'Demonstrate a sincere commitment to their recovery',
];

function ReEntryScholarshipPanel() {
  return (
    <section
      aria-labelledby="reentry-scholarship-title"
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/8 via-warm-bg/40 to-white p-6 sm:p-8 shadow-[0_18px_36px_-22px_rgba(140,80,40,0.25)]"
    >
      {/* Soft top-right glow — pure decoration, scoped to this card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-50"
        style={{ background: 'radial-gradient(closest-side, rgba(216,137,102,0.35), rgba(216,137,102,0) 70%)' }}
      />

      <header className="relative">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-2">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-primary" />
          Alumni Re-Entry
        </p>
        <h2
          id="reentry-scholarship-title"
          className="text-2xl sm:text-[28px] font-bold text-foreground leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          If you&rsquo;ve relapsed, we&rsquo;re still here.
        </h2>
        <p className="mt-1.5 text-[13px] text-foreground/55 italic">A letter to our alumni.</p>
      </header>

      <div
        className="relative mt-5 space-y-4 text-[14px] text-foreground/80 leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <p>Dear Seven Arrows Alumni,</p>
        <p>
          We are grateful for the continued connection we share with our alumni community and recognize that
          recovery is an ongoing journey. At Seven Arrows Recovery, we understand that relapse can happen, and
          we want our alumni to know that support is available.
        </p>
        <p>
          Seven Arrows Recovery will periodically offer alumni scholarships to alumni who have experienced a
          relapse and feel that returning to treatment is necessary.
        </p>
        <p>
          This scholarship opportunity is available to Seven Arrows alumni only and is intended for individuals
          who are ready and willing to fully re-engage in the treatment process.
        </p>
      </div>

      {/* Commitment checklist — each requirement as its own row with
          a check icon so the eye doesn't skim past them. */}
      <div className="relative mt-6 rounded-2xl border border-primary/15 bg-white/70 backdrop-blur-sm p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55 mb-3">
          Approved scholarship recipients must agree to
        </p>
        <ul className="space-y-2.5">
          {COMMITMENTS.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[13.5px] text-foreground/80 leading-snug">
              <span
                aria-hidden
                className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/12 text-primary shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <path d="M4 10.5l3.5 3.5L16 5.5" />
                </svg>
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next-step CTA — Placida's contact info pulled out of the
          letter body so it doesn't get lost in prose. */}
      <a
        href="mailto:placida.valdez@sevenarrowsrecovery.com?subject=Alumni%20Re-Entry%20Scholarship%20Pre-Assessment"
        className="relative mt-6 flex items-center gap-4 rounded-2xl border border-primary/25 bg-white px-5 py-4 hover:border-primary/45 hover:shadow-md transition-all group"
      >
        <span
          aria-hidden
          className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white text-[15px] font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          PV
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-0.5">
            Step 1 · Pre-assessment
          </span>
          <span className="block text-[14px] font-semibold text-foreground">
            Contact Placida Valdez
          </span>
          <span className="block text-[12.5px] text-foreground/60 truncate">
            placida.valdez@sevenarrowsrecovery.com
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </a>

      <p className="relative mt-4 text-[12.5px] text-foreground/55 italic">
        After the pre-assessment, individuals will be guided through the hardship and approval process.
        Scholarships are limited and reviewed on a case-by-case basis.
      </p>

      <p
        className="relative mt-5 pt-4 border-t border-primary/15 text-[13px] text-foreground/70 leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        We are honored to continue supporting our alumni and remain committed to walking alongside you in
        recovery.
      </p>
    </section>
  );
}
