import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/outreach/geocode
//
// Walks contacts where location is non-null but lat/lng have never been
// resolved, and runs Google's Geocoding API against the freeform
// location string. Uses GOOGLE_PLACES_API_KEY (same key family as the
// existing Places integration — the underlying Google Cloud project
// just needs the Geocoding API enabled).
//
// Body: { limit?: number } — caps how many rows we process per call.
// Default 25, max 100. The map view calls this on first open and after
// any contact write that bumps the location field; the cap stops a
// single page-load from spending a thousand geocode calls.
//
// Returns: { processed, geocoded, failed }.

export const dynamic = 'force-dynamic';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface GeocodeResult {
  results?: Array<{
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
  status?: string;
}

async function geocodeOne(location: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('address', location);
  url.searchParams.set('region', 'us');
  url.searchParams.set('key', apiKey);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as GeocodeResult;
    if (json.status !== 'OK') return null;
    const loc = json.results?.[0]?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 412 });

  let body: { limit?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));

  const admin = getAdminSupabase();
  const { data: rows, error } = await admin
    .from('contacts')
    .select('id, location')
    .not('location', 'is', null)
    .is('geocoded_at', null)
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = (rows ?? []) as Array<{ id: string; location: string }>;
  let geocoded = 0;
  let failed = 0;

  // Sequential to keep us under Google's QPS limit on the shared key.
  // Even at 25 / call this finishes in <5s; the map view shows a
  // pending state for un-geocoded rows in the meantime.
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
    const coords = await geocodeOne(loc, apiKey);
    if (coords) {
      await admin
        .from('contacts')
        .update({
          lat: coords.lat,
          lng: coords.lng,
          geocoded_at: new Date().toISOString(),
          geocode_source: 'google-geocoding-v1',
        })
        .eq('id', row.id);
      geocoded += 1;
    } else {
      // Stamp geocoded_at so we don't keep retrying the same dead
      // address every map open — geocode_source records the failure
      // so a future job can re-attempt with a different cleaner.
      await admin
        .from('contacts')
        .update({ geocoded_at: new Date().toISOString(), geocode_source: 'google-failed' })
        .eq('id', row.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: pending.length, geocoded, failed });
}
