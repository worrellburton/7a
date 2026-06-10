'use client';

// Single-row mobile presentation for the calls list. Anatomy:
//
//   ┌──┬─────┬──────────────────────────────────────┬───────┬──┐
//   │ ▌│ icon│ Caller name                          │ time  │ ›│
//   │  │     │ +1 (555) 555-5555 · 2:00             │       │  │
//   └──┴─────┴──────────────────────────────────────┴───────┴──┘
//
// Tap the row → opens the expanded detail view. Per-row actions
// (play recording / select) live in the meatball menu on the right.

import { useEffect, useRef, useState } from 'react';
import {
  Call,
  formatDate,
  formatDuration,
  formatRelativeTime,
  formatTime,
  isMissedCall,
  isPaidSource,
  parseDate,
} from './_shared';

export interface CallMobileRowProps {
  call: Call;
  expanded: boolean;
  selected: boolean;
  isSpam: boolean;
  playingAudio: string | null;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onPlay: (audioUrl: string) => void;
}

// Single accent color per row. Spam wins (it's the loudest signal),
// then missed, then a neutral default. Without AI scoring we don't
// have a fit-tier accent any more.
function statusAccent(args: {
  isSpam: boolean;
  isMissed: boolean;
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
  return { bar: 'bg-gray-200', rowBg: 'bg-white', tag: null };
}

export function CallMobileRow(props: CallMobileRowProps) {
  const {
    call,
    expanded,
    selected,
    isSpam,
    playingAudio,
    onToggleExpand,
    onPlay,
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
  const accent = statusAccent({ isSpam, isMissed });

  const callerNumber = call.caller_number_formatted || call.caller_number || 'Unknown';
  const headlineTop = callerNumber;
  const direction = (call.direction || '').toLowerCase();
  const isInbound = direction === 'inbound';
  const isOutbound = direction === 'outbound';

  // CTM's primary timestamp is `called_at`, but a small slice of the
  // synced rows show up with that field nulled or in a format the
  // parser bails on (especially on iOS Safari). Walk a list of
  // plausible siblings and pick the first one parseDate can actually
  // read — *not* the first non-empty one, because a placeholder
  // string like "0000-00-00 00:00:00" would short-circuit otherwise.
  const looseCall = call as unknown as Record<string, unknown>;
  const candidates = [
    call.called_at,
    looseCall.local_called_at,
    looseCall.start_time,
    looseCall.local_start_time,
    looseCall.created_at,
    looseCall.created,
  ];
  let timestamp = '';
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const stringified = typeof c === 'number' ? String(c) : String(c);
    if (parseDate(stringified)) {
      timestamp = stringified;
      break;
    }
  }
  const relTime = formatRelativeTime(timestamp);
  const absTime = formatTime(timestamp);
  const dateLabel = formatDate(timestamp);
  const timeLabel = absTime;
  const duration = call.duration != null ? formatDuration(call.duration) : null;
  const [linkCopied, setLinkCopied] = useState(false);
  const callPageUrl = `/feather/calls/${encodeURIComponent(String(call.id))}`;
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${callPageUrl}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      /* clipboard blocked — leave feedback off */
    }
  };

  return (
    <div
      className={`group/row ${accent.rowBg} transition-colors active:bg-warm-bg/40 ${
        selected ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-stretch min-h-[52px]">
        <div className={`w-1 shrink-0 ${accent.bar}`} aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 flex items-start gap-3 pl-3 pr-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-xl"
        >
          {/* Left chip: spam / missed icon, or a direction arrow. */}
          <span
            className={`shrink-0 relative inline-flex items-center justify-center rounded-xl w-8 h-8 ${
              isSpam
                ? 'bg-amber-50 text-amber-700'
                : isMissed
                ? 'bg-rose-50 text-rose-600'
                : isInbound
                ? 'bg-emerald-50 text-emerald-600'
                : isOutbound
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-foreground/40'
            }`}
            aria-label={
              isSpam ? 'Spam' : isMissed ? 'Missed call' : isInbound ? 'Inbound' : isOutbound ? 'Outbound' : 'Call'
            }
          >
            {isSpam ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            ) : isMissed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.88.7 2.78a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.83.57 2.78.7A2 2 0 0 1 22 16.92Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 16 8m0-6 6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
                {isInbound ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5m0 14h14M5 19l14-14" />
                ) : isOutbound ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 5v14m0-14H5m14 0L5 19" />
                ) : (
                  <circle cx="12" cy="12" r="2" />
                )}
              </svg>
            )}
          </span>

          {/* Identity stack — phone number + duration line. */}
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
            </div>
            <p
              className="text-[12px] text-foreground/55 mt-0.5 truncate"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {call.tracking_label || call.source_name || 'Call'}
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

          {/* Date + time + chevron stack. Date sits on top in the
              same heavier weight as the headline so a teammate can
              place the call from a thumb-scroll without expanding the
              row; relative time + clock time go underneath. When the
              underlying timestamp can't be parsed (CTM bug + every
              fallback field empty), we collapse to a single muted
              "no date" line so the row doesn't scream em-dashes. */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-right">
              {/* Date / time stack — matches the desktop DATE / TIME
                  column so the field reads at the same prominence on
                  both surfaces. Date sits on top in foreground weight
                  with the year always rendered (no abbreviated "May 11"
                  on mobile); clock time underneath. The relative-time
                  string lives in the tooltip so the visual stays
                  compact. */}
              {dateLabel !== '—' || timeLabel !== '—' ? (
                <>
                  <p
                    className="text-[12.5px] font-semibold text-foreground tabular-nums whitespace-nowrap leading-tight"
                    title={relTime || absTime}
                  >
                    {dateLabel}
                  </p>
                  <p className="text-[11px] text-foreground/55 tabular-nums whitespace-nowrap leading-tight mt-0.5">
                    {timeLabel}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-foreground/35 italic whitespace-nowrap">No date</p>
              )}
              <p className="text-[10px] text-foreground/35 tabular-nums mt-0.5">
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

        {/* Per-row actions — meatball menu with Play. */}
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
              {call.audio ? (
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
              ) : (
                <p className="px-3 py-2.5 text-sm text-foreground/40">No recording</p>
              )}
              <div className="my-1 border-t border-gray-100" aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  await copyShareLink();
                  setActionsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-warm-bg/40 active:bg-warm-bg/60"
              >
                {linkCopied ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-foreground/55" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 11-5.656-5.656l1.101-1.101m11.314-11.314l1.101-1.101a4 4 0 115.656 5.656l-4 4a4 4 0 01-5.656 0M10 14L14 10" />
                  </svg>
                )}
                <span>{linkCopied ? 'Link copied' : 'Copy share link'}</span>
              </button>
              <a
                role="menuitem"
                href={callPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActionsOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-warm-bg/40 active:bg-warm-bg/60"
              >
                <svg className="w-4 h-4 text-foreground/55" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Open call page</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton row used while we're loading the first page of calls.
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
