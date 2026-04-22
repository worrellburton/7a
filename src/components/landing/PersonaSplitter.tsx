'use client';

import { useRef, useState, useEffect } from 'react';
import { usePersona, type Persona } from './PersonaContext';

/**
 * Phase 2 — dual-persona splitter.
 *
 * The single biggest conversion lift available on a residential
 * addiction-treatment landing. Historical data across recovery
 * verticals says ~50% of organic visitors are researching on behalf
 * of a loved one, but most landings speak entirely to the person
 * using — so the loved-one audience bounces or disengages, leaving a
 * visible reach-without-capture gap in the funnel.
 *
 * Visually: two large tiles, equal weight, no hierarchy. Each tile
 * has a short truthful sub-line so the choice feels safe. Picking
 * one writes the persona to context+localStorage and scrolls to the
 * rest of the page, which then adapts to that frame.
 *
 * Already-chosen state: we fade the splitter down into a single
 * "you're viewing the [persona] experience" strip with a "change"
 * control, rather than removing it entirely — keeps the choice
 * discoverable for returning visitors who picked the wrong frame
 * last time.
 */
export default function PersonaSplitter() {
  const { persona, setPersona, ready } = usePersona();
  const ref = useRef<HTMLElement>(null);
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function choose(p: Persona) {
    setPersona(p);
    // Give the state flip a frame then scroll visitors into the
    // re-framed landing below.
    requestAnimationFrame(() => {
      const target = document.getElementById('landing-below-splitter');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (!ready) {
    // Reserve vertical space to avoid layout shift while localStorage
    // is being read.
    return <section id="persona-splitter" className="py-20 lg:py-28 bg-warm-bg" />;
  }

  if (persona) {
    return (
      <section
        id="persona-splitter"
        ref={ref}
        className="py-10 lg:py-14 bg-warm-bg border-b border-black/5"
        aria-label="Current audience"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
          <p className="text-foreground/60 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
            You&rsquo;re viewing the{' '}
            <span className="text-primary font-bold">
              {persona === 'self' ? 'for yourself' : 'for a loved one'}
            </span>{' '}
            experience.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => choose(persona === 'self' ? 'loved_one' : 'self')}
              className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-[12px] font-semibold text-foreground/70 hover:text-primary hover:border-primary/40 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Switch to &ldquo;{persona === 'self' ? 'for a loved one' : 'for yourself'}&rdquo;
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      id="persona-splitter"
      className="relative py-20 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="splitter-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 80% 30%, rgba(216,137,102,0.09) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 55% 55% at 20% 80%, rgba(107,42,20,0.06) 0%, rgba(107,42,20,0) 65%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="section-label justify-center mb-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Before we show you more
        </p>
        <h2
          id="splitter-heading"
          className="text-foreground font-bold tracking-tight mb-5"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4.2vw, 3rem)',
            lineHeight: 1.05,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          Who are you <em className="not-italic text-primary">looking for help for?</em>
        </h2>
        <p
          className="text-foreground/70 leading-relaxed max-w-2xl mx-auto mb-10 lg:mb-12"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.3s',
          }}
        >
          The conversation is different depending on the answer. We&rsquo;d
          rather show you the right one than make you sift through the
          wrong one.
        </p>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          <Tile
            eyebrow="Option 01"
            title="For myself"
            body="I'm the one who needs treatment. Show me what residential looks like, what the first week feels like, and how insurance works."
            icon={<SelfIcon />}
            visible={visible}
            delay={0.4}
            onClick={() => choose('self')}
          />
          <Tile
            eyebrow="Option 02"
            title="For someone I love"
            body="A partner, parent, adult child, sibling. Show me how this works when I'm the one trying to help — visitation, communication, family support."
            icon={<HeartIcon />}
            visible={visible}
            delay={0.55}
            onClick={() => choose('loved_one')}
          />
        </div>

        <p
          className="mt-8 text-[13px] text-foreground/45"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
          }}
        >
          Not sure?{' '}
          <a
            href="tel:+18669964308"
            className="text-primary font-semibold underline decoration-primary/30 hover:decoration-primary"
          >
            Call us — we&rsquo;ll guide you
          </a>{' '}
          · or{' '}
          <button
            type="button"
            onClick={() => choose('self')}
            className="text-foreground/60 hover:text-foreground underline decoration-foreground/20 hover:decoration-foreground/60"
          >
            show me everything
          </button>
          .
        </p>
      </div>
    </section>
  );
}

function Tile({
  eyebrow,
  title,
  body,
  icon,
  visible,
  delay,
  onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  visible: boolean;
  delay: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative text-left rounded-3xl bg-white border border-black/5 p-7 lg:p-10 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-500 overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(circle, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 70%)',
        }}
      />
      <div className="relative flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary mb-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {eyebrow}
          </p>
          <h3
            className="text-foreground font-bold mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 2.1vw, 1.9rem)',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h3>
          <p
            className="text-foreground/70 leading-relaxed mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {body}
          </p>
          <span
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Choose this path
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

function SelfIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3-7 8-7s8 3 8 7" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 8c0 6-8 11-8 11S4 14 4 8a4 4 0 018-1 4 4 0 018 1z" />
      <path d="M8 11h3l1-2 2 4 1-2h1" />
    </svg>
  );
}
