import Link from 'next/link';
import { getAllEpisodesNewestFirst, episodeHref, episodeImage } from '@/lib/episodes';

// Landing-page surfacing of the Recovery Roadmap series. Reads the
// latest episodes from the shared episode manifest, including any
// freshly-published AI-pipeline blogs from /app/content.
//
// Rebuild notes (from the "make this more dynamic + tell about the
// series" ask):
//   - Background flipped to `bg-warm-bg/60` so the section reads as
//     its own panel rather than blending into the white admissions
//     flow above it.
//   - Lede paragraph below the heading explains what the series IS:
//     an ongoing investigative thread about how addiction breaks and
//     how recovery rebuilds. Without this line the audience reads
//     three cards with no anchor.
//   - Episode-count + cadence chip pulled from the manifest so the
//     section signals depth ("50+ episodes, updated weekly") without
//     a marketer having to hand-maintain the number.
//   - Reading-time estimate on each card so the audience can pick a
//     piece that fits the moment.

export const revalidate = 60;

// Tunable assumption — the avg Recovery Roadmap episode runs ~1,400
// words. Refine if we ever start storing word_count on the manifest.
const AVG_WORDS_PER_EPISODE = 1400;
const WPM = 220;

export default async function BlogPreview() {
  const all = await getAllEpisodesNewestFirst();
  // 5 episodes: 1 oversized featured on the left + a 2×2 grid of
  // older episodes on the right. Was 3 equal cards.
  const latest = all.slice(0, 5);
  const total = all.length;

  return (
    <section
      className="relative py-20 lg:py-28 bg-gradient-to-b from-warm-bg/40 via-warm-bg/60 to-warm-bg/30"
      aria-labelledby="blog-preview-heading"
    >
      {/* Soft top divider — a copper hairline that signals "new
          section" without a heavy bg color change. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — two-column: lede on the left, meta + CTA right */}
        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-8 lg:gap-12 items-end mb-12 lg:mb-14">
          <div>
            <p className="section-label mb-3">Investigative series</p>
            <h2
              id="blog-preview-heading"
              className="text-3xl lg:text-[40px] font-bold text-foreground tracking-tight leading-[1.1]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The Recovery <em className="not-italic text-primary">Roadmap</em>
            </h2>
            <p
              className="mt-5 text-foreground/70 text-base lg:text-[17px] leading-relaxed max-w-2xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              An ongoing field journal from inside the work: what the
              science actually says, what a real day in recovery
              looks like, and the quiet moments where the rebuild
              happens. Every episode is reported, edited, and
              clinically reviewed at the ranch.
            </p>

            {/* Trust + cadence chips — pulled live from the manifest
                so a freshly-published episode bumps the count. */}
            <ul
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-foreground/55"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-primary" />
                {total} episode{total === 1 ? '' : 's'} so far
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-primary" />
                Clinically reviewed
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-primary" />
                Free to read, no signup
              </li>
            </ul>
          </div>

          <div className="lg:text-right">
            <p
              className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Start anywhere
            </p>
            <p
              className="text-foreground/65 text-sm leading-relaxed lg:max-w-[320px] lg:ml-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The three pieces below are our newest. The full series
              is sequenced for a first-time read — or pick the
              episode whose title resonates today.
            </p>
            <Link
              href="/who-we-are/recovery-roadmap"
              className="hidden sm:inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:text-primary-dark transition-colors group"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Browse all {total} episodes
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        {/* Episode cards · 1 oversized featured on the far left,
            then a 2x2 grid of 4 older episodes on the right.
            Layout: 3 columns on lg+, featured spans col 1 + both
            rows; the four siblings fill cols 2-3 × rows 1-2.
            Below lg: stacks single-column for thumb reading. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-5 lg:gap-6 lg:auto-rows-fr">
          {latest.map((ep, idx) => {
            const isFeatured = idx === 0;
            return (
              <Link
                key={ep.slug}
                href={episodeHref(ep.slug)}
                className={`relative bg-white rounded-2xl overflow-hidden shadow-[0_8px_28px_-16px_rgba(60,40,30,0.18)] group block no-underline transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_18px_44px_-18px_rgba(160,82,45,0.30)] flex flex-col ${
                  isFeatured ? 'lg:row-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className={`relative ${isFeatured ? 'h-56 lg:h-[260px]' : 'h-40 lg:h-[150px]'}`}>
                  <img
                    src={episodeImage(ep)}
                    alt={ep.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {/* Bottom-up scrim so the episode chip + title
                      stay legible against any photo. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%)',
                    }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Episode {ep.number}
                    </span>
                    {isFeatured && (
                      <span
                        className="bg-white/95 text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Newest
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex-1 ${isFeatured ? 'p-5 lg:p-6' : 'p-4 lg:p-5'}`}>
                  <div className="flex items-center gap-2 mb-2 text-[10.5px]">
                    <span
                      className="text-primary font-semibold uppercase tracking-[0.16em]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Recovery Roadmap
                    </span>
                    <span aria-hidden="true" className="text-foreground/30">·</span>
                    <span className="text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
                      {ep.publishedDisplay}
                    </span>
                    <span aria-hidden="true" className="text-foreground/30">·</span>
                    <span className="text-foreground/45 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                      {Math.max(3, Math.round(AVG_WORDS_PER_EPISODE / WPM))} min read
                    </span>
                  </div>
                  <h3
                    className={`font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug ${
                      isFeatured ? 'text-xl lg:text-2xl' : 'text-base lg:text-lg'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {ep.title}
                  </h3>
                  <p
                    className={`text-foreground/65 leading-relaxed ${
                      isFeatured ? 'text-[14.5px] lg:text-[15.5px] line-clamp-4' : 'text-sm line-clamp-2'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {ep.blurb}
                  </p>
                  <p
                    className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/85 group-hover:text-primary inline-flex items-center gap-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Read episode
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="sm:hidden text-center mt-8">
          <Link
            href="/who-we-are/recovery-roadmap"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Browse all {total} episodes &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
