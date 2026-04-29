import Link from 'next/link';

// Single source of truth for the campus address — pinned here so
// every surface that renders it (footer, contact page, tour page,
// the optional map embed) stays in sync if the property ever
// moves. The JSON-LD blocks in src/app/layout.tsx and
// src/app/(site)/page.tsx mirror the same values; update both
// when this changes.

export const RANCH_ADDRESS = {
  streetAddress: '2491 W Jefferson Rd',
  locality: 'Elfrida',
  region: 'AZ',
  postalCode: '85610',
  country: 'United States',
} as const;

export const RANCH_PHONE = '(866) 996-4308';
export const RANCH_PHONE_TEL = '+18669964308';

/** Single-line "2491 W Jefferson Rd, Elfrida, AZ 85610" — useful for
 *  inline copy where multi-line breaks read awkwardly. */
export function ranchAddressOneLine(): string {
  const a = RANCH_ADDRESS;
  return `${a.streetAddress}, ${a.locality}, ${a.region} ${a.postalCode}`;
}

/** Encoded for use in a Google Maps URL. */
export function ranchAddressMapsQuery(): string {
  return encodeURIComponent(`${ranchAddressOneLine()}, ${RANCH_ADDRESS.country}`);
}

/** "Get directions" deep link — opens the user's preferred maps app
 *  on iOS / Android and Google Maps on desktop. */
export function ranchDirectionsUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${ranchAddressMapsQuery()}`;
}

/**
 * Address block — name + multi-line postal address + a "Get
 * directions" link. Suitable for the Footer column, a Contact-page
 * sidebar, the Tour-page hero, etc. variant="compact" omits the
 * brand name line for spots where the brand is already shown
 * adjacent (footer column header, etc.).
 */
export function RanchAddress({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'compact';
  className?: string;
}) {
  return (
    <address
      className={`not-italic text-sm leading-relaxed ${className ?? ''}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {variant === 'full' && (
        <p className="font-semibold text-foreground mb-1">Seven Arrows Recovery</p>
      )}
      <p>{RANCH_ADDRESS.streetAddress}</p>
      <p>
        {RANCH_ADDRESS.locality}, {RANCH_ADDRESS.region} {RANCH_ADDRESS.postalCode}
      </p>
      <Link
        href={ranchDirectionsUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-1 text-primary font-semibold hover:text-primary-dark transition-colors"
      >
        Get directions
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
    </address>
  );
}

/**
 * Embedded Google Map of the campus. Uses the unauthenticated
 * `output=embed` query string so it works without a Maps Embed API
 * key. The iframe is loaded lazily so it doesn't drag the LCP on
 * pages where the map sits below the fold. height/width are
 * controlled by the caller via className so the same component
 * handles a footer-thumbnail-sized map and a full-width contact
 * page hero.
 */
export function RanchMap({
  className,
  ariaLabel,
}: {
  className?: string;
  ariaLabel?: string;
}) {
  // Prefer the Maps Embed API when NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
  // is set (Vercel env, browser-restricted referrer key) — gives us
  // a clean styled map with no "For development purposes only"
  // watermark. Falls back to the unauthenticated maps.google.com
  // search URL when the key isn't set so dev environments and
  // un-configured deploys keep working without a config error.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${ranchAddressMapsQuery()}&zoom=14`
    : `https://maps.google.com/maps?q=${ranchAddressMapsQuery()}&z=14&output=embed`;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-black/10 bg-warm-bg/50 ${className ?? ''}`}>
      <iframe
        src={src}
        title={ariaLabel ?? 'Map of Seven Arrows Recovery campus'}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        // Defer iframe rendering off the critical path on slower
        // connections — Google's iframe is heavy, ~50 requests just
        // for the map tiles and Maps SDK init.
        className="block w-full h-full border-0"
        allowFullScreen
      />
    </div>
  );
}
