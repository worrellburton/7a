import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/seo/audit/latest?origin=<optional>
// Admin-only. Returns the most recent audit from public.seo_audits,
// or { audit: null } if none exists yet. Powers the hydrate-on-mount
// behavior of /app/seo/audit so a fresh browser sees the last run
// without anyone having to click Run audit.

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
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const origin = url.searchParams.get('origin');

  let q = supabase
    .from('seo_audits')
    .select('id, origin, score, grade, payload, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  if (origin) q = q.eq('origin', origin);

  const { data, error } = await q.maybeSingle();
  if (error) {
    // Typical case: table doesn't exist yet in a preview env. Degrade.
    return NextResponse.json({ audit: null, warning: error.message });
  }
  if (!data) return NextResponse.json({ audit: null });
  return NextResponse.json({
    audit: {
      id: data.id,
      createdAt: data.created_at,
      // The payload already contains everything the page renders.
      ...(data.payload as Record<string, unknown>),
    },
  });
}
