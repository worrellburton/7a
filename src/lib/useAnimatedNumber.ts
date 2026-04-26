import { useEffect, useRef, useState } from 'react';

// Drive a value from `previous` (or 0 on first paint) to `target`
// over `durationMs` using a cubic ease-out curve so the digits
// settle naturally instead of stopping abruptly. Pass `null` for
// `target` to skip — the hook returns null and the caller can
// render a placeholder.
//
// Used by the home At-a-glance cards so a "37" doesn't slam into
// place; it ticks up from 0 (or down from 60 to 32 etc.) when
// data first arrives.
export function useAnimatedNumber(
  target: number | null,
  durationMs = 700,
): number | null {
  const [value, setValue] = useState<number | null>(target);
  const previousRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      setValue(null);
      return;
    }
    const start = performance.now();
    const from = previousRef.current ?? 0;
    const to = target;
    if (from === to) {
      setValue(to);
      return;
    }
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      // Snap to integers because the cards display whole counts;
      // fractional intermediates look like a glitch.
      setValue(Math.round(next));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}
