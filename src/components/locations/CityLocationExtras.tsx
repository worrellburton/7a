import Link from 'next/link';
import { localBusinessSchema, jsonLdScript } from '@/lib/seo/pageSchema';
import { testimonialsForRegion, type CityRegion } from '@/lib/testimonials';

// Drop-in section block that every per-city /locations/<city>
// page can render to fulfill the location-page checklist:
//   - LocalBusiness JSON-LD with areaServed for the city (the
//     ranch address stays canonical; areaServed flips per city).
//   - Lazy-loaded Google Maps iframe pinning the ranch.
//   - 2-3 region-matched testimonials from /lib/testimonials.
//   - Standard admissions CTA pair (call + verify benefits).
//
// Server component — no client state, renders the JSON-LD inline
// via dangerouslySetInnerHTML the same way the rest of the SEO
// schemas in /lib/seo/pageSchema do.

interface Props {
  /** Canonical URL of the city page, e.g. https://…/locations/phoenix. */
  pageUrl: string;
  /** Display city name, e.g. "Phoenix". */
  cityName: string;
  /** Region key used to filter the testimonial library. */
  region: CityRegion;
  /** Human-readable drive distance, e.g. "≈3 hours / 190 mi". */
  driveTime: string;
  /** Map src — pre-built Google Maps embed URL pointing at the
   *  city or the route from the city to the ranch. */
  mapSrc: string;
}

export default function CityLocationExtras({
  pageUrl,
  cityName,
  region,
  driveTime,
  mapSrc,
}: Props) {
  const testimonials = testimonialsForRegion(region, 3);
  const localBusinessJsonLd = localBusinessSchema({ url: pageUrl, city: cityName });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(localBusinessJsonLd)}
      />

      {/* Map + drive directions */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr,1fr] gap-10 items-start">
            <div>
              <p className="section-label mb-4">Getting Here from {cityName}</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                The drive from {cityName}: {driveTime}
              </h2>
              <div className="space-y-4 text-foreground/70 text-base leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                <p>
                  The most common route from {cityName} is I-10 east to Willcox, then south on
                  AZ-191 toward Sunsites. Our admissions team arranges door-to-door transport for
                  every client and family member; if you&rsquo;d rather drive, the route below
                  is the one most {cityName} families take.
                </p>
                <p>
                  Out-of-state family flying in for the weekend family program land at Phoenix
                  Sky Harbor or Tucson International — we coordinate ground transport from
                  either airport so nobody&rsquo;s navigating a rental car at midnight after a
                  cross-country flight.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://maps.google.com/maps?daddr=13771+E+Rucker+Canyon+Rd,+Pearce,+AZ+85625"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Open directions in Google Maps ↗
                </a>
                <a
                  href="tel:8667181665"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-foreground/15 text-foreground text-sm font-semibold hover:bg-warm-bg/60 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Arrange transport · (866) 718-1665
                </a>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-black/10 shadow-sm aspect-[4/3] bg-warm-bg/30">
              <iframe
                title={`Route from ${cityName} to Seven Arrows Recovery in Pearce, AZ`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 lg:py-24 bg-warm-bg/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="section-label mb-4">Voices from the {cityName} alumni</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                What {cityName} families say after the work
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <figure
                  key={t.id}
                  className="bg-white rounded-2xl p-6 border border-black/5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.18)]"
                >
                  <blockquote
                    className="text-foreground/80 leading-relaxed text-[15px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption
                    className="mt-4 text-[11.5px] uppercase tracking-[0.18em] text-foreground/55 font-semibold"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    — {t.attribution}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admissions CTA — standard cross-site pattern. Two paths:
          direct call (primary), or verify-benefits navigation to
          /admissions (secondary). Mirrors the CTA block on /,
          /about, and /contact so the audience sees one consistent
          next-step regardless of which page they landed on. */}
      <section className="py-14 lg:py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/85 mb-3">
            {cityName} admissions · 24/7
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-5">
            One call from {cityName} starts the work.
          </h2>
          <p
            className="text-white/80 text-base lg:text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Confidential, no commitment, no sales script. We&rsquo;ll verify benefits, walk you
            through the admissions process, and arrange transport from {cityName}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:8667181665" className="btn-primary">
              Call (866) 718-1665
            </a>
            <Link
              href="/admissions"
              className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
            >
              Begin admissions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
