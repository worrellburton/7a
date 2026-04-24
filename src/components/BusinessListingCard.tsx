// Server component that renders the live Google Maps business listing —
// name, address, phone, hours, and a deep link to the canonical listing.
// All data comes from `fetchPlaceDetails()` (cached for 1h via Next's
// fetch cache). When the Places API is unreachable or the key isn't set,
// we fall back to known-good values so the section always ships.

import { fetchPlaceDetails, SEVEN_ARROWS_PLACE_ID, type PlaceListing } from '@/lib/places';

const FALLBACK: PlaceListing = {
  name: 'Seven Arrows Recovery',
  formattedAddress: 'Cochise County, Arizona, USA',
  phone: '(866) 996-4308',
  internationalPhone: '+1 866-996-4308',
  website: 'https://sevenarrowsrecoveryarizona.com',
  mapsUrl: `https://www.google.com/maps/place/?q=place_id:${SEVEN_ARROWS_PLACE_ID}`,
  hours: null,
  location: { lat: 31.9, lng: -109.9 },
};

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function PinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PhoneIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
    </svg>
  );
}

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArrowIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;
  return `tel:${digits.startsWith('+') ? digits : `+1${digits}`}`;
}

export default async function BusinessListingCard() {
  const place = await fetchPlaceDetails();
  const listing = place?.listing ?? FALLBACK;
  const isLive = Boolean(place?.listing);

  const phoneHref = telHref(listing.phone);
  const directionsHref = listing.mapsUrl ?? FALLBACK.mapsUrl!;

  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="listing-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-label mb-4 justify-center">Find Us on Google</p>
          <h2
            id="listing-heading"
            className="text-3xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Visit Seven Arrows Recovery
          </h2>
          <p
            className="text-foreground/60 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is reachable 24/7. The campus sits at the base of the
            Swisshelm Mountains in southeast Arizona.
          </p>
        </div>

        <div className="max-w-4xl mx-auto rounded-2xl border border-foreground/10 bg-warm-bg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8 lg:p-10 space-y-6">
              <div className="flex items-center gap-2">
                <GoogleIcon className="w-5 h-5" />
                <span
                  className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground/60"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Google Business Profile
                </span>
              </div>

              <h3
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {listing.name ?? FALLBACK.name}
              </h3>

              {listing.formattedAddress && (
                <div className="flex items-start gap-3 text-foreground/80">
                  <PinIcon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <span style={{ fontFamily: 'var(--font-body)' }}>
                    {listing.formattedAddress}
                  </span>
                </div>
              )}

              {listing.phone && (
                <div className="flex items-start gap-3 text-foreground/80">
                  <PhoneIcon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="hover:text-primary transition-colors font-semibold"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {listing.phone}
                    </a>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-body)' }}>{listing.phone}</span>
                  )}
                </div>
              )}

              {listing.hours && listing.hours.weekdayText.length > 0 && (
                <div className="flex items-start gap-3 text-foreground/80">
                  <ClockIcon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
                  <div className="space-y-1" style={{ fontFamily: 'var(--font-body)' }}>
                    {listing.hours.openNow !== null && (
                      <div
                        className={`text-sm font-semibold ${listing.hours.openNow ? 'text-emerald-600' : 'text-foreground/60'}`}
                      >
                        {listing.hours.openNow ? 'Open now' : 'Closed now'}
                      </div>
                    )}
                    <ul className="text-sm space-y-0.5">
                      {listing.hours.weekdayText.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-dark text-sm font-medium transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <GoogleIcon className="w-4 h-4" />
                  View on Google Maps
                  <ArrowIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Seven Arrows Recovery in Google Maps"
              className="relative block min-h-[260px] md:min-h-full bg-gradient-to-br from-primary/10 via-warm-bg to-primary/5 group"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <PinIcon className="w-7 h-7 text-primary" />
                </div>
                <p
                  className="text-foreground font-semibold mb-1"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Get Directions
                </p>
                <p
                  className="text-foreground/60 text-sm"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Opens our listing in Google Maps
                </p>
              </div>
            </a>
          </div>
        </div>

        {!isLive && (
          <p
            className="text-center text-foreground/40 text-xs mt-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Showing cached business details.
          </p>
        )}
      </div>
    </section>
  );
}
