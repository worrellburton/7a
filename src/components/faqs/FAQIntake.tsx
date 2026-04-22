'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * FAQs — "Didn't see your question?" intake block. Simple editorial
 * block with two conversion paths (call / contact form). Lives
 * between the last category and the closing CTA so scrollers have a
 * second-chance moment to reach out without committing to the big
 * gradient sign-off.
 */
export default function FAQIntake() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 lg:py-28 bg-white border-t border-black/5"
      aria-labelledby="faq-intake-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="section-label mb-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          Didn&rsquo;t see your question?
        </p>
        <h2
          id="faq-intake-heading"
          className="text-foreground font-bold tracking-tight mb-5"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
            lineHeight: 1.06,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}
        >
          Ask us directly. <em className="not-italic text-primary">No pressure.</em>
        </h2>
        <p
          className="text-foreground/70 leading-relaxed text-lg mb-9 max-w-xl mx-auto"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.35s',
          }}
        >
          Our admissions team is available 24/7. Most callers get a real answer
          to their question in under five minutes &mdash; no gatekeeping, no
          sales pitch, no commitment.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.5s',
          }}
        >
          <a
            href="tel:+18669964308"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.3)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Call (866) 996-4308
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-foreground/30 text-foreground hover:bg-foreground hover:text-white rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Send a message
          </Link>
        </div>
      </div>
    </section>
  );
}
