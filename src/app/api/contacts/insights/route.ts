import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/insights
//
// Aggregates for the consolidated insights card on /app/outreach:
//   * counts.{week,month,total,never} — same headline counters the
//     four-tile strip used to compute client-side; centralised here so
//     the card and any future surfaces (mobile / public summary) share
//     a single source of truth.
//   * today.areas — distinct contact locations whose contacts had a
//     log row landed today (admissions's "where did we touch today").
//   * leaderboards.{today,week,month} — per-user totals over the
//     window, with both log count and total duration_seconds so the
//     UI can sort by either.
//
// Time windows are anchored to UTC "now" minus a rolling 24h / 7d /
// 30d so the card stays meaningful across timezones and short
// off-by-one bugs at midnight.

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

interface LogRow {
  contact_id: string;
  contacted_by: string | null;
  contacted_at: string;
  duration_seconds: number | null;
}
interface ContactLite {
  id: string;
  last_contact_at: string | null;
  formatted_address: string | null;
  location: string | null;
  email: string | null;
}
interface UserLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  logs: number;
  durationSeconds: number;
}

function leaderboardFor(
  logs: LogRow[],
  users: Map<string, UserLite>,
  sinceMs: number,
): LeaderboardEntry[] {
  const agg = new Map<string, { logs: number; durationSeconds: number }>();
  for (const l of logs) {
    if (!l.contacted_by) continue;
    const t = new Date(l.contacted_at).getTime();
    if (Number.isNaN(t) || t < sinceMs) continue;
    const slot = agg.get(l.contacted_by) ?? { logs: 0, durationSeconds: 0 };
    slot.logs += 1;
    slot.durationSeconds += l.duration_seconds ?? 0;
    agg.set(l.contacted_by, slot);
  }
  const out: LeaderboardEntry[] = [];
  for (const [userId, slot] of agg) {
    const u = users.get(userId);
    out.push({
      userId,
      name: u?.full_name?.trim() || u?.email || 'Unknown',
      avatarUrl: u?.avatar_url ?? null,
      logs: slot.logs,
      durationSeconds: slot.durationSeconds,
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const now = Date.now();
  const todayCut = now - DAY_MS;
  const weekCut = now - 7 * DAY_MS;
  const monthCut = now - 30 * DAY_MS;

  // Logs over the longest window we'll need (30d) + the
  // pipeline-counter contact slice in parallel. Each query is
  // independent so running them in series wastes a full round-trip
  // of latency for no reason.
  const [logsRes, contactsRes] = await Promise.all([
    admin
      .from('contact_logs')
      .select('contact_id, contacted_by, contacted_at, duration_seconds')
      .gte('contacted_at', new Date(monthCut).toISOString()),
    // Pipeline counters use the denormalised contacts.last_contact_at
    // so a contact last touched 35 days ago still rolls into
    // 'total contacted' / 'never contacted' — independent of the
    // 30-day window above.
    admin
      .from('contacts')
      .select('id, last_contact_at, formatted_address, location, email'),
  ]);
  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
  if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });
  const rows = (logsRes.data ?? []) as LogRow[];
  const contacts = contactsRes.data;
  const contactList = (contacts ?? []) as ContactLite[];
  const byId = new Map<string, ContactLite>();
  for (const c of contactList) byId.set(c.id, c);

  let week = 0;
  let month = 0;
  let total = 0;
  let never = 0;
  let missingEmail = 0;
  for (const c of contactList) {
    if (!(c.email && c.email.trim())) missingEmail += 1;
    if (!c.last_contact_at) { never += 1; continue; }
    total += 1;
    const t = new Date(c.last_contact_at).getTime();
    if (now - t <= 7 * DAY_MS) week += 1;
    if (now - t <= 30 * DAY_MS) month += 1;
  }

  // Areas touched today. Group by formatted_address (preferred — it's
  // already cleaned by the geocoder) or fall back to the raw location.
  // Unknown locations bucket together under "(Unknown)" so the user
  // can see how many of today's touchpoints were untagged.
  const todayCutoffMs = todayCut;
  const areaCount = new Map<string, number>();
  for (const l of rows) {
    const t = new Date(l.contacted_at).getTime();
    if (Number.isNaN(t) || t < todayCutoffMs) continue;
    const c = byId.get(l.contact_id);
    const area = (c?.formatted_address || c?.location || '').trim() || '(Unknown)';
    areaCount.set(area, (areaCount.get(area) ?? 0) + 1);
  }
  const areas = Array.from(areaCount.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  // User lookup for the leaderboards. Only fetch the users that
  // actually show up in the log slice — keeps the payload tight on
  // large orgs.
  const userIds = new Set<string>();
  for (const l of rows) if (l.contacted_by) userIds.add(l.contacted_by);
  let usersMap = new Map<string, UserLite>();
  if (userIds.size > 0) {
    const { data: users, error: uErr } = await admin
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', Array.from(userIds));
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    usersMap = new Map((users ?? []).map((u) => [u.id as string, u as UserLite]));
  }

  const today = leaderboardFor(rows, usersMap, todayCut);
  const weekBoard = leaderboardFor(rows, usersMap, weekCut);
  const monthBoard = leaderboardFor(rows, usersMap, monthCut);

  return NextResponse.json({
    counts: { week, month, total, never, missingEmail },
    today: { areas, leaderboard: today },
    week: { leaderboard: weekBoard },
    month: { leaderboard: monthBoard },
  });
}
