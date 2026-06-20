// Shared types, constants, and pure helpers for the Aircall Calls page.
// Kept self-contained (no imports from the legacy /feather/ctm feature)
// so the two call surfaces can evolve independently.

export const PHOENIX_TZ = 'America/Phoenix';

// A row as returned by /api/aircall/list (transcript trimmed to a
// has_transcript boolean to keep the grid payload small).
export interface AircallCallRow {
  aircall_id: number;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  direction: string | null;
  status: string | null;
  missed: boolean;
  missed_call_reason: string | null;
  voicemail: boolean;
  duration: number | null;
  raw_digits: string | null;
  caller_number: string | null;
  number_id: number | null;
  number_name: string | null;
  number_digits: string | null;
  user_name: string | null;
  user_email: string | null;
  contact_name: string | null;
  contact_company: string | null;
  teams: string[] | null;
  tags: string[] | null;
  recording_url: string | null;
  voicemail_url: string | null;
  summary: string | null;
  // "How did you hear about us?" answer, AI-extracted per call ('' or
  // null when never asked). Admin overrides live per-number in
  // aircall_number_labels and overlay this at render time.
  source: string | null;
  sentiment: string | null;
  // AI-extracted discussion topics (Aircall CI / backfill). Surfaced as
  // chips on the row; null/empty until the AI events land.
  topics: string[] | null;
  has_transcript?: boolean;
}

// Full detail row (from /api/aircall/[id]) — superset with the heavy
// fields the list omits.
export interface AircallCallDetail extends AircallCallRow {
  call_uuid: string | null;
  sid: string | null;
  archived: boolean | null;
  user_id: number | null;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  assigned_user_email: string | null;
  contact_id: number | null;
  asset_url: string | null;
  transcript: string | null;
  comments: { content?: string; posted_by?: { name?: string }; posted_at?: number }[] | null;
  ai: Record<string, unknown> | null;
  raw: Record<string, unknown> | null;
  synced_at: string | null;
  ai_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PhoneShiftEvent {
  id: string;
  event_date: string;        // YYYY-MM-DD (anchor date for recurring rows)
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  subject_id: string | null; // users.id
  title: string | null;      // person's display name (denormalised on the event)
  color: string | null;
  // When set, the row is a recurring shift anchored at event_date and
  // projected forward — the same model the Calendar page uses.
  repeat_rule?: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
}

export interface AircallAgent {
  id?: number;
  name?: string;
  email?: string;
  availability_status?: string;
}

export const directionStyle: Record<string, string> = {
  inbound: 'bg-emerald-50 text-emerald-700',
  outbound: 'bg-blue-50 text-blue-700',
};

// Availability badge styling for an Aircall user's live phone status.
export function availabilityStyle(status: string | undefined | null): { dot: string; label: string; text: string } {
  switch ((status ?? '').toLowerCase()) {
    case 'available':
      return { dot: 'bg-emerald-500', label: 'Available', text: 'text-emerald-700' };
    case 'busy':
    case 'in_call':
      return { dot: 'bg-amber-500', label: 'On a call', text: 'text-amber-700' };
    case 'after_call_work':
      return { dot: 'bg-amber-400', label: 'Wrapping up', text: 'text-amber-700' };
    case 'offline':
      return { dot: 'bg-gray-300', label: 'Offline', text: 'text-foreground/40' };
    case 'do_not_disturb':
      return { dot: 'bg-rose-500', label: 'Do not disturb', text: 'text-rose-700' };
    default:
      return { dot: 'bg-gray-300', label: 'Unknown', text: 'text-foreground/40' };
  }
}

// Up-to-two-letter initials for an avatar fallback. "Jane Doe" → "JD".
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Time from the call starting to being answered ("wait to answer"). Only
// meaningful when the call was actually picked up; returns '—' otherwise
// (missed / never answered). Short waits read in seconds, longer as m:ss.
export function formatWait(startedAt: string | null, answeredAt: string | null): string {
  if (!startedAt || !answeredAt) return '—';
  const secs = (new Date(answeredAt).getTime() - new Date(startedAt).getTime()) / 1000;
  if (!Number.isFinite(secs) || secs < 0) return '—';
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format an international/E.164 digit string into a friendly US display
// where possible, otherwise return a +-prefixed best effort.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return trimmed.startsWith('+') ? trimmed : digits ? `+${digits}` : trimmed;
}

export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string | null | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: PHOENIX_TZ });
  } catch { return '—'; }
}

export function formatTime(dateStr: string | null | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return '';
  try {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: PHOENIX_TZ });
  } catch { return ''; }
}

// "Just now / 12m ago / 3h ago / Yesterday 3:14p / Apr 24 · 9:08a"
export function formatRelativeTime(dateStr: string | null | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return '';
  const now = Date.now();
  const diffSec = Math.round((now - d.getTime()) / 1000);
  if (diffSec < 0 && diffSec > -60) return 'In a moment';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const phoenixToday = new Date(now).toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const phoenixThen = d.toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const diffDays = Math.floor((new Date(phoenixToday).getTime() - new Date(phoenixThen).getTime()) / 86400000);
  const timePart = formatTime(dateStr).replace(' AM', 'a').replace(' PM', 'p');
  if (diffDays === 1) return `Yesterday ${timePart}`.trim();
  if (diffDays < 7) {
    try {
      const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: PHOENIX_TZ });
      return `${day} ${timePart}`.trim();
    } catch { return timePart; }
  }
  return `${formatDate(dateStr)} · ${timePart}`;
}

// Today's date in Phoenix as YYYY-MM-DD.
export function phoenixToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
}

// Current minutes-since-midnight in Phoenix (0–1439).
export function phoenixMinutesNow(): number {
  const parts = new Date().toLocaleTimeString('en-GB', { timeZone: PHOENIX_TZ, hour12: false }).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

// 'HH:MM:SS' → minutes since midnight. Treats null/empty as null.
export function hhmmToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

// '08:00:00' → '8:00a'. End '00:00' is treated as midnight (24:00).
export function formatShiftTime(t: string | null | undefined): string {
  const mins = hhmmToMinutes(t);
  if (mins === null) return '';
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'p' : 'a';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${m.toString().padStart(2, '0')}${ampm}`;
}

// Does a shift [start,end) contain `minute`? Handles end <= start as a
// midnight wrap (overnight) and end '00:00' as 24:00.
export function shiftContainsMinute(start: string | null, end: string | null, minute: number): boolean {
  const a = hhmmToMinutes(start);
  let b = hhmmToMinutes(end);
  if (a === null) return false;
  if (b === null || b === 0) b = 24 * 60; // treat 00:00 end as midnight
  if (b > a) return minute >= a && minute < b;
  // overnight wrap
  return minute >= a || minute < b;
}
