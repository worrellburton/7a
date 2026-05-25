import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/alumni/geocode — geocode the current user's city/state
// via Nominatim (OpenStreetMap) and write lat/lng back to their
// alumni_profiles row. Called from AlumniProfileEditor after a
// successful upsert so the user doesn't see a delay on save.
//
// Privacy: we resolve to CITY CENTROID coordinates, not a precise
// address. Two alumni in the same city get the same lat/lng
// (acceptable — clusters on the map read as "more alumni here"
// instead of revealing anyone's home).
//
// Politeness: Nominatim's public endpoint asks for ≤ 1 req/sec
// and a distinct User-Agent. We honor both. Also short-circuit
// when the profile already has lat/lng for the requested city,
// avoiding duplicate hits on a re-save where city didn't change.

export const dynamic = 'force-dynamic';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'feather-alumni-portal (sevenarrowsrecoveryarizona.com)';

interface Body {
  city?: unknown;
  state?: unknown;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const state = typeof body.state === 'string' ? body.state.trim() : '';
  if (!city) {
    return NextResponse.json({ error: 'city is required' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  // Short-circuit: if the existing row already has lat/lng matching
  // this city, don't re-geocode. Lets the user save repeatedly
  // without spamming Nominatim.
  const { data: existing } = await admin
    .from('alumni_profiles')
    .select('city, state, lat, lng')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing && existing.city === city && existing.state === state && existing.lat != null && existing.lng != null) {
    return NextResponse.json({ ok: true, lat: existing.lat, lng: existing.lng, cached: true });
  }

  // Query Nominatim. countrycodes=us biases the search; format=json
  // returns lat/lon as strings on the top result.
  const params = new URLSearchParams({
    q: state ? `${city}, ${state}, USA` : `${city}, USA`,
    format: 'json',
    limit: '1',
    addressdetails: '0',
    countrycodes: 'us',
  });
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const r = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Geocoder HTTP ${r.status}` }, { status: 502 });
    }
    const arr = (await r.json()) as Array<{ lat?: string; lon?: string }>;
    if (Array.isArray(arr) && arr.length > 0) {
      const top = arr[0];
      const latN = Number(top.lat);
      const lngN = Number(top.lon);
      if (Number.isFinite(latN) && Number.isFinite(lngN)) {
        lat = latN;
        lng = lngN;
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Geocode failed' }, { status: 502 });
  }

  if (lat == null || lng == null) {
    // Couldn't resolve. Clear any stale coords so the profile
    // doesn't keep mismatched lat/lng for a typo'd city.
    await admin.from('alumni_profiles').update({ lat: null, lng: null }).eq('user_id', user.id);
    return NextResponse.json({ ok: false, error: 'City not found' }, { status: 404 });
  }

  await admin
    .from('alumni_profiles')
    .update({ lat, lng })
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, lat, lng, cached: false });
}
