import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  bucketRefDomainsByAscore,
  fetchBacklinks,
  fetchBacklinksOverview,
  fetchRefDomains,
  hasSemrush,
  semrushDefaultTarget,
  SemrushError,
  type BacklinkRow,
  type BacklinksOverview,
  type RefDomainBucket,
  type RefDomainRow,
} from '@/lib/semrush';

// Backlinks data is now fetched on-demand via a "Sync" button rather
// than auto-refreshed on every page load. The reasons:
//   1. Each Semrush row burns API units. Auto-fetch on every visit
//      and every filter chip click was wasting budget.
//   2. The old flow only fetched 50 rows sorted by last_seen. If
//      none of those happened to be (say) nofollow, the Nofollow
//      chip rendered blank even though hundreds of nofollow links
//      existed — a confusing UX.
//
// New shape:
//   GET   → returns the most recent snapshot from
//           seo_backlinks_snapshots, plus the user's display filter
//           applied client-side over the snapshot rows.
//   POST  → runs a fresh sync (overview + dofollow batch + nofollow
//           batch + ref-domain histogram), persists the snapshot,
//           returns the same payload shape as GET.

export const dynamic = 'force-dynamic';

interface SnapshotPayload {
  target: string;
  overview: BacklinksOverview | null;
  rows: BacklinkRow[];
  refdomains: RefDomainRow[];
  refdomain_buckets: RefDomainBucket[];
}

interface SnapshotRow {
  id: string;
  target: string;
  payload: SnapshotPayload;
  synced_at: string;
  synced_by: string | null;
}

function resolveTarget(req: Request): string {
  const url = new URL(req.url);
  return (
    url.searchParams.get('target') ||
    semrushDefaultTarget() ||
    'sevenarrowsrecoveryarizona.com'
  );
}

function applyFilter(rows: BacklinkRow[], filter: string): BacklinkRow[] {
  switch (filter) {
    case 'follow': return rows.filter((r) => r.is_follow);
    case 'nofollow': return rows.filter((r) => r.is_nofollow);
    case 'ugc': return rows.filter((r) => r.is_ugc);
    case 'sponsored': return rows.filter((r) => r.is_sponsored);
    case 'all':
    default: return rows;
  }
}

async function loadLatestSnapshot(target: string): Promise<SnapshotRow | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('seo_backlinks_snapshots')
    .select('id, target, payload, synced_at, synced_by')
    .eq('target', target)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SnapshotRow | null) ?? null;
}

async function loadSyncedByName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  return (data as { full_name: string | null } | null)?.full_name ?? null;
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const target = resolveTarget(req);
  const url = new URL(req.url);
  const filter = (url.searchParams.get('filter') || 'all').toLowerCase();

  let snap: SnapshotRow | null = null;
  try {
    snap = await loadLatestSnapshot(target);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  if (!snap) {
    return NextResponse.json({
      target,
      filter,
      overview: null,
      rows: [],
      refdomains: [],
      refdomain_buckets: [],
      synced_at: null,
      synced_by_name: null,
      empty: true,
    });
  }

  const syncedByName = await loadSyncedByName(snap.synced_by);
  const filtered = applyFilter(snap.payload.rows ?? [], filter);
  return NextResponse.json({
    target,
    filter,
    overview: snap.payload.overview ?? null,
    rows: filtered,
    refdomains: snap.payload.refdomains ?? [],
    refdomain_buckets: snap.payload.refdomain_buckets ?? [],
    total_in_snapshot: snap.payload.rows?.length ?? 0,
    filtered_in_snapshot: filtered.length,
    synced_at: snap.synced_at,
    synced_by_name: syncedByName,
  });
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasSemrush()) {
    return NextResponse.json(
      {
        error:
          'Semrush integration not configured. Set SEMRUSH_API_KEY in the Vercel project env.',
      },
      { status: 412 },
    );
  }

  const target = resolveTarget(req);

  try {
    // One generous batch (200 rows, sorted by recency — Semrush's
    // proven default for the backlinks endpoint). All four filter
    // chips read from the same array client-side. With 200 rows
    // there's normally enough representation across dofollow /
    // nofollow / UGC / sponsored that no chip renders blank.
    const [overview, allRows, refdomains] = await Promise.all([
      fetchBacklinksOverview({ target }),
      fetchBacklinks({
        target,
        limit: 200,
        sort: 'last_seen_desc',
      }),
      fetchRefDomains({ target, limit: 500, sort: 'ascore_desc' }),
    ]);

    const merged = allRows;

    const payload: SnapshotPayload = {
      target,
      overview,
      rows: merged,
      refdomains,
      refdomain_buckets: bucketRefDomainsByAscore(refdomains),
    };

    const { error: insertErr } = await supabase
      .from('seo_backlinks_snapshots')
      .insert({ target, payload, synced_by: user.id });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      target,
      filter: 'all',
      overview,
      rows: merged,
      refdomains,
      refdomain_buckets: payload.refdomain_buckets,
      total_in_snapshot: merged.length,
      filtered_in_snapshot: merged.length,
      synced_at: new Date().toISOString(),
      synced_by_name: null,
    });
  } catch (err) {
    if (err instanceof SemrushError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
