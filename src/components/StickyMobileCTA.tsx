// Sticky bottom-of-screen CTA for mobile. The full phone number is the
// tap target — one press and the dialer opens — with a green pulsing
// "live" dot + "Available 24/7" reassurance so it's immediately obvious
// someone answers. iOS safe-area padding is respected so the button
// never sits under the home-bar.

export default function StickyMobileCTA() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-primary shadow-[0_-8px_24px_-8px_rgba(42,15,10,0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <a
        href="tel:+18669964308"
        aria-label="Call (866) 996-4308 — available 24/7"
        className="flex items-center justify-center gap-3 py-4 px-5 active:bg-primary-dark transition-colors"
      >
        <svg
          className="w-5 h-5 text-white shrink-0"
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
            className="text-white font-bold text-base tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            (866) 996-4308
          </span>
          <span
            className="flex items-center gap-1.5 text-white/90 text-[11px] font-medium tracking-wide"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            Available 24/7
          </span>
        </div>
      </a>
    </div>
  );
}
