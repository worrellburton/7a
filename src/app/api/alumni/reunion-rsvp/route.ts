import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET    /api/alumni/reunion-rsvp  → guest list + counts + my status
// POST   /api/alumni/reunion-rsvp  { status: 'going'|'maybe'|'not_going' }
// DELETE /api/alumni/reunion-rsvp  → clear the caller's RSVP (un-answer)
//
// Partiful-style RSVP for the alumni reunion. Reads/writes through the
// service-role client so the guest-list join to public.users works
// regardless of that table's RLS, and so the upsert is scoped to the
// authenticated caller's own row.

export const dynamic = 'force-dynamic';

const VALID = new Set(['going', 'maybe', 'not_going']);

interface Guest {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  status: string;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('reunion_rsvps')
    .select('user_id, status, responded_at, users:user_id(full_name, avatar_url)')
    .order('responded_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guests: Guest[] = ((data ?? []) as Array<{
    user_id: string;
    status: string;
    users: { full_name: string | null; avatar_url: string | null } | Array<{ full_name: string | null; avatar_url: string | null }> | null;
  }>).map((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      userId: r.user_id,
      name: u?.full_name ?? null,
      avatarUrl: u?.avatar_url ?? null,
      status: r.status,
    };
  });

  const counts = { going: 0, maybe: 0, not_going: 0 } as Record<string, number>;
  for (const g of guests) counts[g.status] = (counts[g.status] ?? 0) + 1;
  const mine = guests.find((g) => g.userId === user.id)?.status ?? null;

  return NextResponse.json({ guests, counts, myStatus: mine });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const status = typeof body.status === 'string' ? body.status : '';
  if (!VALID.has(status)) {
    return NextResponse.json({ error: 'status must be going, maybe, or not_going' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { error } = await admin
    .from('reunion_rsvps')
    .upsert({ user_id: user.id, status, responded_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}

// Clear the caller's RSVP entirely — they're back to "no answer". Used
// by the "un-RSVP" toggle so an alum can take back an answer rather
// than being forced to pick one of the three once they've tapped any.
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { error } = await admin.from('reunion_rsvps').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: null });
}
