'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Dedicated "Daily logs" surface — one 🪵 falls onto the screen for
// every contact_logs row landed today. Each log lands at a random
// position in the lower portion of the viewport (no piling, no
// clumping) with a brief rotational tumble so the page reads as
// "rain of logs" rather than "static grid of emojis". Hover any
// log to see who made it + which contact it was. Below the rain
// the scoreboard ranks every teammate who logged at least one
// touchpoint today, and a quiet record-callout shows the best
// single-day total in company history (any day before today).

interface LogRow {
  id: string;
  contactedAt: string;
  method: string | null;
  durationSeconds: number | null;
  userId: string | null;
  userName: string;
  userAvatarUrl: string | null;
  contactId: string;
  contactName: string;
  contactCompany: string | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  logs: number;
  durationSeconds: number;
  // True when this row is padding (active teammate who hasn't
  // logged today) so the API can return 5 board slots even when
  // fewer than 5 teammates have logged.
  placeholder?: boolean;
}

interface DailyLogsPayload {
  logs: LogRow[];
  leaderboard: LeaderboardEntry[];
  total: number;
  record: { count: number; date: string } | null;
}

// Deterministic pseudo-random from a string seed. Used to give each
// log a stable random position / rotation / fall delay across
// re-renders — so React reconciliation doesn't reshuffle the rain.
function seeded(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
}

function fmtTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Phoenix',
  });
}

function fmtRecordDate(yyyyMmDd: string): string {
  // Stored as "YYYY-MM-DD" in Phoenix time. Re-parse so we don't
  // accidentally show "yesterday" because of a UTC offset.
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function DailyLogsContent() {
  const { session } = useAuth();
  const [data, setData] = useState<DailyLogsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);

  // Pull payload. Re-runs on focus so a teammate logging from
  // another tab updates the rain after a window-switch.
  const refresh = useMemo(
    () => async () => {
      if (!session?.access_token) return;
      try {
        const r = await fetch('/api/contacts/logs-today', { credentials: 'include' });
        if (!r.ok) {
          setError(`HTTP ${r.status}`);
          return;
        }
        const j = (await r.json()) as DailyLogsPayload;
        setData(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    },
    [session?.access_token],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    function onFocus() {
      refresh();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Animate the counter from 0 → today's total once the payload
  // lands. Faster sub-second cadence: ~30 frames over 900ms so
  // the number races up rather than ticking lazily.
  useEffect(() => {
    if (!data) return;
    setCounter(0);
    if (data.total === 0) return;
    const start = performance.now();
    const duration = 900;
    let rafId = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setCounter(Math.round(eased * data.total));
      if (t < 1) rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [data]);

  // Position every log on a deterministic random grid in the lower
  // half of the viewport. Seeded by log id so React reconciliation
  // can't reshuffle on rerender, and the fall delay is staggered so
  // logs arrive in waves instead of all at once.
  const positioned = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.map((log, idx) => {
      const rng = seeded(log.id);
      // Spread across the full width with a small margin so logs
      // don't clip the edge.
      const leftPct = 4 + rng() * 92;
      // Lower 55% of viewport, but with a generous spread so even
      // 200+ logs don't all stack on the floor.
      const topPct = 32 + rng() * 58;
      // Random tilt at rest (-12° to +12°) — looks like fallen logs.
      const tilt = (rng() - 0.5) * 24;
      // Stagger fall by index so logs land in waves — 35ms per log
      // with a small jitter so no two land at the exact same instant.
      const fallDelay = idx * 35 + Math.floor(rng() * 80);
      // Scale slightly per log for depth — closer logs are larger.
      const scale = 0.78 + rng() * 0.55;
      // Z-index roughly tracks scale so "closer" logs render in
      // front of "further" ones — gives a faux-3D depth cue.
      const z = Math.round(scale * 100);
      return { log, leftPct, topPct, tilt, fallDelay, scale, z };
    });
  }, [data]);

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-warm-bg/40">
      {/* Page header — eyebrow + headline + sub. The headline mirrors
          the home-page styling: serif display face with a copper
          accent on "today" so the surface ties back to the rest of
          the marketing console. */}
      <div className="relative z-30 max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/45">
          Marketing &amp; Admissions
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Daily logs <em className="not-italic text-primary">today</em>
        </h1>
        <p className="mt-2 text-[12.5px] text-foreground/55 max-w-xl mx-auto">
          One <span aria-hidden>🪵</span> for every touchpoint logged today — phone, in-person,
          text, email, new contact, or field fill. Hover any log to see who made it and which contact it was.
        </p>

        <div className="mt-5 flex flex-col items-center">
          <span
            className="text-5xl sm:text-6xl font-bold text-emerald-700 tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
            aria-live="polite"
          >
            {counter}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            Logs so far
          </span>

          {/* Daily record callout — quietly under the total so the
              eye reads "today vs. the record". Hidden when we don't
              have history yet. */}
          {data?.record && (
            <p className="mt-2 text-[11.5px] text-foreground/65">
              <span className="font-semibold text-foreground">Daily record:</span>{' '}
              <span className="tabular-nums">{data.record.count}</span> on{' '}
              <span className="font-medium">{fmtRecordDate(data.record.date)}</span>
              {data && data.total >= data.record.count && data.total > 0 && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px]">
                  Record day!
                </span>
              )}
            </p>
          )}
        </div>

        <Link
          href="/app"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>

        {error && (
          <p className="mt-3 text-[11px] text-rose-700">Couldn&apos;t load logs · {error}</p>
        )}
      </div>

      {/* The rain. Pointer-events: none on the layer so hovering only
          fires on each individual 🪵 (set to pointer-events: auto in
          the .daily-log-pin class below). z-40 puts every log + its
          tooltip ABOVE the scoreboard card (z-30) so a log behind the
          card surface still shows its tooltip when hovered — and so
          every log on the page is reachable, not just the ones outside
          the scoreboard's bounding box. */}
      <div
        aria-hidden={false}
        className="pointer-events-none absolute inset-0 z-40"
        role="list"
        aria-label={`${data?.total ?? 0} daily logs`}
      >
        {positioned.map(({ log, leftPct, topPct, tilt, fallDelay, scale, z }) => (
          <span
            key={log.id}
            role="listitem"
            className="daily-log-pin group absolute select-none"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -120vh)',
              ['--rest-rotate' as string]: `${tilt}deg`,
              ['--rest-scale' as string]: `${scale}`,
              ['--fall-delay' as string]: `${fallDelay}ms`,
              zIndex: z,
              fontFamily: 'var(--font-body)',
            }}
          >
            <span className="daily-log-emoji" aria-label="log emoji">
              🪵
            </span>
            <span className="daily-log-tooltip pointer-events-none">
              <span className="block font-semibold text-white truncate">{log.contactName}</span>
              <span className="block text-white/80">
                by <span className="font-medium text-white">{log.userName}</span>
                {log.method ? ` · ${log.method}` : ''}
              </span>
              <span className="block text-white/60 text-[10px] tabular-nums">
                {fmtTimeOfDay(log.contactedAt)}
                {log.durationSeconds ? ` · ${fmtDuration(log.durationSeconds)}` : ''}
              </span>
            </span>
          </span>
        ))}
      </div>

      {/* Scoreboard — overlay on top of the rain layer. The OUTER
          wrapper is pointer-events-none so logs that fall behind the
          card stay hoverable through it (the card is semi-transparent
          and you can see those logs through the bg-white/65). The
          inner card flips pointer-events back on for itself so its
          content is still selectable / readable. */}
      <div
        className="relative z-30 max-w-2xl mx-auto px-4 sm:px-6 pt-72 sm:pt-80 pb-12 pointer-events-none"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Card stays pointer-events-none so logs behind its
            translucent surface can still be hovered through it. The
            card has no interactive children (no buttons / links / form
            inputs) so losing text selection here is an acceptable
            trade for keeping every log reachable. */}
        <section className="pointer-events-none rounded-2xl border border-black/10 bg-white/65 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
          {(() => {
            const realCount = (data?.leaderboard ?? []).filter((r) => !r.placeholder).length;
            return (
              <header className="px-5 py-4 border-b border-black/5 flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
                    Today&apos;s scoreboard <span className="ml-1 text-emerald-700">· top 5</span>
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    Log leaders
                  </h2>
                </div>
                <span className="text-[10.5px] tabular-nums text-foreground/45">
                  {realCount} {realCount === 1 ? 'teammate' : 'teammates'} logged
                </span>
              </header>
            );
          })()}

          {!data ? (
            <p className="px-5 py-8 text-[12px] italic text-foreground/45 text-center">Loading…</p>
          ) : data.leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-[12.5px] italic text-foreground/45 text-center">
              No logs yet today — be the first to land a 🪵 on the board.
            </p>
          ) : (
            <ol className="divide-y divide-black/5">
              {data.leaderboard.slice(0, 5).map((row, idx) => {
                const medal = !row.placeholder
                  ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null)
                  : null;
                const initials = (row.name || '?')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('') || '?';
                const topShare = data.leaderboard[0]?.logs ?? 1;
                const barPct = row.placeholder ? 0 : Math.max(6, Math.round((row.logs / topShare) * 100));
                return (
                  <li
                    key={row.userId}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${row.placeholder ? 'opacity-55 hover:opacity-75' : 'hover:bg-warm-bg/40'}`}
                  >
                    <span
                      className="shrink-0 w-7 text-center text-[12px] font-bold tabular-nums text-foreground/55"
                      aria-label={`Rank ${idx + 1}`}
                    >
                      {medal ?? `${idx + 1}.`}
                    </span>
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className={`shrink-0 w-8 h-8 rounded-full object-cover border border-white shadow-sm ${row.placeholder ? 'grayscale' : ''}`}
                      />
                    ) : (
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center border border-white shadow-sm">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{row.name}</p>
                      {row.placeholder ? (
                        <p className="mt-0.5 text-[10px] italic text-foreground/45">No logs yet today</p>
                      ) : (
                        <div className="mt-1 h-1.5 bg-warm-bg/70 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-[18px] font-bold tabular-nums leading-none ${row.placeholder ? 'text-foreground/35' : 'text-foreground'}`}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {row.placeholder ? '—' : row.logs}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/45">
                        {row.placeholder ? '' : fmtDuration(row.durationSeconds)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes daily-log-fall {
          0% {
            transform: translate(-50%, -120vh) rotate(0deg) scale(var(--rest-scale));
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          70% {
            transform: translate(-50%, 5%) rotate(calc(var(--rest-rotate) * 0.7)) scale(var(--rest-scale));
            opacity: 1;
          }
          85% {
            transform: translate(-50%, -8%) rotate(calc(var(--rest-rotate) * 0.85)) scale(var(--rest-scale));
          }
          100% {
            transform: translate(-50%, 0) rotate(var(--rest-rotate)) scale(var(--rest-scale));
            opacity: 1;
          }
        }

        :global(.daily-log-pin) {
          pointer-events: auto;
          font-size: clamp(1.6rem, 3.2vw, 2.6rem);
          line-height: 1;
          animation: daily-log-fall 1400ms cubic-bezier(0.34, 1.18, 0.46, 1) both;
          animation-delay: var(--fall-delay);
          will-change: transform, opacity;
          cursor: default;
        }
        :global(.daily-log-pin):hover {
          z-index: 200 !important;
        }
        :global(.daily-log-emoji) {
          display: inline-block;
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
          filter: drop-shadow(0 6px 10px rgba(60, 35, 22, 0.25));
        }
        :global(.daily-log-pin):hover :global(.daily-log-emoji),
        :global(.daily-log-pin):focus-within :global(.daily-log-emoji) {
          transform: scale(1.25) rotate(0deg);
        }

        :global(.daily-log-tooltip) {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          transform: translateX(-50%) translateY(4px);
          background: rgb(28 16 11);
          color: white;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.35;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 160ms ease-out, transform 160ms ease-out;
          box-shadow: 0 14px 32px -16px rgba(0, 0, 0, 0.55);
          max-width: 240px;
          min-width: 140px;
          text-align: center;
        }
        :global(.daily-log-tooltip)::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: rgb(28 16 11);
        }
        :global(.daily-log-pin):hover :global(.daily-log-tooltip),
        :global(.daily-log-pin):focus-within :global(.daily-log-tooltip) {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.daily-log-pin) {
            animation: none !important;
            transform: translate(-50%, 0) rotate(var(--rest-rotate)) scale(var(--rest-scale)) !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
