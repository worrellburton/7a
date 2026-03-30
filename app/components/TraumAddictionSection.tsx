import { Link } from '@remix-run/react';

export default function TraumAddictionSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="traumaddiction-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Image */}
          <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-warm-bg">
            <img
              src="/images/sound-healing-session.jpg"
              alt="TraumAddiction treatment session"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Right: Content */}
          <div>
            <p className="section-label mb-4">Not Just Trauma-Focused</p>
            <h2
              id="traumaddiction-heading"
              className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-6"
            >
              TraumAddiction&trade; Specialists
            </h2>
            <p className="text-foreground/60 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              While you may hear the term &ldquo;trauma-informed&rdquo; or &ldquo;trauma-focused,&rdquo;
              Seven Arrows Recovery goes further.
            </p>
            <p className="text-foreground/60 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              Our specialty TraumAddiction&trade; approach combines body-based interventions from ancient
              wisdom traditions with traditional psychotherapy to address psychological, spiritual, emotional
              and physiological needs — creating a more integrative and holistic path to healing.
            </p>

            <ul className="space-y-3 mb-8">
              {['Body-based trauma interventions', 'Ancient wisdom traditions', 'Traditional psychotherapy methods', 'Integrated mind-body-spirit healing'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link to="/treatment/traumaddiction" className="btn-dark">
              Learn About TraumAddiction&trade;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
