import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/social-media/schedule-slots          — list all slots
// POST /api/social-media/schedule-slots          — create a slot
//
// Slots are global (every staff user sees every slot) so the team
// can collaborate on a single posting cadence; only the creator can
// delete their own. RLS on the table enforces the same rule.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('social_media_schedule_slots')
    .select('id, created_by, name, rrule_kind, days_of_week, hour, minute, anchor_date, created_at')
    .order('hour', { ascending: true })
    .order('minute', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

interface CreateBody {
  name?: unknown;
  rrule_kind?: unknown;
  days_of_week?: unknown;
  hour?: unknown;
  minute?: unknown;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateBody = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const kind = body.rrule_kind;
  const hour = Number(body.hour);
  const minute = Number(body.minute);
  const days = Array.isArray(body.days_of_week)
    ? (body.days_of_week as unknown[]).filter((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) as number[]
    : null;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (kind !== 'daily' && kind !== 'every-other-day' && kind !== 'weekly' && kind !== 'biweekly') {
    return NextResponse.json({ error: 'rrule_kind must be daily / every-other-day / weekly / biweekly' }, { status: 400 });
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ error: 'hour must be 0-23' }, { status: 400 });
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return NextResponse.json({ error: 'minute must be 0-59' }, { status: 400 });
  }
  if ((kind === 'weekly' || kind === 'biweekly') && (!days || days.length === 0)) {
    return NextResponse.json({ error: 'weekly / biweekly need at least one day_of_week (0-6)' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('social_media_schedule_slots')
    .insert({
      created_by: user.id,
      name,
      rrule_kind: kind,
      days_of_week: kind === 'weekly' || kind === 'biweekly' ? days : null,
      hour,
      minute,
    })
    .select('id, created_by, name, rrule_kind, days_of_week, hour, minute, anchor_date, created_at')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }
  return NextResponse.json(data);
}
