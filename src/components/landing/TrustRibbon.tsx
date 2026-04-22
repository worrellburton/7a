'use client';

import { usePersona } from './PersonaContext';

/**
 * Always-visible trust ribbon. Lives under the site header on the
 * landing page. Slim, warm, and carries the four pieces of trust
 * signal every recovery visitor needs within the first half-second:
 *
 *   • phone number (tap-to-call on mobile)
 *   • accreditation shorthand
 *   • 24/7 answered indicator (pulses during business hours)
 *   • persona chip (if a persona is chosen), with a "change" escape
 *
 * The ribbon stays visible across every phase of the landing — not
 * just hero and footer — so the visitor never has to hunt for the
 * phone number or re-earn a sense of legitimacy.
 */
export default function TrustRibbon() {
  const { persona, clearPersona } = usePersona();
  return (
    <div className="relative bg-foreground/95 text-white/90 border-b border-white/10 text-[11px] lg:text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-9 lg:h-10">
        <a
          href="tel:+18669964308"
          className="inline-flex items-center gap-2 font-semibold text-white hover:text-accent transition-colors"
        >
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400">
            <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
          </span>
          <span className="hidden sm:inline">Admissions line answered 24/7 —</span>
          (866) 996-4308
        </a>

        <div className="hidden md:flex items-center gap-4 tracking-[0.14em] uppercase text-[10px] text-white/55 font-semibold">
          <span>JCAHO accredited</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>LegitScript</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>HIPAA compliant</span>
        </div>

        {persona ? (
          <button
            type="button"
            onClick={clearPersona}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold tracking-wide transition-colors"
            title="Show me a different experience"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {persona === 'self' ? 'For myself' : 'For a loved one'}
            <span className="text-white/60">· change</span>
          </button>
        ) : (
          <a
            href="#persona-splitter"
            className="hidden sm:inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/80 hover:text-accent transition-colors"
          >
            Who is this for? →
          </a>
        )}
      </div>
    </div>
  );
}
