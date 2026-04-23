import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { gscListSites, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/search-console/sites
// Admin-only diagnostic: returns the Search Console properties the connected
// Google account can read, with their permission level. Useful when the main
// endpoint 403s so the admin can see exactly what they do have access to.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth()) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 412 }
    );
  }

  try {
    const sites = await gscListSites();
    return NextResponse.json({
      configuredSite: process.env.GSC_SITE_URL ?? null,
      sites,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
