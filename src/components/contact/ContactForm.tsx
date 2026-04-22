'use client';

import { useEffect, useRef, useState } from 'react';
import ContactPageForm from '@/components/ContactPageForm';

/**
 * Contact — Phase 4. The form section. Wraps the existing
 * ContactPageForm in an anchored, editorial container with a
 * direct invitation and a small privacy assurance. The form
 * component itself lives in @/components/ContactPageForm and
 * handles submission + validation.
 */
export default function ContactForm() {
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
      id="form"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="contact-form-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">Send a note</p>
            <h2
              id="contact-form-heading"
              className="text-foreground font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 2.8rem)',
                lineHeight: 1.05,
              }}
            >
              Write as much or as little <em className="not-italic text-primary">as you want</em>.
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Share your name, your question, and how you&rsquo;d like us
              to follow up. We read every message. A real person responds
              &mdash; typically within one business day, often much sooner.
            </p>
            <ul className="space-y-3">
              {[
                'Your message is encrypted in transit and at rest.',
                'We never share that you contacted us with anyone.',
                'You\'ll get a confirmation email as soon as you hit send.',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-foreground/75 text-[14.5px] leading-snug"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-4 h-4 text-primary shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <div className="rounded-2xl bg-white border border-black/5 p-6 lg:p-8 shadow-sm">
              <ContactPageForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
