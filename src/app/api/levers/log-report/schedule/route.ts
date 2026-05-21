import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/levers/log-report/schedule
// PUT  /api/levers/log-report/schedule
//
// Per-lever broadcast schedule for the 🪵 Log Report.
//
// One row per lever_type in public.lever_schedules. The cron
// endpoint reads this row every hour and only fires when
// (current UTC weekday == day_of_week) AND (current UTC hour ==
// hour_utc) AND enabled = true.
//
// The picker in the lever UI works in the user's local timezone
// (display_timezone) and we convert to UTC server-side so the
// stored values stay tz-stable. Phoenix doesn't observe DST so
// once-saved schedules don't drift; East-Coast users would need a
// re-save in March / November but that's a problem for a future
// timezone-aware version of this schema.

export const dynamic = 'force-dynamic';

const LEVER_TYPE = 'log-report';

interface PutBody {
  enabled?: boolean;
  dayOfWeek?: number;       // 0..6, 0=Sunday — UTC
  hourUtc?: number;         // 0..23 — UTC
  displayTimezone?: string; // e.g. 'America/Phoenix'
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: meRow } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('lever_schedules')
    .select('lever_type, enabled, day_of_week, hour_utc, display_timezone, updated_at, updated_by')
    .eq('lever_type', LEVER_TYPE)
    .maybeSingle();
  return NextResponse.json({ schedule: data ?? null });
}

export async function PUT(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: meRow } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  let body: PutBody = {};
  try { body = (await req.json()) as PutBody; } catch { /* allow empty */ }

  const dayOfWeek = Number(body.dayOfWeek);
  const hourUtc = Number(body.hourUtc);
  const enabled = body.enabled !== false;
  const displayTimezone = (body.displayTimezone ?? 'America/Phoenix').trim() || 'America/Phoenix';

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: 'dayOfWeek must be 0..6 (0=Sunday).' }, { status: 400 });
  }
  if (!Number.isInteger(hourUtc) || hourUtc < 0 || hourUtc > 23) {
    return NextResponse.json({ error: 'hourUtc must be 0..23.' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('lever_schedules')
    .upsert({
      lever_type: LEVER_TYPE,
      enabled,
      day_of_week: dayOfWeek,
      hour_utc: hourUtc,
      display_timezone: displayTimezone,
      updated_by: user.id,
    }, { onConflict: 'lever_type' })
    .select('lever_type, enabled, day_of_week, hour_utc, display_timezone, updated_at, updated_by')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}
