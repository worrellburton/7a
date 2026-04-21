import Link from 'next/link';

const blocks = [
  {
    time: '6:30 – 9:00',
    title: 'Mindful Morning',
    description:
      'Sunrise meditation, breathwork, and a nutrient-dense breakfast prepared by our on-site chef.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="14" r="4" />
        <path d="M12 3v3M5.64 7.64l2.12 2.12M2 14h3M19 14h3M16.24 9.76l2.12-2.12M3 18h18" />
      </svg>
    ),
  },
  {
    time: '9:00 – 12:30',
    title: 'Clinical Sessions',
    description:
      'Individual therapy, small-group work, EMDR, and the body-based modalities that power our TraumAddiction™ approach.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="9" cy="9" r="3" />
        <circle cx="17" cy="10" r="2" />
        <path d="M3 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
        <path d="M21 20v-1a3 3 0 00-2.4-2.94" />
      </svg>
    ),
  },
  {
    time: '12:30 – 2:30',
    title: 'Shared Table',
    description:
      'Chef-prepared lunch, rest, and reflection time on the covered porch with views of the Swisshelm Mountains.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 11h18v2a4 4 0 01-4 4H7a4 4 0 01-4-4v-2z" />
        <path d="M7 11V6a2 2 0 012-2h6a2 2 0 012 2v5" />
        <path d="M12 17v3" />
      </svg>
    ),
  },
  {
    time: '2:30 – 5:30',
    title: 'Experiential Work',
    description:
      'Equine-assisted psychotherapy, sound healing, somatic practice, and guided time outdoors on the ranch.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 20c0-4 3-7 7-7s7 3 7 7" />
        <path d="M17 13l2-2 2 1-1 2-2 1" />
        <path d="M10 11V7a2 2 0 014 0v4" />
        <circle cx="10" cy="5" r="1" />
      </svg>
    ),
  },
  {
    time: '5:30 – 9:00',
    title: 'Community & Rest',
    description:
      'Shared dinner, community circle, 12-step or peer support, and unhurried time under a dark-sky desert canopy.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        <circle cx="17" cy="6" r="0.8" fill="currentColor" />
        <circle cx="14" cy="4" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function DailyLifeSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="daily-life-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label justify-center mb-4">Life at Seven Arrows</p>
          <h2
            id="daily-life-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            A Day in Recovery
          </h2>
          <p
            className="text-foreground/60 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our days are structured so rest, clinical work, connection, and movement each get their
            own protected space. Here&apos;s what a typical weekday looks like on the ranch.
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
          <Link href="/our-program" className="btn-dark">
            See the Full Program
          </Link>
        </div>
      </div>
    </section>
  );
}
