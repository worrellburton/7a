import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// GET /api/outreach/place-autocomplete?input=phoeni
//
// Server-side proxy for Google Places Autocomplete. We keep the
// GOOGLE_PLACES_API_KEY server-only and never expose it to the
// browser. Used by the inline Location cell on the outreach grid to
// power a typeahead dropdown so admissions doesn't type raw "City,
// ST" strings — they pick a canonical Google place.
//
// Returns: { suggestions: [{ place_id, description, main, secondary }] }
//
// We bias suggestions toward US cities + administrative areas; the
// outreach pipeline is US-only and city-level precision matches what
// the rest of the page needs (map pins, timezone lookup).

export const dynamic = 'force-dynamic';

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

interface AutocompleteResponse {
  status?: string;
  predictions?: Array<{
    place_id?: string;
    description?: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }>;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 412 });

  const input = req.nextUrl.searchParams.get('input')?.trim() ?? '';
  if (input.length < 2) return NextResponse.json({ suggestions: [] });

  const url = new URL(AUTOCOMPLETE_URL);
  url.searchParams.set('input', input);
  url.searchParams.set('types', '(regions)');
  url.searchParams.set('components', 'country:us');
  url.searchParams.set('language', 'en');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const json = (await res.json()) as AutocompleteResponse;
    if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ suggestions: [], status: json.status });
    }
    const suggestions = (json.predictions ?? []).slice(0, 8).map((p) => ({
      place_id: p.place_id ?? '',
      description: p.description ?? '',
      main: p.structured_formatting?.main_text ?? p.description ?? '',
      secondary: p.structured_formatting?.secondary_text ?? '',
    })).filter((s) => s.place_id);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ suggestions: [], error: e instanceof Error ? e.message : String(e) });
  }
}
