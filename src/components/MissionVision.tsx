'use client';

import { useEffect, useRef, useState } from 'react';

function useCountUp(end: number, duration: number, started: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    let raf: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started]);

  return value;
}

const stats: { value: number; suffix?: string; label: string }[] = [
  { value: 50, suffix: '+', label: 'Years of History' },
  { value: 15, suffix: '+', label: 'Team Members' },
  { value: 1, label: 'Seven Arrows' },
];

function StatBlock({ stat, started }: { stat: (typeof stats)[number]; started: boolean }) {
  const count = useCountUp(stat.value, 1800, started);
  return (
    <div className="text-center">
      <p
        className="text-5xl lg:text-6xl font-bold text-foreground leading-none"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {count}
        {stat.suffix && (
          <span className="text-foreground/70">{stat.suffix}</span>
        )}
      </p>
      <p
        className="mt-3 text-xs tracking-[0.22em] uppercase font-semibold text-foreground/55"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {stat.label}
      </p>
    </div>
  );
}

interface MissionVisionProps {
  directorName?: string;
  directorCredentials?: string;
  directorTitle?: string;
  directorImage?: string;
  missionBody?: string;
  visionBody?: string;
}

export default function MissionVision({
  directorName = 'Lindsay Rothschild',
  directorCredentials = 'LCSW, SAP, RYT-200, EMDRIA Certified',
  directorTitle = 'Clinical Director',
  directorImage = '/images/equine-therapy-portrait.jpg',
  missionBody = "At Seven Arrows Recovery, *all individuals are met with love.* We offer a salutogenic approach to the treatment of trauma and addiction. This means promoting well-being and resilience by enhancing our clients' strengths, resources, and sense of purpose. Our clinical program is elevated by the healing power of sacred land, community, and the use of ceremony. We help guide clients back to their center, a reconnection with themselves.",
  visionBody = 'Our vision at Seven Arrows Recovery is to model a needed transformation in the treatment landscape, moving from an industry-driven model to a community-centered healing practice. Grounded in education, integrity, and presence, we weave hope into the fabric of the recovery journey, fostering lasting healing and connection.',
}: MissionVisionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render markdown-ish *emphasis* → <em> so the italicized phrase in
  // "all individuals are met with love" reads as the reference does
  // without markdown pulled into the build.
  const renderWithEmphasis = (text: string) =>
    text.split(/(\*[^*]+\*)/g).map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="not-italic font-semibold" style={{ fontStyle: 'italic' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={i}>{part}</span>;
    });

  return (
    <section
      ref={sectionRef}
      className="relative py-20 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="mission-heading"
    >
      {/* Faint dreamcatcher watermark like the reference — cheap pseudo
          element, decorative only. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'url(/images/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center 40%',
          backgroundSize: 'min(620px, 65vw) auto',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="section-label justify-center mb-5">Transformation is Our Keystone</p>
          <h2
            id="mission-heading"
            className="font-bold text-foreground uppercase tracking-tight leading-[1.02] mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            }}
          >
            Our Mission
          </h2>
          <p
            className="text-foreground/75 text-base lg:text-lg leading-relaxed max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {renderWithEmphasis(missionBody)}
          </p>
        </div>

        {/* Animated stats — only start counting once the section is in view. */}
        <div className="mt-14 lg:mt-16 grid grid-cols-3 gap-6 lg:gap-10 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <div key={stat.label} className="relative">
              {i > 0 && (
                <span
                  className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 h-16 w-px bg-foreground/15"
                  aria-hidden="true"
                />
              )}
              <StatBlock stat={stat} started={started} />
            </div>
          ))}
        </div>
      </div>

      {/* Vision — split card */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 lg:mt-24">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          <div className="card-soft p-8 lg:p-12 flex flex-col">
            <p className="section-label mb-5">Growth is Our Guidepost</p>
            <h3
              className="font-bold text-foreground uppercase tracking-tight leading-[1.05] mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
              }}
            >
              Our Vision
            </h3>
            <p
              className="text-foreground/70 leading-relaxed text-base lg:text-[1.0625rem] mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {visionBody}
            </p>
            <div className="mt-auto">
              {/* Hand-lettered signature approximation */}
              <p
                className="text-2xl lg:text-3xl text-foreground/75 mb-3"
                style={{
                  fontFamily: '"Homemade Apple", "Caveat", "Snell Roundhand", cursive',
                  letterSpacing: '0.01em',
                }}
              >
                {directorName}
              </p>
              <p
                className="text-sm font-semibold text-foreground"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {directorName} {directorCredentials}
              </p>
              <p
                className="text-sm text-foreground/55 mt-0.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {directorTitle}
              </p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-warm-card min-h-[360px] lg:min-h-0">
            <img
              src={directorImage}
              alt={`${directorName}, ${directorTitle}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
