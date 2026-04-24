import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/keywords/fit
// Admin-only. Returns the latest cached fit scores for every keyword
// plus the max scanned_at so the UI can label the row as "scanned N
// minutes ago". Zero-cost: just a single select.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('keyword_fits')
    .select('keyword_id, score, bucket, best_url, best_h1, best_title, breakdown, scanned_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const lastScannedAt = rows.reduce<string | null>((acc, r) => {
    const t = r.scanned_at as string | null;
    if (!t) return acc;
    return acc === null || t > acc ? t : acc;
  }, null);

  return NextResponse.json({ rows, lastScannedAt });
}
