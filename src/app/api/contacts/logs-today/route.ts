import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/logs-today
//
// Powers the dedicated /app/daily-logs page. Returns three things:
//   1. `logs` — every contact_logs row landed today (Phoenix time),
//      joined to its user + contact so each falling 🪵 can render a
//      hover tooltip with "who made it · which contact".
//   2. `leaderboard` — per-user totals for today, sorted by count
//      descending, then duration. Used for the scoreboard.
//   3. `record` — the all-time biggest single-day total + the date
//      it landed. Looks back across the entire contact_logs table.
//      Bucketed in JS rather than SQL so we don't need a new view.
//
// Time window for "today" is anchored to America/Phoenix calendar
// midnight so a teammate in MST sees the same "today" the dashboard
// would label as today.

export const dynamic = 'force-dynamic';

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

function phoenixStartOfTodayISO(): string {
  // Phoenix is UTC-7 year-round (no DST). Compute the YYYY-MM-DD in
  // Phoenix, then the moment that calendar day begins in UTC.
  const phoenixDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Phoenix',
  });
  return new Date(`${phoenixDate}T00:00:00-07:00`).toISOString();
}

function phoenixDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: 'America/Phoenix',
  });
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const todayStart = phoenixStartOfTodayISO();

  // Today's logs — narrow window, hydrate fully (id + method + when).
  // All-time history — only the timestamp column so we can bucket by
  // Phoenix calendar day and find the historical max. Both go in
  // parallel so the page paints fast.
  const [todayRes, historyRes] = await Promise.all([
    admin
      .from('contact_logs')
      .select('id, contact_id, contacted_by, contacted_at, duration_seconds, method')
      .gte('contacted_at', todayStart)
      .order('contacted_at', { ascending: true }),
    admin
      .from('contact_logs')
      .select('contacted_at')
      .order('contacted_at', { ascending: false })
      .limit(50000),
  ]);
  if (todayRes.error) return NextResponse.json({ error: todayRes.error.message }, { status: 500 });
  if (historyRes.error) return NextResponse.json({ error: historyRes.error.message }, { status: 500 });

  const todayLogs = (todayRes.data ?? []) as LogRow[];
  const history = (historyRes.data ?? []) as Array<{ contacted_at: string }>;

  // ── Hydrate users + contacts for today's rows only ───────────
  const userIds = Array.from(new Set(todayLogs.map((l) => l.contacted_by).filter((v): v is string => !!v)));
  const contactIds = Array.from(new Set(todayLogs.map((l) => l.contact_id).filter((v): v is string => !!v)));
  const [usersRes, contactsRes] = await Promise.all([
    userIds.length > 0
      ? admin.from('users').select('id, full_name, email, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as UserLite[], error: null }),
    contactIds.length > 0
      ? admin.from('contacts').select('id, name, company').in('id', contactIds)
      : Promise.resolve({ data: [] as ContactLite[], error: null }),
  ]);
  const usersById = new Map<string, UserLite>(((usersRes.data ?? []) as UserLite[]).map((u) => [u.id, u]));
  const contactsById = new Map<string, ContactLite>(((contactsRes.data ?? []) as ContactLite[]).map((c) => [c.id, c]));

  // ── Logs array ───────────────────────────────────────────────
  const logs = todayLogs.map((l) => {
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

  // ── Leaderboard for today ────────────────────────────────────
  // Always returns up to TOP_N entries. If fewer teammates have
  // logged than TOP_N, pad with active users who haven't logged
  // yet (alphabetical) and mark them placeholder=true so the UI
  // can render them dimmed with a "waiting" label.
  const TOP_N = 5;
  const lbAgg = new Map<string, { logs: number; durationSeconds: number }>();
  for (const l of todayLogs) {
    if (!l.contacted_by) continue;
    const slot = lbAgg.get(l.contacted_by) ?? { logs: 0, durationSeconds: 0 };
    slot.logs += 1;
    slot.durationSeconds += l.duration_seconds ?? 0;
    lbAgg.set(l.contacted_by, slot);
  }
  const realLeaders = Array.from(lbAgg.entries())
    .map(([userId, slot]) => {
      const u = usersById.get(userId);
      return {
        userId,
        name: u?.full_name?.trim() || u?.email || 'Unknown',
        avatarUrl: u?.avatar_url ?? null,
        logs: slot.logs,
        durationSeconds: slot.durationSeconds,
        placeholder: false,
      };
    })
    .sort((a, b) => {
      if (a.logs !== b.logs) return b.logs - a.logs;
      if (a.durationSeconds !== b.durationSeconds) return b.durationSeconds - a.durationSeconds;
      return a.name.localeCompare(b.name);
    })
    .slice(0, TOP_N);

  // Pad with active teammates who haven't logged today, so the
  // scoreboard always shows up to TOP_N slots. Exclude anyone
  // already on the leaderboard.
  type LeaderRow = typeof realLeaders[number];
  let leaderboard: LeaderRow[] = realLeaders;
  if (realLeaders.length < TOP_N) {
    const onBoard = new Set(realLeaders.map((r) => r.userId));
    const { data: actives } = await admin
      .from('users')
      .select('id, full_name, email, avatar_url')
      .eq('status', 'active')
      .order('full_name', { ascending: true });
    const padding: LeaderRow[] = [];
    for (const u of (actives ?? []) as UserLite[]) {
      if (onBoard.has(u.id)) continue;
      padding.push({
        userId: u.id,
        name: u.full_name?.trim() || u.email || 'Teammate',
        avatarUrl: u.avatar_url ?? null,
        logs: 0,
        durationSeconds: 0,
        placeholder: true,
      });
      if (realLeaders.length + padding.length >= TOP_N) break;
    }
    leaderboard = [...realLeaders, ...padding];
  }

  // ── Historical daily record ──────────────────────────────────
  // Bucket every contact_logs row by Phoenix calendar day and pick
  // the day with the highest count. Excludes today so the headline
  // "record" stays distinct from the live total above it.
  const todayKey = phoenixDateKey(new Date().toISOString());
  const dayCount = new Map<string, number>();
  for (const r of history) {
    const key = phoenixDateKey(r.contacted_at);
    if (key === todayKey) continue;
    dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
  }
  let record: { count: number; date: string } | null = null;
  for (const [date, count] of dayCount) {
    if (!record || count > record.count) record = { date, count };
  }

  return NextResponse.json({
    logs,
    leaderboard,
    total: todayLogs.length,
    record,
  });
}
