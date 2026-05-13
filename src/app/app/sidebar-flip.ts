'use client';

// FLIP (First-Last-Invert-Play) infrastructure for the recency
// sidebar. Phase 1 of the 10-phase travel-and-landing animation
// series. This file owns the position-snapshot side of the work;
// subsequent phases wire transforms, transitions, spotlights,
// motion trails, etc. on top.
//
// The hook returns a single function `register(path, el)` that
// every nav <Link> calls with its current ref. Each render the
// hook walks the registered elements, measures their top offsets
// relative to the nearest scroll container, and stores the result
// in `prevPositionsRef`. On the NEXT render we read those previous
// positions, compute deltaY against the new positions, and stash
// the deltas in `deltasRef` for the animation phases to consume.
//
// All measurements live in refs — they're per-frame ephemera, not
// React state, so we never trigger re-renders from inside this
// hook. The single source of truth is the order of paths the
// parent renders; this hook just translates "the same path used
// to be 84px higher" into a delta that downstream phases can
// turn into a tweened transform.

import { useCallback, useLayoutEffect, useRef } from 'react';

export interface FlipController {
  /**
   * Called by each nav row to register its DOM element. Returning
   * the same instance on every render lets refs be stable across
   * renders without forcing the parent to memoise the callback per
   * row. Passing `null` unregisters (React calls with null on
   * unmount or when the path changes).
   */
  register: (path: string, el: HTMLElement | null) => void;
  /**
   * Map of path → vertical delta (in CSS px) between the row's
   * previous render position and its current one. A positive delta
   * means "the row used to be that many pixels lower" — i.e. the
   * row moved UP — which is the direction we expect for a click-
   * to-top travel. Cleared on every applyDeltas() call.
   */
  readDeltas: () => Map<string, number>;
  /**
   * Phase 2 will call this after applyDeltas has been consumed,
   * to flush the position cache so the NEXT render starts from
   * "current = previous." Useful when the parent wants to bail
   * out of animating a particular transition.
   */
  resetPositions: () => void;
}

export function useSidebarFlip(): FlipController {
  // Tracked elements by path. WeakRef-style: we hold raw refs and
  // accept that some entries may be detached at measurement time.
  const elementsRef = useRef(new Map<string, HTMLElement>());
  // Top offsets captured at the end of the PREVIOUS commit, so the
  // current render can compute deltas relative to those positions.
  const prevPositionsRef = useRef(new Map<string, number>());
  // Deltas computed in this commit's layout phase, drained by the
  // animation phases.
  const deltasRef = useRef(new Map<string, number>());

  const register = useCallback((path: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(path, el);
    else elementsRef.current.delete(path);
  }, []);

  // useLayoutEffect runs after DOM mutations but before paint, which
  // means by the time this fires the new order is already laid out.
  // We compare current positions against last render's snapshot,
  // populate deltasRef, and overwrite the snapshot. Phase 2 reads
  // deltasRef in its own useLayoutEffect (which fires AFTER this
  // one on the same commit because effects run in declaration order
  // at the call site).
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const deltas = new Map<string, number>();
    for (const [path, el] of elementsRef.current) {
      // Element may have been detached if the path was filtered
      // out of the rendered set. Skip — we'll naturally re-pick it
      // up on the render that brings it back.
      if (!el.isConnected) continue;
      const top = el.getBoundingClientRect().top;
      next.set(path, top);
      const prev = prevPositionsRef.current.get(path);
      if (prev != null) {
        const dy = prev - top;
        // Sub-pixel deltas (< 0.5px) read as no-op; clamping
        // avoids a thousand 0.1px transitions firing on every
        // unrelated re-render (window resize, theme change, etc).
        if (Math.abs(dy) >= 0.5) deltas.set(path, dy);
      }
    }
    prevPositionsRef.current = next;
    deltasRef.current = deltas;
  });

  const readDeltas = useCallback(() => deltasRef.current, []);
  const resetPositions = useCallback(() => {
    prevPositionsRef.current = new Map();
    deltasRef.current = new Map();
  }, []);

  return { register, readDeltas, resetPositions };
}
