'use client';

// Animated progress bar that surfaces while Claude is building or
// iterating on an email. The build is a single non-streaming API
// call so we don't have real progress data — instead we run a
// smooth ease-out ramp from 0 → 95% over ~24s, and cycle a label
// through the build phases so the wait feels narrated. When the
// caller unmounts (build finished), the bar disappears, which is
// the visual equivalent of "snap to 100%".

import { useEffect, useState } from 'react';

const FRESH_STEPS = [
  'Reading the brief…',
  'Sketching the layout…',
  'Drafting copy in the brand voice…',
  'Placing images and the call-to-action…',
  'Inlining styles for email clients…',
  'Polishing the subject line…',
];

const ITERATE_STEPS = [
  'Reading your iteration note…',
  'Comparing against the previous draft…',
  'Rewriting the affected sections…',
  'Reflowing the layout…',
  'Polishing…',
];

const TARGET_PCT = 95;
const RAMP_MS = 24_000;

export function BuildProgress({ mode }: { mode: 'fresh' | 'iterate' }) {
  const steps = mode === 'iterate' ? ITERATE_STEPS : FRESH_STEPS;
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      // Ease-out: fast at first, asymptotic to TARGET_PCT.
      const t = Math.min(1, elapsed / RAMP_MS);
      const eased = 1 - Math.pow(1 - t, 2.2);
      const nextPct = Math.min(TARGET_PCT, eased * TARGET_PCT);
      setPct(nextPct);
      const idx = Math.min(steps.length - 1, Math.floor((nextPct / TARGET_PCT) * steps.length));
      setStepIdx(idx);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [steps.length]);

  return (
    <div
      className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="text-[11.5px] font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
          {steps[stepIdx]}
        </p>
        <p className="text-[10.5px] font-semibold text-primary tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
          {Math.round(pct)}%
        </p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
