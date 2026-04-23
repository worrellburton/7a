'use client';

import { useEffect, useRef, useState } from 'react';

// Site-wide WebGL background. Fixed full-viewport canvas anchored
// behind every section (z-index -10), so it reads as ambient atmosphere
// only where page sections leave transparent gaps. Subtle on purpose —
// it should never compete with content.
//
// Phase 1 scaffold only: no WebGL yet. We mount the canvas, set up the
// pointer-events / aria / z-index plumbing, and wire the activity hooks
// (prefers-reduced-motion, visibilitychange) so phases 2+ can flip an
// `active` flag instead of having to re-do all this lifecycle work.

export default function SiteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Honor OS reduced-motion preference. When set, we'll later skip the
  // animation loop and only render a single static frame.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Pause when the tab is hidden so we're not burning GPU on a backgrounded tab.
  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Phase 1: nothing renders into the canvas yet. The element + the
  // refs + the lifecycle plumbing are in place so Phase 2 can attach
  // a WebGL context without disturbing layout/SSR semantics.
  // Marking these as intentionally unused for the eslint pass:
  void active;
  void reduced;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      // `contain: strict` keeps paint scoped to this element so the
      // browser can short-circuit hit-testing / layout against the
      // body content above us.
      style={{ contain: 'strict' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        // Hidden sentinel until Phase 2 attaches a WebGL context. We
        // still render it so the DOM shape is stable across phases.
      />
    </div>
  );
}
