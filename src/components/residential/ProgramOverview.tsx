'use client';

import { useEffect, useRef, useState } from 'react';

/** Phase 3 — program overview with prose + highlight card + feature photo. */
const highlights = [
  '30-to-90-day individualized treatment plans',
  'Small group setting — maximum 6:1 client-to-staff ratio',
  '24/7 on-site clinical and residential support',
  'Evidence-based individual and group therapy',
  'Proprietary TraumAddiction® approach',
  'Holistic and experiential therapies',
  'Comfortable, home-like living environment',
  'Structured daily schedule with purposeful downtime',
];

export default function ProgramOverview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section className="py-24 lg:py-32 bg-white" aria-labelledby="overview-heading">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-7" style={style(0.05)}>
            <p className="section-label mb-5">Program Overview</p>
            <h2
              id="overview-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 3.9vw, 3.1rem)', lineHeight: 1.05 }}
            >
              30 to 90 days of <em className="not-italic text-primary">focused recovery</em>.
            </h2>
            <div className="space-y-5 text-foreground/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                Our residential inpatient program provides the time and space necessary
                for deep, lasting change. With stays ranging from 30 to 90 days, your
                treatment plan is individualized to address the unique factors driving
                your addiction. You live on-site at our boutique facility, surrounded by
                the quiet beauty of southern Arizona, with a dedicated clinical team
                guiding you every step of the way.
              </p>
              <p>
                Unlike large-scale treatment centers, Seven Arrows maintains a
                deliberately small census. Our 6:1 client-to-staff ratio ensures
                genuinely personalized care. Every therapist, counselor, and support
                staff member knows your name, your story, and your goals.
              </p>
            </div>

            {/* Feature photo with overlay quote */}
            <figure className="mt-10 rounded-2xl overflow-hidden relative aspect-[16/10]">
              <img
                src="/images/covered-porch-desert-view.jpg"
                alt="Covered porch overlooking the desert at Seven Arrows."
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(10,5,3,0) 35%, rgba(10,5,3,0.85) 100%)' }}
              />
              <figcaption className="absolute left-6 right-6 bottom-6 text-white max-w-md">
                <p className="italic text-lg lg:text-xl leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                  &ldquo;On-site means the help you need is already here.&rdquo;
                </p>
              </figcaption>
            </figure>
          </div>

          {/* Highlights glass card */}
          <aside
            className="lg:col-span-5 rounded-2xl p-8 lg:p-10 relative overflow-hidden"
            style={{
              ...style(0.18),
              background: 'linear-gradient(145deg, var(--color-warm-bg) 0%, var(--color-warm-card) 100%)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Program Highlights
            </p>
            <h3
              className="text-foreground font-bold mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', lineHeight: 1.15 }}
            >
              What&rsquo;s inside a Seven Arrows stay.
            </h3>
            <ul className="space-y-3.5">
              {highlights.map((h, i) => (
                <li
                  key={h}
                  className="flex items-start gap-3 text-foreground/80 text-[15px] leading-snug"
                  style={{
                    fontFamily: 'var(--font-body)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-6px)',
                    transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.04}s`,
                  }}
                >
                  <span className="shrink-0 mt-1 w-4 h-4 rounded-full bg-primary/12 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
