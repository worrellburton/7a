'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Phase 10 — Closing CTA + NAP + Map.
 *
 * Dark-section backdrop under a soft radial glow; serif headline +
 * three CTAs; a two-column NAP panel with Seven Arrows' address,
 * phone, and a Google Map. Carries SEO weight (NAP in address markup)
 * while giving the visitor the three next-steps (call, verify
 * insurance, contact online).
 */
export default function WhyCTA() {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="why-cta-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 lg:mb-16">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            Start Here
          </p>
          <h2
            id="why-cta-heading"
            className="font-bold tracking-tight mb-7 mx-auto max-w-3xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.3rem, 4.6vw, 3.6rem)',
              lineHeight: 1.03,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            Begin your <em className="not-italic" style={{ color: 'var(--color-accent)' }}>healing journey</em> today.
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.9s ease 0.35s',
            }}
          >
            Taking the first step is the hardest part. Our admissions team is
            available 24 hours a day, 7 days a week to answer your questions,
            verify your insurance, and help you or your loved one begin the path
            to recovery.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.55s',
            }}
          >
            <a href="tel:+18669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link
              href="/admissions#verify"
              className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
            >
              Verify Your Insurance
            </Link>
            <Link
              href="/contact"
              className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
            >
              Contact Us Online
            </Link>
          </div>
        </div>

        <div
          className="grid md:grid-cols-2 gap-8 items-start"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.7s',
          }}
        >
          <div
            className="rounded-2xl p-8 lg:p-10"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery
            </p>
            <address
              className="not-italic text-white/85 leading-relaxed space-y-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <p>Elfrida, AZ 85610</p>
              <p>Cochise County, Arizona</p>
              <p className="pt-3">
                <a href="tel:+18669964308" className="text-white text-lg font-bold hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                  (866) 996-4308
                </a>
              </p>
              <p className="text-sm text-white/55 pt-1">
                Available 24/7 — Confidential &amp; free consultations
              </p>
            </address>
          </div>

          <div className="rounded-2xl overflow-hidden h-64 md:h-full min-h-[256px] border border-white/10">
            <iframe
              title="Seven Arrows Recovery Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.5!2d-109.6939!3d31.6711!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sElfrida%2C+AZ+85610!5e0!3m2!1sen!2sus!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '256px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
