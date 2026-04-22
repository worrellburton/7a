'use client';

import { useEffect, useRef, useState } from 'react';
import AdmissionsForm from '@/components/AdmissionsForm';

/**
 * Phase 8 — insurance + cost transparency.
 *
 * Wraps the existing AdmissionsForm (with insurance-card upload)
 * inside a new frame that carries the real conversion wins:
 *
 *   • carrier logo grid so visitors see "we work with yours" fast
 *   • an honest coverage-range visual ("most major insurance covers
 *     70–100% of residential; call to confirm")
 *   • a "verified in about 15 minutes" live indicator
 *
 * Most rehab sites hide cost. Being the site that doesn't is a
 * structural competitive edge.
 */

const carriers = [
  { name: 'Aetna', abbr: 'AETNA' },
  { name: 'Blue Cross Blue Shield', abbr: 'BCBS' },
  { name: 'Cigna', abbr: 'CIGNA' },
  { name: 'UnitedHealthcare', abbr: 'UHC' },
  { name: 'Humana', abbr: 'HUMANA' },
  { name: 'TRICARE', abbr: 'TRICARE' },
  { name: 'Anthem', abbr: 'ANTHEM' },
  { name: 'Magellan', abbr: 'MAGELLAN' },
];

export default function InsuranceTransparency() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="landing-insurance"
      className="py-24 lg:py-32 bg-warm-bg scroll-mt-20"
      aria-labelledby="insurance-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left: copy + coverage visual + carrier wall */}
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <div className="inline-flex items-center gap-2 bg-white border border-primary/20 rounded-full px-3 py-1.5 mb-6">
              <span className="relative w-2 h-2 rounded-full bg-emerald-500">
                <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
              </span>
              <span
                className="text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground/70"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Verified in ~15 minutes · 24/7
              </span>
            </div>
            <p className="section-label mb-4">Insurance, transparently</p>
            <h2
              id="insurance-heading"
              className="text-foreground font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 2.9rem)',
                lineHeight: 1.04,
              }}
            >
              Most major insurance covers{' '}
              <em className="not-italic text-primary">70–100%</em> of residential treatment.
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every plan and situation is different — actual coverage
              depends on your specific plan, diagnosis, and level of care.
              Send your card and we&rsquo;ll verify in plain language,
              typically within fifteen minutes, with no obligation.
            </p>

            {/* Coverage visual — honest range bar */}
            <div className="rounded-2xl bg-white border border-black/5 p-5 lg:p-6 mb-8">
              <p
                className="text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground/50 mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Typical coverage range
              </p>
              <div className="relative h-3 rounded-full bg-foreground/8 overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: '10%',
                    right: '0%',
                    background: 'linear-gradient(90deg, #d88966 0%, #2f6f5e 100%)',
                    transformOrigin: 'left',
                    transform: visible ? 'scaleX(1)' : 'scaleX(0.3)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 1.6s cubic-bezier(0.22,1,0.36,1) 0.3s, opacity 0.6s ease 0.3s',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[12px] tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="text-foreground/50">Out-of-pocket</span>
                <span className="text-foreground/50">Fully covered</span>
              </div>
              <p
                className="mt-4 text-[12.5px] text-foreground/55 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Most in-network plans land in the right half of this bar.
                Private pay is also fully supported and fully confidential.
              </p>
            </div>

            {/* Carrier wall */}
            <p
              className="text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground/50 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Carriers we most commonly verify
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {carriers.map((c) => (
                <div
                  key={c.abbr}
                  className="rounded-xl bg-white border border-black/5 h-12 flex items-center justify-center text-[11px] tracking-[0.16em] uppercase font-bold text-foreground/60"
                  style={{ fontFamily: 'var(--font-body)' }}
                  title={c.name}
                >
                  {c.abbr}
                </div>
              ))}
            </div>
            <p
              className="mt-4 text-[12px] text-foreground/45"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Plus Anthem, Optum, MHN, most PPO and POS plans. Don&rsquo;t see yours? Call — we likely work with it.
            </p>
          </div>

          {/* Right: admissions form with upload */}
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s',
            }}
          >
            <AdmissionsForm />
          </div>
        </div>
      </div>
    </section>
  );
}
