'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 9. "Where science meets ancient wisdom."
 *
 * Split composition — two bordered tiles labeled Science and Ancient
 * Wisdom, each with its own custom SVG motif and bullet list. A
 * central animated seam (two arcs + a meeting circle) visually binds
 * them together as the section enters view.
 */
export default function ScienceAndWisdom() {
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

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ background: 'linear-gradient(180deg, var(--color-warm-bg) 0%, #f0e6dc 100%)' }}
      aria-labelledby="sw-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mx-auto text-center mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label justify-center mb-5">Where Science Meets Ancient Wisdom</p>
          <h2
            id="sw-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.4vw, 3.3rem)', lineHeight: 1.02 }}
          >
            Healing is not <em className="not-italic text-primary">purely cognitive</em>. It is <em className="not-italic text-primary">embodied</em>, <em className="not-italic text-primary">relational</em>, deeply human.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            We integrate neuroscience, evidence-based practice, and time-honored
            approaches to healing — and hold them as complementary, not
            competing, truths.
          </p>
        </div>

        <div className="relative grid lg:grid-cols-2 gap-5 lg:gap-0">
          {/* Science tile */}
          <div
            className="rounded-2xl lg:rounded-r-none bg-white p-8 lg:p-10 border border-black/5 lg:border-r-0 relative overflow-hidden"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
              >
                <ScienceGlyph className="w-6 h-6 text-primary" active={visible} />
              </div>
              <p
                className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Modern science
              </p>
            </div>
            <h3
              className="text-foreground font-bold mb-5"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.12 }}
            >
              Neuroscience, polyvagal theory, and evidence-based practice.
            </h3>
            <ul className="space-y-2.5">
              {[
                'CBT · DBT · IFS · ART',
                'Polyvagal-informed interventions',
                'Outcome tracking & measurable capacity-building',
                'Credentialed, trauma-trained clinicians',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-foreground/75 text-[15px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className="mt-1 w-3 h-3 rounded-sm bg-primary/15 flex items-center justify-center text-primary text-[9px] font-bold" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Wisdom tile */}
          <div
            className="rounded-2xl lg:rounded-l-none relative p-8 lg:p-10 text-white overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--color-dark-section) 0%, var(--color-primary-dark) 100%)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.25s',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 60% 55% at 85% 20%, rgba(216,137,102,0.25) 0%, rgba(216,137,102,0) 65%)',
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <WisdomGlyph className="w-6 h-6 text-accent" active={visible} />
                </div>
                <p
                  className="text-[11px] font-semibold tracking-[0.24em] uppercase text-accent"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Ancient wisdom
                </p>
              </div>
              <h3
                className="font-bold mb-5"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.12 }}
              >
                Land-based, relational, and ceremonial healing traditions.
              </h3>
              <ul className="space-y-2.5">
                {[
                  'Indigenous-informed ceremony & circle work',
                  'Breathwork & trauma-informed yoga',
                  'Equine-assisted co-regulation',
                  'Time on the land as medicine',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-white/85 text-[15px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span className="mt-1 w-3 h-3 rounded-sm bg-accent/20 flex items-center justify-center text-accent text-[9px] font-bold" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Center seam glyph — only on lg+ where tiles abut */}
          <div
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none items-center justify-center w-20 h-20 rounded-full"
            aria-hidden="true"
            style={{
              background: 'white',
              boxShadow: '0 20px 45px -20px rgba(0,0,0,0.35)',
              border: '1px solid rgba(0,0,0,0.06)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.6)',
              transition: 'all 1.2s cubic-bezier(0.22,1,0.36,1) 0.8s',
            }}
          >
            <SeamGlyph className="w-9 h-9" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Glyphs ─────────────────────────────────────────────────────── */

function ScienceGlyph({ className, active }: { className?: string; active: boolean }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="3" />
      <ellipse cx="16" cy="16" rx="13" ry="5" style={{ transform: 'rotate(0deg)', transformOrigin: '16px 16px' }}>
        {active && <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="8s" repeatCount="indefinite" />}
      </ellipse>
      <ellipse cx="16" cy="16" rx="13" ry="5" style={{ transform: 'rotate(60deg)', transformOrigin: '16px 16px' }}>
        {active && <animateTransform attributeName="transform" type="rotate" from="60 16 16" to="420 16 16" dur="8s" repeatCount="indefinite" />}
      </ellipse>
      <ellipse cx="16" cy="16" rx="13" ry="5" style={{ transform: 'rotate(120deg)', transformOrigin: '16px 16px' }}>
        {active && <animateTransform attributeName="transform" type="rotate" from="120 16 16" to="480 16 16" dur="8s" repeatCount="indefinite" />}
      </ellipse>
    </svg>
  );
}

function WisdomGlyph({ className, active }: { className?: string; active: boolean }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="6" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
      {/* Eight directional marks */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 10;
        const r2 = 13.5;
        return (
          <line
            key={i}
            x1={16 + Math.cos(a) * r1}
            y1={16 + Math.sin(a) * r1}
            x2={16 + Math.cos(a) * r2}
            y2={16 + Math.sin(a) * r2}
            style={{
              opacity: active ? 1 : 0.3,
              transition: `opacity 0.7s ease ${0.2 + i * 0.06}s`,
            }}
          />
        );
      })}
    </svg>
  );
}

function SeamGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18 A 12 12 0 0 1 18 6" stroke="var(--color-primary)" />
      <path d="M30 18 A 12 12 0 0 0 18 6" stroke="var(--color-accent)" />
      <path d="M6 18 A 12 12 0 0 0 18 30" stroke="var(--color-primary-dark)" opacity="0.6" />
      <path d="M30 18 A 12 12 0 0 1 18 30" stroke="var(--color-accent)" opacity="0.6" />
      <circle cx="18" cy="18" r="2" fill="var(--color-accent)" stroke="none" />
    </svg>
  );
}
