// Floating mobile call button. Sits fixed bottom-center, above the
// Google reviews badge (which is anchored at bottom-0), so neither
// covers the other. Pill-shaped with a pulsing green "live" dot +
// phone number + "Available 24/7". iOS safe-area inset respected so
// it never sits under the home-bar.

export default function StickyMobileCTA() {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 lg:hidden"
      // Lift above the GoogleReviewsBadge bar (~52px tall) plus the
      // device safe-area inset and a small breathing-room gap.
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 60px)' }}
    >
      <a
        href="tel:+18669964308"
        aria-label="Call (866) 996-4308 — available 24/7"
        className="inline-flex items-center gap-2.5 bg-primary active:bg-primary-dark transition-colors rounded-full pl-4 pr-5 py-3 shadow-[0_12px_30px_-6px_rgba(42,15,10,0.55)] ring-1 ring-black/5"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary" />
        </span>

        <svg
          className="w-4 h-4 text-white shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>

        <div className="flex flex-col items-start leading-tight">
          <span
            className="text-white font-bold text-sm tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            (866) 996-4308
          </span>
          <span
            className="text-white/85 text-[10px] font-medium tracking-wide"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Available 24/7
          </span>
        </div>
      </a>
    </div>
  );
}
