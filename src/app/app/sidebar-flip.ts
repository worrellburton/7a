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
// Phase 8 — companion rows (everything that wasn't the traveler)
// use a softer, slightly faster curve so they feel like they're
// "making room" rather than competing with the traveler. Same
// duration scale, but capped to ~75% of the traveler's max so a
// huge reorder finishes the companions ahead of the hero.
const COMPANION_MIN_DURATION_MS = 200;
const COMPANION_MAX_DURATION_MS = 380;
const COMPANION_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function flipDuration(dy: number, role: 'traveler' | 'companion' = 'traveler'): number {
  const abs = Math.abs(dy);
  const t = Math.min(1, abs / SATURATION_DISTANCE);
  const min = role === 'companion' ? COMPANION_MIN_DURATION_MS : MIN_DURATION_MS;
  const max = role === 'companion' ? COMPANION_MAX_DURATION_MS : MAX_DURATION_MS;
  return Math.round(min + (max - min) * t);
}

// Phase 7 — spawn three offset ghosts that fade out behind the
// traveler as it moves into place. Ghosts are visual-only clones
// pinned to the traveler's PRE-FLIP visual position; they don't
// participate in layout (position: absolute) so the surrounding
// rows don't reflow. Each ghost is removed when its own keyframe
// finishes, and the function returns silently for users with
// prefers-reduced-motion enabled — the trail is non-essential.
function spawnMotionTrail(travelerEl: HTMLElement, deltaY: number): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  // No trail when there's essentially no travel — a 1px hop
  // would just paint three overlapping ghosts of the row.
  if (Math.abs(deltaY) < 8) return;
  const parent = travelerEl.parentElement;
  if (!parent) return;
  // Position the parent relatively if it isn't already, so our
  // absolute-positioned ghosts anchor to the right scroll context.
  const cs = window.getComputedStyle(parent);
  if (cs.position === 'static') parent.style.position = 'relative';

  const rect = travelerEl.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  // The traveler is mid-FLIP: visually at its OLD position
  // (rect.top), heading to its new position (rect.top - deltaY).
  const startY = rect.top - parentRect.top;

  // Three ghosts at staggered opacities; deeper into the trail =
  // fainter + slightly delayed start so the trail reads as a
  // sequence rather than a static blur.
  const GHOSTS = [
    { opacity: 0.32, delay: 0,  duration: 360 },
    { opacity: 0.18, delay: 40, duration: 380 },
    { opacity: 0.08, delay: 90, duration: 420 },
  ];
  for (const cfg of GHOSTS) {
    const ghost = travelerEl.cloneNode(true) as HTMLElement;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.removeAttribute('id');
    ghost.style.position = 'absolute';
    ghost.style.left = `${rect.left - parentRect.left}px`;
    ghost.style.top = `${startY}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = String(cfg.opacity);
    ghost.style.zIndex = '4';
    // Drive the fade-out + slight upward drift via inline keyframe
    // via animation shorthand. The drift is half the traveler's
    // own delta so the trail "lags" rather than racing alongside.
    ghost.style.animation = `sa-flip-ghost-fade ${cfg.duration}ms ${cfg.delay}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`;
    ghost.style.setProperty('--ghost-drift', `${-deltaY * 0.4}px`);
    parent.appendChild(ghost);

    ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
    // Belt-and-braces removal: if animationend never fires (tab
    // backgrounded, etc.) yank the ghost after a generous timeout.
    window.setTimeout(() => ghost.remove(), cfg.delay + cfg.duration + 400);
  }
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
  // Phase 10 — cancel-on-rapid-click. We stash every active
  // animation's cleanup so a second click before the first has
  // finished cancels the in-flight pass cleanly. Without this, a
  // rapid double-click would queue two overlapping FLIPs and the
  // second one would invert against half-played transforms,
  // producing visual jitter or stuck rows.
  const inFlightCleanupRef = useRef<(() => void) | null>(null);

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

    // Phase 10 — if another FLIP is still finishing, fire its
    // cleanup now so transforms / classes / will-change reset to
    // a clean slate before we measure for the next pass. This is
    // the rapid-click guard — without it, a second click before
    // the first lands inverts against half-finished transforms.
    if (inFlightCleanupRef.current) {
      inFlightCleanupRef.current();
      inFlightCleanupRef.current = null;
    }

    // Phase 9 — global reduced-motion gate. If the user has opted
    // out of non-essential motion, we still want the sidebar to
    // re-order (recency is information, not decoration), we just
    // skip the invert + play and let the rows snap to their new
    // positions. Skipping early is much cheaper than running the
    // animation with degraded styles, and it keeps screen-reader
    // / keyboard users on a deterministic, predictable layout.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      travelerPathRef.current = null;
      return;
    }

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
          // Phase 4 + 8: per-row duration + role-aware curve.
          // The traveler gets the expressive cubic-bezier so its
          // arrival reads as a deliberate move; companions get a
          // tighter material-style ease so they feel like they
          // stepped aside. Companion durations are also slightly
          // shorter at the saturation end so the hero is the last
          // thing to settle into place.
          if (el === travelerEl) {
            const dur = flipDuration(dy, 'traveler');
            el.style.transition = `transform ${dur}ms ${FLIP_EASE}, box-shadow ${dur}ms ${FLIP_EASE}`;
          } else {
            const dur = flipDuration(dy, 'companion');
            el.style.transition = `transform ${dur}ms ${COMPANION_EASE}`;
            el.classList.add('sa-flip-companion');
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
          // Phase 7: motion-trail ghosts. Three lightweight
          // clones, each progressively more transparent and
          // offset further behind the traveler's path, fade
          // toward zero as the traveler tweens upward. Cloning
          // up-front keeps the runtime cost bounded — we don't
          // re-render anything, we just attach three siblings
          // and let CSS animate them away.
          spawnMotionTrail(travelerEl, deltas.get(travelerPath ?? '') ?? 0);
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
        el.classList.remove('sa-flip-companion');
        // Phase 6: landing pulse on the traveler. The row has
        // just settled at the top; fire a one-shot keyframe
        // (defined in globals.css as sa-flip-landing) that
        // bounces 0 → -3px → 0 over 360ms with a soft copper
        // ring flash that fades out alongside. The class is
        // added briefly and then removed via animationend so a
        // future reorder can re-trigger the keyframes.
        if (el === travelerEl) {
          el.classList.add('sa-flip-landing');
          const onLandEnd = (ae: AnimationEvent) => {
            if (ae.animationName !== 'sa-flip-landing-anim') return;
            el.removeEventListener('animationend', onLandEnd);
            el.classList.remove('sa-flip-landing');
          };
          el.addEventListener('animationend', onLandEnd);
        }
      };
      el.addEventListener('transitionend', onEnd);
      return () => el.removeEventListener('transitionend', onEnd);
    });

    const cancel = () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      for (const off of cleanups) off();
      for (const { el } of movers) {
        if (el.isConnected) {
          el.style.transition = '';
          el.style.transform = '';
          el.style.willChange = '';
          el.classList.remove('sa-flip-traveler');
          el.classList.remove('sa-flip-landing');
          el.classList.remove('sa-flip-companion');
        }
      }
    };
    inFlightCleanupRef.current = cancel;
    return cancel;
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
