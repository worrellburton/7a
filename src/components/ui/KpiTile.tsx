'use client';

import React from 'react';

// Small card with an uppercase eyebrow + a big number. Used across
// the marketing surfaces (email-campaigns recipients, scheduled,
// daily-logs, outreach insights). Promoted into the shared
// primitive set so the same affordance reads consistently.
//
// The tile renders its value with tabular-nums so adjacent KPIs
// line up vertically in a grid row. Long values truncate so the
// KPI strip survives narrow viewports.

export interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  /** Optional secondary line under the value (e.g. "/ 195"). */
  sub?: React.ReactNode;
  /** Tone hint — colors the big value. Default is foreground. */
  tone?: 'default' | 'warn' | 'good' | 'danger';
  className?: string;
}

const TONE_CLASS: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: 'text-foreground',
  warn: 'text-amber-700',
  good: 'text-emerald-700',
  danger: 'text-rose-700',
};

export function KpiTile({ label, value, sub, tone = 'default', className }: KpiTileProps) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white px-3 py-2.5 ${className ?? ''}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p
        className={`mt-0.5 text-xl font-semibold tabular-nums truncate ${TONE_CLASS[tone]}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {sub != null ? (
        <p className="mt-0.5 text-[10.5px] text-foreground/45 truncate">{sub}</p>
      ) : null}
    </div>
  );
}
