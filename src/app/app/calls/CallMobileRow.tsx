'use client';

// Single-row mobile presentation for the calls list.
//
// The previous mobile card crammed call name, phone, direction
// badge, fit chip, voicemail badge, "1st" badge, spam badge, missed
// badge, operator name, client type, three action buttons, and the
// call ID into one tile. On a 390-wide iPhone screen that meant
// every row wrapped to four lines and the date/time string broke
// down to "— · — · 2:00" when the parser hiccuped on the timestamp.
//
// This component restores a scannable single row. Anatomy from left
// to right:
//
//   ┌──┬─────┬──────────────────────────────────────┬───────┬──┐
//   │ ▌│ icon│ Caller name                          │ time  │ ›│
//   │  │     │ +1 (555) 555-5555 · 2:00             │       │  │
//   └──┴─────┴──────────────────────────────────────┴───────┴──┘
//
//   ▌  Status accent edge (color = fit / missed / spam tier)
//   ◯  Direction icon (incoming arrow / outgoing arrow / missed)
//   …  Identity stack (name + secondary line)
//   ◷  Relative time
//   ›  Chevron (taps reveal action sheet w/ play / transcript)
//
// Tap anywhere on the row → opens the call detail (existing
// expanded view). Long-press / chevron tap → action sheet for
// per-row commands. This decouples the "view this call" path from
// the "do something with this call" path so each one gets a real
// 44x44 tap target instead of three crammed-together 32px circles.

import { useEffect, useRef, useState } from 'react';
import {
  Call,
  ScoreRow,
  formatDuration,
  formatRelativeTime,
  formatTime,
  isMissedCall,
  isPaidSource,
} from './_shared';

export interface CallMobileRowProps {
  call: Call;
  score: ScoreRow | null | undefined;
  expanded: boolean;
  selected: boolean;
  scoring: boolean;
  isSpam: boolean;
  playingAudio: string | null;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onPlay: (audioUrl: string) => void;
  onOpenTranscript: () => void;
  onRescore: () => void;
}

function fitTier(fit: number | null | undefined): 'great' | 'good' | 'ok' | 'poor' | 'unknown' {
  if (fit == null) return 'unknown';
  if (fit >= 75) return 'great';
  if (fit >= 50) return 'good';
  if (fit >= 25) return 'ok';
  return 'poor';
}

// Single accent color per row, derived from the most important
// status the row can carry. Spam wins (it's the loudest signal),
// then missed, then the fit tier, then "no analysis yet".
function statusAccent(args: {
  isSpam: boolean;
  isMissed: boolean;
  fit: number | null | undefined;
}): { bar: string; rowBg: string; tag: { label: string; cls: string } | null } {
  if (args.isSpam) {
    return {
      bar: 'bg-amber-400',
      rowBg: 'bg-amber-50/60',
      tag: { label: 'Spam', cls: 'bg-amber-100 text-amber-800' },
    };
  }
  if (args.isMissed) {
    return {
      bar: 'bg-red-400',
      rowBg: 'bg-rose-50/45',
      tag: { label: 'Missed', cls: 'bg-rose-100 text-rose-800' },
    };
  }
  switch (fitTier(args.fit)) {
    case 'great':
      return { bar: 'bg-emerald-500', rowBg: 'bg-white', tag: null };
    case 'good':
      return { bar: 'bg-blue-500', rowBg: 'bg-white', tag: null };
    case 'ok':
      return { bar: 'bg-amber-500', rowBg: 'bg-white', tag: null };
    case 'poor':
      return { bar: 'bg-red-400', rowBg: 'bg-white', tag: null };
    default:
      return { bar: 'bg-gray-200', rowBg: 'bg-white', tag: null };
  }
}

export function CallMobileRow(props: CallMobileRowProps) {
  const {
    call,
    score,
    expanded,
    selected,
    scoring,
    isSpam,
    playingAudio,
    onToggleExpand,
    onToggleSelect,
    onPlay,
    onOpenTranscript,
    onRescore,
  } = props;
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsHostRef = useRef<HTMLDivElement | null>(null);

  // Close the actions popover on outside taps + Escape so the row
  // never gets stuck with a stale menu open after the user
  // refocuses elsewhere.
  useEffect(() => {
    if (!actionsOpen) return;
    const onPointer = (e: PointerEvent) => {
      const host = actionsHostRef.current;
      if (host && e.target instanceof Node && host.contains(e.target)) return;
      setActionsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActionsOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [actionsOpen]);

  const isMissed = isMissedCall(call);
  const accent = statusAccent({ isSpam, isMissed, fit: score?.fit_score ?? null });

  const callerName = score?.caller_name?.trim();
  const callerNumber = call.caller_number_formatted || call.caller_number || 'Unknown';
  const headlineTop = callerName || callerNumber;
  const headlineSub = callerName ? callerNumber : (score?.call_name ?? null);
  const direction = (call.direction || '').toLowerCase();
  const isInbound = direction === 'inbound';
  const isOutbound = direction === 'outbound';

  // Time line never falls back to "—" anymore. Relative time is the
  // primary read; the absolute time is hover-only via title for
  // teammates who want the exact stamp.
  const relTime = formatRelativeTime(call.called_at);
  const absTime = `${formatTime(call.called_at)}`;
  const duration = call.duration != null ? formatDuration(call.duration) : null;

  return (
    <div
      className={`group/row ${accent.rowBg} transition-colors active:bg-warm-bg/40 ${
        selected ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-stretch min-h-[64px]">
        {/* Status accent edge — colored stripe spanning the full row
            height, motion-reduce friendly because it's pure layout. */}
        <div className={`w-1 shrink-0 ${accent.bar}`} aria-hidden="true" />

        {/* Tappable body — opens / closes the expanded view.
            Selection checkbox is intentionally absent on mobile;
            it lives on the desktop table where multi-select is
            actually useful. Long-press / future swipe-action could
            re-introduce it without giving up the row width. */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-xl"
        >
          {/* Direction / status icon — replaces the old red square
              fit-score chip. Square shrinks to 38x38 to give the
              identity column more horizontal room. */}
          <span
            className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${
              isSpam
                ? 'bg-amber-50 text-amber-700'
                : isMissed
                ? 'bg-rose-50 text-rose-600'
                : isInbound
                ? 'bg-emerald-50 text-emerald-600'
                : isOutbound
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-50 text-foreground/40'
            }`}
            aria-hidden="true"
          >
            {isSpam ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            ) : isMissed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.88.7 2.78a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.83.57 2.78.7A2 2 0 0 1 22 16.92Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 16 8m0-6 6 6" />
              </svg>
            ) : isInbound ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5m0 14h14M5 19l14-14" />
              </svg>
            ) : isOutbound ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 5v14m0-14H5m14 0L5 19" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.88.7 2.78a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.83.57 2.78.7A2 2 0 0 1 22 16.92Z" />
              </svg>
            )}
          </span>

          {/* Identity stack — caller name dominates if known, else
              the phone number itself reads as the headline. The
              second line carries number + duration so the row stays
              one-glance scannable. */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold text-foreground leading-tight truncate">
                {headlineTop}
              </p>
              {accent.tag && (
                <span className={`shrink-0 px-1.5 py-px rounded-full text-[10px] font-semibold ${accent.tag.cls}`}>
                  {accent.tag.label}
                </span>
              )}
              {call.voicemail && !isSpam && (
                <span className="shrink-0 px-1.5 py-px rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                  VM
                </span>
              )}
              {score?.fit_score != null && !isSpam && !isMissed && (
                <span
                  className={`shrink-0 inline-flex items-center justify-center min-w-[1.6rem] px-1 rounded-md text-[10px] font-bold tabular-nums ${
                    score.fit_score >= 75
                      ? 'bg-emerald-50 text-emerald-700'
                      : score.fit_score >= 50
                      ? 'bg-blue-50 text-blue-700'
                      : score.fit_score >= 25
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                  title={`Fit score ${score.fit_score}/100`}
                >
                  {score.fit_score}
                </span>
              )}
            </div>
            <p
              className="text-[12px] text-foreground/55 mt-0.5 truncate"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {headlineSub ?? callerNumber}
              {duration && (
                <>
                  <span className="mx-1.5 text-foreground/30">·</span>
                  <span className="tabular-nums">{duration}</span>
                </>
              )}
              {isPaidSource(call.source) && (
                <>
                  <span className="mx-1.5 text-foreground/30">·</span>
                  <span className="text-foreground/45">Paid</span>
                </>
              )}
            </p>
          </div>

          {/* Time + chevron stack — time always renders even if the
              parse failed for some rows (relTime falls back to ''
              and the chevron still anchors). */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-right">
              <p
                className="text-[11px] font-semibold text-foreground/65 tabular-nums whitespace-nowrap"
                title={absTime}
              >
                {relTime || absTime || ''}
              </p>
              {/* Reserve the second line so rows stay the same height
                  whether or not we render a tag below. */}
              <p className="text-[10px] text-foreground/35 tabular-nums">
                #{call.id}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-foreground/30 transition-transform ${
                expanded ? 'rotate-180' : ''
              } motion-reduce:transition-none`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Per-row actions — one button that opens a tiny popover
            with Play / Transcript / Re-analyze. Keeps the row free
            of three competing icons and gives every action a real
            44x44 tap target. */}
        <div ref={actionsHostRef} className="shrink-0 flex items-center pr-2 relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setActionsOpen((v) => !v)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-foreground/55 active:bg-warm-bg/50"
            aria-label={`More actions for call ${call.id}`}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {actionsOpen && (
            <div
              role="menu"
              className="absolute right-2 top-full mt-1 z-30 w-44 rounded-xl border border-black/5 bg-white shadow-xl py-1 animate-sheet-slide motion-reduce:animate-none"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {call.audio && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsOpen(false);
                    onPlay(call.audio);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-warm-bg/40 active:bg-warm-bg/60"
                >
                  {playingAudio === call.audio ? (
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  <span>{playingAudio === call.audio ? 'Stop' : 'Play recording'}</span>
                </button>
              )}
              {score?.transcript && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsOpen(false);
                    onOpenTranscript();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-warm-bg/40 active:bg-warm-bg/60"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <span>View transcript</span>
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={scoring}
                onClick={() => {
                  setActionsOpen(false);
                  onRescore();
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-warm-bg/40 active:bg-warm-bg/60 disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 text-foreground/55 ${scoring ? 'animate-spin motion-reduce:animate-none' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>{score?.scored_at ? 'Re-analyze' : 'Analyze'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton row used while we're loading the first page of calls.
// Mirrors the real row's vertical rhythm so swapping in real data
// doesn't reflow the list.
export function CallMobileRowSkeleton() {
  return (
    <div className="bg-white animate-pulse motion-reduce:animate-none">
      <div className="flex items-stretch min-h-[64px]">
        <div className="w-1 shrink-0 bg-gray-100" aria-hidden="true" />
        <div className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 py-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-gray-100" />
            <div className="h-2.5 w-44 rounded bg-gray-100" />
          </div>
          <div className="shrink-0 space-y-2">
            <div className="h-2.5 w-12 rounded bg-gray-100 ml-auto" />
            <div className="h-2 w-10 rounded bg-gray-100 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
