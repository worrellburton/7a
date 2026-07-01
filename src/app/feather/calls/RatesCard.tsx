'use client';

import { useState } from 'react';

// Collapsible "Rates" reference card for the Calls page. Mirrors the
// OperatorCheatSheet pattern: a single glass row that drops down the full
// Seven Arrows pay structure when pressed, so admissions can keep pricing a
// click away while on a call without it crowding the live log. Starts
// collapsed. Source: "Seven Arrows Recovery Pay Structure — July 1, 2026".

const EFFECTIVE = 'July 1, 2026';

interface MonthRow { label: string; price: number; off: string | null }
interface TierTotal { label: string; price: number }
interface Tier {
  key: string;
  name: string;
  tag: string;
  // Tailwind tone classes for the tier's accent.
  head: string;   // header text
  chip: string;   // discount pill
  rule: string;   // top accent rule
  months: MonthRow[];
  totals: TierTotal[];
}

const TIERS: Tier[] = [
  {
    key: 'cash',
    name: 'Cash Pay',
    tag: 'Standard rate',
    head: 'text-primary',
    chip: 'bg-primary/10 text-primary border-primary/20',
    rule: 'from-primary/70',
    months: [
      { label: 'First 30 days', price: 38000, off: null },
      { label: 'Second 30 days', price: 35000, off: '7.9% off' },
      { label: 'Third 30 days', price: 33000, off: '13.2% off' },
    ],
    totals: [
      { label: '30-day', price: 38000 },
      { label: '60-day', price: 73000 },
      { label: '90-day', price: 106000 },
    ],
  },
  {
    key: 'vet',
    name: 'Veteran',
    tag: 'Veteran cost',
    head: 'text-sky-700',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    rule: 'from-sky-500/70',
    months: [
      { label: 'First 30 days', price: 35000, off: '7.9% off' },
      { label: 'Second 30 days', price: 33000, off: '13.2% off' },
      { label: 'Third 30 days', price: 31000, off: '18.4% off' },
    ],
    totals: [
      { label: '30-day', price: 35000 },
      { label: '60-day', price: 68000 },
      { label: '90-day', price: 99000 },
    ],
  },
  {
    key: 'tribal',
    name: 'Tribal',
    tag: 'Tribal cost',
    head: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rule: 'from-emerald-500/70',
    months: [
      { label: 'First 30 days', price: 20000, off: '47.4% off' },
      { label: 'Second 30 days', price: 18000, off: '52.6% off' },
      { label: 'Third 30 days', price: 18000, off: '52.6% off' },
    ],
    totals: [
      { label: '30-day', price: 20000 },
      { label: '60-day', price: 38000 },
      { label: '90-day', price: 56000 },
    ],
  },
];

// Deposit / payment schedule (the second table in the source sheet).
const SCHEDULE: { due: string; amount: number; covers: string }[] = [
  { due: 'Deposit', amount: 19000, covers: 'Days 1–14' },
  { due: 'Day 15', amount: 19000, covers: 'Days 15–30' },
  { due: 'Day 30', amount: 17500, covers: 'Days 31–45' },
  { due: 'Day 45', amount: 17500, covers: 'Days 46–60' },
  { due: 'Day 60', amount: 16500, covers: 'Days 60–74' },
  { due: 'Day 75', amount: 16500, covers: 'Days 75–90' },
];

const NOTES: string[] = [
  'For cash-paying clients always try to get $38,000/month — only drop to the discounted structure above if they ask.',
  'Collect 50% of the first 30 days up front to reserve the bed.',
  'Depending on length of stay, payments are accepted on day 15, 30, 45, 60, and 75.',
];

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt = (n: number) => usd0.format(n);

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div className="relative rounded-2xl border border-black/10 bg-white/70 overflow-hidden">
      <div aria-hidden className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tier.rule} to-transparent`} />
      <div className="px-4 pt-3.5 pb-3">
        <p className={`text-[13px] font-bold ${tier.head}`} style={{ fontFamily: 'var(--font-display)' }}>{tier.name}</p>
        <p className="text-[10px] uppercase tracking-wider text-foreground/40">{tier.tag}</p>
      </div>
      <div className="divide-y divide-black/5 border-t border-black/5">
        {tier.months.map((m) => (
          <div key={m.label} className="flex items-center justify-between gap-2 px-4 py-2">
            <span className="text-[12px] text-foreground/70">{m.label}</span>
            <span className="flex items-center gap-2">
              {m.off && (
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold ${tier.chip}`}>{m.off}</span>
              )}
              <span className="text-[13.5px] font-bold tabular-nums text-foreground">{fmt(m.price)}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t border-black/10 bg-warm-bg/40 text-center">
        {tier.totals.map((t) => (
          <div key={t.label} className="px-2 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground/40">{t.label}</p>
            <p className="mt-0.5 text-[12.5px] font-bold tabular-nums text-foreground">{fmt(t.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RatesCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative rounded-3xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      {/* The "row" — press to drop the rate sheet down. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 sm:px-7 py-4 text-left hover:bg-white/30 transition-colors"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[15px] font-bold text-primary ring-2 ring-white shadow-sm">
          $
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Rates</p>
          <p className="text-[11px] text-foreground/50">Pay structure · Cash / Veteran / Tribal · effective {EFFECTIVE}</p>
        </div>
        <svg
          className={`w-4 h-4 text-foreground/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 sm:px-7 pb-6 pt-1">
          {/* Tiers */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-foreground/10 pt-4">
            {TIERS.map((t) => <TierCard key={t.key} tier={t} />)}
          </div>

          {/* Payment schedule */}
          <div className="mt-6 border-t border-foreground/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Payment schedule</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SCHEDULE.map((s) => (
                <div key={s.due} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-foreground">{s.due}</span>
                    <span className="block text-[10.5px] text-foreground/45">{s.covers}</span>
                  </span>
                  <span className="shrink-0 text-[14px] font-bold tabular-nums text-foreground">{fmt(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 border-t border-foreground/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Notes</p>
            <ul className="mt-2 space-y-1.5">
              {NOTES.map((n) => (
                <li key={n} className="flex items-start gap-2 text-[12.5px] leading-snug text-foreground/70">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
