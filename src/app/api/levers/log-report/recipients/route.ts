import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/levers/log-report/recipients
// PUT  /api/levers/log-report/recipients
//
// Per-lever saved recipient cohort. The UI's recipients picker
// posts its selection here on Save; the cron handler at
// /api/cron/levers/log-report and the manual pull at
// /api/levers/log-report/pull both read it back and use it as the
// send-to list, falling back to "every super admin" only when the
// saved list is empty.
//
// Storage lives on public.lever_schedules.recipient_user_ids
// (uuid[]) — one row per lever_type, so a single upsert by
// lever_type keeps the schedule + recipient set side-by-side
// without a join table.

export const dynamic = 'force-dynamic';

const LEVER_TYPE = 'log-report';

interface PutBody {
  recipientUserIds?: unknown;
}

async function requireSuperAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: meRow } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return { ok: false as const, res: NextResponse.json({ error: 'Super admin only' }, { status: 403 }) };
  }
  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('lever_schedules')
    .select('recipient_user_ids, updated_at')
    .eq('lever_type', LEVER_TYPE)
    .maybeSingle();
  return NextResponse.json({
    recipientUserIds: (data?.recipient_user_ids as string[] | null) ?? [],
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;

  let body: PutBody = {};
  try { body = (await req.json()) as PutBody; } catch { /* allow empty body = clear */ }

  // Sanitize: keep only non-empty string ids and dedupe so a
  // double-toggle bug in the UI never bloats the array. We don't
  // verify each id resolves to a real user row here — the cron
  // and pull routes both re-select on users.id, so a stale id
  // just drops out of the eventual recipient set.
  const raw = Array.isArray(body.recipientUserIds) ? body.recipientUserIds : [];
  const sanitized = Array.from(new Set(
    raw.filter((v): v is string => typeof v === 'string' && v.length > 0),
  ));

  const admin = getAdminSupabase();
  // Upsert by lever_type. The row already exists from the
  // 20260521_lever_schedules.sql seed, but onConflict still keeps
  // the operation idempotent if a future lever wants to use this
  // route before a schedule row is in place. The schedule fields
  // need values to satisfy the NOT NULL CHECK constraints, so we
  // read the existing row's values and re-write them rather than
  // pass dummy zeros that would silently move the auto-fire window.
  const { data: existing } = await admin
    .from('lever_schedules')
    .select('day_of_week, hour_utc, enabled, display_timezone')
    .eq('lever_type', LEVER_TYPE)
    .maybeSingle();
  const dayOfWeek = existing?.day_of_week ?? 1;
  const hourUtc = existing?.hour_utc ?? 1;
  const enabled = existing?.enabled ?? true;
  const displayTimezone = existing?.display_timezone ?? 'America/Phoenix';

  const { error } = await admin
    .from('lever_schedules')
    .upsert({
      lever_type: LEVER_TYPE,
      enabled,
      day_of_week: dayOfWeek,
      hour_utc: hourUtc,
      display_timezone: displayTimezone,
      recipient_user_ids: sanitized,
      updated_by: gate.userId,
    }, { onConflict: 'lever_type' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recipientUserIds: sanitized });
}
