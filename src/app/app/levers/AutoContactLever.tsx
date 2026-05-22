'use client';

import { useState } from 'react';
import Lever from './Lever';

// Auto-contact lever — pulls one new outreach contact via the
// shared AI-suggest machinery (the same backend the hourly Bobby
// cron uses). Provider can be forced to Claude or Gemini, or left
// on 'auto' to follow the cron's hour-parity alternation.
//
// Each pull goes through /api/levers/auto-contact/pull, which is
// super-admin gated, dedupes against the existing roster
// server-side, and inserts the picked contact attributed to the
// puller. The lever's "last result" card shows what landed (or
// why nothing did).

type Provider = 'auto' | 'claude' | 'gemini';

interface PullResult {
  inserted: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null;
  provider: 'claude' | 'gemini';
  reason?: 'inserted' | 'no_candidate' | 'all_duplicates' | 'provider_error';
  error?: string;
  candidatesConsidered: number;
}

export default function AutoContactLever() {
  const [pulling, setPulling] = useState(false);
  const [provider, setProvider] = useState<Provider>('auto');
  const [steer, setSteer] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [lastResult, setLastResult] = useState<{ at: string; result: PullResult } | null>(null);

  const pull = async () => {
    if (pulling) return;
    setPulling(true);
    try {
      const res = await fetch('/api/levers/auto-contact/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, steer: steer.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as PullResult & { error?: string };
      if (!res.ok) {
        setLastResult({
          at: new Date().toISOString(),
          result: {
            inserted: null,
            provider: provider === 'gemini' ? 'gemini' : 'claude',
            reason: 'provider_error',
            error: json?.error ?? `HTTP ${res.status}`,
            candidatesConsidered: 0,
          },
        });
        return;
      }
      setLastResult({ at: new Date().toISOString(), result: json });
    } catch (e) {
      setLastResult({
        at: new Date().toISOString(),
        result: {
          inserted: null,
          provider: provider === 'gemini' ? 'gemini' : 'claude',
          reason: 'provider_error',
          error: e instanceof Error ? e.message : String(e),
          candidatesConsidered: 0,
        },
      });
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Lever
        name="✨ Auto-contact"
        count={0}
        pulling={pulling}
        disabled={false}
        onPull={() => void pull()}
        hint={provider === 'auto' ? 'alternates · Claude / Gemini' : provider === 'gemini' ? 'Gemini Pro' : 'Claude'}
        tone="amber"
      />

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className={`px-2 py-1 rounded transition-colors ${showOptions ? 'bg-white/10 text-white' : 'hover:text-white/85'}`}
        >
          {showOptions ? 'Hide options' : 'Options'}
        </button>
      </div>

      {showOptions && (
        <div className="mt-3 w-full max-w-md rounded-lg border border-white/10 bg-black/30 backdrop-blur px-4 py-3 space-y-3">
          {/* Provider picker — 'auto' mirrors the hourly cron parity
              so a manual pull doesn't break the alternation rhythm
              for the day. */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 mb-1.5">Model</p>
            <div className="inline-flex items-center gap-1 rounded-md bg-white/5 p-1">
              {([
                ['auto', 'Auto'],
                ['claude', 'Claude'],
                ['gemini', 'Gemini Pro'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProvider(key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    provider === key ? 'bg-white text-stone-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-white/45">
              Auto follows the cron&apos;s hour parity (even = Claude, odd = Gemini).
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 mb-1.5">
              Extra steer <span className="font-normal text-white/35">(optional)</span>
            </p>
            <input
              type="text"
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              placeholder="e.g. Tucson PHP intake directors"
              className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
        </div>
      )}

      {lastResult && (() => {
        const r = lastResult.result;
        const ok = r.reason === 'inserted' && r.inserted;
        const tone = ok
          ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100'
          : r.reason === 'all_duplicates'
            ? 'border-amber-400/40 bg-amber-950/40 text-amber-100'
            : 'border-rose-400/40 bg-rose-950/40 text-rose-100';
        return (
          <div className={`mt-4 w-full max-w-md rounded-lg border ${tone} px-4 py-3`}>
            <p className="text-sm font-semibold">
              {ok
                ? `✓ Added ${r.inserted!.name}`
                : r.reason === 'all_duplicates'
                  ? '⚠ All candidates were duplicates'
                  : r.reason === 'no_candidate'
                    ? '⚠ No usable candidate'
                    : '✗ Pull failed'}
              <span className="ml-2 font-normal text-white/55 text-xs">
                {new Date(lastResult.at).toLocaleTimeString()} · {r.provider === 'gemini' ? 'Gemini Pro' : 'Claude'}
              </span>
            </p>
            {ok && r.inserted && (
              <div className="mt-1 text-[12px] text-white/85 space-y-0.5">
                {r.inserted.company && <p>{r.inserted.company}</p>}
                {r.inserted.email && <p className="font-mono text-[11.5px]">{r.inserted.email}</p>}
                {r.inserted.phone && <p className="font-mono text-[11.5px]">{r.inserted.phone}</p>}
              </div>
            )}
            {!ok && r.error && (
              <p className="mt-1 text-[11.5px] text-white/80 break-all">{r.error.slice(0, 320)}</p>
            )}
            {!ok && !r.error && (
              <p className="mt-1 text-[11.5px] text-white/65">
                Considered {r.candidatesConsidered} candidate{r.candidatesConsidered === 1 ? '' : 's'} — none survived dedup or contact-info checks. Try again or change the steer.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
