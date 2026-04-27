'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';

// Generic per-row chat thread for any (table, keyColumn, keyValue)
// triple. iMessage-style bubbles: my posts on the right, others on
// the left. Realtime INSERT/DELETE subscription scoped to a single
// keyValue. Authors can hover-delete their own messages.
//
// Drop-in for tables shaped like:
//   id uuid PK
//   <keyColumn> <type>           -- e.g. issue_id uuid / source_url text
//   user_id uuid REFERENCES users(id)
//   body text
//   created_at timestamptz

interface Message {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  // The key column is dynamic, but it's always present.
  [key: string]: string | number | boolean | null | undefined;
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

export function RowChat({
  table,
  keyColumn,
  keyValue,
  label,
  targetPath,
  activityType,
  activityKind,
}: {
  table: string;
  keyColumn: string;
  keyValue: string;
  /** Human-readable label for activity log entries. */
  label?: string;
  /** App path the activity log should link back to. */
  targetPath: string;
  /** Activity log event type for sends, e.g. "seo.backlink_chat_message". */
  activityType: string;
  /** targetKind on the activity log entry. */
  activityKind: string;
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
        table,
        match: { [keyColumn]: keyValue },
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

    const channel = supabase
      .channel(`row-chat-${table}-${keyValue}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `${keyColumn}=eq.${keyValue}` },
        async (payload) => {
          const row = payload.new as Message;
          await ensureUsers([row.user_id]);
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter: `${keyColumn}=eq.${keyValue}` },
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
  }, [table, keyColumn, keyValue]);

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
      [keyColumn]: keyValue,
      user_id: user.id,
      body,
      created_at: new Date().toISOString(),
    } as Message;
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    const inserted = await db({
      action: 'insert',
      table,
      data: { [keyColumn]: keyValue, user_id: user.id, body },
    });
    if (inserted && (inserted as Message).id) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (inserted as Message) : m)));
      logActivity({
        userId: user.id,
        type: activityType,
        targetKind: activityKind,
        targetId: keyValue,
        targetLabel: label || keyValue,
        targetPath,
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
    const res = await db({ action: 'delete', table, match: { id } });
    if (!res || (res as { ok?: boolean; error?: string }).error) {
      setMessages(prev);
    } else if (user?.id) {
      logActivity({
        userId: user.id,
        type: `${activityType}_deleted`,
        targetKind: activityKind,
        targetId: keyValue,
        targetLabel: label || keyValue,
        targetPath,
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
          placeholder="Add a comment…"
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
