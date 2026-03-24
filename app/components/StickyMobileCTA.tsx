

export default function StickyMobileCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-primary shadow-lg safe-area-bottom">
      <div className="flex">
        <a
          href="tel:+18669964308"
          className="flex-1 flex items-center justify-center gap-2 py-4 text-white font-semibold text-sm tracking-wide"
          aria-label="Call (866) 996-4308"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call Now
        </a>
        <div className="w-px bg-white/20" />
        <a
          href="#contact"
          className="flex-1 flex items-center justify-center gap-2 py-4 text-white font-semibold text-sm tracking-wide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verify Insurance
        </a>
      </div>
    </div>
  );
}
