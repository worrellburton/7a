// Google Places Details fetch for the public-site review widget.
//
// Place ID is a public, stable identifier (visible on any Google Maps URL)
// so we hard-code it here. GOOGLE_API_KEY is server-only — it never leaves
// the Next.js server runtime. Responses are cached at the edge for 1 hour
// to stay well within Google's 30-day ToS cap and keep Place Details quota
// down (each call is billed per-field-mask).

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

export interface PlaceDetails {
  rating: number | null;
  userRatingsTotal: number | null;
  reviews: PlaceReview[];
  fetchedAt: number;
}

interface PlacesApiResponse {
  status: string;
  error_message?: string;
  result?: {
    rating?: number;
    user_ratings_total?: number;
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

export async function fetchPlaceDetails(): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const url = new URL(PLACES_URL);
  url.searchParams.set('place_id', SEVEN_ARROWS_PLACE_ID);
  url.searchParams.set('fields', 'rating,user_ratings_total,reviews');
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

    const reviews: PlaceReview[] = (json.result.reviews ?? []).map((r) => ({
      authorName: r.author_name ?? 'Anonymous',
      profilePhotoUrl: r.profile_photo_url ?? null,
      rating: Number(r.rating ?? 0),
      relativeTime: r.relative_time_description ?? '',
      text: r.text ?? '',
      time: Number(r.time ?? 0),
    }));

    return {
      rating: json.result.rating ?? null,
      userRatingsTotal: json.result.user_ratings_total ?? null,
      reviews,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
