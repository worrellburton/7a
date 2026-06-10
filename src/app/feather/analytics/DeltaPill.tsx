'use client';

import { fmtDelta, pctChange } from './shared';

interface Props {
  current: number;
  previous: number | null | undefined;
  inverse?: boolean;
}

// Small badge showing % change vs previous period.
// `inverse` flips the color meaning (e.g. bounce rate going down is "good").
export function DeltaPill({ current, previous, inverse = false }: Props) {
  if (previous === null || previous === undefined) {
    return null;
  }
  const delta = pctChange(current, previous);
  const { label, tone } = fmtDelta(delta, inverse);
  const cls =
    tone === 'up'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'down'
      ? 'bg-rose-50 text-rose-700 border-rose-100'
      : 'bg-neutral-50 text-neutral-500 border-neutral-100';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {tone === 'up' ? '▲' : tone === 'down' ? '▼' : '•'} {label}
    </span>
  );
}
