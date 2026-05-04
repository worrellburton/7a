import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// Manual backlink CRUD. The Backlinks page reads from this table
// alongside the seo_backlinks_snapshots Semrush dump and merges the
// two streams at display time, so manual rows survive the next sync.
//
//   GET    /api/seo/backlinks/manual?target=…   list rows for target
//   POST   /api/seo/backlinks/manual            insert a new row
//   DELETE /api/seo/backlinks/manual?id=…       remove (uploader/admin)
//
// All endpoints require an authed admin. The Directories/Backlinks
// page is admin-only at the route level via PageGuard, so requiring
// is_admin here matches that gate.

export const dynamic = 'force-dynamic';

interface ManualBody {
  target?: string;
  source_url?: string;
  source_title?: string | null;
  anchor?: string | null;
  target_url?: string | null;
  rel?: 'follow' | 'nofollow' | 'ugc' | 'sponsored';
  page_score?: number | null;
  notes?: string | null;
}

async function gateAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const { data: u } = await supabase
    .from('users')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!u?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  return {
    user,
    name: (u.full_name as string | null) ?? null,
    admin: getAdminSupabase(),
  } as const;
}

export async function GET(req: Request) {
  const gate = await gateAdmin();
  if ('error' in gate) return gate.error;
  const target = new URL(req.url).searchParams.get('target');
  if (!target) return NextResponse.json({ error: 'Missing target' }, { status: 400 });
  const { data, error } = await gate.admin
    .from('seo_manual_backlinks')
    .select('id, target, source_url, source_title, anchor, target_url, is_follow, is_nofollow, is_ugc, is_sponsored, page_score, notes, added_by, added_by_name, created_at')
    .eq('target', target)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await gateAdmin();
  if ('error' in gate) return gate.error;
  const body = (await req.json().catch(() => ({}))) as ManualBody;
  const target = (body.target ?? '').trim();
  const source_url_raw = (body.source_url ?? '').trim();
  if (!target || !source_url_raw) {
    return NextResponse.json(
      { error: 'target and source_url are required.' },
      { status: 400 },
    );
  }
  // Normalize source_url — admins paste naked domains all the time,
  // and rendering href={value} on a relative path would route inside
  // the app and 404 (same bug we hit on directory live links).
  const source_url = /^[a-z][a-z0-9+.-]*:/i.test(source_url_raw)
    ? source_url_raw
    : `https://${source_url_raw}`;

  const rel = body.rel ?? 'follow';
  const is_follow = rel === 'follow';
  const is_nofollow = rel === 'nofollow' || rel === 'ugc' || rel === 'sponsored';
  const is_ugc = rel === 'ugc';
  const is_sponsored = rel === 'sponsored';

  const score = (() => {
    const v = body.page_score;
    if (v == null) return null;
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, Math.round(v)));
  })();

  const { data: row, error } = await gate.admin
    .from('seo_manual_backlinks')
    .insert({
      target,
      source_url,
      source_title: body.source_title?.trim() || null,
      anchor: body.anchor?.trim() || null,
      target_url: body.target_url?.trim() || null,
      is_follow,
      is_nofollow,
      is_ugc,
      is_sponsored,
      page_score: score,
      notes: body.notes?.trim() || null,
      added_by: gate.user.id,
      added_by_name: gate.name,
    })
    .select('*')
    .single();
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  // Activity feed — directory edits and backlink edits both flow
  // through public.activity_log so the feed on /app/seo/actions
  // shows them side by side. target_label is the source domain so
  // the feed reads "Bobby added a backlink for example.com".
  let label = source_url;
  try {
    label = new URL(source_url).host.replace(/^www\./, '');
  } catch { /* keep raw */ }
  await gate.admin.from('activity_log').insert({
    user_id: gate.user.id,
    type: 'seo.backlink_added',
    target_kind: 'seo_backlink',
    target_id: (row as { id: string }).id,
    target_label: label,
    target_path: '/app/seo/backlinks',
    metadata: {
      source_url,
      anchor: body.anchor ?? null,
      rel,
      target,
    },
  });

  return NextResponse.json({ row });
}

export async function DELETE(req: Request) {
  const gate = await gateAdmin();
  if ('error' in gate) return gate.error;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Look up the row first so the activity-log entry has a label.
  const { data: existing } = await gate.admin
    .from('seo_manual_backlinks')
    .select('source_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await gate.admin
    .from('seo_manual_backlinks')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.source_url) {
    let label = existing.source_url as string;
    try {
      label = new URL(label).host.replace(/^www\./, '');
    } catch { /* keep raw */ }
    await gate.admin.from('activity_log').insert({
      user_id: gate.user.id,
      type: 'seo.backlink_removed',
      target_kind: 'seo_backlink',
      target_id: id,
      target_label: label,
      target_path: '/app/seo/backlinks',
      metadata: { source_url: existing.source_url },
    });
  }

  return NextResponse.json({ ok: true });
}
