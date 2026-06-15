import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireChatAccess } from '@/lib/chat-server';

// GET  /api/chat/unread?room=general  — { unread: number, last_at: iso | null }
// POST /api/chat/unread?room=general  — bump chat_reads.last_read_at to now
//
// Powers the red-dot indicator on the Chat sidebar entry. The page
// itself calls POST as soon as it mounts so opening Chat clears the
// dot for that user.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;
  const url = new URL(req.url);
  const room = url.searchParams.get('room') || 'general';

  const admin = getAdminSupabase();

  // ?all=1 — aggregate unread across the general room AND every DM
  // room the caller participates in. Powers the sidebar Chat badge so
  // a waiting DM lights it up, not just Everybody traffic.
  if (url.searchParams.get('all') === '1') {
    const { data: reads } = await admin
      .from('chat_reads')
      .select('room, last_read_at')
      .eq('user_id', user.id);
    const cursorByRoom = new Map<string, string>();
    for (const r of reads ?? []) cursorByRoom.set(r.room as string, r.last_read_at as string);

    const { data: msgs } = await admin
      .from('chat_messages')
      .select('room, user_id, created_at, deleted_at')
      .or(`room.eq.general,and(room.like.dm:%,room.like.%${user.id}%)`)
      .order('created_at', { ascending: false })
      .limit(1000);
    let unread = 0;
    for (const m of (msgs ?? []) as Array<{ room: string; user_id: string; created_at: string; deleted_at: string | null }>) {
      if (m.user_id === user.id || m.deleted_at) continue;
      const cursor = cursorByRoom.get(m.room);
      if (!cursor || m.created_at > cursor) unread++;
    }
    return NextResponse.json({ unread, last_at: null });
  }
  const { data: read } = await admin
    .from('chat_reads')
    .select('last_read_at')
    .eq('user_id', user.id)
    .eq('room', room)
    .maybeSingle();
  const lastRead = (read as { last_read_at?: string } | null)?.last_read_at ?? null;

  // Count messages newer than the user's last read marker, ignoring
  // their own messages (you don't unread-yourself) and soft-deleted
  // rows.
  let query = admin
    .from('chat_messages')
    .select('id, created_at', { count: 'exact', head: false })
    .eq('room', room)
    .neq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  if (lastRead) query = query.gt('created_at', lastRead);
  const { data, count } = await query;
  const lastAt = (data && data[0] && (data[0] as { created_at?: string }).created_at) || null;

  return NextResponse.json({ unread: count ?? 0, last_at: lastAt });
}

export async function POST(req: NextRequest) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;
  const url = new URL(req.url);
  const room = url.searchParams.get('room') || 'general';

  const admin = getAdminSupabase();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('chat_reads')
    .upsert(
      { user_id: user.id, room, last_read_at: now },
      { onConflict: 'user_id,room' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, last_read_at: now });
}
