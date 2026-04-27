'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';

// Per-backlink chat thread, keyed off the backlink's source_url. Same
// iMessage-style layout as the facilities IssueChat: my bubbles on the
// right, everyone else's on the left, realtime inserts/deletes,
// authors can delete their own messages on hover.

interface Message {
  id: string;
  source_url: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface UserInfo {
  full_name: string | null;
  avatar_url: string | null;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Phoenix',
    });
  } catch {
    return '';
  }
}

export function BacklinkChat({
  sourceUrl,
  label,
}: {
  sourceUrl: string;
  label?: string;
}) {
  const { user } = useAuth();
  const { confirm } = useModal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await db({
        action: 'select',
        table: 'seo_backlink_messages',
        match: { source_url: sourceUrl },
        order: { column: 'created_at', ascending: true },
      });
      if (cancelled) return;
      if (Array.isArray(rows)) {
        setMessages(rows as Message[]);
        const ids = (rows as Message[]).map((m) => m.user_id);
        if (user?.id) ids.push(user.id);
        await ensureUsers(ids);
      } else if (user?.id) {
        await ensureUsers([user.id]);
      }
    }
    load();

    // Realtime subscription. The `filter` clause keeps each open chat
    // listening only to its own thread.
    const channel = supabase
      .channel(`backlink-chat-${sourceUrl}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seo_backlink_messages', filter: `source_url=eq.${sourceUrl}` },
        async (payload) => {
          const row = payload.new as Message;
          await ensureUsers([row.user_id]);
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'seo_backlink_messages', filter: `source_url=eq.${sourceUrl}` },
        (payload) => {
          const row = payload.old as Message;
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  async function ensureUsers(ids: string[]) {
    const missing = Array.from(new Set(ids)).filter((id) => id && !users[id]);
    if (missing.length === 0) return;
    const rows = await db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url' });
    if (Array.isArray(rows)) {
      const next: Record<string, UserInfo> = { ...users };
      for (const r of rows as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        next[r.id] = { full_name: r.full_name, avatar_url: r.avatar_url };
      }
      setUsers(next);
    }
  }

  const send = async () => {
    const body = draft.trim();
    if (!body || !user || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      source_url: sourceUrl,
      user_id: user.id,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    const inserted = await db({
      action: 'insert',
      table: 'seo_backlink_messages',
      data: { source_url: sourceUrl, user_id: user.id, body },
    });
    if (inserted && (inserted as Message).id) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (inserted as Message) : m)));
      logActivity({
        userId: user.id,
        type: 'seo.backlink_chat_message',
        targetKind: 'seo_backlink',
        targetId: sourceUrl,
        targetLabel: label || sourceUrl,
        targetPath: '/app/seo/backlinks',
        metadata: { preview: body.slice(0, 140) },
      });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    const ok = await confirm('Delete this message?', { confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const prev = messages;
    setMessages((cur) => cur.filter((m) => m.id !== id));
    const res = await db({ action: 'delete', table: 'seo_backlink_messages', match: { id } });
    if (!res || (res as { ok?: boolean; error?: string }).error) {
      setMessages(prev);
    } else if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'seo.backlink_chat_message_deleted',
        targetKind: 'seo_backlink',
        targetId: sourceUrl,
        targetLabel: label || sourceUrl,
        targetPath: '/app/seo/backlinks',
      });
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-body)' }}>
      <div ref={scrollRef} className="flex-1 px-3 py-3 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-foreground/30 text-center py-6">
            No comments yet — start the conversation.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = user?.id === m.user_id;
            const author = users[m.user_id];
            const prev = i > 0 ? messages[i - 1] : null;
            const showAuthor = (!prev || prev.user_id !== m.user_id);
            const initial = (author?.full_name || '?').charAt(0).toUpperCase();
            const AvatarBubble = (
              <div className="w-6 h-6 shrink-0">
                {author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                    {initial}
                  </div>
                )}
              </div>
            );
            return (
              <div key={m.id} className={`flex items-end gap-2 group/msg ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && AvatarBubble}
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[78%]`}>
                  {showAuthor && !mine && (
                    <span className="text-[10px] text-foreground/40 mb-0.5 px-2">
                      {author?.full_name || 'Unknown'}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    {mine && (
                      <button
                        onClick={() => remove(m.id)}
                        className="opacity-0 group-hover/msg:opacity-100 text-foreground/30 hover:text-red-500 transition-opacity"
                        aria-label="Delete message"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <div
                      className={`px-3 py-1.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                        mine
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-warm-bg text-foreground rounded-bl-md'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                  <span className="text-[10px] text-foreground/30 mt-0.5 px-2">
                    {formatTime(m.created_at)}
                  </span>
                </div>
                {mine && AvatarBubble}
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-gray-100 px-2 py-2 flex items-end gap-2 bg-warm-bg/30">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Comment on this backlink…"
          rows={1}
          className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="shrink-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
