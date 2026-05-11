import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// GET /api/outreach/place-details?place_id=ChIJ...
//
// Resolves a Google place_id (from the autocomplete suggestions) into
// everything the outreach grid stores on save:
//   - formatted_address (canonical "City, State, USA")
//   - lat / lng (drops a marker on the map view)
//   - tz (IANA timezone id, drives the "9:03 AM local" label next
//        to the phone icon)
//
// Two upstream Google calls — Place Details for lat/lng + name, then
// Time Zone API for the IANA id at that lat/lng. Both go through the
// same server-side GOOGLE_PLACES_API_KEY.

export const dynamic = 'force-dynamic';

const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const TIMEZONE_URL = 'https://maps.googleapis.com/maps/api/timezone/json';

interface DetailsResponse {
  status?: string;
  result?: {
    place_id?: string;
    formatted_address?: string;
    name?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  };
}

interface TimezoneResponse {
  status?: string;
  timeZoneId?: string;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 412 });

  const placeId = req.nextUrl.searchParams.get('place_id')?.trim() ?? '';
  if (!placeId) return NextResponse.json({ error: 'place_id required' }, { status: 400 });

  // 1. Place details
  const detailsUrl = new URL(DETAILS_URL);
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'place_id,formatted_address,name,geometry/location');
  detailsUrl.searchParams.set('key', apiKey);
  const detailsRes = await fetch(detailsUrl.toString(), { cache: 'no-store' });
  if (!detailsRes.ok) return NextResponse.json({ error: `Details HTTP ${detailsRes.status}` }, { status: 500 });
  const detailsJson = (await detailsRes.json()) as DetailsResponse;
  if (detailsJson.status !== 'OK' || !detailsJson.result) {
    return NextResponse.json({ error: detailsJson.status || 'Details failed' }, { status: 502 });
  }
  const loc = detailsJson.result.geometry?.location;
  const lat = typeof loc?.lat === 'number' ? loc.lat : null;
  const lng = typeof loc?.lng === 'number' ? loc.lng : null;
  const formatted_address = detailsJson.result.formatted_address ?? detailsJson.result.name ?? null;

  // 2. Timezone (best-effort; map still works without it)
  let tz: string | null = null;
  if (lat != null && lng != null) {
    const tzUrl = new URL(TIMEZONE_URL);
    tzUrl.searchParams.set('location', `${lat},${lng}`);
    tzUrl.searchParams.set('timestamp', String(Math.floor(Date.now() / 1000)));
    tzUrl.searchParams.set('key', apiKey);
    try {
      const tzRes = await fetch(tzUrl.toString(), { cache: 'no-store' });
      if (tzRes.ok) {
        const tzJson = (await tzRes.json()) as TimezoneResponse;
        if (tzJson.status === 'OK' && typeof tzJson.timeZoneId === 'string') tz = tzJson.timeZoneId;
      }
    } catch { /* leave tz null */ }
  }

  return NextResponse.json({
    place_id: detailsJson.result.place_id ?? placeId,
    formatted_address,
    lat,
    lng,
    tz,
  });
}
