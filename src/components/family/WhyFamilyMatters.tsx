'use client';

import { useEffect, useRef, useState } from 'react';

export default function WhyFamilyMatters() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="why-family-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div
            className="lg:col-span-6 order-2 lg:order-1"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <figure className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/embrace-connection.jpg"
                alt="A family reconnecting at Seven Arrows"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0) 50%, rgba(20,10,6,0.5) 80%, rgba(20,10,6,0.9) 100%)',
                }}
              />
              <figcaption
                className="absolute inset-x-6 bottom-6 text-white/90 text-[12px] tracking-[0.18em] uppercase font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Family weekend · spring 2026
              </figcaption>
            </figure>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2">
            <p
              className="section-label mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              Why family matters
            </p>
            <h2
              id="why-family-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            >
              Addiction is a <em className="not-italic text-primary">family</em> disease.
            </h2>
            <div
              className="space-y-5 text-foreground/75 text-lg leading-relaxed max-w-xl"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 1s ease 0.4s',
              }}
            >
              <p>
                Substance use changes the whole family system &mdash; who
                covers for whom, who sleeps badly, who learns not to bring
                it up. Those adaptations don&rsquo;t evaporate the day
                someone starts treatment.
              </p>
              <p>
                Recovery that lasts requires the family to heal alongside the
                client. Not to fix them. To get their own nervous system
                back, rebuild trust on new terms, and set boundaries that
                protect the recovery everyone is rooting for.
              </p>
              <p className="text-foreground/90 font-semibold">
                Our family program is structured, boundaried, and free of
                charge to immediate family of active clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
