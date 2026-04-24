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

  return NextResponse.json({ map });
}
