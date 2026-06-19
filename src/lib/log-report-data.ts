// Real aggregation for the weekly 🪵 Log Report. Hydrates the
// LogReportData shape /lib/log-report-email.ts consumes — same
// columns the /feather/outreach insights card already reads from, so
// the email's per-rep totals match what the team sees in-app.

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  LogReportData,
  LogReportLeaderRow,
  LogReportMethodCount,
  LogReportAreaRow,
  LogReportContactRow,
  LogReportSegment,
} from './log-report-email';
import { isDataMethod } from './log-report-email';

interface LogRow {
  id: string;
  contact_id: string;
  contacted_by: string | null;
  contacted_at: string;
  duration_seconds: number | null;
  method: string | null;
}
interface ContactLite {
  id: string;
  name: string | null;
  company: string | null;
  formatted_address: string | null;
  location: string | null;
}
interface UserLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Build every breakdown (leaderboard / methods / areas / top
// contacts / counts) over an arbitrary slice of the week's logs.
// Used to split the report into its two parts — Email logs vs
// everything else — without re-querying the database.
function buildSegment(
  logs: LogRow[],
  userById: Map<string, UserLite>,
  contactById: Map<string, ContactLite>,
): LogReportSegment {
  const repAgg = new Map<string, { name: string; avatarUrl: string | null; logs: number; outreachLogs: number; dataLogs: number; durationSec: number }>();
  for (const l of logs) {
    if (!l.contacted_by) continue;
    const u = userById.get(l.contacted_by);
    const slot = repAgg.get(l.contacted_by) ?? {
      name: u?.full_name?.trim() || 'Unknown',
      avatarUrl: u?.avatar_url ?? null,
      logs: 0,
      outreachLogs: 0,
      dataLogs: 0,
      durationSec: 0,
    };
    slot.logs += 1;
    if (isDataMethod(l.method)) slot.dataLogs += 1;
    else slot.outreachLogs += 1;
    slot.durationSec += l.duration_seconds ?? 0;
    repAgg.set(l.contacted_by, slot);
  }
  const leaderboard: LogReportLeaderRow[] = Array.from(repAgg.entries())
    .map(([userId, slot]) => ({ userId, ...slot }))
    .sort((a, b) => {
      if (a.outreachLogs !== b.outreachLogs) return b.outreachLogs - a.outreachLogs;
      if (a.logs !== b.logs) return b.logs - a.logs;
      if (a.durationSec !== b.durationSec) return b.durationSec - a.durationSec;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  const methodAgg = new Map<string, { count: number; durationSec: number }>();
  for (const l of logs) {
    const m = (l.method ?? 'Unknown').trim() || 'Unknown';
    const slot = methodAgg.get(m) ?? { count: 0, durationSec: 0 };
    slot.count += 1;
    slot.durationSec += l.duration_seconds ?? 0;
    methodAgg.set(m, slot);
  }
  const byMethod: LogReportMethodCount[] = Array.from(methodAgg.entries())
    .map(([method, slot]) => ({ method, count: slot.count, durationSec: slot.durationSec, isDataMethod: isDataMethod(method) }))
    .sort((a, b) => b.count - a.count);

  const areaAgg = new Map<string, number>();
  for (const l of logs) {
    const c = contactById.get(l.contact_id);
    const area = (c?.formatted_address || c?.location || '').trim() || '(Unknown)';
    areaAgg.set(area, (areaAgg.get(area) ?? 0) + 1);
  }
  const topAreas: LogReportAreaRow[] = Array.from(areaAgg.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const contactAgg = new Map<string, { touches: number; lastMethod: string | null; lastAt: string }>();
  for (const l of logs) {
    const slot = contactAgg.get(l.contact_id) ?? { touches: 0, lastMethod: null, lastAt: l.contacted_at };
    slot.touches += 1;
    if (l.contacted_at >= slot.lastAt) {
      slot.lastAt = l.contacted_at;
      slot.lastMethod = l.method ?? null;
    }
    contactAgg.set(l.contact_id, slot);
  }
  const topContacts: LogReportContactRow[] = Array.from(contactAgg.entries())
    .map(([contactId, slot]) => {
      const c = contactById.get(contactId);
      return {
        name: c?.name?.trim() || 'Unknown contact',
        company: c?.company?.trim() || null,
        touches: slot.touches,
        lastMethod: slot.lastMethod,
        lastAt: slot.lastAt,
      };
    })
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 10);

  return {
    counts: {
      total: logs.length,
      uniqueContacts: new Set(logs.map((l) => l.contact_id)).size,
      uniqueReps: new Set(logs.map((l) => l.contacted_by).filter(Boolean)).size,
      totalDurationSec: logs.reduce((a, b) => a + (b.duration_seconds ?? 0), 0),
    },
    byMethod,
    leaderboard,
    topAreas,
    topContacts,
  };
}

// One log counts as "email" when its method is Email. Everything
// else (phone, in-person, text, voicemail, data work, …) lands in
// the second part of the report.
function isEmailMethod(method: string | null | undefined): boolean {
  return (method ?? '').trim().toLowerCase() === 'email';
}

export interface BuildLogReportOpts {
  /** End of the window (default now). Inclusive. */
  endsAt?: Date;
  /** Window length in days (default 7). */
  days?: number;
  /** Absolute origin used by in-email CTAs (default sevenarrowsrecoveryarizona.com). */
  appOrigin?: string;
}

// One round-trip into contact_logs over the chosen window, then
// in-memory joins against compact users + contacts slices. Cheaper
// than a single nested-select Postgres join when the team is small
// and the window is bounded — and lets us reuse the slices across
// the four aggregations (leaderboard, methods, areas, top contacts).
export async function buildLogReportData(
  admin: SupabaseClient,
  opts: BuildLogReportOpts = {},
): Promise<LogReportData> {
  const endsAt = opts.endsAt ?? new Date();
  const days = opts.days ?? 7;
  const startsAt = new Date(endsAt.getTime() - days * 24 * 60 * 60 * 1000);

  const { data: rawLogs, error: logsErr } = await admin
    .from('contact_logs')
    .select('id, contact_id, contacted_by, contacted_at, duration_seconds, method')
    .gte('contacted_at', startsAt.toISOString())
    .lte('contacted_at', endsAt.toISOString())
    .limit(5000);
  if (logsErr) throw new Error(logsErr.message);
  const logs = (rawLogs ?? []) as LogRow[];

  const contactIds = Array.from(new Set(logs.map((l) => l.contact_id).filter((v): v is string => !!v)));

  const [usersRes, contactsRes] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('status', 'active'),
    contactIds.length > 0
      ? admin.from('contacts').select('id, name, company, formatted_address, location').in('id', contactIds)
      : Promise.resolve({ data: [] as ContactLite[], error: null }),
  ]);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (contactsRes.error) throw new Error(contactsRes.error.message);
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u as UserLite]));
  const contactById = new Map((contactsRes.data ?? []).map((c) => [c.id, c as ContactLite]));

  // ─── Aggregations ─────────────────────────────────────────────

  // Per-rep leaderboard — only teammates who logged at least one
  // touchpoint this week appear. Unknowns (contacted_by points to a
  // deleted user) bucket under a single 'Unknown' row so totals
  // reconcile. Split logs into outreach vs data work so a CSV
  // import of 100 contacts doesn't read as 100 phone calls.
  const repAgg = new Map<string, { name: string; avatarUrl: string | null; logs: number; outreachLogs: number; dataLogs: number; durationSec: number }>();
  for (const l of logs) {
    if (!l.contacted_by) continue;
    const u = userById.get(l.contacted_by);
    const slot = repAgg.get(l.contacted_by) ?? {
      name: u?.full_name?.trim() || 'Unknown',
      avatarUrl: u?.avatar_url ?? null,
      logs: 0,
      outreachLogs: 0,
      dataLogs: 0,
      durationSec: 0,
    };
    slot.logs += 1;
    if (isDataMethod(l.method)) slot.dataLogs += 1;
    else slot.outreachLogs += 1;
    slot.durationSec += l.duration_seconds ?? 0;
    repAgg.set(l.contacted_by, slot);
  }
  const leaderboard: LogReportLeaderRow[] = Array.from(repAgg.entries())
    .map(([userId, slot]) => ({ userId, ...slot }))
    // Rank by outreach first so a rep who actually dialed phones
    // outranks a rep who imported a CSV. Total logs is the
    // tiebreaker so a rep with equal outreach + extra data work
    // still beats a tied rep.
    .sort((a, b) => {
      if (a.outreachLogs !== b.outreachLogs) return b.outreachLogs - a.outreachLogs;
      if (a.logs !== b.logs) return b.logs - a.logs;
      if (a.durationSec !== b.durationSec) return b.durationSec - a.durationSec;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  // Method mix — count + total duration per method label. Tag
  // each row as data-method or outreach so the email renderer can
  // visually distinguish.
  const methodAgg = new Map<string, { count: number; durationSec: number }>();
  for (const l of logs) {
    const m = (l.method ?? 'Unknown').trim() || 'Unknown';
    const slot = methodAgg.get(m) ?? { count: 0, durationSec: 0 };
    slot.count += 1;
    slot.durationSec += l.duration_seconds ?? 0;
    methodAgg.set(m, slot);
  }
  const byMethod: LogReportMethodCount[] = Array.from(methodAgg.entries())
    .map(([method, slot]) => ({
      method,
      count: slot.count,
      durationSec: slot.durationSec,
      isDataMethod: isDataMethod(method),
    }))
    .sort((a, b) => b.count - a.count);

  // Top areas — group by formatted_address first (geocoder-clean),
  // fall back to the raw location string, finally '(Unknown)'.
  const areaAgg = new Map<string, number>();
  for (const l of logs) {
    const c = contactById.get(l.contact_id);
    const area = (c?.formatted_address || c?.location || '').trim() || '(Unknown)';
    areaAgg.set(area, (areaAgg.get(area) ?? 0) + 1);
  }
  const topAreas: LogReportAreaRow[] = Array.from(areaAgg.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top contacts touched — count per contact + last touch
  // method/date so the recap reads as 'who saw the most attention.'
  const contactAgg = new Map<string, { touches: number; lastMethod: string | null; lastAt: string }>();
  for (const l of logs) {
    const slot = contactAgg.get(l.contact_id) ?? { touches: 0, lastMethod: null, lastAt: l.contacted_at };
    slot.touches += 1;
    if (l.contacted_at >= slot.lastAt) {
      slot.lastAt = l.contacted_at;
      slot.lastMethod = l.method ?? null;
    }
    contactAgg.set(l.contact_id, slot);
  }
  const topContacts: LogReportContactRow[] = Array.from(contactAgg.entries())
    .map(([contactId, slot]) => {
      const c = contactById.get(contactId);
      return {
        name: c?.name?.trim() || 'Unknown contact',
        company: c?.company?.trim() || null,
        touches: slot.touches,
        lastMethod: slot.lastMethod,
        lastAt: slot.lastAt,
      };
    })
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 10);

  // Totals.
  const totalDurationSec = logs.reduce((a, b) => a + (b.duration_seconds ?? 0), 0);
  const uniqueContacts = new Set(logs.map((l) => l.contact_id)).size;
  const uniqueReps = new Set(logs.map((l) => l.contacted_by).filter(Boolean)).size;
  // Outreach vs data work split — surfaced in the email's KPI band
  // so "127 logs" reads correctly when 60 of those were CSV imports.
  let outreach = 0;
  let dataWork = 0;
  let newContacts = 0;
  let fieldFills = 0;
  for (const l of logs) {
    if (isDataMethod(l.method)) {
      dataWork += 1;
      if (l.method === 'New Contact') newContacts += 1;
      else if (l.method === 'Data Entry') fieldFills += 1;
    } else {
      outreach += 1;
    }
  }

  return {
    window: {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      label: `${fmtShortDate(startsAt.toISOString())} – ${fmtShortDate(endsAt.toISOString())}`,
    },
    counts: {
      total: logs.length,
      outreach,
      dataWork,
      newContacts,
      fieldFills,
      uniqueContacts,
      uniqueReps,
      totalDurationSec,
    },
    byMethod,
    leaderboard,
    topAreas,
    topContacts,
    // Two-part split for the email body: one recap for email logs,
    // one for every other kind of log.
    emails: buildSegment(logs.filter((l) => isEmailMethod(l.method)), userById, contactById),
    everythingElse: buildSegment(logs.filter((l) => !isEmailMethod(l.method)), userById, contactById),
    generatedAt: new Date().toISOString(),
    appOrigin: opts.appOrigin ?? 'https://sevenarrowsrecoveryarizona.com',
  };
}
