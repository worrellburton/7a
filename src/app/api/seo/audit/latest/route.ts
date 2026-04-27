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
    .select('id, origin, score, grade, payload, duration_ms, ran_by, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  if (origin) q = q.eq('origin', origin);

  const { data, error } = await q.maybeSingle();
  if (error) {
    // Typical case: table doesn't exist yet in a preview env. Degrade.
    return NextResponse.json({ audit: null, warning: error.message });
  }
  if (!data) return NextResponse.json({ audit: null });

  // Resolve the runner's display name in a second tiny query. The FK
  // points at auth.users so we can't use PostgREST relationship syntax
  // here — public.users.id and auth.users.id are the same uuid, so a
  // plain lookup works. Failures degrade silently to "by someone".
  let ranByName: string | null = null;
  if (data.ran_by) {
    const { data: u } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', data.ran_by)
      .maybeSingle();
    ranByName = u?.full_name || u?.email || null;
  }

  return NextResponse.json({
    audit: {
      id: data.id,
      createdAt: data.created_at,
      ranBy: data.ran_by,
      ranByName,
      // The payload already contains everything the page renders.
      ...(data.payload as Record<string, unknown>),
    },
  });
}
