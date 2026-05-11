import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/outreach/geocode
//
// Walks contacts where `location` is non-null but lat/lng have never
// been resolved, and runs Google against the freeform location string.
// Uses GOOGLE_PLACES_API_KEY (same key family as the existing Places
// autocomplete).
//
// Body: { limit?: number, retry_failed?: boolean }
//   - limit: cap how many rows we process per call. Default 25, max 100.
//   - retry_failed: when true, also re-tries rows that previously hit
//     the geocoder but came back empty (geocoded_at IS NOT NULL,
//     lat IS NULL). Default false so cold map opens don't burn quota
//     on dead addresses.
//
// Resolution strategy — we try in order:
//   1. Places Find Place From Text → place_id → Place Details lat/lng.
//      This uses the SAME Places API the autocomplete already uses, so
//      orgs that only enabled Places (not Geocoding) on their GCP
//      project will still backfill cleanly.
//   2. Geocoding API as a fallback if Find Place returns no candidates.
//      Skipped silently if that API isn't enabled on the project.
//
// Each row is stamped with `geocode_source` describing which strategy
// produced the coords (or which one failed) so we can audit failures
// later and re-try with a different cleaner.

export const dynamic = 'force-dynamic';

const FIND_PLACE_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEZONE_URL = 'https://maps.googleapis.com/maps/api/timezone/json';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface ResolvedPlace {
  lat: number;
  lng: number;
  place_id?: string | null;
  formatted_address?: string | null;
}

async function resolveViaFindPlace(location: string, apiKey: string): Promise<ResolvedPlace | null> {
  const findUrl = new URL(FIND_PLACE_URL);
  findUrl.searchParams.set('input', location);
  findUrl.searchParams.set('inputtype', 'textquery');
  findUrl.searchParams.set('fields', 'place_id');
  findUrl.searchParams.set('key', apiKey);
  let placeId: string | null = null;
  try {
    const res = await fetch(findUrl.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: string; candidates?: Array<{ place_id?: string }> };
    if (json.status !== 'OK') return null;
    placeId = json.candidates?.[0]?.place_id ?? null;
  } catch { return null; }
  if (!placeId) return null;

  const detailsUrl = new URL(PLACE_DETAILS_URL);
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'place_id,formatted_address,geometry/location');
  detailsUrl.searchParams.set('key', apiKey);
  try {
    const res = await fetch(detailsUrl.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      result?: {
        place_id?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      };
    };
    if (json.status !== 'OK' || !json.result) return null;
    const loc = json.result.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      place_id: json.result.place_id ?? placeId,
      formatted_address: json.result.formatted_address ?? null,
    };
  } catch { return null; }
}

async function resolveViaGeocoding(location: string, apiKey: string): Promise<ResolvedPlace | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('address', location);
  url.searchParams.set('region', 'us');
  url.searchParams.set('key', apiKey);
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      results?: Array<{
        geometry?: { location?: { lat?: number; lng?: number } };
        place_id?: string;
        formatted_address?: string;
      }>;
    };
    if (json.status !== 'OK') return null;
    const first = json.results?.[0];
    const loc = first?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return {
      lat: loc.lat,
      lng: loc.lng,
      place_id: first?.place_id ?? null,
      formatted_address: first?.formatted_address ?? null,
    };
  } catch { return null; }
}

async function resolveTimezone(lat: number, lng: number, apiKey: string): Promise<string | null> {
  const url = new URL(TIMEZONE_URL);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('timestamp', String(Math.floor(Date.now() / 1000)));
  url.searchParams.set('key', apiKey);
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: string; timeZoneId?: string };
    if (json.status !== 'OK') return null;
    return typeof json.timeZoneId === 'string' ? json.timeZoneId : null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 412 });

  let body: { limit?: unknown; retry_failed?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));
  const retryFailed = body.retry_failed === true;

  const admin = getAdminSupabase();
  let query = admin
    .from('contacts')
    .select('id, location')
    .not('location', 'is', null)
    .is('lat', null);
  if (!retryFailed) {
    // Default behaviour: only try rows the geocoder has never seen.
    query = query.is('geocoded_at', null);
  }
  const { data: rows, error } = await query.limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = (rows ?? []) as Array<{ id: string; location: string }>;
  let geocoded = 0;
  let failed = 0;

  for (const row of pending) {
    const loc = (row.location || '').trim();
    if (!loc) {
      await admin
        .from('contacts')
        .update({ geocoded_at: new Date().toISOString(), geocode_source: 'skip-empty' })
        .eq('id', row.id);
      failed += 1;
      continue;
    }
    // Try Places Find Place first — uses the same key family the
    // user has working for autocomplete. Geocoding API is the
    // fallback only when Find Place returns nothing.
    let coords = await resolveViaFindPlace(loc, apiKey);
    let source: 'google-places-find-place' | 'google-geocoding-v1' | 'google-failed' = 'google-places-find-place';
    if (!coords) {
      coords = await resolveViaGeocoding(loc, apiKey);
      source = coords ? 'google-geocoding-v1' : 'google-failed';
    }
    if (coords) {
      const tz = await resolveTimezone(coords.lat, coords.lng, apiKey);
      await admin
        .from('contacts')
        .update({
          lat: coords.lat,
          lng: coords.lng,
          formatted_address: coords.formatted_address ?? null,
          place_id: coords.place_id ?? null,
          tz,
          geocoded_at: new Date().toISOString(),
          geocode_source: source,
        })
        .eq('id', row.id);
      geocoded += 1;
    } else {
      await admin
        .from('contacts')
        .update({ geocoded_at: new Date().toISOString(), geocode_source: 'google-failed' })
        .eq('id', row.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: pending.length, geocoded, failed });
}
