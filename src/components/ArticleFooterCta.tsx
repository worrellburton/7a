import Link from 'next/link';

// The standard article closer used by the established root articles:
// warm-bg admissions CTA followed by the Recovery Roadmap series link.
// Extracted verbatim from the hand-coded article template so DB-backed
// posts can close identically. `episodeNumber` renders the "This is
// Episode N" line when known; DB posts omit it.

export default function ArticleFooterCta({ episodeNumber }: { episodeNumber?: number }) {
  return (
    <>
      <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center mt-12">
        <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Start the Recovery Journey at Seven Arrows Recovery
        </h3>
        <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
          You don&rsquo;t have to walk this road alone. Our admissions team in Arizona is ready to listen, answer your questions, and help you find the next right step &mdash; whatever that looks like for you or your loved one.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:8667181665" className="btn-primary">
            Call (866) 718-1665
          </a>
          <Link href="/admissions" className="btn-outline">
            Start Admissions
          </Link>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <p className="text-sm text-foreground/50 mb-4">
          <strong className="text-foreground/70">
            {episodeNumber ? `This is Episode ${episodeNumber} of “The Recovery Roadmap”` : 'Part of “The Recovery Roadmap”'}
          </strong>{' '}
          &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
        </p>
        <Link
          href="/who-we-are/recovery-roadmap"
          className="group flex items-stretch gap-4 p-4 rounded-xl border border-primary/25 hover:border-primary/55 hover:shadow-lg transition-all duration-300 bg-white"
        >
          <div className="shrink-0 w-24 sm:w-32 aspect-[4/3] rounded-lg overflow-hidden bg-warm-bg flex items-center justify-center">
            <svg className="w-10 h-10 text-primary/60" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="14" x2="16" y2="14" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Series
              <span className="w-5 h-px bg-primary/40" aria-hidden="true" />
              All episodes
            </span>
            <p
              className="text-foreground font-bold leading-snug group-hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
            >
              The Recovery Roadmap &mdash; every episode in order
            </p>
            <span
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 group-hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Browse the full series
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </Link>
      </div>
    </>
  );
}
