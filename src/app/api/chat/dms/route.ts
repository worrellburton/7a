import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { GENERAL_ROOM, dmOtherParticipant } from '@/lib/chat-shared';
import { requireChatAccess } from '@/lib/chat-server';

// GET /api/chat/dms — the caller's conversation list.
//
// Returns the Everybody room plus every DM room the caller is part
// of, each with the other person's identity, a last-message preview,
// and an unread count derived from chat_reads cursors. One endpoint
// powers the chat-mode sidebar rail, the home-screen chats row, and
// the aggregate sidebar badge (sum the unreads).

export const dynamic = 'force-dynamic';

interface MessageLite {
  room: string;
  user_id: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  room: string;
  kind: 'general' | 'dm';
  other: { id: string; name: string | null; avatar: string | null; user_kind: string | null } | null;
  last_body: string | null;
  last_at: string | null;
  last_by_me: boolean;
  unread: number;
}

export async function GET(req: NextRequest) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const me = gate.user.id;

  const admin = getAdminSupabase();

  // Read cursors for every room the caller has opened.
  const { data: readRows } = await admin
    .from('chat_reads')
    .select('room, last_read_at')
    .eq('user_id', me);
  const lastReadByRoom = new Map<string, string>();
  for (const r of readRows ?? []) {
    lastReadByRoom.set(r.room as string, r.last_read_at as string);
  }

  // Recent messages across the general room + my DM rooms. 1000 recent
  // rows comfortably covers the active window for a 20-bed program's
  // staff+alumni chat; older threads still appear via their last
  // message as long as it's in range.
  const { data: msgRows, error } = await admin
    .from('chat_messages')
    .select('room, user_id, body, deleted_at, created_at')
    .or(`room.eq.${GENERAL_ROOM},and(room.like.dm:%,room.like.%${me}%)`)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byRoom = new Map<string, { last: MessageLite | null; unread: number }>();
  byRoom.set(GENERAL_ROOM, { last: null, unread: 0 });
  for (const raw of (msgRows ?? []) as MessageLite[]) {
    let entry = byRoom.get(raw.room);
    if (!entry) {
      entry = { last: null, unread: 0 };
      byRoom.set(raw.room, entry);
    }
    if (!entry.last && !raw.deleted_at) entry.last = raw;
    const cursor = lastReadByRoom.get(raw.room);
    if (
      raw.user_id !== me &&
      !raw.deleted_at &&
      (!cursor || raw.created_at > cursor)
    ) {
      entry.unread++;
    }
  }

  // Resolve the "other" person for each DM room.
  const otherIds = Array.from(byRoom.keys())
    .map((room) => dmOtherParticipant(room, me))
    .filter((id): id is string => !!id);
  const userMap = new Map<string, { name: string | null; avatar: string | null; user_kind: string | null }>();
  if (otherIds.length > 0) {
    const { data: usrs } = await admin
      .from('users')
      .select('id, full_name, avatar_url, user_kind')
      .in('id', otherIds);
    for (const u of usrs ?? []) {
      userMap.set(u.id as string, {
        name: (u.full_name as string | null) ?? null,
        avatar: (u.avatar_url as string | null) ?? null,
        user_kind: (u.user_kind as string | null) ?? null,
      });
    }
  }

  const conversations: ChatConversation[] = [];
  for (const [room, entry] of byRoom.entries()) {
    const otherId = dmOtherParticipant(room, me);
    // Keep the Everybody room + alumni-to-alumni DMs only. Any legacy
    // DM thread with an employee is dropped from the list so an alum's
    // conversations stay alumni-only.
    if (otherId && userMap.get(otherId)?.user_kind !== 'alumni') continue;
    conversations.push({
      room,
      kind: room === GENERAL_ROOM ? 'general' : 'dm',
      other: otherId
        ? { id: otherId, ...(userMap.get(otherId) ?? { name: null, avatar: null, user_kind: null }) }
        : null,
      last_body: entry.last?.body ?? null,
      last_at: entry.last?.created_at ?? null,
      last_by_me: entry.last?.user_id === me,
      unread: entry.unread,
    });
  }
  // Everybody first, then DMs by most recent activity.
  conversations.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'general' ? -1 : 1;
    return (b.last_at ?? '').localeCompare(a.last_at ?? '');
  });

  return NextResponse.json({ conversations });
}
