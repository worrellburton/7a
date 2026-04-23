import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/google/reviews-db-debug
// Admin-only. Reports the health of public.google_reviews — total
// row count, freshest/oldest review_time, last sync timestamp,
// rating distribution, and how many rows would be evicted by the
// next 30-day TTL pass. Mirror of places-debug / gemini-debug.

export const dynamic = 'force-dynamic';

const TTL_DAYS = 30;

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();

  const { count: total, error: countErr } = await admin
    .from('google_reviews')
    .select('*', { count: 'exact', head: true });
  if (countErr) return NextResponse.json({ error: `count failed: ${countErr.message}` }, { status: 500 });

  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count: stale } = await admin
    .from('google_reviews')
    .select('*', { count: 'exact', head: true })
    .lt('fetched_at', cutoff);

  const { data: freshest } = await admin
    .from('google_reviews')
    .select('author_name, rating, review_time, fetched_at')
    .order('review_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: oldest } = await admin
    .from('google_reviews')
    .select('author_name, rating, review_time, fetched_at')
    .order('review_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: lastSyncRow } = await admin
    .from('google_reviews')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Rating histogram + unique-author count from one fetch — small
  // table (capped at a few hundred rows by the 30-day TTL), so a
  // single .select() is cheaper than a custom RPC.
  const { data: rows } = await admin
    .from('google_reviews')
    .select('rating, author_name');
  const ratingHist: Record<number, number> = {};
  const authors = new Set<string>();
  for (const r of (rows ?? []) as Array<{ rating: number; author_name: string }>) {
    ratingHist[r.rating] = (ratingHist[r.rating] ?? 0) + 1;
    authors.add(r.author_name);
  }
  const uniqueAuthors = authors.size;

  return NextResponse.json({
    total_rows: total ?? 0,
    unique_authors: uniqueAuthors,
    rating_histogram: ratingHist,
    freshest_review: freshest,
    oldest_review: oldest,
    last_sync_at: lastSyncRow?.fetched_at ?? null,
    ttl_days: TTL_DAYS,
    rows_due_for_eviction: stale ?? 0,
  });
}
