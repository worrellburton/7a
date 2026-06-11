'use client';

// Chats strip for the home screens (staff /feather + alumni
// /feather/alumni). One horizontal row of conversation chips —
// Everybody first, then DM threads with unread badges — each linking
// straight into /feather/chat. Data comes from the same /api/chat/dms
// endpoint that powers the chat-mode sidebar rail.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface Conversation {
  room: string;
  kind: 'general' | 'dm';
  other: { id: string; name: string | null; avatar: string | null; user_kind: string | null } | null;
  last_body: string | null;
  last_at: string | null;
  last_by_me: boolean;
  unread: number;
}

export default function HomeChatsRow() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const r = await fetch('/api/chat/dms', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) return;
      const json = (await r.json()) as { conversations?: Conversation[] };
      if (Array.isArray(json.conversations)) setConversations(json.conversations);
    } catch { /* next poll retries */ }
  }, [session?.access_token]);

  useEffect(() => {
    void load();
    const iv = setInterval(() => { void load(); }, 60_000);
    const onVis = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  if (conversations.length === 0) return null;

  return (
    <section aria-label="Your chats" className="mb-5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {conversations.map((c) => {
          const href = c.kind === 'general' ? '/feather/chat' : `/feather/chat?with=${c.other?.id}`;
          const name = c.kind === 'general' ? 'Everybody' : c.other?.name?.split(' ')[0] || 'Someone';
          return (
            <Link
              key={c.room}
              href={href}
              className={`group shrink-0 inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3.5 py-1.5 transition-all hover:shadow-md hover:-translate-y-px ${
                c.unread > 0
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-white border-black/10 hover:border-primary/25'
              }`}
            >
              <span className="relative shrink-0">
                {c.kind === 'general' ? (
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                ) : c.other?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.other.avatar} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-black/10" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center border border-primary/15">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                {c.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
                )}
              </span>
              <span className={`text-[12.5px] whitespace-nowrap ${c.unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/75 group-hover:text-foreground'}`}>
                {name}
              </span>
              {c.unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums">
                  {c.unread > 99 ? '99+' : c.unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
