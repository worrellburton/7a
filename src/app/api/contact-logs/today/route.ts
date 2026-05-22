import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contact-logs/today
//
// Lightweight feed of today's contact_logs, used by the home page's
// log-rain animation. "Today" is the Phoenix-local calendar day —
// matches the rest of the org's date math (Levers, GA4 conversions,
// calls dashboard) so the rain resets at the same midnight everyone
// experiences as "the start of the day".
//
// Returned shape is deliberately small: id, made_at, the rep's name +
// avatar, the contact's name, and the touchpoint method. Just enough
// for the hover tooltip; we don't ship the full notes or transcript.
//
// Open to any signed-in user (matches contact_logs RLS).

export const dynamic = 'force-dynamic';

interface LogDrop {
  id: string;
  made_at: string;
  method: string | null;
  // Free-text the touchpoint author left (or the system wrote for
  // Data Entry / New Contact). The home log-rain tooltip surfaces
  // this for Data Entry rows so admins see what fields were filled
  // without opening the contact.
  comments: string | null;
  by_id: string | null;
  by_name: string | null;
  by_avatar: string | null;
  contact_id: string | null;
  contact_name: string | null;
}

// Phoenix doesn't observe DST so the offset is stable at UTC-7.
// We compute "start of today in Phoenix" as the UTC instant whose
// Phoenix calendar date is today's. Doing it this way (instead of
// `new Date(localString)`) avoids the bug where a server in UTC and
// a server in PHX would disagree about which calendar day "now" is.
function startOfTodayPhoenixIso(): string {
  const now = new Date();
  const phxToday = now.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }); // YYYY-MM-DD
  // 07:00Z is midnight Phoenix year-round (no DST).
  return `${phxToday}T07:00:00.000Z`;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const since = startOfTodayPhoenixIso();

  // Pull logs + the rep's display name/avatar via a single join.
  // contact_logs is small enough day-over-day that LIMIT 500 is a
  // very generous cap.
  const { data: rows, error } = await admin
    .from('contact_logs')
    .select('id, contacted_at, method, comments, contacted_by, contact_id, users:contacted_by(full_name, avatar_url), contacts:contact_id(name)')
    .gte('contacted_at', since)
    .order('contacted_at', { ascending: true })
    .limit(500);

  if (error) {
    console.error('[contact-logs/today]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type RawRow = {
    id: string;
    contacted_at: string;
    method: string | null;
    comments: string | null;
    contacted_by: string | null;
    contact_id: string | null;
    users: { full_name: string | null; avatar_url: string | null } | null;
    contacts: { name: string | null } | null;
  };

  const logs: LogDrop[] = ((rows ?? []) as unknown as RawRow[]).map((r) => ({
    id: r.id,
    made_at: r.contacted_at,
    method: r.method,
    comments: r.comments,
    by_id: r.contacted_by,
    by_name: r.users?.full_name ?? null,
    by_avatar: r.users?.avatar_url ?? null,
    contact_id: r.contact_id,
    contact_name: r.contacts?.name ?? null,
  }));

  return NextResponse.json({
    logs,
    sincePhoenixMidnight: since,
    count: logs.length,
  });
}
