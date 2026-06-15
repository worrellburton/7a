import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { isDmRoom, isDmParticipant, dmOtherParticipant } from '@/lib/chat-shared';
import { requireChatAccess, isAlumniUser } from '@/lib/chat-server';

// GET  /api/chat/messages?room=general  — newest 100 messages with
//                                         author display name + avatar
// POST /api/chat/messages                — send a new message
//
// Chat is alumni-only (see lib/chat-server). Rooms: 'general' is the
// everybody room (alumni community); 'dm:<uidA>:<uidB>' rooms are private
// DMs — both verbs refuse anyone who isn't one of the two participants,
// and DMs are further restricted to alumni-to-alumni so an alum can only
// message another alum, never an employee.

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

interface MessageRow {
  id: string;
  room: string;
  user_id: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;

  const url = new URL(req.url);
  const room = url.searchParams.get('room') || 'general';
  if (isDmRoom(room)) {
    if (!isDmParticipant(room, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const other = dmOtherParticipant(room, user.id);
    if (!other || !(await isAlumniUser(other))) {
      return NextResponse.json({ error: 'DMs are alumni-only' }, { status: 403 });
    }
  }
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('chat_messages')
    .select('id, room, user_id, body, edited_at, deleted_at, created_at')
    .eq('room', room)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as MessageRow[]).reverse();
  // Hydrate author display name + avatar in one shot.
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const userMap = new Map<string, { full_name: string | null; avatar_url: string | null; user_kind: string | null }>();
  if (ids.length > 0) {
    const { data: usrs } = await admin
      .from('users')
      .select('id, full_name, avatar_url, user_kind')
      .in('id', ids);
    for (const u of usrs ?? []) {
      userMap.set(u.id as string, {
        full_name: (u.full_name as string | null) ?? null,
        avatar_url: (u.avatar_url as string | null) ?? null,
        user_kind: (u.user_kind as string | null) ?? null,
      });
    }
  }
  const enriched = rows.map((r) => {
    const u = userMap.get(r.user_id);
    return {
      ...r,
      author_name: u?.full_name ?? null,
      author_avatar_url: u?.avatar_url ?? null,
      author_kind: u?.user_kind ?? null,
    };
  });
  return NextResponse.json({ rows: enriched });
}

export async function POST(req: NextRequest) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;

  let body: { room?: string; body?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const room = typeof body.room === 'string' && body.room.trim() ? body.room.trim() : 'general';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (isDmRoom(room)) {
    if (!isDmParticipant(room, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const other = dmOtherParticipant(room, user.id);
    if (!other || !(await isAlumniUser(other))) {
      return NextResponse.json({ error: 'DMs are alumni-only' }, { status: 403 });
    }
  }
  if (!text) return NextResponse.json({ error: 'body is empty' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'body too long (max 4000)' }, { status: 413 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('chat_messages')
    .insert({ room, user_id: user.id, body: text })
    .select('id, room, user_id, body, edited_at, deleted_at, created_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
