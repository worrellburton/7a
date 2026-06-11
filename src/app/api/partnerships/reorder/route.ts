import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/reorder
//
// Bulk-writes manual priority ranks ({id, priority}[]) after a user
// nudges a partner up/down inside a type sheet. partners is in the
// realtime publication, so every open tab re-sorts as the updates
// land.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;

  let body: { order?: unknown } = {};
  try { body = await req.json(); } catch { /* fallthrough */ }
  const order = Array.isArray(body.order)
    ? (body.order as Array<{ id?: unknown; priority?: unknown }>)
        .filter((e) => typeof e.id === 'string' && typeof e.priority === 'number' && Number.isFinite(e.priority))
        .slice(0, 500)
    : [];
  if (order.length === 0) return NextResponse.json({ error: 'order must be a non-empty array of {id, priority}' }, { status: 400 });

  const admin = getAdminSupabase();
  for (const entry of order) {
    const { error } = await admin
      .from('partners')
      .update({ priority: Math.round(entry.priority as number) })
      .eq('id', entry.id as string);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: order.length });
}
