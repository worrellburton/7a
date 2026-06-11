import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/redirects/active
//
// Public, cacheable JSON blob of every enabled redirect, served to
// the Next.js middleware on every request. Response is tagged with
// 'redirects' so admin edits (via the [id] and POST routes) can
// invalidate this cache instantly on save.

export const dynamic = 'force-dynamic';

interface ActiveMap {
  [from_path: string]: { to: string; status: number };
}

export async function GET() {
  const admin = getAdminSupabase();
  // Falls back gracefully if the migration has not been applied yet —
  // the middleware just sees an empty map and no-ops.
  const { data, error } = await admin
    .from('redirects')
    .select('from_path, to_path, status_code')
    .eq('enabled', true);

  if (error) {
    console.warn('[redirects/active] query failed:', error.message);
    return NextResponse.json({ map: {} });
  }

  const map: ActiveMap = {};
  for (const row of data ?? []) {
    if (!row.from_path || !row.to_path) continue;
    map[row.from_path] = {
      to: row.to_path as string,
      status: Number(row.status_code) || 301,
    };
  }

  // CDN-cacheable: middleware fetches this on (potentially) every
  // marketing pageview, and `next: { revalidate }` hints are ignored
  // inside middleware — there is no Data Cache there. Without this
  // header every visitor paid a same-origin hop + lambda + Supabase
  // query before TTFB. s-maxage=60 keeps admin edits visible within
  // a minute; stale-while-revalidate serves the old map instantly
  // while the refresh happens off the request path.
  return NextResponse.json(
    { map },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
