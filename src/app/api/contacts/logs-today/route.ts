import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/logs-today
//
// Powers /feather/logs and the HomeDailyLogsChip on /feather.
//
// Query param:
//   range = today | this_week | last_week | this_month | last_month |
//           this_year | all_time
//   (defaults to today)
//
// Returns:
//   logs        — every contact_logs row in the window, joined with
//                 user + contact for the right-column live feed.
//   leaderboard — per-user totals in the window, ranked by count
//                 then duration.
//   total       — total count in the window.
//   record      — the all-time biggest single-day total + the date it
//                 landed (excluding today). Kept under the existing
//                 name so the home chip keeps working unchanged.
//   records     — { dayBest, weekBest, dayBestByUser } — quick stats
//                 for the records card on the dedicated page. dayBest
//                 mirrors `record`; weekBest aggregates Phoenix Mon–Sun
//                 weeks; dayBestByUser is the single user × day cell
//                 with the most logs.
//
// Time windows anchor to America/Phoenix calendar boundaries so a
// teammate in MST sees the same "today" the rest of the dashboard
// labels as today.

export const dynamic = 'force-dynamic';

type RangeKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time';

interface LogRow {
  id: string;
  contact_id: string;
  contacted_by: string | null;
  contacted_at: string;
  duration_seconds: number | null;
  method: string | null;
}
interface UserLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
interface ContactLite {
  id: string;
  name: string | null;
  company: string | null;
}

function phoenixDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

// Build a Date pinned to Phoenix midnight (00:00:00 -07:00) from a
// YYYY-MM-DD calendar key.
function phoenixMidnight(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00-07:00`);
}

// Phoenix calendar week starts Monday. Returns the YYYY-MM-DD of the
// Monday of the week containing `iso`.
function phoenixWeekStartKey(iso: string): string {
  const key = phoenixDateKey(iso);
  const noon = new Date(`${key}T12:00:00-07:00`); // noon so DST math is moot
  const dow = noon.getDay(); // 0 = Sunday, 1 = Monday, …
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(noon);
  monday.setDate(noon.getDate() + offset);
  return monday.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

function phoenixMonthStartKey(iso: string): string {
  const key = phoenixDateKey(iso);
  return `${key.slice(0, 7)}-01`;
}

function addDaysKey(yyyyMmDd: string, days: number): string {
  const dt = phoenixMidnight(yyyyMmDd);
  dt.setDate(dt.getDate() + days);
  return dt.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

function addMonthsKey(yyyyMmDd: string, months: number): string {
  const [y, m] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}-01`;
}

interface RangeWindow {
  startIso: string;
  endIso: string | null; // null = no upper bound (open-ended)
  label: string;
}

function rangeWindow(range: RangeKey): RangeWindow {
  const nowIso = new Date().toISOString();
  const todayKey = phoenixDateKey(nowIso);
  switch (range) {
    case 'today': {
      return {
        startIso: phoenixMidnight(todayKey).toISOString(),
        endIso: null,
        label: 'today',
      };
    }
    case 'yesterday': {
      // Closed day window: [yesterday 00:00 Phoenix, today 00:00 Phoenix).
      // Mirrors the last_week / last_month pattern (start of period
      // inclusive, start of the *next* period exclusive) so a log
      // landing right at midnight goes to the new day and doesn't
      // get double-counted.
      const yKey = addDaysKey(todayKey, -1);
      return {
        startIso: phoenixMidnight(yKey).toISOString(),
        endIso: phoenixMidnight(todayKey).toISOString(),
        label: 'yesterday',
      };
    }
    case 'this_week': {
      const monKey = phoenixWeekStartKey(nowIso);
      return {
        startIso: phoenixMidnight(monKey).toISOString(),
        endIso: null,
        label: 'this week',
      };
    }
    case 'last_week': {
      const thisMon = phoenixWeekStartKey(nowIso);
      const lastMon = addDaysKey(thisMon, -7);
      return {
        startIso: phoenixMidnight(lastMon).toISOString(),
        endIso: phoenixMidnight(thisMon).toISOString(),
        label: 'last week',
      };
    }
    case 'this_month': {
      const monthKey = phoenixMonthStartKey(nowIso);
      return {
        startIso: phoenixMidnight(monthKey).toISOString(),
        endIso: null,
        label: 'this month',
      };
    }
    case 'last_month': {
      const thisMonth = phoenixMonthStartKey(nowIso);
      const lastMonth = addMonthsKey(thisMonth, -1);
      return {
        startIso: phoenixMidnight(lastMonth).toISOString(),
        endIso: phoenixMidnight(thisMonth).toISOString(),
        label: 'last month',
      };
    }
    case 'this_year': {
      // Phoenix calendar year — powers the /feather/logs/sheet
      // type × month grid, which buckets these rows client-side.
      const yearStartKey = `${todayKey.slice(0, 4)}-01-01`;
      return {
        startIso: phoenixMidnight(yearStartKey).toISOString(),
        endIso: null,
        label: 'this year',
      };
    }
    case 'all_time': {
      return {
        startIso: '1970-01-01T00:00:00.000Z',
        endIso: null,
        label: 'all time',
      };
    }
  }
}

function parseRange(raw: string | null): RangeKey {
  switch (raw) {
    case 'yesterday':
    case 'this_week':
    case 'last_week':
    case 'this_month':
    case 'last_month':
    case 'this_year':
    case 'all_time':
    case 'today':
      return raw;
    default:
      return 'today';
  }
}

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = parseRange(req.nextUrl.searchParams.get('range'));
  const win = rangeWindow(range);

  const admin = getAdminSupabase();

  // Window logs — narrow query for the chosen range, hydrate fully.
  // History — only the timestamp + contacted_by so we can bucket all-
  // time records (day / week / day×user). Both fully paginated so
  // there's no row cap; the previous .limit(100000) was a safer
  // bound than the PostgREST default but still a cap. Pages of 1000
  // are large enough that the typical range adds zero extra
  // round-trips (one short page returns and we exit immediately).
  const PAGE = 1000;
  const windowLogs: LogRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = admin
      .from('contact_logs')
      .select('id, contact_id, contacted_by, contacted_at, duration_seconds, method')
      .gte('contacted_at', win.startIso)
      .order('contacted_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (win.endIso) q = q.lt('contacted_at', win.endIso);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const chunk = (data ?? []) as LogRow[];
    windowLogs.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const history: Array<{ contacted_at: string; contacted_by: string | null }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('contact_logs')
      .select('contacted_at, contacted_by')
      .order('contacted_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const chunk = (data ?? []) as Array<{ contacted_at: string; contacted_by: string | null }>;
    history.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  // ── Hydrate users + contacts for window rows ─────────────────
  const userIds = Array.from(new Set(windowLogs.map((l) => l.contacted_by).filter((v): v is string => !!v)));
  const contactIds = Array.from(new Set(windowLogs.map((l) => l.contact_id).filter((v): v is string => !!v)));

  // History also references user ids — gather the full set so the
  // "best day by user" record can name the rep without a second
  // round-trip.
  const recordUserIds = new Set<string>(userIds);
  for (const r of history) if (r.contacted_by) recordUserIds.add(r.contacted_by);
  const allUserIdList = Array.from(recordUserIds);

  const [usersRes, contactsRes] = await Promise.all([
    allUserIdList.length > 0
      ? admin.from('users').select('id, full_name, email, avatar_url').in('id', allUserIdList)
      : Promise.resolve({ data: [] as UserLite[], error: null }),
    contactIds.length > 0
      ? admin.from('contacts').select('id, name, company').in('id', contactIds)
      : Promise.resolve({ data: [] as ContactLite[], error: null }),
  ]);
  const usersById = new Map<string, UserLite>(((usersRes.data ?? []) as UserLite[]).map((u) => [u.id, u]));
  const contactsById = new Map<string, ContactLite>(((contactsRes.data ?? []) as ContactLite[]).map((c) => [c.id, c]));

  // ── Logs array ───────────────────────────────────────────────
  const logs = windowLogs.map((l) => {
    const u = l.contacted_by ? usersById.get(l.contacted_by) : null;
    const c = contactsById.get(l.contact_id);
    return {
      id: l.id,
      contactedAt: l.contacted_at,
      method: l.method,
      durationSeconds: l.duration_seconds,
      userId: l.contacted_by,
      userName: u?.full_name?.trim() || u?.email || 'Unknown',
      userAvatarUrl: u?.avatar_url ?? null,
      contactId: l.contact_id,
      contactName: c?.name?.trim() || 'Unknown contact',
      contactCompany: c?.company?.trim() || null,
    };
  });

  // ── Leaderboard for the window ───────────────────────────────
  const lbAgg = new Map<string, { logs: number; durationSeconds: number }>();
  for (const l of windowLogs) {
    if (!l.contacted_by) continue;
    const slot = lbAgg.get(l.contacted_by) ?? { logs: 0, durationSeconds: 0 };
    slot.logs += 1;
    slot.durationSeconds += l.duration_seconds ?? 0;
    lbAgg.set(l.contacted_by, slot);
  }
  const leaderboard = Array.from(lbAgg.entries())
    .map(([userId, slot]) => {
      const u = usersById.get(userId);
      return {
        userId,
        name: u?.full_name?.trim() || u?.email || 'Unknown',
        avatarUrl: u?.avatar_url ?? null,
        logs: slot.logs,
        durationSeconds: slot.durationSeconds,
      };
    })
    .sort((a, b) => {
      if (a.logs !== b.logs) return b.logs - a.logs;
      if (a.durationSeconds !== b.durationSeconds) return b.durationSeconds - a.durationSeconds;
      return a.name.localeCompare(b.name);
    });

  // ── Records (all-time, derived from history) ─────────────────
  const todayKey = phoenixDateKey(new Date().toISOString());

  // Day buckets (excluding today so the live total doesn't trample
  // a fresh in-progress day's number).
  const dayCount = new Map<string, number>();
  // Week buckets (Monday-anchored, full historical sweep).
  const weekCount = new Map<string, number>();
  // Day × user buckets — track who logged the most in a single day.
  // Today is included here because a teammate who's already pumped
  // out 30 today still deserves to see themselves on the record list
  // (different signal from the headline "previous-day record" above).
  const dayUserCount = new Map<string, { date: string; userId: string; count: number }>();

  for (const r of history) {
    const key = phoenixDateKey(r.contacted_at);
    if (key !== todayKey) {
      dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
    }
    const wk = phoenixWeekStartKey(r.contacted_at);
    weekCount.set(wk, (weekCount.get(wk) ?? 0) + 1);
    if (r.contacted_by) {
      const cellKey = `${key}::${r.contacted_by}`;
      const cell = dayUserCount.get(cellKey) ?? { date: key, userId: r.contacted_by, count: 0 };
      cell.count += 1;
      dayUserCount.set(cellKey, cell);
    }
  }
  let dayBest: { count: number; date: string } | null = null;
  for (const [date, count] of dayCount) {
    if (!dayBest || count > dayBest.count) dayBest = { date, count };
  }
  let weekBest: { count: number; weekStart: string } | null = null;
  for (const [weekStart, count] of weekCount) {
    if (!weekBest || count > weekBest.count) weekBest = { weekStart, count };
  }
  let dayBestByUser: { count: number; date: string; userId: string; name: string; avatarUrl: string | null } | null = null;
  for (const cell of dayUserCount.values()) {
    if (!dayBestByUser || cell.count > dayBestByUser.count) {
      const u = usersById.get(cell.userId);
      dayBestByUser = {
        count: cell.count,
        date: cell.date,
        userId: cell.userId,
        name: u?.full_name?.trim() || u?.email || 'Unknown',
        avatarUrl: u?.avatar_url ?? null,
      };
    }
  }

  // Window-count rollup — one log-count per date range so the
  // glowing chart on /feather/logs renders all six bars in a
  // single round-trip. Computed in-memory from the same `history`
  // sweep we already pulled for the records section, so this is
  // free; no extra DB query.
  const todayKey0 = phoenixDateKey(new Date().toISOString());
  const yesterdayKey0 = addDaysKey(todayKey0, -1);
  const thisWeekStartKey = phoenixWeekStartKey(new Date().toISOString());
  const lastWeekStartKey = addDaysKey(thisWeekStartKey, -7);
  const thisMonthStartKey = phoenixMonthStartKey(new Date().toISOString());
  const lastMonthStartKey = addMonthsKey(thisMonthStartKey, -1);
  const counts = { today: 0, yesterday: 0, this_week: 0, last_week: 0, this_month: 0, last_month: 0, all_time: 0 };
  for (const r of history) {
    const k = phoenixDateKey(r.contacted_at);
    counts.all_time += 1;
    if (k === todayKey0) counts.today += 1;
    if (k === yesterdayKey0) counts.yesterday += 1;
    if (k >= thisWeekStartKey) counts.this_week += 1;
    if (k >= lastWeekStartKey && k < thisWeekStartKey) counts.last_week += 1;
    if (k >= thisMonthStartKey) counts.this_month += 1;
    if (k >= lastMonthStartKey && k < thisMonthStartKey) counts.last_month += 1;
  }

  // Weekly time series — last WEEKS_BACK Phoenix-Monday-anchored
  // weeks ending with the current (in-progress) week, oldest →
  // newest. Pre-filled with zeros so a quiet week still draws a
  // point on the line instead of a gap that misleads the reader.
  const WEEKS_BACK = 6;
  const weekSlots: Array<{ weekStart: string; count: number }> = [];
  let cursor = thisWeekStartKey;
  for (let i = 0; i < WEEKS_BACK; i++) {
    weekSlots.push({ weekStart: cursor, count: weekCount.get(cursor) ?? 0 });
    cursor = addDaysKey(cursor, -7);
  }
  weekSlots.reverse();
  const trimmed = weekSlots;

  return NextResponse.json({
    range,
    rangeLabel: win.label,
    logs,
    leaderboard,
    total: windowLogs.length,
    // Legacy alias kept for the home chip + existing daily-logs page.
    record: dayBest,
    records: {
      dayBest,
      weekBest,
      dayBestByUser,
    },
    windowCounts: counts,
    weeklySeries: trimmed,
  });
}
