'use client';

// Chat — realtime chatroom for staff + alumni. One global room for
// now ('general'); the schema is room-scoped so multi-room is a
// future addition. Realtime is two pipes:
//   * postgres_changes on chat_messages (INSERT / UPDATE / DELETE)
//     keeps the message list in sync across tabs.
//   * a Supabase presence channel (`chat-presence-${room}`) carries
//     the typing indicator — every keystroke debounces to a
//     presence track update, and idle ticks remove the user.
//
// Edits + deletes flip edited_at / deleted_at on the row instead of
// hard-deleting. The UI renders "edited" + "(message deleted)"
// placeholders so the timeline doesn't gap mid-thread.

import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { supabase } from '@/lib/supabase';
import { GENERAL_ROOM, dmRoomFor } from '@/lib/chat-shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Message {
  id: string;
  room: string;
  user_id: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  author_kind?: string | null;
}

interface TypingPresence {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ChatContent() {
  const { user, session, userKind, isSuperAdmin, avatarUrl: myAvatarFromAuth } = useAuth();
  const modal = useModal();
  // Active room: /feather/chat is the Everybody room; /feather/chat?with=<id>
  // is a DM with that person (room key derived from the sorted uid
  // pair, so both sides land in the same room). The chat-mode sidebar
  // rail in PlatformShell drives this param.
  const searchParams = useSearchParams();
  const withId = searchParams.get('with');
  const room = user?.id && withId ? dmRoomFor(user.id, withId) : GENERAL_ROOM;
  const isDm = room !== GENERAL_ROOM;
  const [otherUser, setOtherUser] = useState<{ name: string | null; avatar: string | null; kind: string | null } | null>(null);
  useEffect(() => {
    if (!withId) {
      setOtherUser(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from('users')
      .select('full_name, avatar_url, user_kind')
      .eq('id', withId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setOtherUser({
          name: (data?.full_name as string | null) ?? null,
          avatar: (data?.avatar_url as string | null) ?? null,
          kind: (data?.user_kind as string | null) ?? null,
        });
      });
    return () => { cancelled = true; };
  }, [withId]);
  // OAuth metadata's full_name + avatar_url can be stale (or empty)
  // for any teammate who edited their profile via /app/profile —
  // those edits land on public.users, not the auth metadata. Pull
  // the canonical name + avatar from the users row so the chat
  // byline matches what every other surface in the app shows.
  const [myName, setMyName] = useState<string | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await supabase.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        const dbName = (r.data?.full_name as string | null | undefined) ?? null;
        const dbAvatar = (r.data?.avatar_url as string | null | undefined) ?? null;
        const metaName = (user.user_metadata?.full_name as string | undefined) ?? null;
        setMyName(dbName ?? metaName ?? user.email?.split('@')[0] ?? null);
        setMyAvatar(dbAvatar ?? myAvatarFromAuth ?? null);
      } catch { /* fallback below handles it */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email, user?.user_metadata?.full_name, myAvatarFromAuth]);
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [typing, setTyping] = useState<TypingPresence[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Initial fetch + realtime subscriptions. Re-runs whenever the
  // active room changes (switching between Everybody and a DM).
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    setRows([]);
    setLoading(true);
    fetch(`/api/chat/messages?room=${encodeURIComponent(room)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => (r.ok ? ((await r.json()) as { rows: Message[] }) : null))
      .then((json) => {
        if (cancelled || !json) return;
        setRows(json.rows ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Mark as read on mount + clear the red dot in the sidebar.
    void fetch(`/api/chat/unread?room=${encodeURIComponent(room)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const channel = supabase
      .channel(`chat-${room}-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${room}` }, (payload) => {
        const row = payload.new as Message;
        setRows((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room=eq.${room}` }, (payload) => {
        const row = payload.new as Message;
        setRows((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const old = payload.old as { id: string };
        setRows((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [session?.access_token, user?.id, room]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Scroll if we're near the bottom — don't yank the viewport if
    // the user has scrolled up to read older messages.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  // Read cursor: while this page is open, every batch of messages we
  // render counts as read. PlatformShell's sidebar badge counts
  // chat_messages newer than this stamp.
  useEffect(() => {
    if (!user?.id || rows.length === 0) return;
    void supabase
      .from('chat_reads')
      .upsert({ user_id: user.id, room, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,room' });
  }, [user?.id, rows.length, room]);

  // Typing-indicator presence channel. Each keystroke calls track()
  // with `is_typing=true`; a timer untracks after 3 seconds idle.
  // Other tabs read the presence state and render "X is typing…".
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`chat-presence-${room}`, { config: { presence: { key: user.id } } });
    presenceRef.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const next: TypingPresence[] = [];
      for (const [key, metas] of Object.entries(state)) {
        if (key === user.id) continue;
        const meta = (metas as Array<{ is_typing?: boolean; full_name?: string | null; avatar_url?: string | null }>)[0];
        if (meta?.is_typing) {
          next.push({
            user_id: key,
            full_name: meta.full_name ?? null,
            avatar_url: meta.avatar_url ?? null,
          });
        }
      }
      setTyping(next);
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ is_typing: false, full_name: myName, avatar_url: myAvatar });
      }
    });
    return () => {
      void supabase.removeChannel(ch);
      presenceRef.current = null;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user?.id, myName, myAvatar, room]);

  const announceTyping = useCallback(() => {
    const ch = presenceRef.current;
    if (!ch || !user?.id) return;
    void ch.track({ is_typing: true, full_name: myName, avatar_url: myAvatar });
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void ch.track({ is_typing: false, full_name: myName, avatar_url: myAvatar });
    }, 3000);
  }, [user?.id, myName, myAvatar]);

  async function send() {
    if (!session?.access_token || !user?.id) return;
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    // Stop the typing indicator immediately.
    const ch = presenceRef.current;
    if (ch) {
      void ch.track({ is_typing: false, full_name: myName, avatar_url: myAvatar });
    }
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ room, body: text }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Couldn't send: ${json.error ?? res.status}`);
        setDraft(text);
      }
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(messageId: string) {
    if (!session?.access_token) return;
    const text = editDraft.trim();
    if (!text) { setEditingId(null); return; }
    const res = await fetch(`/api/chat/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ body: text }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't edit: ${json.error ?? res.status}`);
      return;
    }
    setEditingId(null);
    setEditDraft('');
  }

  async function deleteMessage(messageId: string, asSuperAdmin = false) {
    if (!session?.access_token) return;
    const ok = asSuperAdmin
      ? await modal.confirm('Hard-delete this message?', {
          message: 'Removed from the database with no placeholder. Cannot be undone.',
          confirmLabel: 'Hard delete',
          tone: 'danger',
        })
      : await modal.confirm('Delete this message?', {
          confirmLabel: 'Delete',
          tone: 'danger',
        });
    if (!ok) return;
    const res = await fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Couldn't delete: ${json.error ?? res.status}`);
    }
  }

  // Group messages by author + minute so multiple sends from the
  // same person collapse into a single avatar block. Soft-deleted
  // messages are split out as their own anonymous entries — we
  // never show whose message it was, just "(a user deleted a
  // message)". Hard-deleted rows are dropped from the realtime
  // feed entirely (super admin removal) so they don't appear here.
  type GroupItem =
    | { kind: 'group'; authorId: string; firstAt: string; messages: Message[] }
    | { kind: 'deleted'; id: string; createdAt: string };
  const groups = useMemo<GroupItem[]>(() => {
    const out: GroupItem[] = [];
    for (const m of rows) {
      if (m.deleted_at) {
        out.push({ kind: 'deleted', id: m.id, createdAt: m.created_at });
        continue;
      }
      const last = out[out.length - 1];
      if (
        last &&
        last.kind === 'group' &&
        last.authorId === m.user_id &&
        Math.abs(new Date(m.created_at).getTime() - new Date(last.firstAt).getTime()) < 5 * 60 * 1000
      ) {
        last.messages.push(m);
      } else {
        out.push({ kind: 'group', authorId: m.user_id, firstAt: m.created_at, messages: [m] });
      }
    }
    return out;
  }, [rows]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] max-h-[calc(100vh-1px)] overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="px-4 sm:px-6 lg:px-10 py-4 border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-3 flex-wrap">
          {isDm ? (
            <div className="flex items-center gap-3 min-w-0">
              {otherUser?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={otherUser.avatar} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-black/10" />
              ) : (
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                  {(otherUser?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Direct message</p>
                <h1 className="text-lg font-semibold text-foreground tracking-tight truncate">
                  {otherUser?.name || 'Direct message'}
                  {otherUser?.kind === 'alumni' && (
                    <span className="ml-2 align-middle inline-block px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Alumni
                    </span>
                  )}
                </h1>
                <p className="text-sm text-foreground/55 mt-0.5">Just the two of you.</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Chatroom</p>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Everybody</h1>
              <p className="text-sm text-foreground/55 mt-0.5">
                Open to staff + alumni. {userKind === 'alumni' && <span className="text-emerald-700 font-semibold">Welcome back.</span>}
              </p>
            </div>
          )}
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            <p className="text-center text-sm text-foreground/45">Loading messages…</p>
          ) : groups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="mt-1 text-[12.5px] text-foreground/55">
                {isDm ? `Say hi to ${otherUser?.name?.split(' ')[0] || 'them'} — this is the start of your conversation.` : 'Be the first to say hi.'}
              </p>
            </div>
          ) : (
            groups.map((g) => {
              if (g.kind === 'deleted') {
                // Anonymous placeholder — no avatar, no name, no
                // timestamp. Just a centered grey line so the
                // viewer knows a message used to be here without
                // learning who deleted it.
                return (
                  <div key={g.id} className="flex justify-center">
                    <p className="px-3 py-1 rounded-full bg-warm-bg/60 text-[11.5px] italic text-foreground/45">
                      A user deleted a message
                    </p>
                  </div>
                );
              }
              const head = g.messages[0];
              const isMine = g.authorId === user.id;
              // For your own messages, prefer the live state copy of
              // name + avatar — the API join can lag a fresh INSERT
              // and we don't want a `?` flash before realtime backfills.
              const displayAvatar = isMine ? (head.author_avatar_url || myAvatar) : head.author_avatar_url;
              const displayName = isMine ? (head.author_name || myName) : head.author_name;
              // Alumni have a viewable profile at /feather/alumni/u/[id]
              // (reachable by anyone signed in; the API enforces opt-in
              // privacy on PII). Staff don't have an equivalent surface,
              // so their names/avatars stay plain text.
              const profileHref = head.author_kind === 'alumni' ? `/feather/alumni/u/${g.authorId}` : null;
              const avatarEl = displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-black/10" />
              ) : (
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </span>
              );
              return (
                <div key={head.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <div className="shrink-0">
                    {profileHref ? (
                      <Link href={profileHref} aria-label={`View ${displayName || 'profile'}`} className="block hover:opacity-80 transition-opacity">
                        {avatarEl}
                      </Link>
                    ) : (
                      avatarEl
                    )}
                  </div>
                  <div className={`min-w-0 max-w-[80%] ${isMine ? 'text-right' : ''}`}>
                    <div className={`flex items-baseline gap-2 ${isMine ? 'justify-end' : ''}`}>
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="text-[12.5px] font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
                        >
                          {isMine ? (displayName || 'You') : (displayName || 'Someone')}
                        </Link>
                      ) : (
                        <p className="text-[12.5px] font-semibold text-foreground">
                          {isMine ? (displayName || 'You') : (displayName || 'Someone')}
                        </p>
                      )}
                      {head.author_kind === 'alumni' && !isMine && (
                        <span className="inline-block px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Alumni
                        </span>
                      )}
                      <span className="text-[11px] text-foreground/40">{fmtTime(head.created_at)}</span>
                    </div>
                    <ul className={`mt-1 space-y-1 ${isMine ? 'items-end flex flex-col' : ''}`}>
                      {g.messages.map((m) => {
                        const isEditing = editingId === m.id;
                        return (
                          <li key={m.id} className="group/msg max-w-full">
                            {isEditing ? (
                              <div className={`inline-flex flex-col gap-1.5 ${isMine ? 'items-end' : ''}`}>
                                <textarea
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  rows={Math.min(6, editDraft.split('\n').length)}
                                  className="w-72 max-w-full px-3 py-1.5 rounded-2xl border border-primary bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(m.id)}
                                    className="px-2 py-1 rounded-md bg-primary text-white font-semibold uppercase tracking-wider"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setEditDraft(''); }}
                                    className="text-foreground/55 hover:text-foreground"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className={`inline-flex items-start gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                <p
                                  className={`px-3 py-1.5 rounded-2xl text-sm whitespace-pre-wrap break-words text-left ${
                                    isMine ? 'bg-primary text-white' : 'bg-white border border-black/10 text-foreground'
                                  }`}
                                >
                                  {m.body}
                                </p>
                                {m.edited_at && (
                                  <span className="text-[10px] text-foreground/35 mt-1.5 italic">edited</span>
                                )}
                                {(isMine || isSuperAdmin) && (
                                  <span className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1 self-start mt-1">
                                    {isMine && (
                                      <button
                                        type="button"
                                        onClick={() => { setEditingId(m.id); setEditDraft(m.body); }}
                                        className="text-foreground/40 hover:text-primary"
                                        aria-label="Edit"
                                        title="Edit"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteMessage(m.id, !isMine && isSuperAdmin)}
                                      className={`text-foreground/40 hover:text-rose-600 ${!isMine && isSuperAdmin ? 'hover:text-rose-700' : ''}`}
                                      aria-label={!isMine && isSuperAdmin ? 'Hard delete (super admin)' : 'Delete'}
                                      title={!isMine && isSuperAdmin ? 'Hard delete (super admin)' : 'Delete'}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
                                    </button>
                                  </span>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Composer — iMessage-style capsule: one frosted "liquid glass"
          pill holding the textarea with a circular arrow-up send button
          inset on the right. The capsule glows warmer the moment it has
          focus or a draft, like the iOS field lighting up. */}
      <footer className="border-t border-white/40 bg-gradient-to-t from-white/90 to-white/55 backdrop-blur-xl px-4 sm:px-6 lg:px-10 py-3">
        <div className="max-w-3xl mx-auto">
          {typing.length > 0 && (
            <p className="mb-1.5 text-[11px] text-foreground/55 italic">
              {typing.map((t) => t.full_name?.split(' ')[0] || 'Someone').join(', ')} {typing.length === 1 ? 'is' : 'are'} typing
              <span className="ml-1 inline-flex">
                <span className="w-1 h-1 rounded-full bg-foreground/45 mx-0.5 animate-bounce" />
                <span className="w-1 h-1 rounded-full bg-foreground/45 mx-0.5 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1 h-1 rounded-full bg-foreground/45 mx-0.5 animate-bounce" style={{ animationDelay: '240ms' }} />
              </span>
            </p>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className={`group/composer relative flex items-end rounded-[26px] border bg-white/55 backdrop-blur-2xl transition-all duration-300 ${
              draft.trim()
                ? 'border-primary/30 shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_2px_18px_rgba(188,107,74,0.28),0_0_42px_rgba(216,137,102,0.22)]'
                : 'border-white/60 shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_2px_12px_rgba(0,0,0,0.06)] focus-within:border-primary/25 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_2px_16px_rgba(188,107,74,0.18),0_0_32px_rgba(216,137,102,0.14)]'
            }`}
          >
            {/* Liquid-glass sheen — a soft top highlight that makes the
                capsule read as curved glass instead of flat white. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[26px] overflow-hidden"
            >
              <span className="absolute inset-x-3 top-0 h-1/2 rounded-[26px] bg-gradient-to-b from-white/80 to-transparent opacity-70" />
            </span>
            <textarea
              value={draft}
              onChange={(e) => { setDraft(e.target.value); announceTyping(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={Math.min(4, Math.max(1, draft.split('\n').length))}
              placeholder="Message…"
              className="relative flex-1 min-w-0 bg-transparent border-0 text-sm leading-5 pl-4 pr-2 py-2.5 focus:outline-none focus:ring-0 resize-none placeholder:text-foreground/40"
              // Inline because the global `:focus-visible` accessibility
              // outline in globals.css is unlayered CSS — it beats any
              // Tailwind utility, and it was drawing a rectangular ring
              // inside the glass capsule. The capsule's own focus-within
              // glow is the focus indicator here.
              style={{ outline: 'none' }}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send"
              className={`relative shrink-0 m-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                draft.trim() && !sending
                  ? 'bg-primary text-white shadow-[0_0_14px_rgba(188,107,74,0.55)] hover:bg-primary-dark hover:shadow-[0_0_18px_rgba(188,107,74,0.7)] scale-100'
                  : 'bg-foreground/10 text-foreground/35 scale-95'
              }`}
            >
              {sending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isSameDay = d.toDateString() === today.toDateString();
  if (isSameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 1) return `Yesterday · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (diffDays < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
