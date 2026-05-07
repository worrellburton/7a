// Shared types, constants, and pure helpers for the Calls feature.
// Extracted from content.tsx so sub-components can be split into
// sibling files without circular imports back through the page.

import { getAuthToken } from '@/lib/db';

export interface Call {
  id: number;
  name: string;
  caller_number: string;
  caller_number_formatted: string;
  tracking_number: string;
  tracking_number_formatted: string;
  receiving_number: string;
  receiving_number_formatted: string;
  duration: number;
  talk_time: number;
  ring_time: number;
  direction: string;
  source: string;
  source_name: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  called_at: string;
  tracking_label: string;
  audio: string;
  tag_list: string[];
  status: string;
  voicemail: boolean;
  first_call: boolean;
  business_number: string;
  // CTM's own lead score (their scoring, not ours). Optional / null
  // when the account hasn't enabled lead scoring at the CTM side.
  score: number | null;
  notes: string;
}

export interface CTMResponse {
  calls?: Call[];
  total_entries?: number;
  total_pages?: number;
  page?: number;
  per_page?: number;
  error?: string;
}

export type Tab = 'calls' | 'sources' | 'spam';

export const SPAM_STORAGE_KEY = 'calls_spam_numbers_v1';

export interface Insights {
  today: number;
  yesterday: number;
  thisWeek: number;
  allTime: number;
  avgDuration: number;
  inbound: number;
  outbound: number;
  missedThisWeek: number;
  missedPaidThisWeek: number;
  returnedMissedThisWeek: number;
  returnedPickedUpThisWeek: number;
  dailyCounts: { label: string; short: string; date: string; count: number; missedCount: number; returnedCount: number; sources: { name: string; count: number }[] }[];
}

export const directionStyle: Record<string, string> = {
  inbound: 'bg-emerald-50 text-emerald-700',
  outbound: 'bg-blue-50 text-blue-700',
};

export function normalizePhone(num: string | null | undefined): string {
  if (!num) return '';
  return num.replace(/\D/g, '');
}

// Treat anything that isn't obviously organic / direct / unattributed as a
// "paid" source for the purposes of missed-paid-call reporting.
export function isPaidSource(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  if (!s) return false;
  if (s.includes('organic') || s.includes('direct') || s === 'unknown' || s === 'none') return false;
  return true;
}

export function isMissedCall(c: { direction?: string | null; voicemail?: boolean | null; talk_time?: number | null }): boolean {
  if (c.direction !== 'inbound') return false;
  return !!c.voicemail || (c.talk_time ?? 0) < 3;
}

export async function ctmFetch(endpoint: string, params?: Record<string, string | number>): Promise<CTMResponse> {
  const token = getAuthToken();
  const res = await fetch('/api/ctm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params }),
  });
  return res.json();
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // CTM sometimes returns "YYYY-MM-DD HH:MM:SS +ZZZZ" without 'T'
  d = new Date(String(dateStr).replace(' ', 'T').replace(' +', '+').replace(' -', '-'));
  if (!isNaN(d.getTime())) return d;
  // Try Unix timestamp (seconds)
  const n = Number(dateStr);
  if (n > 1e9 && n < 2e10) return new Date(n * 1000);
  return null;
}

export function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return '—'; }
}

export function formatTime(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '—';
  try {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  } catch { return ''; }
}

// Relative-time formatter for the mobile call list. Reads as
// "Just now / 12m / 2h / Yesterday 3:14p / Apr 24 · 9:08a" so a
// teammate scrolling the list can place the call without doing
// arithmetic. Falls back to the absolute formatTime when the input
// can't be parsed (rather than the bare em-dash the old layout
// rendered, which made the row look broken).
export function formatRelativeTime(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 0 && diffSec > -60) return 'In a moment';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  // Phoenix-local "today" comparison so 11pm-yesterday doesn't read
  // "Today" the next morning.
  const phoenixToday = new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const phoenixThen = d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const diffDays = Math.floor((new Date(phoenixToday).getTime() - new Date(phoenixThen).getTime()) / 86400000);
  const timePart = (() => {
    try {
      return d
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Phoenix',
        })
        .replace(' AM', 'a')
        .replace(' PM', 'p');
    } catch {
      return '';
    }
  })();
  if (diffDays === 1) return `Yesterday ${timePart}`.trim();
  if (diffDays < 7) {
    try {
      const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Phoenix' });
      return `${day} ${timePart}`.trim();
    } catch {
      return timePart;
    }
  }
  try {
    const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Phoenix' });
    return `${md} · ${timePart}`.trim();
  } catch {
    return timePart;
  }
}

export function fmtAudioTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
