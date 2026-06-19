'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

// Site-wide smooth scrolling for the public marketing pages. Mounted once
// in (site)/layout.tsx so it covers every public route. Honours
// prefers-reduced-motion (skips the scroll hijack entirely for users who
// asked for less motion) and tears the rAF loop + Lenis instance down on
// unmount so a client navigation away from the public site doesn't leave
// a dangling animation frame.
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
