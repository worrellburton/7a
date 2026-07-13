'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-into-view reveal that never hides content from anyone:
 *
 *   - SSR/no-JS render is VISIBLE (opacity 1). The old pattern
 *     server-rendered sections at opacity 0 and relied on an
 *     IntersectionObserver to un-hide them — visitors without JS
 *     (and crawler renders that don't run IO callbacks) got blank
 *     sections.
 *   - prefers-reduced-motion users keep the section visible and get
 *     no entrance animation at all.
 *   - Sections already in (or above) the viewport at mount are left
 *     visible instead of blinking out and re-animating.
 *
 * Only when JS is running, motion is allowed, and the section is
 * still below the fold do we hide it and arm the observer.
 */
export function useRevealOnScroll<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setVisible(false);
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
