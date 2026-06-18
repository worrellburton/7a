'use client';

import Link from 'next/link';

// Reports landing — shows the cards for every available pre-built
// report. Each card deep-links to the report's own page (own data
// fetch, own PDF export). New reports get added to the REPORTS
// array below; the layout renders them automatically.

interface ReportCard {
  href: string;
  badge: string;     // small uppercase label above the title
  title: string;
  description: string;
  iconPath: string;  // 24x24 stroke icon path
  accent: 'primary' | 'emerald' | 'blue' | 'amber';
}

const REPORTS: ReportCard[] = [
  {
    href: '/feather/ctm/reports/recovery-com',
    badge: 'Source · Paid',
    title: 'Recovery.com performance',
    description:
      'Every call attributed to the Recovery.com listing — volume, lead quality, operator handling, conversion likelihood, and a paste-into-an-email summary. PDF export included.',
    iconPath:
      'M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9zM12 7v5l3 3',
    accent: 'primary',
  },
];

export default function ReportsLandingContent() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header — same glass plank as the calls page so the route
          feels like a natural sibling. */}
      <header className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <Link
              href="/feather/ctm"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/45 hover:text-primary uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Calls
            </Link>
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Reports
            </h1>
            <p className="text-[11px] sm:text-sm text-foreground/55 mt-0.5">
              Pre-built rollups of the call log, ready to print or send.
            </p>
          </div>
        </div>
      </header>

      {/* Report cards. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <ReportCardLink key={r.href} card={r} />
        ))}
      </div>

      {REPORTS.length === 1 && (
        <p className="mt-6 text-xs text-foreground/45 max-w-xl">
          More reports will land here as we build them — by referrer, by
          insurance, by time of day, by operator. Tell admissions which
          rollup would save them the most pasting and we&rsquo;ll add
          it to the queue.
        </p>
      )}
    </div>
  );
}

function ReportCardLink({ card }: { card: ReportCard }) {
  const accentRing =
    card.accent === 'primary'
      ? 'group-hover:border-primary/45'
      : card.accent === 'emerald'
        ? 'group-hover:border-emerald-300'
        : card.accent === 'blue'
          ? 'group-hover:border-blue-300'
          : 'group-hover:border-amber-300';
  const iconBg =
    card.accent === 'primary'
      ? 'bg-primary/10 text-primary'
      : card.accent === 'emerald'
        ? 'bg-emerald-100 text-emerald-700'
        : card.accent === 'blue'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700';
  return (
    <Link
      href={card.href}
      className={`group relative block rounded-2xl border border-white/70 bg-white/65 supports-[backdrop-filter]:bg-white/50 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(60,48,42,0.25)] hover:shadow-[0_18px_40px_-18px_rgba(60,48,42,0.32)] transition-all p-5 ${accentRing}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/85 to-transparent" />
      <div className="flex items-start gap-4">
        <span className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl ${iconBg}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={card.iconPath} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/40">{card.badge}</p>
          <h2 className="mt-0.5 text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {card.title}
          </h2>
          <p className="mt-1 text-[12.5px] text-foreground/65 leading-snug">
            {card.description}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary opacity-80 group-hover:opacity-100 transition-opacity">
            Open report
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
