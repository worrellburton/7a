'use client';

import { useEffect, useState } from 'react';

/**
 * Exit-intent rescue modal.
 *
 * A single attempt to recover a visitor who is about to leave the
 * landing without taking any action. Shows once per session. Offers
 * a low-friction next step (email capture → admissions guide) for
 * visitors who aren't ready for a phone call but are clearly
 * engaged enough to be here.
 *
 * Trigger rules:
 *   • desktop — fire when the pointer leaves through the top edge
 *     after the visitor has been on the page > 10s (avoids firing
 *     on bot / back-button behavior)
 *   • mobile  — fire when the user scrolls > 60% then back up more
 *     than 300px quickly (proxy for "reaching for back")
 *   • suppress if a phone or insurance CTA was clicked
 *   • suppress if already dismissed this session
 *
 * The modal is intentionally calm — not a pop-up with urgency
 * copy. Tone of this vertical cannot tolerate pressure tactics.
 */

const SESSION_KEY = 'seven-arrows-exit-intent-shown';
const SUPPRESS_KEY = 'seven-arrows-exit-intent-suppress';

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let shown = false;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {}
    if (shown) return;

    let suppressed = false;
    try {
      suppressed = localStorage.getItem(SUPPRESS_KEY) === '1';
    } catch {}
    if (suppressed) return;

    const mountedAt = Date.now();

    function markShown() {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
    }

    function trigger() {
      if (Date.now() - mountedAt < 10_000) return;
      setOpen(true);
      markShown();
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    }

    function onMouseOut(e: MouseEvent) {
      if (e.relatedTarget == null && e.clientY <= 0) trigger();
    }

    let lastScroll = 0;
    let peakScroll = 0;
    function onScroll() {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) peakScroll = Math.max(peakScroll, y / h);
      if (peakScroll > 0.6 && lastScroll - y > 300) trigger();
      lastScroll = y;
    }

    // Suppress if phone / insurance intent is expressed.
    function onClickSuppress(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const a = el.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('tel:') || href.startsWith('sms:') || href.includes('insurance')) {
        try {
          localStorage.setItem(SUPPRESS_KEY, '1');
        } catch {}
      }
    }

    window.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClickSuppress, true);

    return () => {
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClickSuppress, true);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-heading"
      className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-7 sm:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full text-foreground/50 hover:text-foreground hover:bg-warm-bg flex items-center justify-center"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3
              className="text-xl font-bold text-foreground mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              We&rsquo;ll send it right over.
            </h3>
            <p
              className="text-foreground/65 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No follow-up marketing unless you ask for one. If you want
              to talk now,{' '}
              <a href="tel:+18669964308" className="text-primary font-semibold underline">
                (866) 996-4308
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <p
              id="exit-heading"
              className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Before you go
            </p>
            <h3
              className="text-foreground font-bold mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.35rem, 2vw, 1.7rem)',
                lineHeight: 1.1,
              }}
            >
              Take our one-page admissions overview with you.
            </h3>
            <p
              className="text-foreground/70 leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cost ranges, what a typical week looks like, what to bring,
              and how insurance actually works. Written for families, in
              plain language. We&rsquo;ll email it — no call required,
              no follow-up marketing unless you ask for one.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                // Integration hook: swap for the real admissions
                // endpoint when one exists. Until then we pretend-send
                // and fire an analytics-ready custom event.
                try {
                  window.dispatchEvent(
                    new CustomEvent('exit_intent_email_captured', {
                      detail: { email: email.trim() },
                    }),
                  );
                } catch {}
                setSubmitted(true);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-black/15 text-sm focus:border-primary focus:outline-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-3 text-sm font-bold transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Email me the guide
              </button>
            </form>
            <p
              className="mt-4 text-[11px] text-foreground/45"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Prefer to talk now?{' '}
              <a href="tel:+18669964308" className="text-primary font-semibold underline">
                Call (866) 996-4308
              </a>
              . Answered 24/7.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
