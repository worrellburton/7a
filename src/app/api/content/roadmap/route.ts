import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { apiError } from '@/lib/api-responses';

// GET  /api/content/roadmap — list every roadmap row, joined with
//                             the linked blog so the UI can show
//                             status (queued / building / published).
// POST /api/content/roadmap — create a new roadmap row from inline
//                             entry on the Roadmap tab.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('blog_roadmap_items')
    .select('id, position, working_title, target_keyword, est_volume, intent, target_date, blog_id, notes, created_at, updated_at')
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Join the linked blog rows in a single batch lookup so the UI
  // can show queued / building / published state per row without
  // a second round-trip per row.
  const rows = (data ?? []) as Array<{
    id: string;
    position: number;
    working_title: string;
    target_keyword: string | null;
    est_volume: number | null;
    intent: string | null;
    target_date: string | null;
    blog_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>;
  const blogIds = Array.from(new Set(rows.map((r) => r.blog_id).filter((v): v is string => !!v)));
  const blogStatusById = new Map<string, { status: string; slug: string | null }>();
  if (blogIds.length > 0) {
    const { data: blogs } = await admin
      .from('blogs')
      .select('id, status, slug')
      .in('id', blogIds);
    for (const b of (blogs ?? []) as Array<{ id: string; status: string; slug: string | null }>) {
      blogStatusById.set(b.id, { status: b.status, slug: b.slug });
    }
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      blog_status: r.blog_id ? (blogStatusById.get(r.blog_id)?.status ?? null) : null,
      blog_slug: r.blog_id ? (blogStatusById.get(r.blog_id)?.slug ?? null) : null,
    })),
  });
}

interface CreateBody {
  working_title?: string;
  target_keyword?: string | null;
  est_volume?: number | null;
  intent?: string | null;
  target_date?: string | null;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  let body: CreateBody = {};
  try { body = (await req.json()) as CreateBody; } catch { /* allow empty */ }
  const title = (body.working_title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'working_title is required' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  // Append at the end by default so new items don't disturb the
  // existing manual ordering.
  const { data: maxRow } = await admin
    .from('blog_roadmap_items')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow?.position as number | undefined) ?? 0) + 1;

  const { data: inserted, error } = await admin
    .from('blog_roadmap_items')
    .insert({
      position: nextPosition,
      working_title: title,
      target_keyword: body.target_keyword ?? null,
      est_volume: typeof body.est_volume === 'number' ? body.est_volume : null,
      intent: body.intent ?? null,
      target_date: body.target_date ?? null,
      notes: body.notes ?? null,
      created_by: gate.user!.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(inserted, { status: 201 });
}
