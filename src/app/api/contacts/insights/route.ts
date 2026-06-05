import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

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
  method: string | null;
}
interface ContactLite {
  id: string;
  last_contact_at: string | null;
  formatted_address: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  phone_cell: string | null;
  phone_office: string | null;
  company: string | null;
  role: string | null;
  specialty: string | null;
  type: string[] | null;
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

export async function GET() {
  // Cookie-session auth — the InsightsCard's plain fetch doesn't
  // send an Authorization header, so the older getUserFromRequest
  // bearer-token gate was 401-ing every call. The response
  // omitted `governance` and the badge showed '—' / 'Calculating…'
  // while the count tiles kept rendering off the client-side
  // fallback in content.tsx.
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
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
      .select('contact_id, contacted_by, contacted_at, duration_seconds, method')
      .gte('contacted_at', new Date(monthCut).toISOString())
      // Explicit large limit so we don't silently cap at the
      // PostgREST default page size (1000). A busy month easily
      // clears 1000 logs and we need every row to compute the
      // leaderboard + week / month / total counters correctly.
      .limit(100000),
    // Pipeline counters use the denormalised contacts.last_contact_at
    // so a contact last touched 35 days ago still rolls into
    // 'total contacted' / 'never contacted' — independent of the
    // 30-day window above. Same explicit limit for the contacts
    // sweep, since the org's pipeline is already approaching 1000
    // contacts.
    admin
      .from('contacts')
      .select('id, last_contact_at, formatted_address, location, email, phone, phone_cell, phone_office, company, role, specialty, type')
      .limit(100000),
  ]);
  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
  if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });
  // `contact_logs` carries two flavours of rows: real outreach
  // touchpoints (calls, emails, texts, in-person, etc.) AND a
  // 'New Contact' registration event written every time a contact
  // is added — including by the auto-add cron and the auto-contact
  // lever. The registration events are NOT outreach and shouldn't
  // count toward "areas contacted today" or the activity
  // leaderboards (the user flagged that the locations chip was
  // surfacing places they hadn't actually reached out to today,
  // because the rows were just freshly-added contacts).
  const allLogs = (logsRes.data ?? []) as LogRow[];
  const rows = allLogs.filter((r) => (r.method ?? '').trim().toLowerCase() !== 'new contact');
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

  // ─── Data governance score ──────────────────────────────────
  // Per-field completeness across the whole contact list, with
  // email weighted 3x because empty email blocks the email-campaign
  // pipeline (we can't enroll someone with no email). Score is
  // (filled weight / possible weight) * 100 — clean 0..100.
  // Phone is a 'one of three' field — any of phone, phone_cell, or
  // phone_office counts as filled.
  const FIELD_WEIGHTS = [
    { key: 'email',     label: 'Email',     weight: 3 },
    { key: 'phone',     label: 'Any phone', weight: 1 },
    { key: 'company',   label: 'Company',   weight: 1 },
    { key: 'role',      label: 'Role',      weight: 1 },
    { key: 'location',  label: 'Location',  weight: 1 },
    { key: 'specialty', label: 'Specialty', weight: 1 },
    { key: 'type',      label: 'Type',      weight: 1 },
  ] as const;
  const truthy = (v: unknown): boolean => {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    return true;
  };
  const breakdown = FIELD_WEIGHTS.map((f) => {
    let filled = 0;
    for (const c of contactList) {
      if (f.key === 'phone') {
        if (truthy(c.phone) || truthy(c.phone_cell) || truthy(c.phone_office)) filled += 1;
      } else if (f.key === 'location') {
        if (truthy(c.location) || truthy(c.formatted_address)) filled += 1;
      } else {
        if (truthy((c as unknown as Record<string, unknown>)[f.key])) filled += 1;
      }
    }
    const missing = contactList.length - filled;
    const pctFilled = contactList.length === 0 ? 100 : Math.round((filled / contactList.length) * 1000) / 10;
    return { key: f.key, label: f.label, weight: f.weight, filled, missing, pctFilled };
  });
  let earned = 0;
  let possible = 0;
  for (const row of breakdown) {
    earned += row.filled * row.weight;
    possible += contactList.length * row.weight;
  }
  const governanceScore = possible === 0 ? 100 : Math.round((earned / possible) * 1000) / 10;

  // Recent governance activity — every contact-field fill the
  // PATCH route logs. Joined to the user table for the display
  // name. Last 20 entries so the panel doesn't unbounded-fetch on
  // a busy week.
  const { data: actRows } = await admin
    .from('activity_log')
    .select('id, user_id, type, target_id, target_label, metadata, created_at')
    .like('type', 'contact.%_filled')
    .order('created_at', { ascending: false })
    .limit(20);
  const actUserIds = Array.from(new Set((actRows ?? []).map((a) => a.user_id as string | null).filter((v): v is string => !!v)));
  let actUserMap = new Map<string, UserLite>();
  if (actUserIds.length > 0) {
    const { data: actUsers } = await admin
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', actUserIds);
    actUserMap = new Map((actUsers ?? []).map((u) => [u.id as string, u as UserLite]));
  }
  const governanceActivity = ((actRows ?? []) as Array<{ id: string; user_id: string | null; type: string; target_id: string | null; target_label: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    .map((r) => {
      const u = r.user_id ? actUserMap.get(r.user_id) : null;
      return {
        id: r.id,
        at: r.created_at,
        userId: r.user_id,
        userName: u?.full_name ?? u?.email ?? 'Unknown',
        userAvatarUrl: u?.avatar_url ?? null,
        contactId: r.target_id,
        contactName: r.target_label,
        fieldLabel: (r.metadata?.label as string | undefined) ?? r.type.replace('contact.', '').replace('_filled', ''),
      };
    });

  return NextResponse.json({
    counts: { week, month, total, never, missingEmail },
    today: { areas, leaderboard: today },
    week: { leaderboard: weekBoard },
    month: { leaderboard: monthBoard },
    governance: {
      score: governanceScore,
      totalContacts: contactList.length,
      breakdown,
      activity: governanceActivity,
    },
  });
}
