import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { autoAddOneContact, pickProviderFromHour } from '@/lib/contact-auto-add';
import type { SuggestProvider } from '@/lib/contact-suggest';

// POST /api/levers/auto-contact/pull
//
// Super-admin lever that runs the same "find one + dedup + insert"
// flow as the hourly cron, but attributed to the puller and with
// the provider exposed as an optional override. The lever UI on
// /feather/levers calls this with provider='auto' to mirror cron
// parity (so a manual pull doesn't break the alternation rhythm),
// but the body accepts an explicit 'claude' | 'gemini' for the
// admin who wants to compare outputs side-by-side.

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface PullBody {
  provider?: SuggestProvider | 'auto';
  steer?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_super_admin) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  let body: PullBody = {};
  try { body = (await req.json()) as PullBody; } catch { /* allow empty */ }
  const provider: SuggestProvider | 'auto' = body.provider === 'gemini' || body.provider === 'claude'
    ? body.provider
    : 'auto';
  const resolvedProvider: SuggestProvider = provider === 'auto'
    ? pickProviderFromHour()
    : provider;
  const steer = typeof body.steer === 'string' ? body.steer.slice(0, 600) : '';

  const admin = getAdminSupabase();
  const result = await autoAddOneContact({
    admin,
    createdByUserId: user.id,
    provider: resolvedProvider,
    extraSteer: steer || undefined,
    source: resolvedProvider === 'gemini' ? 'lever-add-with-gemini' : 'lever-add-with-claude',
  });

  return NextResponse.json(result);
}
