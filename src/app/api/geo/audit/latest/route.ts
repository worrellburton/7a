import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/geo/audit/latest?site=<optional>
// Admin-only. Returns the most recent GEO audit row from
// public.geo_audits, or { audit: null } if none exists yet. Used by
// /app/geo/audit to hydrate on mount so a cold browser sees the
// latest team-wide run.

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const site = url.searchParams.get('site');

  let q = supabase
    .from('geo_audits')
    .select('id, site, score, grade, engines, skipped_engines, payload, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  if (site) q = q.eq('site', site);

  const { data, error } = await q.maybeSingle();
  if (error) {
    return NextResponse.json({ audit: null, warning: error.message });
  }
  if (!data) return NextResponse.json({ audit: null });

  return NextResponse.json({
    audit: {
      id: data.id,
      createdAt: data.created_at,
      ...(data.payload as Record<string, unknown>),
    },
  });
}
