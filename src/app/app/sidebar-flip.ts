'use client';

// FLIP (First-Last-Invert-Play) infrastructure for the recency
// sidebar. Phases 1-3 of the 10-phase travel-and-landing animation.
//
// Phase 1 — position snapshots + delta computation.
// Phase 2 — invert + play (the basic working animation).
// Phase 3 (this commit) — paint stability + GPU promotion.
//   * Double-rAF before the play leg, so Safari/WebKit always
//     paint the inverted frame before the transition kicks off.
//   * will-change: transform on movers during the animation, so
//     the compositor promotes the row to its own layer and the
//     tween runs entirely off the main thread.
//   * Inline `transform: translateZ(0)` on the moving element
//     during the animation, forcing GPU acceleration even on
//     browsers that ignore will-change.
//   * `transitionend` cleanup so the will-change / translateZ
//     hints don't linger past the animation (which would otherwise
//     leak GPU memory and keep the layer promoted forever).
//
// Subsequent phases (4-10) layer in: distance-scaled easing,
// traveler spotlight, landing pulse, motion-trail ghosts,
// companion animation for shifted items, mobile parity, reduced-
// motion, cancel-on-rapid-click.

import { useCallback, useLayoutEffect, useRef } from 'react';

export interface FlipController {
  register: (path: string, el: HTMLElement | null) => void;
  readDeltas: () => Map<string, number>;
  resetPositions: () => void;
}

const FLIP_TRANSITION = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

export function useSidebarFlip(): FlipController {
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const prevPositionsRef = useRef(new Map<string, number>());
  const deltasRef = useRef(new Map<string, number>());

  const register = useCallback((path: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(path, el);
    else elementsRef.current.delete(path);
  }, []);

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

    if (movers.length === 0) return;

    // ── Invert: rewind every mover to its previous visual position.
    // GPU-promote each mover up-front so the upcoming transform is
    // composited rather than re-rasterised on every tween frame.
    // translateZ(0) covers browsers that don't honour will-change.
    for (const { el, dy } of movers) {
      el.style.transition = 'none';
      el.style.willChange = 'transform';
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
    }

    // Commit the invert. offsetWidth is a synchronous layout read.
    void movers[0].el.offsetWidth;

    // ── Play: double-rAF before clearing the transform. WebKit
    // sometimes coalesces our single-rAF play with the layout that
    // committed the invert, paints once, and skips the animation.
    // Two rAFs guarantee the inverted frame paints first.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        for (const { el } of movers) {
          el.style.transition = FLIP_TRANSITION;
          el.style.transform = 'translate3d(0, 0, 0)';
        }
      });
    });

    // ── Cleanup hints after the animation ends. Otherwise the
    // will-change + translate3d keep the layer promoted forever
    // and we pay GPU memory for every row that ever animated.
    const cleanups = movers.map(({ el }) => {
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', onEnd);
        if (!el.isConnected) return;
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
      };
      el.addEventListener('transitionend', onEnd);
      return () => el.removeEventListener('transitionend', onEnd);
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      for (const off of cleanups) off();
      for (const { el } of movers) {
        if (el.isConnected) {
          el.style.transition = '';
          el.style.transform = '';
          el.style.willChange = '';
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
