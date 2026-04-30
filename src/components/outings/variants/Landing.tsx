import Link from 'next/link';
import type { OutingWithImage } from '@/lib/outings-data';

// Landing variant — cinematic horizontal-scroll snap carousel on a
// dark warm-charcoal background. Wider 3:2 landscape cards with the
// caption always visible (no hover reveal, since the homepage isn't
// a tactile catalog the way the holistic page is). Distinct from
// Experiential in three ways: dark theme, horizontal flow instead
// of grid, and headline copy that pitches "what you'll experience"
// rather than "the program weaves outings in."

export default function Landing({ outings }: { outings: OutingWithImage[] }) {
  return (
    <section
      className="relative isolate overflow-hidden py-20 lg:py-28"
      style={{
        background:
          'linear-gradient(180deg, #2a0f0a 0%, #1a1a1a 48%, #0e0e0e 100%)',
      }}
      aria-labelledby="outings-heading-landing"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 lg:mb-12">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              You won&rsquo;t just be in a building.
            </p>
            <h2
              id="outings-heading-landing"
              className="text-white font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.05,
              }}
            >
              Cochise County, all of it.
            </h2>
            <p
              className="mt-5 text-white/70 text-base leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Sky islands, dark-sky parks, mining towns, Indigenous trails,
              and a quiet you can hear. Every outing on the program is
              staffed by trauma-informed clinicians.
            </p>
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.22em] text-white/35 lg:text-right"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Scroll →
          </p>
        </div>
      </div>

      {/* Edge-bleed scroll container — cards continue off the right
          edge of the screen so it reads as a horizontal stream rather
          than a contained grid. snap-x snap-mandatory keeps each card
          centered on flick. */}
      <div className="relative">
        <ul
          role="list"
          className="flex gap-5 lg:gap-7 overflow-x-auto snap-x snap-mandatory scroll-smooth pl-4 pr-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2))] pb-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {outings.map((outing) => {
            const cached = outing.image;
            return (
              <li
                key={outing.slug}
                className="snap-start shrink-0 w-[80vw] sm:w-[440px] lg:w-[520px]"
              >
                <Link
                  href={outing.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/landing block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#1a1a1a] rounded-2xl"
                  aria-label={`${outing.name} — visit official site`}
                >
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black/30">
                    <div className="relative aspect-[3/2] w-full">
                      {cached ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cached.imageUrl}
                          alt={`${outing.name}, ${outing.region}`}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover/landing:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/landing:scale-100"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black"
                        />
                      )}

                      <span
                        aria-hidden="true"
                        className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white/80 group-hover/landing:bg-accent group-hover/landing:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-3-7H4a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-3" />
                        </svg>
                      </span>
                    </div>

                    <div className="px-5 py-4 lg:px-6 lg:py-5 bg-black/50 supports-[backdrop-filter]:bg-black/40 backdrop-blur">
                      <p
                        className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent mb-2"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {outing.region}
                      </p>
                      <h3
                        className="text-white font-bold tracking-tight"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.35rem',
                          lineHeight: 1.15,
                        }}
                      >
                        {outing.name}
                      </h3>
                      <p
                        className="mt-2 text-white/75 text-[13px] leading-snug"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {outing.body}
                      </p>
                      {cached?.credit && (
                        <p className="mt-3 text-[9px] tracking-wide text-white/35">
                          Photo: {cached.credit}
                          {cached.license ? ` · ${cached.license}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
