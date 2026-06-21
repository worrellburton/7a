import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { readFlag } from '@/lib/app-flags';

// GET  /api/social-media/queue-slots → { slots: { weekday, time }[] }
// PUT  /api/social-media/queue-slots → { slots } (super admin only)
//
// Team-wide recurring posting slots (e.g. Mon 09:00, Wed 09:00, Fri 12:00).
// "Queue" a Ready draft and it schedules into the next slot not already
// taken. Stored as an app_flag so it's shared, not per-browser.

export const dynamic = 'force-dynamic';

interface Slot { weekday: number; time: string }

function sanitize(raw: unknown): Slot[] {
  if (!Array.isArray(raw)) return [];
  const out: Slot[] = [];
  for (const s of raw) {
    const weekday = Number((s as { weekday?: unknown }).weekday);
    const time = String((s as { time?: unknown }).time ?? '');
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
    out.push({ weekday, time });
  }
  // De-dupe + sort by weekday then time.
  const seen = new Set<string>();
  return out
    .filter((s) => { const k = `${s.weekday}|${s.time}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time))
    .slice(0, 40);
}

export async function GET() {
  const slots = sanitize(await readFlag<unknown>('social_queue_slots', []));
  return NextResponse.json({ slots });
}

export async function PUT(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: { slots?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const slots = sanitize(body.slots);

  const admin = getAdminSupabase();
  const { error } = await admin.from('app_flags').upsert({
    key: 'social_queue_slots',
    value: slots,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots });
}
