import Link from 'next/link';
import { OUTINGS } from '@/lib/outings';
import { getServerSupabase } from '@/lib/supabase-server';

// Experiential-therapy outings — catalog presentation. Replaces the
// older "A Day of Practice" fictional schedule and the "Credentialed
// practitioners" tile. Each card is image-led: the photographic
// illustration generated from /lib/outings.ts is the canvas; the
// region eyebrow + name + link sit on top, with the body copy
// rising on hover.
//
// Image URLs are read server-side from public.outings_images (cache
// populated by /api/outings/preheat). Cards without a generated
// image fall back to a textured warm-bg surface so the catalog
// stays presentable while the cache is being warmed.

interface Cached {
  slug: string;
  image_url: string;
}

async function loadOutingImages(): Promise<Map<string, string>> {
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('outings_images')
      .select('slug, image_url');
    const map = new Map<string, string>();
    for (const row of (data ?? []) as Cached[]) {
      if (row.slug && row.image_url) map.set(row.slug, row.image_url);
    }
    return map;
  } catch {
    return new Map();
  }
}

export default async function OutingsExperiential() {
  const images = await loadOutingImages();

  return (
    <section className="bg-white py-20 lg:py-28" aria-labelledby="outings-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12 lg:mb-14">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Experiential therapy · off-site
          </p>
          <h2
            id="outings-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.6vw, 2.8rem)',
              lineHeight: 1.05,
            }}
          >
            The land does part of the work.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cochise County is one of the most varied corners of the American
            Southwest — alpine sky islands, Indigenous history, dark-sky
            preserves, and a quiet that is genuinely rare. We weave outings
            into the program so the body has somewhere new to be while the
            nervous system practices what it&rsquo;s learning indoors.
          </p>
        </div>

        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6"
          role="list"
        >
          {OUTINGS.map((outing) => {
            const imageUrl = images.get(outing.slug);
            return (
              <li
                key={outing.slug}
                className="group/outing relative isolate overflow-hidden rounded-2xl bg-warm-bg/40 ring-1 ring-black/5 shadow-sm hover:shadow-xl transition-all duration-500 ease-out hover:-translate-y-1"
              >
                <Link
                  href={outing.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
                  aria-label={`${outing.name} — visit official site`}
                >
                  <div className="relative aspect-[4/5] w-full">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={`${outing.name}, ${outing.region}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover/outing:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/outing:scale-100"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-br from-warm-bg via-warm-bg/70 to-primary/10"
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-foreground/15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l4-3 4 4 4-3 6 5v11H3V7Z" />
                            <circle cx="9" cy="9" r="1" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Soft scrim that anchors caption legibility but
                        only deepens at the bottom — keeps the upper
                        two-thirds of the photograph visually clean. */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.45) 55%, rgba(20,10,6,0.92) 100%)',
                      }}
                    />

                    {/* Top-left external-link affordance — quiet at
                        rest, accent on hover. */}
                    <span
                      aria-hidden="true"
                      className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/85 supports-[backdrop-filter]:bg-white/55 backdrop-blur text-foreground/65 group-hover/outing:text-primary transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-3-7H4a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-3" />
                      </svg>
                    </span>

                    {/* Caption stack — region eyebrow + name + body
                        reveal. Body slides in on hover. */}
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p
                        className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent mb-2"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {outing.region}
                      </p>
                      <h3
                        className="text-white font-bold tracking-tight leading-[1.1]"
                        style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}
                      >
                        {outing.name}
                      </h3>
                      <p
                        className="mt-2 text-white/85 text-[13px] leading-snug max-h-0 opacity-0 group-hover/outing:max-h-32 group-hover/outing:opacity-100 transition-all duration-500 ease-out overflow-hidden motion-reduce:max-h-32 motion-reduce:opacity-100 motion-reduce:transition-none"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {outing.body}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <p
          className="mt-8 text-center text-[12px] text-foreground/45"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Outings vary with weather, season, and clinical pacing. Every trip
          is staffed by trauma-informed clinicians.
        </p>
      </div>
    </section>
  );
}
