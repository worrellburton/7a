// Full-width sticky call-CTA pinned to the bottom of the mobile
// viewport, directly above GoogleReviewsBadge. Two together form
// a 2-row ribbon at the bottom of every mobile page: phone on top,
// social-proof badge underneath.
//
// No dismiss affordance — the phone CTA is the highest-value
// conversion surface on the site; making it dismissable was lower-
// signal than the friction of users hitting the X by mistake.
// (Earlier sessionStorage-backed dismiss state has been removed.)
//
// The `sticky-mobile-cta` class is used by globals.css to hide the
// row while the mobile nav drawer is open (otherwise the call bar
// floats over the open menu and looks like part of it). The
// attribute is set on <html> by MobileMenu.

export default function StickyMobileCTA() {
  return (
    <div
      className="sticky-mobile-cta fixed inset-x-0 z-50 lg:hidden bg-primary text-white shadow-[0_-6px_18px_-4px_rgba(42,15,10,0.45)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 52px)' }}
    >
      <a
        href="tel:+18667181665"
        aria-label="Call (866) 718-1665 — available 24/7"
        className="flex items-center justify-center gap-3 px-4 py-2.5 active:opacity-90 transition-opacity"
      >
        {/* Icon disc with the pulsing green ping pinned to its
            upper-right corner. */}
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
    </div>
  );
}
