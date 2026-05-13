'use client';

// FLIP (First-Last-Invert-Play) infrastructure for the recency
// sidebar. Phases 1-2 of the 10-phase travel-and-landing animation.
//
// Phase 1 (shipped): measure positions, expose deltas.
// Phase 2 (this commit): apply the inverse transform and trigger
//   the play-back so each reordered row visibly travels from its
//   old position to its new one.
//
// Subsequent phases (3-10) layer in: GPU hints, distance-scaled
// easing, traveler spotlight, landing pulse, motion trail ghosts,
// companion animations for shifted items, mobile parity, reduced-
// motion handling, cancel-on-rapid-click, etc.
//
// All measurements live in refs; the hook never triggers a re-render
// from its own side effects.

import { useCallback, useLayoutEffect, useRef } from 'react';

export interface FlipController {
  /** Each nav row calls this with its DOM element on every render. */
  register: (path: string, el: HTMLElement | null) => void;
  /** Map of path → vertical delta (px) since last commit. Cleared once consumed. */
  readDeltas: () => Map<string, number>;
  /** Drop the cached snapshot so the next render starts fresh. */
  resetPositions: () => void;
}

// Single shared transition string used for the "Play" leg of the
// FLIP. Phase 4 will replace this with a per-row, distance-scaled
// curve; for Phase 2 a fixed cubic-bezier ease-out + 320ms reads
// snappy without feeling abrupt.
const FLIP_TRANSITION = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

export function useSidebarFlip(): FlipController {
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const prevPositionsRef = useRef(new Map<string, number>());
  const deltasRef = useRef(new Map<string, number>());

  const register = useCallback((path: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(path, el);
    else elementsRef.current.delete(path);
  }, []);

  // Layout effect runs after every commit, after DOM mutations but
  // before paint. Order of operations per commit:
  //
  //   1. Measure each registered element's new top offset (the "L"
  //      in FLIP — Last position).
  //   2. Diff against last commit's snapshot to compute deltas.
  //   3. For any path with a non-trivial delta, apply
  //      transform: translateY({delta}px) and transition: none
  //      SYNCHRONOUSLY — this rewinds the element to its previous
  //      visual position before the browser paints.
  //   4. Force a layout read (offsetWidth) so the inverse transform
  //      is committed.
  //   5. requestAnimationFrame: clear the transform and restore the
  //      transition, letting the CSS engine tween from old →
  //      new position over FLIP_TRANSITION's duration.
  //
  // This is the classic FLIP recipe; nothing here is fancy yet —
  // Phase 3+ will add GPU hints, distance-scaled timing, and the
  // visual treatments (spotlight, pulse, trail).
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const deltas = new Map<string, number>();
    const movers: { el: HTMLElement; dy: number }[] = [];
    for (const [path, el] of elementsRef.current) {
      if (!el.isConnected) continue;
      const top = el.getBoundingClientRect().top;
      next.set(path, top);
      const prev = prevPositionsRef.current.get(path);
      if (prev != null) {
        const dy = prev - top;
        if (Math.abs(dy) >= 0.5) {
          deltas.set(path, dy);
          movers.push({ el, dy });
        }
      }
    }
    prevPositionsRef.current = next;
    deltasRef.current = deltas;

    // First render — no previous positions, nothing to invert.
    if (movers.length === 0) return;

    // ── Invert leg of FLIP — pin each mover to its OLD pixel
    // position by applying translateY of the delta we just
    // computed (`prev - new` is positive for upward motion, so
    // we translate the element DOWN by that amount to put it
    // visually back where it was).
    for (const { el, dy } of movers) {
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    }

    // Force the browser to commit the inverse transform before
    // we kick off the play. Reading offsetWidth is a synchronous
    // layout read; voids any pending paint-batching that would
    // otherwise collapse the invert+play into a single paint and
    // skip the animation entirely.
    void movers[0].el.offsetWidth;

    // ── Play leg — on the next frame, clear the transform and
    // re-enable the transition; CSS animates back to translateY(0)
    // which is the new (correct) position. Two rAFs would be more
    // bulletproof against Safari quirks, but a single one is
    // enough here because the layout read above already committed
    // the invert.
    const raf = window.requestAnimationFrame(() => {
      for (const { el } of movers) {
        el.style.transition = FLIP_TRANSITION;
        el.style.transform = 'translateY(0)';
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
      // If we unmount mid-animation, clear inline styles so
      // remounted rows don't render with a stale transform.
      for (const { el } of movers) {
        if (el.isConnected) {
          el.style.transition = '';
          el.style.transform = '';
        }
      }
    };
  });

  const readDeltas = useCallback(() => deltasRef.current, []);
  const resetPositions = useCallback(() => {
    prevPositionsRef.current = new Map();
    deltasRef.current = new Map();
  }, []);

  return { register, readDeltas, resetPositions };
}
