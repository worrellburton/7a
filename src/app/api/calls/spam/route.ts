import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/calls-shared';

// GET    /api/calls/spam                 — list all spam-marked numbers
// POST   /api/calls/spam { number }      — mark a number as spam
// DELETE /api/calls/spam?number=...      — remove a number from the list
//
// Replaces the per-browser localStorage spam registry so the list is
// shared across users and survives cache clears.

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('call_spam_numbers')
    .select('phone_normalized, reported_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    numbers: (data ?? []).map(r => r.phone_normalized as string),
    entries: data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { number?: string };
  const normalized = normalizePhone(body.number);
  if (!normalized) {
    return NextResponse.json({ error: 'number is required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('call_spam_numbers')
    .upsert(
      {
        phone_normalized: normalized,
        reported_by: user.id,
      },
      { onConflict: 'account_id,phone_normalized' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, number: normalized });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const normalized = normalizePhone(url.searchParams.get('number'));
  if (!normalized) {
    return NextResponse.json({ error: 'number is required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from('call_spam_numbers')
    .delete()
    .eq('phone_normalized', normalized);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, number: normalized });
}
