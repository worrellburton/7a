'use client';

// Animated progress bar that surfaces while Claude is building or
// iterating on an email. The build is a single non-streaming API
// call so we don't have real progress data — instead we model
// expected wall-time from history and animate against that:
//
//   1. On mount we read recent completion times from localStorage
//      (per mode), median-of-last-N, clamped to a sensible range.
//   2. The bar ramps 0 → 90% over the estimate with ease-out, so
//      the bulk of the visible progress lands inside the typical
//      build window.
//   3. After the estimate window, the bar continues to creep
//      90% → 99% over a long tail so the marketer doesn't see it
//      pinned at "95%" indefinitely — it keeps moving even when
//      Claude is taking longer than usual.
//   4. On unmount (parent flipped 'building' to false) we record the
//      elapsed time so the next build's estimate is more accurate.
//
// The eta label under the spinner is rounded to whole seconds and
// counts down so the wait reads honestly even when the underlying
// model is slow.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const STORAGE_KEY = 'sa.email-build-durations';
const MAX_HISTORY = 12;
// First-time defaults (no history yet). Tuned for Claude Fable 5
// (always-on thinking) — a fresh build typically runs ~45-75s, an
// iteration ~25-40s. Real history replaces these after a few builds.
const DEFAULT_FRESH_MS = 60_000;
const DEFAULT_ITERATE_MS = 30_000;
// Floor + ceiling on the estimate so a single weird measurement
// (5s spike, 4-minute Anthropic incident) doesn't move the bar
// into territory that mis-represents the next build.
const MIN_ESTIMATE_MS = 8_000;
const MAX_ESTIMATE_MS = 180_000;

type Mode = 'fresh' | 'iterate';

interface History {
  fresh: number[];
  iterate: number[];
}

function readHistory(): History {
  if (typeof window === 'undefined') return { fresh: [], iterate: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fresh: [], iterate: [] };
    const parsed = JSON.parse(raw) as Partial<History>;
    return {
      fresh: Array.isArray(parsed.fresh) ? parsed.fresh.filter((n) => typeof n === 'number' && isFinite(n) && n > 0).slice(-MAX_HISTORY) : [],
      iterate: Array.isArray(parsed.iterate) ? parsed.iterate.filter((n) => typeof n === 'number' && isFinite(n) && n > 0).slice(-MAX_HISTORY) : [],
    };
  } catch {
    return { fresh: [], iterate: [] };
  }
}

function recordDuration(mode: Mode, ms: number) {
  if (typeof window === 'undefined') return;
  // Drop obvious outliers — the marketer hitting "Wait, stop!" at
  // 2s is not a real build, and a 10-minute reading is a tab that
  // was backgrounded. Either side would poison the median.
  if (ms < 2_500 || ms > 5 * 60_000) return;
  const history = readHistory();
  const next = { ...history };
  next[mode] = [...next[mode], Math.round(ms)].slice(-MAX_HISTORY);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private-mode — silently ignore */
  }
  // Also persist to the shared timings table so every device's
  // progress bar estimates off the same real history. Fire-and-
  // forget — losing one sample never blocks the UI.
  void supabase
    .from('email_build_timings')
    .insert({ mode, duration_ms: Math.round(ms) })
    .then(() => { /* recorded */ });
}

// Median of the last MAX_HISTORY shared timings for this mode. The
// DB is the cross-device source of truth; localStorage stays as the
// zero-latency first paint.
async function fetchSharedEstimate(mode: Mode): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('email_build_timings')
      .select('duration_ms')
      .eq('mode', mode)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY);
    const values = ((data ?? []) as Array<{ duration_ms: number }>)
      .map((r) => r.duration_ms)
      .filter((n) => typeof n === 'number' && isFinite(n) && n > 0);
    return median(values);
  } catch {
    return null;
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function estimateMs(mode: Mode): number {
  const history = readHistory();
  const med = median(history[mode]);
  const fallback = mode === 'iterate' ? DEFAULT_ITERATE_MS : DEFAULT_FRESH_MS;
  const base = med ?? fallback;
  return Math.max(MIN_ESTIMATE_MS, Math.min(MAX_ESTIMATE_MS, base));
}

export function BuildProgress({ mode }: { mode: 'fresh' | 'iterate' }) {
  const steps = mode === 'iterate' ? ITERATE_STEPS : FRESH_STEPS;
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  // Seed the estimate synchronously from localStorage (instant first
  // paint), then refine once from the shared DB history — the
  // cross-device median is the better number, especially on a fresh
  // browser with no local history. The ref means the animation loop
  // picks the refinement up on its next frame without restarting.
  const estimateRef = useRef<number>(estimateMs(mode));
  const startedAtRef = useRef<number>(Date.now());
  useEffect(() => {
    let cancelled = false;
    void fetchSharedEstimate(mode).then((med) => {
      if (cancelled || med == null) return;
      estimateRef.current = Math.max(MIN_ESTIMATE_MS, Math.min(MAX_ESTIMATE_MS, med));
    });
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    const start = startedAtRef.current;
    let raf = 0;
    const tick = () => {
      // Read the ref every frame so the async DB refinement (and the
      // localStorage seed before it) both steer the same animation.
      const estimate = estimateRef.current;
      const elapsed = Date.now() - start;
      // Phase A — 0 → 90% over `estimate` with an ease-out curve so
      // momentum is front-loaded (matches how Claude actually feels:
      // chugs through layout / copy quickly, slows for the polish).
      // Phase B — 90% → 99% over the next 2× the estimate, so the
      // bar keeps creeping if Claude takes longer than usual rather
      // than pinning at a single number.
      let nextPct: number;
      if (elapsed <= estimate) {
        const t = elapsed / estimate;
        const eased = 1 - Math.pow(1 - t, 2.2);
        nextPct = eased * 90;
      } else {
        const tailT = Math.min(1, (elapsed - estimate) / (estimate * 2));
        const tailEased = 1 - Math.pow(1 - tailT, 2.5);
        nextPct = 90 + tailEased * 9; // 90 → 99
      }
      setPct(nextPct);
      const idx = Math.min(steps.length - 1, Math.floor((nextPct / 100) * steps.length));
      setStepIdx(idx);
      // ETA rounds the remaining seconds, clamped at 0 so we never
      // show a negative countdown when Claude runs long. After the
      // estimate elapses we show "almost done" instead of a stale
      // remaining count.
      const remainingMs = estimate - elapsed;
      setSecondsLeft(remainingMs > 1_000 ? Math.round(remainingMs / 1000) : 0);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      // Record the actual elapsed time so the next build estimates
      // off real data. Outliers (aborts, tab-throttled) are filtered
      // inside recordDuration.
      recordDuration(mode, Date.now() - start);
    };
  }, [mode, steps.length]);

  const etaLabel = secondsLeft == null
    ? null
    : secondsLeft > 0
    ? `~${secondsLeft}s left`
    : 'almost done…';

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
      {etaLabel && (
        <p
          className="mt-1.5 text-[10.5px] text-foreground/55 tabular-nums"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {etaLabel}
        </p>
      )}
    </div>
  );
}
