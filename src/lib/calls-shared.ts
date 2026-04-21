// Pure helpers shared between the Calls page client code and the
// /api/calls/* server routes. Keeping the rules in one place avoids
// drifting server aggregates vs. client badges.

export const MEANINGFUL_THRESHOLD = 60;

export function normalizePhone(num: string | null | undefined): string {
  if (!num) return '';
  return num.replace(/\D/g, '');
}

export function isMissedCall(c: {
  direction?: string | null;
  voicemail?: boolean | null;
  talk_time?: number | null;
}): boolean {
  if (c.direction !== 'inbound') return false;
  return !!c.voicemail || (c.talk_time ?? 0) < 3;
}

export function isPaidSource(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  if (!s) return false;
  if (s.includes('organic') || s.includes('direct') || s === 'unknown' || s === 'none') return false;
  return true;
}

export function isSpamNumber(
  spamSet: Set<string>,
  call: {
    caller_number?: string | null;
    caller_number_formatted?: string | null;
    receiving_number?: string | null;
    receiving_number_formatted?: string | null;
  },
): boolean {
  const candidates = [
    call.caller_number,
    call.caller_number_formatted,
    call.receiving_number,
    call.receiving_number_formatted,
  ];
  for (const c of candidates) {
    const k = normalizePhone(c);
    if (k && spamSet.has(k)) return true;
  }
  return false;
}

export interface AggregateCall {
  ctm_id: string;
  called_at: string;
  direction: string | null;
  duration: number | null;
  talk_time: number | null;
  voicemail: boolean | null;
  caller_number: string | null;
  caller_number_formatted: string | null;
  receiving_number: string | null;
  receiving_number_formatted: string | null;
  source: string | null;
  source_name: string | null;
}

export interface RangeAggregates {
  totalCalls: number;
  inbound: number;
  outbound: number;
  missed: number;
  missedPaid: number;
  missedSpam: number;
  meaningful: number;
  spam: number;
  returnedMissed: number;
  returnedPickedUp: number;
  avgDuration: number;
  dailyCounts: {
    date: string;
    count: number;
    missedCount: number;
    returnedCount: number;
    meaningfulCount: number;
  }[];
}

// Compute every stat card value for a given set of calls + score map.
// `phoenixDay` is a function the caller provides so we don't hard-bake a
// tz here — keeps this file environment-agnostic.
export function computeRangeAggregates(
  calls: AggregateCall[],
  spamSet: Set<string>,
  scores: Map<string, { fit_score: number | null }>,
  phoenixDay: (iso: string) => string,
  rangeDays: string[],
): RangeAggregates {
  const rangeDateSet = new Set(rangeDays);
  const dayCount = new Map<string, number>();
  const dayMissed = new Map<string, number>();
  const dayReturned = new Map<string, number>();
  const dayMeaningful = new Map<string, number>();
  const missedNumbers = new Set<string>();

  let totalCalls = 0;
  let inbound = 0;
  let outbound = 0;
  let missed = 0;
  let missedPaid = 0;
  let missedSpam = 0;
  let meaningful = 0;
  let spam = 0;
  let totalDuration = 0;

  for (const c of calls) {
    const day = phoenixDay(c.called_at);
    if (!rangeDateSet.has(day)) continue;
    const isSpam = isSpamNumber(spamSet, c);
    if (isSpam) {
      spam++;
      if (isMissedCall(c)) missedSpam++;
      continue;
    }
    totalCalls++;
    totalDuration += c.duration ?? 0;
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
    if (c.direction === 'inbound') inbound++;
    if (c.direction === 'outbound') outbound++;
    if (isMissedCall(c)) {
      missed++;
      dayMissed.set(day, (dayMissed.get(day) ?? 0) + 1);
      if (c.caller_number) missedNumbers.add(c.caller_number);
      if (isPaidSource(c.source_name || c.source)) missedPaid++;
    }
    const s = scores.get(c.ctm_id);
    if (s?.fit_score != null && s.fit_score >= MEANINGFUL_THRESHOLD) {
      meaningful++;
      dayMeaningful.set(day, (dayMeaningful.get(day) ?? 0) + 1);
    }
  }

  let returnedMissed = 0;
  let returnedPickedUp = 0;
  for (const c of calls) {
    if (c.direction !== 'outbound') continue;
    const day = phoenixDay(c.called_at);
    if (!rangeDateSet.has(day)) continue;
    const target = c.caller_number || c.receiving_number;
    if (target && missedNumbers.has(target)) {
      returnedMissed++;
      dayReturned.set(day, (dayReturned.get(day) ?? 0) + 1);
      if ((c.talk_time ?? 0) >= 3) returnedPickedUp++;
    }
  }

  const dailyCounts = rangeDays.map(d => ({
    date: d,
    count: dayCount.get(d) ?? 0,
    missedCount: dayMissed.get(d) ?? 0,
    returnedCount: dayReturned.get(d) ?? 0,
    meaningfulCount: dayMeaningful.get(d) ?? 0,
  }));

  return {
    totalCalls,
    inbound,
    outbound,
    missed,
    missedPaid,
    missedSpam,
    meaningful,
    spam,
    returnedMissed,
    returnedPickedUp,
    avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    dailyCounts,
  };
}

// Build the list of Phoenix-tz calendar days between fromIso and toIso
// (inclusive). Used for building the daily-counts grid.
export function phoenixDaysBetween(fromIso: string, toIso: string): string[] {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const days: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime() + dayMs) {
    const day = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    if (days[days.length - 1] !== day) days.push(day);
    cursor.setTime(cursor.getTime() + dayMs);
  }
  // Trim any trailing day past `to` that slipped in due to the dayMs pad.
  const toDay = to.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  while (days.length && days[days.length - 1] > toDay) days.pop();
  return days;
}

export function phoenixDayOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}
