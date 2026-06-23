'use client';

// Delayed-delete-with-undo. Destructive actions (deleting a draft) hide the
// row optimistically and start a grace window; only after it elapses does
// the real commit (the DB delete) run. Undo cancels the timer and the row
// reappears — nothing was ever deleted. Navigating away commits any pending
// delete so it isn't silently dropped.

import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY = new Set<string>();

interface Pending { ids: string[]; label: string }

export function usePendingDeletes(commit: (ids: string[]) => void, delayMs = 6000) {
  const [pending, setPending] = useState<Pending | null>(null);
  const timer = useRef<number | null>(null);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const pendingRef = useRef<Pending | null>(null);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  const clearTimer = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };

  const request = useCallback((ids: string[], label: string) => {
    // Commit any in-flight pending immediately before starting a new one,
    // so two quick deletes don't lose the first. Read it from the ref and
    // commit OUTSIDE the state updater — a side effect inside the updater can
    // double-fire under StrictMode and double-commit the previous batch.
    const prev = pendingRef.current;
    if (prev) commitRef.current(prev.ids);
    setPending({ ids, label });
    clearTimer();
    timer.current = window.setTimeout(() => {
      const cur = pendingRef.current;
      if (cur) commitRef.current(cur.ids);
      setPending(null);
      timer.current = null;
    }, delayMs);
  }, [delayMs]);

  const undo = useCallback(() => { clearTimer(); setPending(null); }, []);

  // Commit on unmount so a pending delete isn't dropped on navigation.
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (pendingRef.current) commitRef.current(pendingRef.current.ids);
  }, []);

  const hiddenIds = pending ? new Set(pending.ids) : EMPTY;
  return { pending, hiddenIds, request, undo };
}

export function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 rounded-xl bg-foreground text-white shadow-lg px-4 py-2.5 max-w-[calc(100vw-2rem)]"
    >
      <span className="text-[12.5px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-[12px] font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200"
      >
        Undo
      </button>
    </div>
  );
}
