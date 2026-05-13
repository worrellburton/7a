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
  /**
   * Tell the FLIP hook which path the user just clicked. The hook
   * will paint a traveler-spotlight (Phase 5) on that row during
   * its upcoming animation so the eye locks onto the moving entry
   * instead of the sea of companion shifts around it. Called from
   * the click handler before recordSidebarVisit's local state
   * update triggers a re-render.
   */
  markTraveler: (path: string) => void;
}

// Phase 4 — per-row duration scaled by travel distance. A 2-row hop
// should feel snappy; a 12-row jump should feel weightier and let
// the eye actually track the moving element. Linear interpolation
// between MIN_DURATION_MS at 0px and MAX_DURATION_MS at the
// SATURATION_DISTANCE — beyond that, every row caps at the max so a
// 300px and a 900px travel land at the same speed (otherwise really
// long journeys feel sluggish without earning it).
const MIN_DURATION_MS = 220;
const MAX_DURATION_MS = 520;
const SATURATION_DISTANCE = 360;
const FLIP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function flipDuration(dy: number): number {
  const abs = Math.abs(dy);
  const t = Math.min(1, abs / SATURATION_DISTANCE);
  return Math.round(MIN_DURATION_MS + (MAX_DURATION_MS - MIN_DURATION_MS) * t);
}

export function useSidebarFlip(): FlipController {
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const prevPositionsRef = useRef(new Map<string, number>());
  const deltasRef = useRef(new Map<string, number>());
  // The path the user just clicked. Consumed once on the very next
  // layout effect, then cleared. We use a ref instead of state so
  // setting it doesn't trigger an extra render between the click
  // and the recency reorder it's tied to.
  const travelerPathRef = useRef<string | null>(null);

  const register = useCallback((path: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(path, el);
    else elementsRef.current.delete(path);
  }, []);

  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const deltas = new Map<string, number>();
    const movers: { path: string; el: HTMLElement; dy: number }[] = [];
    for (const [path, el] of elementsRef.current) {
      if (!el.isConnected) continue;
      const top = el.getBoundingClientRect().top;
      next.set(path, top);
      const prev = prevPositionsRef.current.get(path);
      if (prev != null) {
        const dy = prev - top;
        if (Math.abs(dy) >= 0.5) {
          deltas.set(path, dy);
          movers.push({ path, el, dy });
        }
      }
    }
    prevPositionsRef.current = next;
    deltasRef.current = deltas;

    if (movers.length === 0) return;

    // Pick up the path the user just clicked (set via markTraveler).
    // We resolve it to the actual mover for fast lookup during the
    // play leg, then clear the ref so the next reorder (e.g. caused
    // by some unrelated state change) doesn't reuse a stale marker.
    const travelerPath = travelerPathRef.current;
    travelerPathRef.current = null;
    const travelerEl = travelerPath
      ? movers.find((m) => m.path === travelerPath)?.el ?? null
      : null;

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
        for (const { el, dy } of movers) {
          // Phase 4: per-row duration. Each mover gets its own
          // transition string sized to its travel distance, so a
          // big jump reads as deliberate and a small hop stays
          // snappy. Phase 5 also tweens the spotlight's box-shadow
          // alongside the transform so the glow rises and falls
          // with the row instead of snapping in/out at the
          // endpoints — hence the multi-property transition list
          // on the traveler.
          const dur = flipDuration(dy);
          if (el === travelerEl) {
            el.style.transition = `transform ${dur}ms ${FLIP_EASE}, box-shadow ${dur}ms ${FLIP_EASE}`;
          } else {
            el.style.transition = `transform ${dur}ms ${FLIP_EASE}`;
          }
          el.style.transform = 'translate3d(0, 0, 0)';
        }
        // ── Phase 5: light up the traveler. The element ALREADY
        // got translateY(prev - new) above, so we layer a glow +
        // tiny scale-up on top without disturbing the FLIP math.
        // Both effects ride the same transition stack so they
        // breathe out as the row lands.
        if (travelerEl) {
          travelerEl.classList.add('sa-flip-traveler');
        }
      });
    });

    // ── Cleanup hints after the animation ends. Otherwise the
    // will-change + translate3d keep the layer promoted forever
    // and we pay GPU memory for every row that ever animated. The
    // traveler also gets its spotlight class removed here so the
    // glow fades out exactly when the row lands.
    const cleanups = movers.map(({ el }) => {
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', onEnd);
        if (!el.isConnected) return;
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.classList.remove('sa-flip-traveler');
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
          el.classList.remove('sa-flip-traveler');
        }
      }
    };
  });

  const readDeltas = useCallback(() => deltasRef.current, []);
  const resetPositions = useCallback(() => {
    prevPositionsRef.current = new Map();
    deltasRef.current = new Map();
  }, []);
  const markTraveler = useCallback((path: string) => {
    travelerPathRef.current = path;
  }, []);

  return { register, readDeltas, resetPositions, markTraveler };
}
