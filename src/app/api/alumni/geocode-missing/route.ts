import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/alumni/geocode-missing — sweep alumni_profiles rows that
// are opted into the map (on_map=true) and have a city but NO lat/lng,
// geocode them via Nominatim, and write the coords back.
//
// Why this exists: /api/alumni/geocode only runs when an alum saves
// their OWN profile in the editor. Any row whose city arrived another
// way — or whose geocode call failed that day — sat coordinate-less
// forever, and the map silently dropped the pin while the list below
// still showed the person. The map page fires this once on load when
// it notices ungeocoded pins, so the map self-heals.
//
// Politeness: Nominatim asks for ≤1 req/sec — we sleep 1.1s between
// lookups and cap the sweep at 4 rows per call (the page re-fetches
// after, and a rare bigger backlog clears across a few page loads).

export const dynamic = 'force-dynamic';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'feather-alumni-portal (sevenarrowsrecoveryarizona.com)';
const MAX_PER_SWEEP = 4;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;

  const admin = getAdminSupabase();
  const { data: rows } = await admin
    .from('alumni_profiles')
    .select('user_id, city, state')
    .eq('on_map', true)
    .is('lat', null)
    .not('city', 'is', null)
    .limit(MAX_PER_SWEEP);

  const missing = (rows ?? []).filter((r) => typeof r.city === 'string' && r.city.trim().length > 0);
  let fixed = 0;

  for (let i = 0; i < missing.length; i++) {
    const row = missing[i];
    if (i > 0) await sleep(1100);
    const city = String(row.city).trim();
    const state = typeof row.state === 'string' ? row.state.trim() : '';
    const params = new URLSearchParams({
      q: state ? `${city}, ${state}, USA` : `${city}, USA`,
      format: 'json',
      limit: '1',
      addressdetails: '0',
      countrycodes: 'us',
    });
    try {
      const r = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!r.ok) continue;
      const arr = (await r.json()) as Array<{ lat?: string; lon?: string }>;
      const lat = Number(arr?.[0]?.lat);
      const lng = Number(arr?.[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const { error } = await admin
        .from('alumni_profiles')
        .update({ lat, lng })
        .eq('user_id', row.user_id);
      if (!error) fixed++;
    } catch {
      // One bad lookup shouldn't kill the sweep — next page load retries.
    }
  }

  return NextResponse.json({ ok: true, scanned: missing.length, fixed });
}
