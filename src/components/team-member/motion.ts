'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useInView — fires once when the element crosses the threshold and
 * then disconnects. Used for scroll-triggered reveals on the team
 * member pages. Kept deliberately minimal; don't add "has left view"
 * tracking here because reveals should never un-reveal on these pages.
 *
 * Robustness notes (the public team-member page learned the hard way):
 *
 *  - The threshold is treated as a *ceiling*, not a floor. We always
 *    add a lower threshold of `0.01` so that sections taller than the
 *    viewport (where the requested ratio can never be reached) still
 *    fire on first pixel of contact instead of staying invisible.
 *  - A safety timer flips the state to "in view" after 1.5s no matter
 *    what. If IntersectionObserver doesn't run (older Safari quirks,
 *    measurement timing during view-transitions, etc.) the section
 *    still becomes visible rather than rendering as a blank gap.
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.15 }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Hard fallback: if the observer never fires (for any reason),
    // flip inView true so the gated content does not remain invisible.
    const failsafe = window.setTimeout(() => setInView(true), 1500);

    // Bake an extra low threshold into whatever the caller asked for
    // so sections taller than the viewport (e.g. stacked-card grids
    // on mobile) still trigger on first contact.
    const requested = options.threshold;
    const merged: IntersectionObserverInit = {
      ...options,
      threshold: Array.isArray(requested)
        ? Array.from(new Set([0.01, ...requested])).sort((a, b) => a - b)
        : [0.01, typeof requested === 'number' ? requested : 0.15],
    };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
          window.clearTimeout(failsafe);
          return;
        }
      }
    }, merged);
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView] as const;
}

/**
 * useReducedMotion — tracks the OS prefers-reduced-motion setting.
 * Components should gate any non-essential animation on this so that
 * opting out of motion actually opts out. Defaults to `true` (i.e.
 * motion is allowed) on the server to keep SSR markup stable.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return reduced;
}

/**
 * Shared easing — matches the rest of the site (calm, decelerating).
 */
export const EASE_OUT_QUART = 'cubic-bezier(0.16, 1, 0.3, 1)';
