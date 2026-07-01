'use client';

import { useAuth } from '@/lib/AuthProvider';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import FloatingScrollbar from '@/components/FloatingScrollbar';
import { supabase } from '@/lib/supabase';
import { OperatorSchedule } from './OperatorSchedule';
import { OperatorCheatSheet } from './OperatorCheatSheet';
import { RatesCard } from './RatesCard';
import { CallsHeatmap } from './CallsHeatmap';
import MessagesPanel from './MessagesPanel';
import {
  type AircallCallRow,
  PHOENIX_TZ,
  directionStyle,
  formatDuration,
  formatPhone,
  formatRelativeTime,
  formatWait,
  initials,
  sourceChipClass,
} from './_shared';
import { callerLocation } from './area-codes';

const PER_PAGE = 50;

type RangePreset = 'today' | '7d' | '30d' | 'all';
type DirectionFilter = 'all' | 'inbound' | 'outbound';

interface AgentUser { email: string; avatar_url: string | null; full_name: string | null; }

// Phoenix is UTC-7 year-round (no DST), so local midnight is 07:00 UTC.
function phoenixMidnightUtc(daysAgo = 0): Date {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo, 7, 0, 0, 0));
}

function rangeFrom(preset: RangePreset): string | undefined {
  switch (preset) {
    case 'today': return phoenixMidnightUtc(0).toISOString();
    case '7d': return phoenixMidnightUtc(6).toISOString();
    case '30d': return phoenixMidnightUtc(29).toISOString();
    case 'all': return undefined;
  }
}

// Human label for the active range — shown on the heatmap so it's clear the
// chart is scoped to the same Today / 7-day / 30-day / All filter as the list.
function rangeLabel(preset: RangePreset): string {
  switch (preset) {
    case 'today': return 'Today';
    case '7d': return 'Last 7 days';
    case '30d': return 'Last 30 days';
    case 'all': return 'All time';
  }
}

// Phoenix-local day key + a friendly label (Today / Yesterday / Mon, Jun 16)
// for the per-day group dividers.
function callDayKey(iso: string | null): string {
  if (!iso) return 'unknown';
  try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ }); } catch { return 'unknown'; }
}
function callDayLabel(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const dk = callDayKey(iso);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  if (dk === today) return 'Today';
  if (dk === yesterday) return 'Yesterday';
  try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: PHOENIX_TZ }); } catch { return dk; }
}

// A call is "live" while it hasn't ended and Aircall still reports it as
// ringing (initial) or connected (answered). These get pinned to a
// pulsing "Live now" strip above the table.
//
// Guard against stuck calls: a missed `call.hangup` webhook can leave a
// real call with ended_at = null forever, and the incremental backfill
// (watermarked on started_at) never revisits it — so it would otherwise
// show a "live" timer counting up for hours. Cap the live state by age:
// a call ringing longer than 15 min, or connected longer than 3 h, is
// treated as stale (its end event was lost) and falls back into the
// regular list instead of a runaway Live-now timer.
const LIVE_RINGING_MAX_MS = 15 * 60 * 1000;        // 15 minutes
const LIVE_CONNECTED_MAX_MS = 3 * 60 * 60 * 1000;  // 3 hours
function isLiveCall(c: AircallCallRow, now: number = Date.now()): boolean {
  if (c.ended_at) return false;
  if (c.status !== 'initial' && c.status !== 'answered') return false;
  const since = c.answered_at ?? c.started_at;
  if (!since) return false;
  const started = Date.parse(since);
  if (!Number.isFinite(started)) return false;
  const age = now - started;
  const cap = c.answered_at ? LIVE_CONNECTED_MAX_MS : LIVE_RINGING_MAX_MS;
  return age >= 0 && age <= cap;
}

// Running clock for live calls — m:ss, rolling to h:mm:ss past an hour.
function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// Compact status (color dot + label) for a call — shared by the mobile
// rows and the repeat-caller context popover.
function callStatusMeta(c: AircallCallRow): { dot: string; label: string } {
  if (c.voicemail) return { dot: 'bg-violet-500', label: 'Voicemail' };
  if (c.missed) return { dot: 'bg-rose-500', label: 'Missed' };
  if (c.direction === 'inbound') return { dot: 'bg-emerald-500', label: 'Inbound' };
  return { dot: 'bg-blue-500', label: c.direction === 'outbound' ? 'Outbound' : 'Call' };
}

// Curated "how did you hear about us?" options for the Source dropdown.
// Any existing AI-detected / custom value that isn't in this list is
// added as its own option so it stays selectable instead of vanishing.
const SOURCE_OPTIONS = [
  'Google',
  'Web search',
  'Psychology Today',
  'Insurance directory',
  'Referral',
  'Doctor / Professional',
  'Friend / Family',
  'Alumni',
  'Returning client',
  'Facebook',
  'Instagram',
  'SAMHSA',
  'Billboard / Ad',
  'Other',
];

// Source column header. The pulsing dot signals that source detection is
// live (Claude reads each transcript); hovering reveals the rules.
function SourceHeader() {
  return (
    <span className="group relative inline-flex items-center gap-1.5 cursor-help">
      Source
      <span className="relative inline-flex items-center" aria-hidden>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="ml-1 text-[9px] font-bold tracking-wider text-emerald-600">AUTO</span>
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-72 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[11px] font-normal normal-case tracking-normal leading-snug text-foreground/70 shadow-xl group-hover:block">
        <span className="block font-semibold text-foreground mb-1">Auto-detected source</span>
        After each call, Claude reads the transcript and — if the operator asked <em>&ldquo;how did you hear about us?&rdquo;</em> — records the caller&rsquo;s answer here. It&rsquo;s left blank when the question isn&rsquo;t asked. Admins can override it from the dropdown, which applies to every call from that number.
      </span>
    </span>
  );
}

// Source column cell. Shows the resolved "how did you hear about us?"
// source — the per-number admin override if set, else the per-call
// AI-detected value. Admins open a custom dropdown (most-used sources on
// top, plus an "add new source" field) to set the per-number override.
function SourceCell({
  number, aiSource, override, canEdit, token, onSaved, options, counts,
}: {
  number: string;
  aiSource: string | null;
  override: string | undefined;
  canEdit: boolean;
  token: string | null;
  onSaved: (number: string, value: string) => void;
  /** All known sources, already ordered most-used first. */
  options: string[];
  counts: Record<string, number>;
}) {
  const resolved = (override ?? (aiSource || '')).trim();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const chip = resolved
    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${sourceChipClass(resolved)}`}>{resolved}</span>
    : null;

  if (!number || !canEdit) {
    return chip ?? <span className="text-foreground/30">—</span>;
  }

  // Current value always appears (so a custom AI value stays selectable).
  const list = resolved && !options.includes(resolved) ? [resolved, ...options] : options;

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: Math.min(r.left, window.innerWidth - 240), top: r.bottom + 4 });
    setCustom('');
    setOpen(true);
  };

  const save = async (next: string) => {
    setOpen(false);
    try {
      const res = await fetch('/api/aircall/number-label', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ number, source: next }),
      });
      if (res.ok) onSaved(number, next);
    } catch { /* swallow — UI will reflect on next load */ }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className="group inline-flex items-center text-left"
        title="Set source — applies to every call from this number"
      >
        {chip ?? <span className="text-foreground/30 group-hover:text-primary">+ add</span>}
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[56] w-56 max-h-80 overflow-auto rounded-lg border border-black/10 bg-white shadow-xl py-1"
            style={{ left: pos.left, top: pos.top }}
          >
            <button type="button" onClick={() => void save('')} className="w-full text-left px-3 py-1.5 text-[12px] text-foreground/50 hover:bg-warm-bg/60">
              — None —
            </button>
            {list.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => void save(o)}
                className="w-full text-left px-3 py-1.5 hover:bg-warm-bg/60 flex items-center gap-2"
              >
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${sourceChipClass(o)}`}>{o}</span>
                {counts[o] > 0 && <span className="ml-auto text-[10px] tabular-nums text-foreground/35">{counts[o]}</span>}
                {o === resolved && <span className="text-primary text-[11px]">✓</span>}
              </button>
            ))}
            <div className="border-t border-black/5 mt-1 pt-1.5 px-2 pb-1">
              <div className="flex items-center gap-1">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) void save(custom.trim()); }}
                  placeholder="Add new source…"
                  maxLength={60}
                  className="flex-1 min-w-0 px-2 py-1 rounded border border-black/15 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="button" disabled={!custom.trim()} onClick={() => void save(custom.trim())} className="text-[11px] font-semibold text-primary disabled:opacity-40 px-1">
                  Add
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// Repeat-caller badge — sits inline next to a number that has called more
// than once in the current view. Clicking it opens a popover with the
// context: every loaded call from that number (when, outcome, who took
// it, length), plus a link to the full per-number history.
function RepeatBadge({ numberKey, calls, count, missed }: {
  numberKey: string;
  calls: AircallCallRow[];
  count: number;
  missed: number;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: Math.min(r.left, window.innerWidth - 296), top: r.bottom + 4 });
    setOpen(true);
  };

  const phone = formatPhone(calls[0]?.raw_digits || numberKey);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        title={`${count} calls from this number in view${missed > 0 ? ` · ${missed} missed` : ''} — tap for details`}
        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors align-middle"
      >
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {count}×{missed > 0 && <span className="text-rose-600 ml-0.5">· {missed}</span>}
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[55]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="fixed z-[56] w-72 max-h-96 overflow-auto rounded-xl border border-black/10 bg-white shadow-xl"
            style={{ left: pos.left, top: pos.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-black/5">
              <p className="text-[12px] font-bold text-foreground">{phone}</p>
              <p className="text-[10px] text-foreground/50">
                {count} {count === 1 ? 'call' : 'calls'} in this view
                {missed > 0 && <> · <span className="text-rose-600 font-semibold">{missed} missed</span></>}
              </p>
            </div>
            <ul className="py-1">
              {calls.map((c) => {
                const meta = callStatusMeta(c);
                return (
                  <li key={c.aircall_id}>
                    <Link href={`/feather/calls/${c.aircall_id}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-warm-bg/60">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} title={meta.label} />
                      <span className="text-[11px] text-foreground/70 flex-1 min-w-0 truncate">
                        {formatRelativeTime(c.started_at)}
                        <span className="text-foreground/35"> · {meta.label}</span>
                        {c.user_name && <span className="text-foreground/35"> · {c.user_name}</span>}
                      </span>
                      <span className="text-[10px] tabular-nums text-foreground/45 shrink-0">{formatDuration(c.duration)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-black/5 px-3 py-1.5">
              <Link href={`/feather/calls/number/${encodeURIComponent(numberKey)}`} className="text-[11px] font-semibold text-primary hover:underline">
                See full history →
              </Link>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export default function CallsContent() {
  const { session, isAdmin, isSuperAdmin } = useAuth();
  const token = session?.access_token ?? null;
  const canManage = isAdmin || isSuperAdmin;
  const router = useRouter();
  // Bounded scroll box around the wide desktop table → sticky header +
  // contacts-style floating horizontal scrollbar.
  const callsTableRef = useRef<HTMLDivElement | null>(null);

  const [calls, setCalls] = useState<AircallCallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Per-number overrides overlaid on the grid: operator-assigned names
  // (Caller column) + admin "source" overrides (Source column). Small
  // table — fetched once, keyed by digit-only number.
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/aircall/number-label', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled && res.ok) {
          setLabels((json.labels ?? {}) as Record<string, string>);
          setSources((json.sources ?? {}) as Record<string, string>);
        }
      } catch { /* non-fatal — overrides just don't overlay */ }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // AI source detection is per-call: the model only catches "how did you
  // hear about us?" when the caller actually says it, so one call from a
  // number can show a source while its re-occurring siblings show nothing.
  // Treat the source as a property of the NUMBER — the most recent non-empty
  // AI source from any loaded call becomes the value for every call from that
  // number, so re-occurring calls all read the same source. (A per-number
  // admin override still wins over this.)
  const aiSourceByNumber = useMemo(() => {
    const best: Record<string, { source: string; at: number }> = {};
    for (const c of calls) {
      const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
      const src = (c.source || '').trim();
      if (!key || !src) continue;
      const at = Date.parse(c.started_at ?? '') || 0;
      const cur = best[key];
      if (!cur || at > cur.at) best[key] = { source: src, at };
    }
    const out: Record<string, string> = {};
    for (const k of Object.keys(best)) out[k] = best[k].source;
    return out;
  }, [calls]);

  // Source usage frequency across the loaded rows (resolved = override
  // else AI value) → "most used" sources float to the top of the dropdown.
  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of calls) {
      const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
      const val = ((key && sources[key]) || c.source || '').trim();
      if (val) m[val] = (m[val] ?? 0) + 1;
    }
    return m;
  }, [calls, sources]);
  const orderedSources = useMemo(() => {
    const set = new Set<string>([...SOURCE_OPTIONS, ...Object.keys(sourceCounts)]);
    return Array.from(set).sort((a, b) => {
      const ca = sourceCounts[a] ?? 0, cb = sourceCounts[b] ?? 0;
      if (cb !== ca) return cb - ca;
      const ia = SOURCE_OPTIONS.indexOf(a), ib = SOURCE_OPTIONS.indexOf(b);
      return ((ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)) || a.localeCompare(b);
    });
  }, [sourceCounts]);

  // When an admin edits a source it's saved per-number, so reflect it on
  // every row from that number at once by updating the shared map.
  const handleSourceSaved = useCallback((number: string, value: string) => {
    setSources((prev) => {
      const next = { ...prev };
      if (value) next[number] = value; else delete next[number];
      return next;
    });
  }, []);

  // Day grouping — today is expanded by default, every earlier day is
  // collapsed behind a divider row showing call/operator/missed stats.
  // `toggledDays` flips a day away from its default state.
  const todayKey = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ }), []);
  const [toggledDays, setToggledDays] = useState<Set<string>>(new Set());
  const toggleDay = useCallback((dk: string) => {
    setToggledDays((prev) => {
      const n = new Set(prev);
      if (n.has(dk)) n.delete(dk); else n.add(dk);
      return n;
    });
  }, []);
  const dayGroups = useMemo(() => {
    const groups: { key: string; label: string; calls: AircallCallRow[] }[] = [];
    let cur: { key: string; label: string; calls: AircallCallRow[] } | null = null;
    for (const c of calls) {
      // Live calls are pinned to their own strip above the table.
      if (isLiveCall(c)) continue;
      const dk = callDayKey(c.started_at);
      if (!cur || cur.key !== dk) {
        cur = { key: dk, label: callDayLabel(c.started_at), calls: [] };
        groups.push(cur);
      }
      cur.calls.push(c);
    }
    // Always surface Today — even with zero calls — so the operator sees
    // "today" at the top instead of the list silently starting yesterday.
    if (!groups.some((g) => g.key === todayKey)) {
      groups.unshift({ key: todayKey, label: 'Today', calls: [] });
    }
    return groups;
  }, [calls, todayKey]);

  // Calls happening right now (ringing or connected) — pinned, ticking.
  // Re-evaluated on each tick so a call that crosses the staleness cap
  // (missed hangup) drops out of "live" promptly instead of ticking forever.
  const [nowTs, setNowTs] = useState(() => Date.now());
  const liveCalls = useMemo(() => calls.filter((c) => isLiveCall(c, nowTs)), [calls, nowTs]);
  useEffect(() => {
    if (liveCalls.length === 0) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveCalls.length]);

  // Repeat-caller intelligence — how many times each number appears in the
  // loaded view (and how many were missed), so a hot returning lead is
  // obvious at a glance. Keyed by digit-only number.
  const numberStats = useMemo(() => {
    const m: Record<string, { count: number; missed: number }> = {};
    for (const c of calls) {
      const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
      if (!key) continue;
      const e = m[key] || (m[key] = { count: 0, missed: 0 });
      e.count += 1;
      if (c.missed) e.missed += 1;
    }
    return m;
  }, [calls]);
  // The actual calls behind each number, for the repeat-caller popover.
  const callsByNumber = useMemo(() => {
    const m: Record<string, AircallCallRow[]> = {};
    for (const c of calls) {
      const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
      if (!key) continue;
      (m[key] ||= []).push(c);
    }
    return m;
  }, [calls]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [missedOnly, setMissedOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Agent → platform-user lookup (avatar + name), matched on email. Keyed
  // by lowercased email; `requestedAgents` guards against refetching the
  // same emails as the visible page changes.
  const [agentUsers, setAgentUsers] = useState<Record<string, AgentUser>>({});
  const requestedAgents = useRef<Set<string>>(new Set());

  const [insights, setInsights] = useState<{ today: number; missedToday: number; week: number; answeredRate: number | null } | null>(null);

  // Inline recording playback — one shared <audio> driven from the rows
  // so you can hit play without opening the call. Audio streams through
  // the authenticated /api/aircall/recording proxy (cookie-auth).
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const togglePlay = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const a = audioElRef.current;
    if (!a) return;
    if (playingId === id) { a.pause(); setPlayingId(null); return; }
    a.src = `/api/aircall/recording/${id}`;
    a.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null));
  };

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [debouncedSearch, preset, direction, missedOnly]);

  const buildParams = useCallback((overrides?: Record<string, string>) => {
    const p = new URLSearchParams();
    const from = rangeFrom(preset);
    if (from) p.set('from', from);
    if (direction !== 'all') p.set('direction', direction);
    if (missedOnly) p.set('missed', '1');
    if (debouncedSearch) p.set('search', debouncedSearch);
    p.set('page', String(page));
    p.set('perPage', String(PER_PAGE));
    if (overrides) for (const [k, v] of Object.entries(overrides)) p.set(k, v);
    return p;
  }, [preset, direction, missedOnly, debouncedSearch, page]);

  const loadCalls = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aircall/list?${buildParams().toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load calls');
      setCalls(json.calls ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [token, buildParams]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  // Resolve the agents in the current page to platform users so the Agent
  // column can show their profile picture. Matched on email against the
  // users table (same source the operator schedule uses).
  useEffect(() => {
    const emails = Array.from(
      new Set(calls.map((c) => c.user_email).filter((e): e is string => !!e)),
    );
    const toFetch = emails.filter((e) => !requestedAgents.current.has(e.toLowerCase()));
    if (toFetch.length === 0) return;
    toFetch.forEach((e) => requestedAgents.current.add(e.toLowerCase()));
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('email, avatar_url, full_name')
        .in('email', toFetch);
      if (cancelled || error || !data) return;
      setAgentUsers((prev) => {
        const next = { ...prev };
        for (const u of data as AgentUser[]) if (u.email) next[u.email.toLowerCase()] = u;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [calls]);

  // Insights — cheap count-only fetches (perPage=1, read total).
  const loadInsights = useCallback(async () => {
    if (!token) return;
    const todayFrom = phoenixMidnightUtc(0).toISOString();
    const weekFrom = phoenixMidnightUtc(6).toISOString();
    const headers = { Authorization: `Bearer ${token}` };
    const count = async (params: Record<string, string>) => {
      const p = new URLSearchParams({ perPage: '1', page: '1', ...params });
      const res = await fetch(`/api/aircall/list?${p.toString()}`, { headers });
      const j = await res.json().catch(() => ({}));
      return res.ok ? (j.total ?? 0) : 0;
    };
    const sample = async () => {
      // Pull today's calls to estimate the answered rate.
      const p = new URLSearchParams({ from: todayFrom, perPage: '100', page: '1' });
      const res = await fetch(`/api/aircall/list?${p.toString()}`, { headers });
      const j = await res.json().catch(() => ({}));
      const rows: AircallCallRow[] = res.ok ? (j.calls ?? []) : [];
      const inbound = rows.filter((r) => r.direction === 'inbound');
      if (inbound.length === 0) return null;
      const answered = inbound.filter((r) => !r.missed).length;
      return Math.round((answered / inbound.length) * 100);
    };
    try {
      const [today, missedToday, week, answeredRate] = await Promise.all([
        count({ from: todayFrom }),
        count({ from: todayFrom, missed: '1' }),
        count({ from: weekFrom }),
        sample(),
      ]);
      setInsights({ today, missedToday, week, answeredRate });
    } catch {
      /* non-fatal */
    }
  }, [token]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Live updates — refetch (debounced) whenever aircall_calls changes.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('aircall_calls_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aircall_calls' }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => {
          loadCalls();
          loadInsights();
        }, 600);
      })
      .subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loadCalls, loadInsights]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const stats = useMemo(() => ([
    { label: 'Calls today', value: insights ? insights.today.toLocaleString() : '—' },
    { label: 'Missed today', value: insights ? insights.missedToday.toLocaleString() : '—', alert: !!insights && insights.missedToday > 0 },
    { label: 'Last 7 days', value: insights ? insights.week.toLocaleString() : '—' },
    { label: 'Answered rate (today)', value: insights?.answeredRate != null ? `${insights.answeredRate}%` : '—' },
  ]), [insights]);

  // Agent cell — profile picture (matched on email) + name, with an
  // initials fallback when the agent isn't a platform user / has no avatar.
  const renderAgent = (c: AircallCallRow) => {
    if (!c.user_name && !c.user_email) return <span className="text-foreground/30">—</span>;
    const u = c.user_email ? agentUsers[c.user_email.toLowerCase()] : undefined;
    const name = c.user_name || u?.full_name || c.user_email || '—';
    // Avatar only — name shows on hover (native tooltip + aria-label).
    return u?.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={u.avatar_url} alt={name} title={name} aria-label={name} className="h-7 w-7 rounded-full object-cover ring-1 ring-white shadow-sm" />
    ) : (
      <span title={name} aria-label={name} className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center ring-1 ring-white">
        {initials(name)}
      </span>
    );
  };

  // Mobile call status → a color + label (kept off the avatar so it
  // doesn't read like an online/offline presence indicator).
  const mobileStatus = (c: AircallCallRow) =>
    c.voicemail
      ? { dot: 'bg-violet-500', label: 'Voicemail' }
      : c.missed
      ? { dot: 'bg-rose-500', label: 'Missed' }
      : c.direction === 'inbound'
      ? { dot: 'bg-emerald-500', label: 'Inbound' }
      : { dot: 'bg-blue-500', label: c.direction === 'outbound' ? 'Outbound' : 'Call' };

  // Mobile leading avatar: just the operator's (small) photo — no badge.
  const renderMobileAvatar = (c: AircallCallRow) => {
    const u = c.user_email ? agentUsers[c.user_email.toLowerCase()] : undefined;
    const name = c.user_name || u?.full_name || '';
    return u?.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={u.avatar_url} alt={name} title={name} className="h-6 w-6 rounded-full object-cover ring-1 ring-white shadow-sm shrink-0" />
    ) : name ? (
      <span title={name} className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center ring-1 ring-white shrink-0">
        {initials(name)}
      </span>
    ) : (
      <span className="h-6 w-6 rounded-full bg-foreground/10 text-foreground/40 flex items-center justify-center ring-1 ring-white shrink-0">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </span>
    );
  };

  // Repeat-caller badge — only renders when a number shows up more than
  // once in the current view. Click opens the context popover.
  const renderRepeatBadge = (key: string) => {
    const st = key ? numberStats[key] : undefined;
    if (!st || st.count < 2) return null;
    return <RepeatBadge numberKey={key} calls={callsByNumber[key] ?? []} count={st.count} missed={st.missed} />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <header className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Calls</h1>
            <p className="mt-0.5 text-sm text-foreground/55">
              Live Aircall activity{total > 0 && <> · {total.toLocaleString()} in view</>}
              <span className="text-foreground/30"> · </span>
              <a href="/feather/ctm" className="text-primary hover:underline font-medium">CTM</a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Text messages (Aircall SMS) — opens a threaded drawer. */}
            <MessagesPanel token={token} />
            <button
              onClick={() => { loadCalls(); loadInsights(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/85 border border-white/70 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-white transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Shared hidden player for inline row playback. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioElRef} className="hidden" onEnded={() => setPlayingId(null)} />

      {/* Operator schedule */}
      <OperatorSchedule token={token} />

      {/* Admissions call-flow cheat sheet — collapsed row, drops down. */}
      <OperatorCheatSheet />

      {/* Rates — pay structure reference, collapsed row, drops down. */}
      <RatesCard />

      {/* Insight stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${s.alert ? 'text-rose-600' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, contact, agent, line, or transcript…"
            className="w-full pl-9 pr-3 py-2 rounded-full border border-white/70 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="inline-flex rounded-full border border-white/70 bg-white/70 p-0.5 text-xs font-semibold">
          {(['today', '7d', '30d', 'all'] as RangePreset[]).map((r) => (
            <button key={r} onClick={() => setPreset(r)} className={`px-3 py-1.5 rounded-full transition-colors ${preset === r ? 'bg-primary text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}>
              {r === 'today' ? 'Today' : r === 'all' ? 'All' : r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as DirectionFilter)}
          className="px-3 py-2 rounded-full border border-white/70 bg-white/70 text-xs font-semibold text-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <button
          onClick={() => setMissedOnly((v) => !v)}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${missedOnly ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-white/70 border-white/70 text-foreground/60 hover:text-foreground'}`}
        >
          Missed only
        </button>
        <button
          onClick={() => setShowHeatmap((v) => !v)}
          aria-pressed={showHeatmap}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${showHeatmap ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white/70 border-white/70 text-foreground/60 hover:text-foreground'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
          </svg>
          Heatmap
        </button>
      </div>

      {/* Optional call-volume heatmap (weekday × hour). */}
      {showHeatmap && (
        <CallsHeatmap
          token={token}
          from={rangeFrom(preset)}
          direction={direction}
          missed={missedOnly}
          search={debouncedSearch}
          rangeLabel={rangeLabel(preset)}
        />
      )}

      {/* Live now — ringing / connected calls, pinned + ticking. The
          Realtime subscription keeps this list current the instant the
          webhook fires a call.* event. */}
      {liveCalls.length > 0 && (
        <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 backdrop-blur px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Live now · {liveCalls.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {liveCalls.map((c) => {
              const ringing = !c.answered_at;
              const since = ringing ? c.started_at : c.answered_at;
              const elapsed = since ? formatElapsed(nowTs - Date.parse(since)) : '';
              const loc = callerLocation(c.raw_digits || c.caller_number);
              const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
              const display = (key && labels[key]) || c.contact_name || formatPhone(c.raw_digits || c.caller_number);
              return (
                <button
                  key={c.aircall_id}
                  onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-left hover:bg-white transition-colors"
                >
                  {renderAgent(c)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {display}
                      {loc && <span className="ml-1.5 text-[11px] font-normal text-foreground/45">{loc.abbr}</span>}
                    </p>
                    <p className="text-[11px] text-foreground/55 truncate">
                      <span className={`font-semibold ${ringing ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ringing ? 'Ringing' : 'On call'}
                      </span>
                      {c.number_name && <> · {c.number_name}</>}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-bold text-foreground/70 shrink-0">{elapsed}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Call list */}
      <div className="rounded-3xl border border-white/70 bg-white/55 backdrop-blur-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="px-5 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : loading && calls.length === 0 ? (
          <div className="divide-y divide-foreground/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-foreground/5 animate-pulse" />
                <div className="flex-1 h-4 rounded bg-foreground/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No calls in this view</p>
            <p className="mt-1 text-xs text-foreground/50 max-w-md mx-auto">
              Once Aircall is connected and the webhook/backfill have run, calls appear here automatically and update live. Try widening the date range to “All”.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table — sticky header + floating horizontal scrollbar. */}
            <FloatingScrollbar tableRef={callsTableRef} engagedSelector="[data-calls-table]" />
            <div
              ref={callsTableRef}
              data-calls-table
              className="hidden sm:block overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            <table className="w-full min-w-[1180px] text-sm [&_td]:align-top">
              <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-white/90 [&_th]:backdrop-blur [&_th]:border-b [&_th]:border-foreground/10">
                <tr className="text-[11px] uppercase tracking-wider text-foreground/40">
                  <th className="text-left font-semibold px-5 py-3">When</th>
                  <th className="text-left font-semibold px-3 py-3">Agent</th>
                  <th className="text-left font-semibold px-3 py-3">Caller</th>
                  <th className="text-left font-semibold px-3 py-3">Location</th>
                  <th className="text-left font-semibold px-3 py-3 relative"><SourceHeader /></th>
                  <th className="text-left font-semibold px-3 py-3">Summary</th>
                  <th className="text-left font-semibold px-3 py-3">Line</th>
                  <th className="text-right font-semibold px-3 py-3">Wait</th>
                  <th className="text-right font-semibold px-3 py-3">Duration</th>
                  <th className="text-left font-semibold px-3 py-3">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {dayGroups.map((g) => {
                  const expanded = (g.key === todayKey) !== toggledDays.has(g.key);
                  const ops = new Set(g.calls.map((cc) => cc.user_name || cc.user_email || '').filter(Boolean)).size;
                  const missed = g.calls.filter((cc) => cc.missed).length;
                  return (
                  <Fragment key={g.key}>
                    <tr className="bg-warm-bg/30 cursor-pointer hover:bg-warm-bg/50 transition-colors" onClick={() => toggleDay(g.key)}>
                      <td colSpan={11} className="px-5 pt-3 pb-1.5 border-b border-foreground/5">
                        <div className="flex items-center gap-3">
                          <svg className={`w-3 h-3 text-foreground/40 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">{g.label}</span>
                          <span className="text-[11px] font-normal normal-case tracking-normal text-foreground/40">
                            {g.calls.length === 0 ? (
                              g.key === todayKey ? 'No calls have happened yet today' : 'No calls'
                            ) : (
                              <>
                                {g.calls.length} {g.calls.length === 1 ? 'call' : 'calls'}
                                <span className="mx-1.5 text-foreground/20">·</span>
                                {ops} {ops === 1 ? 'operator' : 'operators'}
                                {missed > 0 && (<><span className="mx-1.5 text-foreground/20">·</span><span className="text-rose-500/80">{missed} missed</span></>)}
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {expanded && g.calls.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-5 py-4 text-center text-[12px] text-foreground/40 italic">
                          No calls have happened yet today.
                        </td>
                      </tr>
                    )}
                    {expanded && g.calls.map((c) => (
                  <tr
                    key={c.aircall_id}
                    onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                    className={`cursor-pointer hover:bg-white/60 transition-colors ${c.missed ? 'bg-rose-50/40' : ''}`}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-foreground/70">{formatRelativeTime(c.started_at)}</td>
                    <td className="px-3 py-3">{renderAgent(c)}</td>
                    <td className="px-3 py-3">
                      {(() => {
                        const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
                        const phone = formatPhone(c.raw_digits || c.caller_number);
                        const display = (key && labels[key]) || c.contact_name;
                        return (
                          <>
                            {display && <div className="font-medium text-foreground">{display}</div>}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {key ? (
                                <Link
                                  href={`/feather/calls/number/${encodeURIComponent(key)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  title="See every call from this number"
                                  className={`${display ? 'text-[11px] text-foreground/45' : 'font-medium text-foreground'} hover:text-primary hover:underline`}
                                >
                                  {phone}
                                </Link>
                              ) : (
                                <div className={display ? 'text-[11px] text-foreground/45' : 'font-medium text-foreground'}>{phone}</div>
                              )}
                              {renderRepeatBadge(key)}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const loc = callerLocation(c.raw_digits || c.caller_number);
                        return loc
                          ? <span className="text-foreground/70" title={loc.name}>{loc.abbr}</span>
                          : <span className="text-foreground/30">—</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <SourceCell
                        number={c.caller_number || (c.raw_digits || '').replace(/\D/g, '')}
                        aiSource={aiSourceByNumber[c.caller_number || (c.raw_digits || '').replace(/\D/g, '')] ?? c.source}
                        override={sources[c.caller_number || (c.raw_digits || '').replace(/\D/g, '')]}
                        canEdit={canManage}
                        token={token}
                        onSaved={handleSourceSaved}
                        options={orderedSources}
                        counts={sourceCounts}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {c.summary || (c.topics && c.topics.length > 0) ? (
                        <div className="max-w-[380px]">
                          {c.summary && <div className="whitespace-pre-line text-[12px] leading-snug text-foreground/60">{c.summary}</div>}
                          {c.topics && c.topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.topics.slice(0, 4).map((t) => (
                                <span key={t} className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">{t}</span>
                              ))}
                              {c.topics.length > 4 && <span className="text-[10px] text-foreground/40 self-center">+{c.topics.length - 4}</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-foreground/60 whitespace-nowrap">
                      {(() => {
                        // Show just the last 4 digits of the called line
                        // to keep the column narrow + single-line; the
                        // full line name + number live in the tooltip.
                        const digits = (c.number_digits || '').replace(/\D/g, '');
                        const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
                        const title = [c.number_name, c.number_digits ? formatPhone(c.number_digits) : null].filter(Boolean).join(' · ');
                        if (last4) return <span className="tabular-nums" title={title || undefined}>…{last4}</span>;
                        return c.number_name
                          ? <span title={c.number_name}>{c.number_name}</span>
                          : <span className="text-foreground/30">—</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground/60">{formatWait(c.started_at, c.answered_at)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground/70">{formatDuration(c.duration)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${directionStyle[c.direction ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.direction ?? 'call'}
                        </span>
                        {c.missed && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700">Missed</span>}
                        {c.voicemail && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Voicemail</span>}
                        {(c.tags ?? []).slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/5 text-foreground/60">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-foreground/30">
                        {c.recording_url && (
                          <button
                            onClick={(e) => togglePlay(e, c.aircall_id)}
                            aria-label={playingId === c.aircall_id ? 'Pause recording' : 'Play recording'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {playingId === c.aircall_id ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                          </button>
                        )}
                        {c.has_transcript && <svg className="w-4 h-4 text-emerald-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile rows */}
            <div className="sm:hidden divide-y divide-foreground/5">
              {calls.map((c) => (
                <div key={c.aircall_id} className={`px-4 py-3 flex items-center gap-3 ${c.missed ? 'bg-rose-50/40' : ''}`}>
                  <div
                    onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                    className="min-w-0 flex-1 text-left flex items-center gap-3 cursor-pointer"
                  >
                    {renderMobileAvatar(c)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-medium text-foreground truncate min-w-0">{(c.caller_number && labels[c.caller_number]) || c.contact_name || formatPhone(c.raw_digits || c.caller_number)}</p>
                        {renderRepeatBadge(c.caller_number || (c.raw_digits || '').replace(/\D/g, ''))}
                      </div>
                      {(() => {
                        const loc = callerLocation(c.raw_digits || c.caller_number);
                        return loc ? <p className="text-[11px] text-foreground/45 truncate">{loc.name}</p> : null;
                      })()}
                      <p className="text-[11px] text-foreground/45 truncate flex items-center gap-1.5">
                        {(() => {
                          const s = mobileStatus(c);
                          return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${s.dot}`} title={s.label} aria-label={s.label} />;
                        })()}
                        <span className="truncate">{formatRelativeTime(c.started_at)} · {c.user_name || c.number_name || c.direction}</span>
                      </p>
                      {c.summary && (
                        <p className="mt-1 text-[11px] text-foreground/55 leading-snug whitespace-pre-line">
                          <span className="font-bold uppercase tracking-wider text-primary/80">AI</span> {c.summary}
                        </p>
                      )}
                      {c.topics && c.topics.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.topics.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-foreground/50 shrink-0">{formatDuration(c.duration)}</span>
                  {c.recording_url && (
                    <button
                      onClick={(e) => togglePlay(e, c.aircall_id)}
                      aria-label={playingId === c.aircall_id ? 'Pause recording' : 'Play recording'}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0"
                    >
                      {playingId === c.aircall_id ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                      ) : (
                        <svg className="w-4 h-4 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between mt-4 text-xs text-foreground/55">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-full border border-white/70 bg-white/70 font-semibold disabled:opacity-40 hover:bg-white transition-colors">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-full border border-white/70 bg-white/70 font-semibold disabled:opacity-40 hover:bg-white transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
