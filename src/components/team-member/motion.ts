'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useInView — fires once when the element crosses the threshold and
 * then disconnects. Used for scroll-triggered reveals on the team
 * member pages. Kept deliberately minimal; don't add "has left view"
 * tracking here because reveals should never un-reveal on these pages.
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.15 }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
          return;
        }
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
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
