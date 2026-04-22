'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Dual Diagnosis — Phase 6. Bento of the six core components of our
 * integrated treatment approach. Warm-bg section with an SCBT-style
 * "house-integrated" flagship tile on top plus five underneath.
 */

type Item = { title: string; body: string; Icon: (p: { className?: string }) => ReactElement };

const flagship: Item = {
  title: 'Comprehensive psychiatric assessment',
  body: 'Every admission begins with a thorough psychiatric and clinical evaluation to identify every co-occurring condition and build a single, unified treatment roadmap — not two parallel ones.',
  Icon: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="10" width="32" height="30" rx="3" /><path d="M14 18h20M14 24h20M14 30h14" /><circle cx="38" cy="14" r="3" fill="currentColor" stroke="none" /></svg>
  ),
};

const items: Item[] = [
  {
    title: 'Integrated individual therapy',
    body: 'One-on-one sessions with licensed therapists using CBT, DBT, EMDR, and IFS — addressing addiction and mental-health symptoms in the same hour.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /></svg>
    ),
  },
  {
    title: 'Medication management',
    body: 'Psychiatric oversight ensures safe, effective use of non-addictive medications when clinically indicated — coordinated with every other layer of care.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="18" rx="4" /><path d="M8 12h8" /></svg>
    ),
  },
  {
    title: 'Specialized dual-diagnosis groups',
    body: 'Groups designed specifically for co-occurring disorders. Members understand each other faster, and the work goes deeper because of it.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="2.5" /><circle cx="5" cy="13" r="2" /><circle cx="19" cy="13" r="2" /><path d="M3 20c0-2 1.5-3.5 4-3.5M17 16.5c2.5 0 4 1.5 4 3.5M7 20c0-2.5 2-4 5-4s5 1.5 5 4" /></svg>
    ),
  },
  {
    title: 'Trauma-informed everything',
    body: 'Our TraumAddiction® approach holds trauma as the common thread between the mental-health condition and the substance use — and treats that thread directly.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 4v6c0 5-4 7-9 8-5-1-9-3-9-8V7z" /><path d="M9 12l2 2 4-4" /></svg>
    ),
  },
  {
    title: 'Somatic & body-based work',
    body: 'Breathwork, yoga, equine, and somatic experiencing regulate the shared nervous-system substrate that drives both conditions.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2" /><path d="M12 7v5M5 14l7-2 7 2M12 12v6" /></svg>
    ),
  },
  {
    title: 'Integrated aftercare',
    body: 'Discharge plans coordinate ongoing mental-health providers, psychiatric medication management, and recovery community into a single step-down.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
    ),
  },
];

export default function IntegratedApproach() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const FlagIcon = flagship.Icon;
  const style = (d: number) => ({ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s` });

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg" aria-labelledby="ia-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14" style={style(0.05)}>
          <p className="section-label mb-5">Our Integrated Approach</p>
          <h2 id="ia-heading" className="text-foreground font-bold tracking-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3rem)', lineHeight: 1.03 }}>
            Six components. <em className="not-italic text-primary">One unified plan.</em>
          </h2>
        </div>

        <article className="relative rounded-3xl overflow-hidden mb-5 lg:mb-6 p-8 lg:p-12 text-white" style={{ ...style(0.12), background: 'linear-gradient(115deg, var(--color-dark-section) 0%, var(--color-primary-dark) 90%)' }}>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 45% 55% at 85% 20%, rgba(216,137,102,0.32) 0%, rgba(216,137,102,0) 65%)' }} />
          <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-10 items-start lg:items-center">
            <div className="shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <FlagIcon className="w-10 h-10 lg:w-12 lg:h-12 text-accent" />
            </div>
            <div className="flex-1 max-w-3xl">
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-3" style={{ fontFamily: 'var(--font-body)' }}>Foundation</p>
              <h3 className="font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', lineHeight: 1.1 }}>{flagship.title}</h3>
              <p className="text-white/85 leading-relaxed text-[15.5px]" style={{ fontFamily: 'var(--font-body)' }}>{flagship.body}</p>
            </div>
          </div>
        </article>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {items.map((m, i) => {
            const Icon = m.Icon;
            return (
              <article key={m.title} className="rounded-2xl bg-white p-6 border border-black/5 hover:border-primary/25 transition-all" style={style(0.2 + i * 0.06)}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.15 }}>{m.title}</h3>
                    <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{m.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
