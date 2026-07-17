import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/contacts/attempts?range=this_month|last_month|last_90|this_year|all
//
// Time series behind the contacts page's attempts chart: how many
// touchpoints (contact_logs rows) landed per day across the selected
// window, split by method so the client can filter methods without
// refetching. Days with no activity are zero-filled so the line spans
// the whole window instead of skipping quiet days; windows longer than
// ~200 days bucket by ISO week to keep the line legible.
//
// Days are bucketed on America/Phoenix time (UTC-7, no DST) — the
// business timezone — so "today" on the chart matches the team's day.

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const PHOENIX_OFFSET_MS = 7 * 60 * 60 * 1000; // fixed UTC-7, no DST
const WEEK_BUCKET_THRESHOLD_DAYS = 200;

type RangeKey = 'this_month' | 'last_month' | 'last_90' | 'this_year' | 'all';

interface LogSlim {
  contacted_at: string;
  method: string | null;
  contacted_by: string | null;
}

/** Date-only key ('YYYY-MM-DD') of a UTC ms timestamp in Phoenix time. */
function phoenixDayKey(ms: number): string {
  return new Date(ms - PHOENIX_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC ms of Phoenix-midnight for a 'YYYY-MM-DD' Phoenix day key. */
function phoenixDayStartMs(key: string): number {
  return new Date(`${key}T00:00:00Z`).getTime() + PHOENIX_OFFSET_MS;
}

/** Monday-of-week key for a Phoenix day key (weekly buckets). */
function weekKeyOf(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return new Date(d.getTime() - dow * DAY_MS).toISOString().slice(0, 10);
}

function rangeStartMs(range: RangeKey, nowMs: number): number | null {
  // Anchor calendar math to the Phoenix day the team is living in.
  const today = phoenixDayKey(nowMs); // YYYY-MM-DD
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  switch (range) {
    case 'this_month':
      return phoenixDayStartMs(`${today.slice(0, 7)}-01`);
    case 'last_month': {
      const prevY = m === 1 ? y - 1 : y;
      const prevM = m === 1 ? 12 : m - 1;
      return phoenixDayStartMs(`${prevY}-${String(prevM).padStart(2, '0')}-01`);
    }
    case 'last_90':
      return phoenixDayStartMs(today) - 89 * DAY_MS;
    case 'this_year':
      return phoenixDayStartMs(`${y}-01-01`);
    case 'all':
      return null; // from the first log
  }
}

function rangeEndMs(range: RangeKey, nowMs: number): number {
  if (range === 'last_month') {
    // End of the previous calendar month (start of this month).
    const today = phoenixDayKey(nowMs);
    return phoenixDayStartMs(`${today.slice(0, 7)}-01`);
  }
  return nowMs;
}

export async function GET(req: NextRequest) {
  // Staff-only, same boundary as quick-log-context: this aggregates
  // org-wide outreach volume plus each logger's name/email/avatar, so
  // alumni/guest accounts must not be able to enumerate it.
  // NOTE: no `req` argument — the chart client authenticates via the
  // session COOKIE (credentials: 'include'), and passing req makes
  // resolveContext demand an Authorization header instead, 401ing
  // every request and blanking the chart ("No attempts in this
  // window"). The argless form reads the cookie session.
  const gate = await requireStaff();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const rangeRaw = (url.searchParams.get('range') || 'last_90') as RangeKey;
  const range: RangeKey = ['this_month', 'last_month', 'last_90', 'this_year', 'all'].includes(rangeRaw)
    ? rangeRaw
    : 'last_90';

  const admin = getAdminSupabase();
  const nowMs = Date.now();
  const startMs = rangeStartMs(range, nowMs);
  const endMs = rangeEndMs(range, nowMs);

  // Page through every log in the window (PostgREST caps a single
  // select at 1000 rows).
  const PAGE = 1000;
  const logs: LogSlim[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = admin
      .from('contact_logs')
      .select('contacted_at, method, contacted_by')
      .lt('contacted_at', new Date(endMs).toISOString())
      .order('contacted_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (startMs != null) q = q.gte('contacted_at', new Date(startMs).toISOString());
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const chunk = (data ?? []) as LogSlim[];
    logs.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  // Window bounds for zero-fill. All-time starts at the first log.
  const effectiveStartMs =
    startMs ?? (logs.length > 0 ? new Date(logs[0].contacted_at).getTime() : nowMs);
  const spanDays = Math.max(1, Math.ceil((endMs - effectiveStartMs) / DAY_MS));
  const bucket: 'day' | 'week' = spanDays > WEEK_BUCKET_THRESHOLD_DAYS ? 'week' : 'day';

  // Aggregate per bucket per method, plus per person (with per-method
  // splits so the client's method chips filter the leaderboard too).
  const byBucket = new Map<string, { total: number; byMethod: Record<string, number> }>();
  const methodTotals = new Map<string, number>();
  const byPerson = new Map<string, Record<string, number>>();
  for (const l of logs) {
    const t = new Date(l.contacted_at).getTime();
    if (Number.isNaN(t)) continue;
    const dayKey = phoenixDayKey(t);
    const key = bucket === 'week' ? weekKeyOf(dayKey) : dayKey;
    const slot = byBucket.get(key) ?? { total: 0, byMethod: {} };
    const method = l.method?.trim() || 'Unknown';
    slot.total += 1;
    slot.byMethod[method] = (slot.byMethod[method] ?? 0) + 1;
    byBucket.set(key, slot);
    methodTotals.set(method, (methodTotals.get(method) ?? 0) + 1);
    if (l.contacted_by) {
      const p = byPerson.get(l.contacted_by) ?? {};
      p[method] = (p[method] ?? 0) + 1;
      byPerson.set(l.contacted_by, p);
    }
  }

  // Names + avatars for the by-person leaderboard.
  const personIds = [...byPerson.keys()];
  const userById = new Map<string, { full_name: string | null; email: string | null; avatar_url: string | null }>();
  if (personIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', personIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>) {
      userById.set(u.id, u);
    }
  }
  const people = [...byPerson.entries()]
    .map(([id, byMethod]) => {
      const u = userById.get(id);
      return {
        id,
        name: u?.full_name?.trim() || u?.email || 'Unknown',
        avatarUrl: u?.avatar_url ?? null,
        byMethod,
      };
    })
    .sort((a, b) =>
      Object.values(b.byMethod).reduce((s, n) => s + n, 0)
      - Object.values(a.byMethod).reduce((s, n) => s + n, 0));

  // Zero-fill the window so the line covers quiet days too.
  const startKeyDay = phoenixDayKey(effectiveStartMs);
  const endKeyDay = phoenixDayKey(endMs - 1);
  const firstKey = bucket === 'week' ? weekKeyOf(startKeyDay) : startKeyDay;
  const lastKey = bucket === 'week' ? weekKeyOf(endKeyDay) : endKeyDay;
  const stepMs = bucket === 'week' ? 7 * DAY_MS : DAY_MS;
  const days: Array<{ date: string; total: number; byMethod: Record<string, number> }> = [];
  for (
    let t = new Date(`${firstKey}T00:00:00Z`).getTime();
    t <= new Date(`${lastKey}T00:00:00Z`).getTime();
    t += stepMs
  ) {
    const key = new Date(t).toISOString().slice(0, 10);
    const slot = byBucket.get(key);
    days.push({ date: key, total: slot?.total ?? 0, byMethod: slot?.byMethod ?? {} });
  }

  // Methods sorted by volume so the client's chip row leads with the
  // ones that matter.
  const methods = [...methodTotals.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);

  return NextResponse.json({
    range,
    bucket,
    start: new Date(effectiveStartMs).toISOString(),
    end: new Date(endMs).toISOString(),
    total: logs.length,
    methods,
    days,
    people,
  });
}
