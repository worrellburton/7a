'use client';

// Floating mobile call button. Sits fixed bottom-center, above the
// Google reviews badge (which is anchored at bottom-0), so neither
// covers the other. Matches the desktop BeforeFooterCTA treatment:
// a phone-icon disc on the left with the pulsing green "live" dot
// pinned to its corner, and a two-line text block on the right —
// tiny "AVAILABLE 24/7" kicker above the bold phone number.
//
// Three mobile-polish behaviours layered on top of the original pill:
//
//   · iOS safe-area-inset — both the `bottom` offset and the wrapper
//     padding read `env(safe-area-inset-bottom)` so the pill sits
//     cleanly above the home indicator on every iPhone notch / Pro
//     model. The (site)/layout adds matching bottom padding to
//     <main> so page content doesn't tuck under the pill.
//
//   · Dismissable for the session — a small × button collapses the
//     bar and writes `callBarDismissed = 'true'` to sessionStorage.
//     The choice persists across navigations within the tab but
//     resets when the visitor closes the tab and returns, so a
//     new session always sees the call affordance again.
//
//   · Lazy hydration — until sessionStorage has been read on mount,
//     we render `null` so the bar doesn't flash on a dismissed
//     session before the hide kicks in (no FOUC).

import { useEffect, useState } from 'react';

const SESSION_KEY = 'callBarDismissed';

export default function StickyMobileCTA() {
  // Two-stage state: `hydrated` flips true after the first
  // useEffect runs (so we can safely read sessionStorage on the
  // client without SSR / hydration mismatch), and `dismissed`
  // tracks the actual visibility decision.
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SESSION_KEY);
      if (stored === 'true') setDismissed(true);
    } catch {
      // sessionStorage can throw in private-mode + a couple of
      // embedded webviews — fall back to "show the bar" since the
      // call CTA is more valuable than the dismiss preference.
    }
    setHydrated(true);
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      /* private mode — choice still hides for this mount */
    }
  }

  if (!hydrated || dismissed) return null;

  return (
    <div
      // The `sticky-mobile-cta` class is used by globals.css to hide
      // this row while the mobile nav drawer is open (otherwise the
      // call button floats over the open menu and looks like part of
      // it). The attribute is set on <html> by MobileMenu.
      //
      // Full-width row positioned IMMEDIATELY above GoogleReviewsBadge
      // (which sits at bottom-0 on mobile, ~52px tall). Together the
      // two stack into a flat ribbon at the bottom of the viewport —
      // call CTA on top, social-proof badge underneath. No centered
      // floating pill anymore; the row is the bottom chrome.
      className="sticky-mobile-cta fixed inset-x-0 z-50 lg:hidden bg-primary text-white shadow-[0_-6px_18px_-4px_rgba(42,15,10,0.45)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 52px)' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <a
          href="tel:+18667181665"
          aria-label="Call (866) 718-1665 — available 24/7"
          className="flex-1 inline-flex items-center gap-3 active:opacity-90 transition-opacity"
        >
          {/* Icon disc with the pulsing green ping pinned to its
              upper-right corner — same treatment as before. */}
          <span
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-primary">
              <span className="absolute inset-0 rounded-full bg-[#4ade80] animate-ping opacity-70" />
            </span>
          </span>

          <span className="flex flex-col items-start leading-tight text-left">
            <span
              className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/80"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Available 24/7
            </span>
            <span
              className="text-[15px] font-bold tracking-wide text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              (866) 718-1665
            </span>
          </span>
        </a>

        {/* Dismiss × — separate touch target so a slip on the close
            button doesn't fire the tel: call. Sized 36×36 for thumb
            ergonomics; stays inside the row instead of floating
            beside it. */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Hide the call bar for this session"
          title="Hide for this session"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors text-white"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
