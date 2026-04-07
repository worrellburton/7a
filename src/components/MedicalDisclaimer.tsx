export default function MedicalDisclaimer() {
  return (
    <div className="bg-warm-bg border border-primary/10 rounded-lg p-6 mt-12 max-w-3xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-primary mb-2">
            Medically Reviewed Content
          </p>
          <p className="text-sm text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            This content has been clinically reviewed by the Seven Arrows Recovery treatment team.
            Our staff includes licensed clinicians (LCSW, LPC, CADC) and medical professionals
            with extensive experience in addiction medicine and behavioral health.
          </p>
          <p className="text-xs text-foreground/50 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
            Last reviewed: March 2026 &middot; Sources: SAMHSA, NIDA, American Society of Addiction Medicine
          </p>
        </div>
      </div>
    </div>
  );
}
