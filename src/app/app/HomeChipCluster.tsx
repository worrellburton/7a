'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Right-cluster wrapper for the home header's info chips
// (HomeMercuryBalanceChip, HomeDailyLogsChip, HomeHardwareChip).
//
// Desktop: chips render inline in a row, same as before.
// Mobile:  the chips collapse behind a single round trigger button.
//          Tapping it opens a dropdown panel positioned below the
//          button with the chips stacked vertically. Closes on
//          outside-click / Escape / pressing the trigger again so
//          the home header stops competing with the WELCOME BACK
//          headline for horizontal space.
//
// Children render once and are repositioned via class toggles rather
// than re-mounted, so each chip's internal state + queries persist
// when the user opens / closes the panel.

export default function HomeChipCluster({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center gap-2">
      {/* Mobile trigger. Hidden on sm+ so the chips below sit inline.
          The hint chip in the corner mirrors the bell + + button's
          round shape so the row reads as a consistent set of pills. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Hide quick stats' : 'Show quick stats'}
        className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-foreground hover:bg-white hover:border-primary/45 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" />
        </svg>
      </button>

      {/* The chips themselves. Desktop: inline row at the same spot
          as before. Mobile: absolutely-positioned dropdown that
          appears below the trigger button on tap. */}
      <div
        role={open ? 'menu' : undefined}
        className={`
          ${open ? 'flex' : 'hidden'} sm:flex
          flex-col items-stretch gap-2
          absolute top-full right-0 mt-2
          bg-white/95 supports-[backdrop-filter]:bg-white/85 backdrop-blur-xl
          border border-white/80 shadow-xl p-3 rounded-2xl z-40 min-w-[200px]
          sm:static sm:flex-row sm:items-center sm:mt-0 sm:gap-2
          sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:rounded-none sm:min-w-0
        `}
      >
        {children}
      </div>
    </div>
  );
}
