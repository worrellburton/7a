'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 8 — Accreditation strip.
 *
 * Pair of large seals (Joint Commission Gold Seal, LegitScript) on a
 * cream surface, with a short context paragraph and the plain-text
 * compliance line (HIPAA / CARF). Elevated above the FAQ so the
 * visitor reads "this is the real thing" right before asking their
 * final questions.
 */

export default function WhyAccreditation() {
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="accred-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(188,107,74,0.08) 0%, rgba(188,107,74,0) 65%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="section-label justify-center mb-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Accredited &amp; Certified
        </p>
        <h2
          id="accred-heading"
          className="text-foreground font-bold tracking-tight mb-7"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
            lineHeight: 1.05,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          Held to the <em className="not-italic text-primary">highest standards</em> of care.
        </h2>
        <p
          className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.3s',
          }}
        >
          Seven Arrows Recovery is accredited by The Joint Commission &mdash; the
          gold-standard for healthcare organizations worldwide &mdash; and
          certified by LegitScript, meaning our facility meets strict standards
          for transparency, compliance, and quality of care.
        </p>

        <div
          className="flex flex-wrap items-center justify-center gap-10 lg:gap-16 mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.45s',
          }}
        >
          <a
            href="https://www.qualitycheck.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Joint Commission Gold Seal of Approval"
            className="block transition-transform hover:scale-105"
          >
            <img
              src="https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776808204322-pzyzhrow2ib-joint-commission-gold-seal-of-approval.jpg"
              alt="Joint Commission Gold Seal of Approval"
              className="h-28 lg:h-32 w-auto rounded-xl shadow-md"
              loading="lazy"
            />
          </a>
          <a
            href="https://www.legitscript.com/websites/?checker_keywords=sevenarrowsrecovery.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Verify LegitScript Certification for sevenarrowsrecovery.com"
            className="block transition-transform hover:scale-105"
          >
            <img
              src="https://static.legitscript.com/seals/11087571.png"
              alt="LegitScript Certified — verify at legitscript.com"
              className="h-28 lg:h-32 w-auto"
              loading="lazy"
              width={65}
              height={79}
            />
          </a>
        </div>

        <p
          className="text-[11px] uppercase tracking-[0.22em] text-foreground/45 font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.65s',
          }}
        >
          JCAHO Accredited &nbsp;·&nbsp; LegitScript Certified &nbsp;·&nbsp; HIPAA Compliant
        </p>
      </div>
    </section>
  );
}
