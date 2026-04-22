import Link from 'next/link';

// Homepage — "The path to admission." Replaces the former "A Day in
// Recovery" daily-schedule timeline. Same 5-beat horizontal-rail
// layout, but each beat now maps to a step in the admissions
// journey (call → verify → assess → travel → arrive) so the
// homepage earns its conversion. CTA goes to /admissions.

const blocks = [
  {
    time: 'Minutes',
    title: 'Start with a call',
    description:
      'Dial (866) 996-4308 or submit the form. A real person picks up, listens first, and walks you through next steps.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    time: '15–30 min',
    title: 'Verify insurance',
    description:
      'Free, confidential benefits check with most major plans. We return a plain-English summary of coverage before you decide anything.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    time: '20–30 min',
    title: 'Phone assessment',
    description:
      'A brief clinical screen with our admissions team — substance use, mental health, medications, recent detox needs. Confidential.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M6 2h12v20l-6-4-6 4z" />
        <path d="M9 10h6" />
        <path d="M9 14h4" />
      </svg>
    ),
  },
  {
    time: 'Same day',
    title: 'Travel coordinated',
    description:
      'Airport pickup at Tucson (TUS) or Phoenix (PHX), or sober-transport from anywhere in the country. We handle the logistics.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 15l6-6 4 2 5-8h2l-2 10 4 3-2 3-7-3-3 3h-4l2-5-6 2z" />
      </svg>
    ),
  },
  {
    time: '24–48 hrs',
    title: 'Arrive at the ranch',
    description:
      'Most clients land on campus within two days of the first call. You are welcomed, oriented, and the clinical work begins.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 12l9-8 9 8" />
        <path d="M5 11v10h14V11" />
        <path d="M10 21v-6h4v6" />
      </svg>
    ),
  },
];

export default function DailyLifeSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="admissions-path-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label justify-center mb-4">The path to admission</p>
          <h2
            id="admissions-path-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            Five steps from first call to first day.
          </h2>
          <p
            className="text-foreground/60 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team answers 24/7. Most clients land on campus
            within 24 to 48 hours of the first call. Here&apos;s how the
            path unfolds.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Horizontal rail — desktop only */}
          <div
            className="hidden lg:block absolute left-0 right-0 top-[46px] h-px"
            aria-hidden="true"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(160,82,45,0.25) 15%, rgba(160,82,45,0.25) 85%, transparent 100%)' }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 relative">
            {blocks.map((block, i) => (
              <div key={block.title} className="flex flex-col items-center text-center">
                <div
                  className="w-[92px] h-[92px] rounded-full bg-warm-bg flex items-center justify-center text-primary relative z-10 shadow-sm border border-primary/10"
                  aria-hidden="true"
                >
                  {block.icon}
                  <span
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {i + 1}
                  </span>
                </div>
                <p
                  className="mt-5 text-[11px] font-bold tracking-[0.18em] uppercase text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {block.time}
                </p>
                <h3 className="mt-2 text-base font-bold text-foreground">{block.title}</h3>
                <p
                  className="mt-2 text-sm text-foreground/60 leading-relaxed max-w-[220px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {block.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-14">
          <Link href="/admissions" className="btn-dark">
            Start admissions
          </Link>
        </div>
      </div>
    </section>
  );
}
