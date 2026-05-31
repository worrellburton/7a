import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/alumni/check-in
//
// Daily "I'm still sober today" check-in for the alumni time-sober
// feature. Body: { reset?: boolean }.
//
// Normal check-in:
//   - bumps check_in_streak based on the Phoenix-day delta since the
//     last check-in (same day = no-op, yesterday = +1, gap = reset
//     to 1), and stamps last_check_in_at = now.
//   - DOES NOT touch sobriety_date — the days-sober counter is
//     anchored to the start date and never silently resets.
//
// reset = true (the gentle "Reset my date" path):
//   - additionally sets sobriety_date to today (Phoenix). Recovery
//     isn't linear; this is a fresh start, not a failure. The
//     check-in streak still counts (they showed up to reset).
//
// Server-authoritative: streak math runs here with the service-role
// client scoped to the authenticated user's own row, so a stale tab
// or hand-crafted request can't inflate someone's streak.

export const dynamic = 'force-dynamic';

// Phoenix is UTC-7 year-round (no DST). A "day index" is the number
// of whole days since the epoch in Phoenix-local time — subtract the
// 7h offset before flooring so the boundary lands at Phoenix midnight.
const PHX_OFFSET_MS = 7 * 60 * 60 * 1000;
function phoenixDayIndex(ms: number): number {
  return Math.floor((ms - PHX_OFFSET_MS) / 86_400_000);
}
function phoenixDateString(ms: number): string {
  // YYYY-MM-DD for the Phoenix calendar day containing `ms`.
  const shifted = new Date(ms - PHX_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { reset?: unknown };
  const reset = body.reset === true;

  const admin = getAdminSupabase();
  const { data: row, error: readErr } = await admin
    .from('alumni_profiles')
    .select('last_check_in_at, check_in_streak, sobriety_date, track_sobriety')
    .eq('user_id', user.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!row) {
    return NextResponse.json({ error: 'No alumni profile yet. Turn on time-sober tracking first.' }, { status: 400 });
  }

  const nowMs = Date.now();
  const todayIdx = phoenixDayIndex(nowMs);
  const lastMs = row.last_check_in_at ? Date.parse(row.last_check_in_at as string) : null;
  const lastIdx = lastMs != null && Number.isFinite(lastMs) ? phoenixDayIndex(lastMs) : null;
  const prevStreak = (row.check_in_streak as number | null) ?? 0;

  let streak: number;
  let alreadyToday = false;
  if (lastIdx === null) {
    streak = 1;
  } else if (lastIdx === todayIdx) {
    // Already checked in today — keep the streak, no double count.
    streak = Math.max(1, prevStreak);
    alreadyToday = true;
  } else if (lastIdx === todayIdx - 1) {
    streak = prevStreak + 1; // consecutive day
  } else {
    streak = 1; // missed a day (or more) — streak restarts
  }

  const update: Record<string, unknown> = {
    last_check_in_at: new Date(nowMs).toISOString(),
    check_in_streak: streak,
  };
  if (reset) {
    update.sobriety_date = phoenixDateString(nowMs);
    update.track_sobriety = true;
  }

  const { data: updated, error: updErr } = await admin
    .from('alumni_profiles')
    .update(update)
    .eq('user_id', user.id)
    .select('last_check_in_at, check_in_streak, sobriety_date')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    alreadyCheckedInToday: alreadyToday && !reset,
    reset,
    lastCheckInAt: updated?.last_check_in_at ?? update.last_check_in_at,
    checkInStreak: updated?.check_in_streak ?? streak,
    sobrietyDate: updated?.sobriety_date ?? row.sobriety_date,
  });
}
