// Insurance-verification section. Site-wide footer-adjacent block
// that pulls the audience into the admissions funnel.
//
// 10-phase rebuild (all in this rewrite):
//   1. Dark backdrop matching the footer below — the bg color
//      drops straight into the footer's brown without a visible
//      seam, so the two sections read as one continuous closing
//      panel instead of "warm cream form / dark footer".
//   2. WebGL animated backdrop (DarkFormBackdrop) renders three
//      slow-drifting copper blobs behind the content. Subtle by
//      design (low alpha, slow time scale). Falls back to a
//      static gradient on prefers-reduced-motion / no WebGL.
//   3. Multi-column grid for the form fields (see AdmissionsForm)
//      so the whole flow fits inside a single ~900px viewport
//      instead of vertical scrolling.
//   4. Horizontal split — heading + intro + trust strip on the
//      left, form on the right (lg+). The audience reads the
//      pitch + the form simultaneously instead of in sequence.
//   5. Footer continuity — no bottom padding on the section, so
//      the dark gradient flows directly into the footer's
//      `bg-[#14090a]` band. The site-wide layout already places
//      Footer immediately after this section.
//   6. Dark-mode inputs (translucent white over dark) — handled
//      inside AdmissionsForm via the dark={true} prop.
//   7. Glowing card-upload slots — copper soft-glow ring +
//      pulse-on-hover; lives inside CardSlot.
//   8. Refined submit button — wider, dark-mode hover gradient.
//   9. Trust strip — HIPAA · TLS · 15-min response, pinned under
//      the intro copy so the audience sees the safety signals
//      before they start typing.
//  10. Accessibility — section labeled by the H2, all inputs keep
//      their existing aria-labels + focus-visible rings; reduced-
//      motion respected by the backdrop.

import AdmissionsForm from './AdmissionsForm';
import DarkFormBackdrop from './DarkFormBackdrop';

export default function InsuranceVerification() {
  return (
    <section
      className="relative isolate overflow-hidden pt-16 lg:pt-24 pb-8 lg:pb-12"
      aria-labelledby="insurance-heading"
      style={{
        // Static gradient as the base layer — gives us a visible
        // background even when the WebGL canvas is paused (off-
        // screen) or the browser declined to initialise WebGL.
        // Bottom stop matches the footer's brown so the seam is
        // invisible at the bottom of the section.
        background:
          'linear-gradient(180deg, #1a0e0a 0%, #160c08 60%, #14090a 100%)',
      }}
    >
      {/* WebGL drift behind the content. position:absolute on the
          canvas via the className below; pointer-events none so
          form fields receive every click. */}
      <DarkFormBackdrop className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-90" />

      {/* Soft top scrim — a 60px vignette so the dark section
          doesn't slam into whatever (light) section sits above
          it elsewhere on the site. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16 -z-10"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4), transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,0.85fr),minmax(0,1.15fr)] gap-10 lg:gap-14 items-center">
          {/* Left — copy + trust strip */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/85 mb-3">
              Let us help you
            </p>
            <h2
              id="insurance-heading"
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-white leading-[1.05]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Take the first step toward <em className="not-italic text-amber-200">the rest of your life.</em>
            </h2>
            <p
              className="mt-4 text-white/70 text-base lg:text-lg leading-relaxed max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most major insurance plans cover addiction treatment. Share your details
              (and snap a photo of your card if you have one) and we&rsquo;ll verify your
              benefits and call you back — typically within 15 minutes.
            </p>

            {/* Phase 9 — trust strip. Three small chips, each one
                a specific reassurance: data security, response
                time, and human-on-the-other-end. Inline below the
                lede so the audience reads them before the form. */}
            <ul
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-white/65"
              style={{ fontFamily: 'var(--font-body)' }}
              aria-label="Safety + response signals"
            >
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400/85" />
                HIPAA-compliant intake
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400/85" />
                Encrypted TLS upload
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400/85" />
                Live admissions, 24/7
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400/85" />
                ~15-minute callback
              </li>
            </ul>

            <p
              className="mt-6 text-[12px] text-white/45"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Prefer to talk first?{' '}
              <a
                href="tel:8667181665"
                className="text-amber-200/90 font-semibold hover:text-amber-100 underline-offset-4 hover:underline"
              >
                Call (866) 718-1665
              </a>
            </p>
          </div>

          {/* Right — the form itself, dark variant. */}
          <AdmissionsForm dark />
        </div>
      </div>
    </section>
  );
}
