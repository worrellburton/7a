// Google Places Details fetch for the public site.
//
// Place ID is a public, stable identifier (visible on any Google Maps URL)
// so we hard-code it here. GOOGLE_PLACES_API_KEY is server-only — it never
// leaves the Next.js server runtime. Responses are cached at the edge for 1
// hour to stay well within Google's 30-day ToS cap and keep Place Details
// quota down (each call is billed per-field-mask SKU, so we fetch reviews
// + listing data in a single request and split the result downstream).

export const SEVEN_ARROWS_PLACE_ID = 'ChIJkx6TLLFX14YR1XG008rPWUM';

const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const CACHE_SECONDS = 60 * 60; // 1 hour

export interface PlaceReview {
  authorName: string;
  profilePhotoUrl: string | null;
  rating: number;
  relativeTime: string;
  text: string;
  time: number; // unix seconds
}

export interface PlaceHours {
  openNow: boolean | null;
  weekdayText: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
}

export interface PlaceListing {
  name: string | null;
  formattedAddress: string | null;
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  mapsUrl: string | null; // Canonical Google Maps listing URL
  hours: PlaceHours | null;
  location: { lat: number; lng: number } | null;
}

export interface PlaceDetails {
  rating: number | null;
  userRatingsTotal: number | null;
  reviews: PlaceReview[];
  listing: PlaceListing | null;
  fetchedAt: number;
}

interface PlacesApiResponse {
  status: string;
  error_message?: string;
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    geometry?: {
      location?: { lat?: number; lng?: number };
    };
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
    reviews?: Array<{
      author_name?: string;
      profile_photo_url?: string;
      rating?: number;
      relative_time_description?: string;
      text?: string;
      time?: number;
    }>;
  };
}

// Field mask spans Basic (name, formatted_address, geometry, url),
// Contact (formatted_phone_number, international_phone_number, website,
// opening_hours), and Atmosphere (rating, user_ratings_total, reviews).
// Google bills one SKU per touched category per call — we accept that
// in exchange for a single round trip and one cache entry.
const FIELDS = [
  'name',
  'rating',
  'user_ratings_total',
  'reviews',
  'formatted_address',
  'formatted_phone_number',
  'international_phone_number',
  'website',
  'url',
  'geometry/location',
  'opening_hours',
].join(',');

export async function fetchPlaceDetails(): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = new URL(PLACES_URL);
  url.searchParams.set('place_id', SEVEN_ARROWS_PLACE_ID);
  url.searchParams.set('fields', FIELDS);
  url.searchParams.set('reviews_sort', 'newest');
  url.searchParams.set('language', 'en');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: CACHE_SECONDS, tags: ['google-place'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as PlacesApiResponse;
    if (json.status !== 'OK' || !json.result) return null;
    const result = json.result;

    // Filter out low-rated reviews at the data layer so individual
    // components can't accidentally display them. The aggregate rating
    // and total count below still come straight from Google's full
    // corpus — only the *displayed* review cards are curated.
    const MIN_DISPLAYED_RATING = 4;
    const reviews: PlaceReview[] = (result.reviews ?? [])
      .map((r) => ({
        authorName: r.author_name ?? 'Anonymous',
        profilePhotoUrl: r.profile_photo_url ?? null,
        rating: Number(r.rating ?? 0),
        relativeTime: r.relative_time_description ?? '',
        text: r.text ?? '',
        time: Number(r.time ?? 0),
      }))
      .filter((r) => r.rating >= MIN_DISPLAYED_RATING);

    const loc = result.geometry?.location;
    const listing: PlaceListing = {
      name: result.name ?? null,
      formattedAddress: result.formatted_address ?? null,
      phone: result.formatted_phone_number ?? null,
      internationalPhone: result.international_phone_number ?? null,
      website: result.website ?? null,
      mapsUrl: result.url ?? null,
      hours: result.opening_hours
        ? {
            openNow: result.opening_hours.open_now ?? null,
            weekdayText: result.opening_hours.weekday_text ?? [],
          }
        : null,
      location:
        typeof loc?.lat === 'number' && typeof loc?.lng === 'number'
          ? { lat: loc.lat, lng: loc.lng }
          : null,
    };

    return {
      rating: result.rating ?? null,
      userRatingsTotal: result.user_ratings_total ?? null,
      reviews,
      listing,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
