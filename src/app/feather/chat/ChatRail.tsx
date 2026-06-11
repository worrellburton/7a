'use client';

// Chat-mode sidebar. When you're anywhere under /feather/chat the
// PlatformShell swaps its page nav for this rail: a back button to
// return to the regular nav, a Chat header, the Everybody room, and
// every DM thread you have — pick a person from "New message" and
// their thread appears here. In the desktop rail the labels reveal on
// hover-expand exactly like the page nav; the mobile drawer renders
// the always-expanded variant.

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

interface Conversation {
  room: string;
  kind: 'general' | 'dm';
  other: { id: string; name: string | null; avatar: string | null; user_kind: string | null } | null;
  last_body: string | null;
  last_at: string | null;
  last_by_me: boolean;
  unread: number;
}

interface PickerUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_kind: string | null;
}

export default function ChatRail({
  variant,
  onNavigate,
}: {
  variant: 'rail' | 'drawer';
  onNavigate?: () => void;
}) {
  const { user, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWith = searchParams.get('with');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [people, setPeople] = useState<PickerUser[] | null>(null);
  const [search, setSearch] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Label/visibility treatment: the desktop rail hides text until the
  // sidebar hover-expands (same gate as the page nav); the drawer is
  // always expanded.
  const label = variant === 'rail' ? 'hidden group-hover/sidebar:block' : 'block';
  const labelFlex = variant === 'rail' ? 'hidden group-hover/sidebar:flex' : 'flex';

  const loadConversations = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const r = await fetch('/api/chat/dms', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) return;
      const json = (await r.json()) as { conversations?: Conversation[] };
      if (Array.isArray(json.conversations)) setConversations(json.conversations);
    } catch { /* poll retries */ }
  }, [session?.access_token]);

  useEffect(() => {
    void loadConversations();
    pollRef.current = setInterval(() => { void loadConversations(); }, 20_000);
    const onVis = () => { if (!document.hidden) void loadConversations(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadConversations]);

  // Live: any new message in a room I can see refreshes the list (the
  // RLS select policy keeps other people's DMs out of this stream).
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`chat-rail-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        void loadConversations();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, loadConversations]);

  // People picker — staff + alumni, loaded on first open.
  useEffect(() => {
    if (!pickerOpen || people !== null || !user?.id) return;
    void supabase
      .from('users')
      .select('id, full_name, avatar_url, user_kind, status')
      .neq('id', user.id)
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        const rows = ((data ?? []) as Array<PickerUser & { status?: string | null }>)
          .filter((u) => !u.status || u.status === 'active');
        setPeople(rows);
      });
  }, [pickerOpen, people, user?.id]);

  const openDm = useCallback((otherId: string) => {
    setPickerOpen(false);
    setSearch('');
    onNavigate?.();
    router.push(`/feather/chat?with=${otherId}`);
  }, [router, onNavigate]);

  const filteredPeople = (people ?? []).filter((p) =>
    !search.trim() || (p.full_name ?? '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  const rowBase =
    'group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm overflow-hidden transition-all duration-300 ease-out w-full text-left';
  const activeRow =
    'font-semibold bg-warm-bg/70 text-primary shadow-[inset_3px_0_0_0_var(--color-primary),inset_0_0_0_1px_rgba(188,107,74,0.18)]';
  const idleRow = 'text-foreground/70 hover:text-primary hover:bg-warm-bg/50';

  return (
    <div className="flex flex-col min-h-0 flex-1" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Back to the regular nav */}
      <div className="px-3 pt-2">
        <Link
          href="/feather"
          onClick={onNavigate}
          className={`${rowBase} ${idleRow}`}
        >
          <span className="shrink-0 text-foreground/45">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </span>
          <span className={`${label} whitespace-nowrap text-[13px]`}>Back</span>
        </Link>
      </div>

      {/* Chat header + new message */}
      <div className="px-3 pt-3 pb-1">
        <div className={`${labelFlex} items-center justify-between px-3 mb-1`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45">Chat</p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`${rowBase} ${pickerOpen ? activeRow : idleRow}`}
        >
          <span className="shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className={`${label} whitespace-nowrap text-[13px] font-semibold`}>New message</span>
        </button>

        {pickerOpen && (
          <div className={`${label} mt-1 px-1`}>
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setPickerOpen(false); }}
              placeholder="Who do you want to message?"
              className="w-full px-3 py-1.5 rounded-xl border border-black/10 bg-white text-[13px] focus:outline-none focus:border-primary"
            />
            <div className="mt-1 max-h-56 overflow-y-auto space-y-0.5">
              {people === null ? (
                <p className="px-3 py-2 text-[12px] text-foreground/45 italic">Loading people…</p>
              ) : filteredPeople.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-foreground/45 italic">No one matches.</p>
              ) : (
                filteredPeople.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openDm(p.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-warm-bg/60 transition-colors text-left"
                  >
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-black/10" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center border border-primary/15">
                        {(p.full_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-[13px] text-foreground/85 truncate">{p.full_name || 'Unnamed'}</span>
                    {p.user_kind === 'alumni' && (
                      <span className="shrink-0 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Alumni
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversations */}
      <nav className="sa-sidebar-scroll flex-1 min-h-0 p-3 pt-1 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Conversations">
        {conversations.map((c) => {
          const isActive = c.kind === 'general' ? !activeWith : activeWith === c.other?.id;
          const href = c.kind === 'general' ? '/feather/chat' : `/feather/chat?with=${c.other?.id}`;
          const name = c.kind === 'general' ? 'Everybody' : c.other?.name || 'Someone';
          const preview = c.last_body
            ? `${c.last_by_me ? 'You: ' : ''}${c.last_body}`
            : c.kind === 'general' ? 'Staff + alumni, all together.' : 'Say hi 👋';
          return (
            <Link key={c.room} href={href} onClick={onNavigate} className={`${rowBase} ${isActive ? activeRow : idleRow}`}>
              <span className="relative shrink-0">
                {c.kind === 'general' ? (
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                ) : c.other?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.other.avatar} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-black/10" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center border border-primary/15">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                {c.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white" aria-label={`${c.unread} unread`} />
                )}
              </span>
              <span className={`${label} min-w-0 flex-1`}>
                <span className="flex items-center gap-2">
                  <span className={`text-[13px] truncate ${c.unread > 0 ? 'font-bold text-foreground' : ''}`}>{name}</span>
                  {c.other?.user_kind === 'alumni' && (
                    <span className="shrink-0 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Alumni
                    </span>
                  )}
                </span>
                <span className={`block text-[11px] truncate ${c.unread > 0 ? 'text-foreground/75 font-medium' : 'text-foreground/45'}`}>
                  {preview}
                </span>
              </span>
              {c.unread > 0 && (
                <span className={`${label} shrink-0`}>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums">
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
