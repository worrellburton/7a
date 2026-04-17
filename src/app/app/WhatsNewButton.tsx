'use client';

import { useEffect, useState } from 'react';
import { updates } from '@/lib/updates';

// Floating "What's new" button pinned to the lower-right. Pulses when there's
// an update newer than whatever the user last viewed. The indicator clears the
// moment the user opens the popup (we write the latest update's timestamp to
// localStorage under `whats_new_seen_at`).

const SEEN_KEY = 'whats_new_seen_at';

function formatUpdateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Phoenix',
    });
  } catch {
    return iso;
  }
}

export default function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeenAt(window.localStorage.getItem(SEEN_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const latest = updates[0]?.at;
  const hasNew = !!latest && (!seenAt || new Date(latest) > new Date(seenAt));

  function handleOpen() {
    setOpen(true);
    if (latest) {
      try { window.localStorage.setItem(SEEN_KEY, latest); } catch { /* ignore */ }
      setSeenAt(latest);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-40 group flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-primary/40 transition-all"
        aria-label="What's new"
        title="What's new"
      >
        <span className="relative inline-flex items-center justify-center">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {hasNew && (
            <>
              <span className="absolute -top-1 -right-1 block w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <span className="absolute -top-1 -right-1 block w-2.5 h-2.5 rounded-full bg-primary" />
            </>
          )}
        </span>
        <span className="text-xs font-semibold text-foreground/70 group-hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
          What&apos;s new
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/20 p-0 sm:p-6" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:w-[26rem] max-h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-foreground">What&apos;s new</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-foreground/40 hover:text-foreground hover:bg-warm-bg transition-colors" aria-label="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {updates.length === 0 ? (
                <p className="text-xs text-foreground/40 text-center py-6" style={{ fontFamily: 'var(--font-body)' }}>No updates yet.</p>
              ) : (
                updates.map((u) => (
                  <div key={u.at} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <p className="text-sm font-semibold text-foreground">{u.title}</p>
                      <span className="text-[10px] text-foreground/40 shrink-0 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                        {formatUpdateTime(u.at)}
                      </span>
                    </div>
                    <ul className="text-xs text-foreground/60 space-y-1 list-disc pl-4" style={{ fontFamily: 'var(--font-body)' }}>
                      {u.items.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
