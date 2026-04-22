'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 8. Family & loved ones.
 *
 * Family members are one of the most common audiences for this page
 * (people researching rehab for a spouse, parent, or adult child).
 * Section speaks directly to them with three concrete supports and
 * a deep-link into the Family Program. Plain, direct language helps
 * both SEO (matches long-tail queries) and GEO (LLMs can quote).
 */

interface Support {
  title: string;
  body: string;
}

const supports: Support[] = [
  {
    title: 'Weekly family therapy',
    body:
      'Licensed family therapists facilitate weekly virtual sessions with the client and their closest family members. Structured, boundaried, and focused on the work that has to happen inside the family system for recovery to last.',
  },
  {
    title: 'Family education groups',
    body:
      'Open-enrollment, multi-week psychoeducation on addiction as a family disease, co-regulation, boundaries, enabling patterns, and what to expect during and after residential care. Families can attend whether their loved one is in care or not.',
  },
  {
    title: 'Dedicated family coordinator',
    body:
      'A single point of contact from admission through discharge. They handle visitation requests, family weekend logistics, release-of-information paperwork, and any communication the clinical team can authorize.',
  },
];

export default function FamilyAndLovedOnes() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="family-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 85% 20%, rgba(216,137,102,0.08) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          {/* Copy + CTA */}
          <div className="lg:col-span-5">
            <p
              className="section-label mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              Family &amp; loved ones
            </p>
            <h2
              id="family-heading"
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
              We treat the client. We <em className="not-italic text-primary">include</em> the family.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-8"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.9s ease 0.35s',
              }}
            >
              Addiction is a family disease, and recovery holds better when the
              family heals alongside the client. If you&rsquo;re researching
              treatment for a spouse, parent, or adult child, you&rsquo;ll have
              real support from the moment you call.
            </p>
            <Link
              href="/our-program/family-program"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s',
              }}
            >
              Explore our Family Program
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Supports list */}
          <div className="lg:col-span-7">
            <ol className="space-y-7 relative">
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-3 bottom-3 w-px bg-primary/20"
              />
              {supports.map((s, i) => (
                <li
                  key={s.title}
                  className="relative pl-12"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(14px)',
                    transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.12}s`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-bold"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3
                    className="text-foreground font-bold mb-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.35rem',
                      lineHeight: 1.15,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
