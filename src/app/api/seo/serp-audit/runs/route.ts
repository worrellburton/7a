import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/serp-audit/runs
//
// Returns the most recent SERP-audit runs (newest first), plus the
// run_by display name + avatar resolved in a single batched users
// SELECT. Admin-only. Used by /app/seo/serp-audit to show the
// history strip and the latest run's result list.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('seo_serp_audits')
    .select('id, run_at, run_by, query, result_count, results, error')
    .order('run_at', { ascending: false })
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.run_by).filter((v): v is string => !!v)));
  const userMap = new Map<string, { name: string | null; avatar: string | null }>();
  if (ids.length > 0) {
    const { data: usrs } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', ids);
    for (const u of usrs ?? []) {
      userMap.set(u.id as string, {
        name: (u.full_name as string | null) ?? null,
        avatar: (u.avatar_url as string | null) ?? null,
      });
    }
  }

  const runs = rows.map((r) => {
    const u = r.run_by ? userMap.get(r.run_by) : null;
    return {
      id: r.id,
      run_at: r.run_at,
      run_by: r.run_by,
      run_by_name: u?.name ?? null,
      run_by_avatar_url: u?.avatar ?? null,
      query: r.query,
      result_count: r.result_count,
      results: r.results,
      error: r.error ?? null,
    };
  });

  return NextResponse.json({ runs });
}
