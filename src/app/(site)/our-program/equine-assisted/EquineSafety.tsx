'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Phase 7 — Clinical safety, credentials, and ethics.
 *
 * Makes the difference between "therapeutic horsemanship" (which we
 * are not) and "equine-assisted psychotherapy delivered by a licensed
 * clinician" (which we are) explicit, at a level of specificity that
 * holds up to scrutiny from family members, monitoring programs, and
 * referring clinicians. The checklist is intentionally plain — no
 * marketing adjectives, just what&rsquo;s in place.
 */

interface SafetyItem {
  title: string;
  body: string;
}

const items: SafetyItem[] = [
  {
    title: 'Dual-leader protocol',
    body:
      'Every session is co-led by a licensed mental-health clinician and a dedicated equine specialist. The clinician owns the therapeutic frame; the specialist owns the horse-and-human safety frame. Neither role is collapsed into the other.',
  },
  {
    title: 'Licensed clinicians only',
    body:
      'All EAP clinicians hold active Arizona behavioral-health licensure (LPC, LCSW, LMFT, or equivalent). EAP content appears in the client record the same way individual therapy does — documented, billable, and continuous with the rest of care.',
  },
  {
    title: 'Trauma-informed framework',
    body:
      'Sessions are built on attachment theory, somatic experiencing, and Internal Family Systems (IFS). Clinicians track window-of-tolerance in real time and de-escalate rather than push when a client is flooding.',
  },
  {
    title: 'JCAHO-accredited program',
    body:
      'Seven Arrows Recovery is accredited by The Joint Commission (JCAHO), LegitScript-certified, and HIPAA-compliant. Our EAP program operates inside those same quality and privacy frameworks.',
  },
  {
    title: 'Consent, opt-out, and substitution',
    body:
      'EAP is an offered modality, not a required one. Clients who decline, or who later decide the arena isn&rsquo;t where their work lives, are substituted into equivalent clinical hours with no loss of care intensity.',
  },
  {
    title: 'Horse welfare standards',
    body:
      'Our herd is never run more than a capped number of sessions per week. Horses who are off, in season, or recovering are rotated out. A horse&rsquo;s &ldquo;no&rdquo; is respected the same way a client&rsquo;s &ldquo;no&rdquo; is — it&rsquo;s information, not resistance.',
  },
  {
    title: 'Medical oversight on campus',
    body:
      'Nursing staff on campus 24/7, a medical director over every plan of care, and established referral pathways to Cochise County hospital partners for anything that exceeds our level.',
  },
  {
    title: '42 CFR Part 2 confidentiality',
    body:
      'EAP records are governed by both HIPAA and 42 CFR Part 2 — the federal confidentiality rule specific to substance-use treatment. Information is not released outside of signed ROI except where the law requires it.',
  },
];

function Shield({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export default function EquineSafety() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: 'var(--color-dark-section)' }}
      aria-labelledby="equine-safety-heading"
    >
      {/* Subtle radial warm glow from the upper-left so the section
          doesn&rsquo;t read as a flat slab */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 15% 0%, rgba(216,137,102,0.14) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 mb-14 lg:mb-16">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p
              className="flex items-center gap-3 text-[11px] tracking-[0.24em] uppercase font-semibold mb-5"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--color-accent)',
              }}
            >
              <span aria-hidden="true" className="block w-10 h-px" style={{ background: 'var(--color-accent)' }} />
              Clinical safety & ethics
            </p>
            <h2
              id="equine-safety-heading"
              className="font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
              }}
            >
              Real clinical care, not{' '}
              <em className="not-italic" style={{ color: 'var(--color-accent)' }}>horsemanship theater</em>.
            </h2>
          </div>

          <div
            className="lg:col-span-6 lg:pl-4"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s',
            }}
          >
            <p
              className="text-white/80 text-[17px] leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Equine-assisted psychotherapy at Seven Arrows is a licensed
              mental-health intervention delivered inside an accredited
              residential addiction program. Every session is documented,
              trauma-informed, and co-led by people whose entire job is
              keeping both clients and horses safe.
            </p>
            <p
              className="text-white/75 text-[16px] leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The checklist below is what that means in practice — share it
              with a family member or referring clinician who wants to know
              exactly what they&rsquo;re signing off on.
            </p>
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-8 lg:gap-y-10">
          {items.map((item, i) => (
            <li
              key={item.title}
              className="flex gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.08}s`,
              }}
            >
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(216,137,102,0.18)',
                  color: 'var(--color-accent)',
                }}
                aria-hidden="true"
              >
                <Shield />
              </div>
              <div>
                <h3
                  className="font-bold text-white mb-1.5"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.15rem',
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-white/75 text-[14.5px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div
          className="mt-14 lg:mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-10"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.9s',
          }}
        >
          <span
            className="text-[10px] tracking-[0.28em] uppercase font-bold text-white/50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Credentials on file
          </span>
          {[
            { label: 'JCAHO Accredited', aka: 'The Joint Commission' },
            { label: 'LegitScript Certified', aka: 'Addiction treatment registry' },
            { label: 'HIPAA Compliant', aka: 'Federal privacy rule' },
            { label: '42 CFR Part 2', aka: 'SUD-specific confidentiality rule' },
            { label: 'AZ-Licensed Clinicians', aka: 'LPC / LCSW / LMFT' },
          ].map((c) => (
            <Credential key={c.label} label={c.label} aka={c.aka} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Credential({ label, aka }: { label: string; aka: string }) {
  return (
    <div className="flex flex-col">
      <span
        className="text-white text-sm font-semibold"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
      <span
        className="text-white/45 text-[11px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {aka}
      </span>
    </div>
  );
}
