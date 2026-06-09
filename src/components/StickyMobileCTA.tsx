'use client';

import { useEffect, useState } from 'react';

// Full-width sticky call-CTA pinned to the bottom of the mobile
// viewport. Light cream background with the phone icon + number
// in copper — matches the site's own warm palette instead of
// the bright copper bar we shipped earlier, which the team
// found visually loud.
//
// Now includes a small X dismiss button on the right edge. The
// phone CTA itself was previously fire-and-forget (no escape),
// but on long sessions / users who already have the number it
// got in the way of reading the bottom of the page. Dismissal
// is sticky for the browser session — sessionStorage so a hard
// refresh brings it back if the user really wants it again.
//
// The `sticky-mobile-cta` class is used by globals.css to hide
// the row while the mobile nav drawer is open (otherwise the
// call bar floats over the open menu and looks like part of
// it). The attribute is set on <html> by MobileMenu.

const DISMISS_KEY = 'sa-sticky-mobile-cta:dismissed';

export default function StickyMobileCTA() {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate dismissed state from sessionStorage. Keeping this in
  // an effect (not the initial useState) avoids an SSR/client
  // markup mismatch on the rendered tree.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch { /* sessionStorage unavailable (private mode) — render normally */ }
    setHydrated(true);
  }, []);

  if (hydrated && dismissed) return null;

  return (
    <div
      className="sticky-mobile-cta fixed inset-x-0 bottom-0 z-50 lg:hidden bg-warm-bg/95 supports-[backdrop-filter]:bg-warm-bg/85 backdrop-blur border-t border-black/10 shadow-[0_-6px_18px_-4px_rgba(42,15,10,0.18)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative">
        <a
          href="tel:+18667181665"
          aria-label="Call (866) 718-1665 — available 24/7"
          // Right padding accounts for the absolute-positioned
          // dismiss button so the phone CTA's centered content
          // doesn't end up off-center on smaller phones.
          className="flex items-center justify-center gap-3 px-4 pr-12 py-3 active:opacity-80 transition-opacity"
        >
          {/* Copper icon disc with the pulsing green ping pinned to
              its upper-right corner. */}
          <span
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 bg-primary/10"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-warm-bg">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
            </span>
          </span>

          <span className="flex flex-col items-start leading-tight text-left">
            <span
              className="text-[9px] font-semibold tracking-[0.22em] uppercase text-foreground/55"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Available 24/7
            </span>
            <span
              className="text-[15px] font-bold tracking-wide text-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              (866) 718-1665
            </span>
          </span>
        </a>

        {/* Dismiss X — sits inside the same container as the phone
            <a> so a tap on the X doesn't trigger the tel: link
            underneath. Generous touch target (32x32) for thumb
            accuracy on small phones. */}
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
          }}
          aria-label="Dismiss call bar"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground/55 hover:text-foreground hover:bg-black/5 active:bg-black/10 transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
