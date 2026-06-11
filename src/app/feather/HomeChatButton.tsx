'use client';

// Round chat button for the home header's right cluster. Carries a
// live unread badge (general room + DMs, same /api/chat/unread?all=1
// aggregate the sidebar badge uses) and opens /feather/chat. Replaces
// the chat-chips strip that used to sit under the welcome header on
// the staff home.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeChatButton() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/chat/unread?all=1', { cache: 'no-store', credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { unread?: number } | null) => {
          if (!cancelled && json) setUnread(json.unread ?? 0);
        })
        .catch(() => { /* next poll retries */ });
    };
    load();
    const iv = window.setInterval(load, 30_000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push('/feather/chat')}
      aria-label={unread > 0 ? `Chat — ${unread} unread` : 'Chat'}
      title="Chat"
      className="relative inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-foreground hover:bg-white hover:border-primary/45 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <svg className="w-4 h-4 lg:w-[18px] lg:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums ring-2 ring-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
