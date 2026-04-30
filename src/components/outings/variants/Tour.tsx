import Link from 'next/link';
import type { OutingWithImage } from '@/lib/outings-data';

// Tour variant — magazine-style alternating list. Each outing is a
// full row with image on one side and copy on the other; the row
// direction flips on every other entry so the page reads as a
// reel scroll rather than a grid. Includes a 2-digit index because
// the tour page is itinerary-shaped (prospects want to picture
// "what's day 3 going to look like"). Background is warm-bg so the
// section sits between the page's darker hero and lighter detail
// sections without competing.

export default function Tour({ outings }: { outings: OutingWithImage[] }) {
  return (
    <section
      className="bg-warm-bg/60 py-20 lg:py-28"
      aria-labelledby="outings-heading-tour"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14 lg:mb-20">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            On the itinerary
          </p>
          <h2
            id="outings-heading-tour"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.6vw, 2.8rem)',
              lineHeight: 1.05,
            }}
          >
            Where the program meets the land.
          </h2>
          <p
            className="mt-5 text-foreground/70 text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Eight off-site outings rotate through the program — each one
            paired with the clinical week it best fits. Selection adjusts to
            weather, group composition, and the rhythm of the cohort.
          </p>
        </div>

        <ol className="space-y-16 lg:space-y-24" role="list">
          {outings.map((outing, idx) => {
            const cached = outing.image;
            const flipped = idx % 2 === 1;
            return (
              <li
                key={outing.slug}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center ${
                  flipped ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div className="lg:col-span-7">
                  <Link
                    href={outing.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/tour block relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-sm hover:shadow-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`${outing.name} — visit official site`}
                  >
                    <div className="relative aspect-[16/10] w-full bg-warm-bg/40">
                      {cached ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cached.imageUrl}
                          alt={`${outing.name}, ${outing.region}`}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover/tour:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover/tour:scale-100"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-br from-warm-bg via-warm-bg/70 to-primary/10"
                        />
                      )}
                      {cached?.credit && (
                        <p className="absolute bottom-2 right-3 text-[9px] tracking-wide text-white/65 mix-blend-difference">
                          Photo: {cached.credit}
                          {cached.license ? ` · ${cached.license}` : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>

                <div className="lg:col-span-5">
                  <p
                    className="text-[11px] font-mono font-semibold tracking-[0.18em] text-primary/70 mb-3"
                    aria-hidden="true"
                  >
                    {String(idx + 1).padStart(2, '0')} / {String(outings.length).padStart(2, '0')}
                  </p>
                  <p
                    className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-3"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {outing.region}
                  </p>
                  <h3
                    className="text-foreground font-bold tracking-tight"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
                      lineHeight: 1.1,
                    }}
                  >
                    {outing.name}
                  </h3>
                  <p
                    className="mt-4 text-foreground/75 text-[15px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {outing.body}
                  </p>
                  <Link
                    href={outing.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-primary hover:text-primary-dark transition-colors"
                  >
                    Visit official site
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>

        <p
          className="mt-20 text-center text-[12px] text-foreground/45"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Outings vary with weather, season, and clinical pacing. Every trip
          is staffed by trauma-informed clinicians.
        </p>
      </div>
    </section>
  );
}
