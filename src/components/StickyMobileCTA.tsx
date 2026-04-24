// Floating mobile call button. Sits fixed bottom-center, above the
// Google reviews badge (which is anchored at bottom-0), so neither
// covers the other. Matches the desktop BeforeFooterCTA treatment:
// a phone-icon disc on the left with the pulsing green "live" dot
// pinned to its corner, and a two-line text block on the right —
// tiny "AVAILABLE 24/7" kicker above the bold phone number. iOS
// safe-area inset respected so it never sits under the home-bar.
//
// The pill is always visible on mobile — inner pages no longer carry
// a duplicate phone CTA inside the hero (PageHero filters out phone
// CTAs), so this is the single source of truth for the call action.

export default function StickyMobileCTA() {
  return (
    <div
      // The `sticky-mobile-cta` class is used by globals.css to hide
      // this pill while the mobile nav drawer is open (otherwise the
      // call button floats over the open menu and looks like part of
      // it). The attribute is set on <html> by MobileMenu.
      className="sticky-mobile-cta fixed left-1/2 -translate-x-1/2 z-50 lg:hidden"
      // Lift above the GoogleReviewsBadge bar (~52px tall) plus the
      // device safe-area inset and a small breathing-room gap.
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 60px)' }}
    >
      <a
        href="tel:+18669964308"
        aria-label="Call (866) 996-4308 — available 24/7"
        className="inline-flex items-center gap-3 bg-primary active:bg-primary-dark transition-colors rounded-full pl-2.5 pr-5 py-2 shadow-[0_12px_30px_-6px_rgba(42,15,10,0.55)] ring-1 ring-black/5"
      >
        {/* Icon disc with the green ping dot pinned to its upper-
            right corner, identical to the desktop BeforeFooterCTA
            treatment. */}
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
            className="text-sm font-bold tracking-wide text-white"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            (866) 996-4308
          </span>
        </span>
      </a>
    </div>
  );
}
