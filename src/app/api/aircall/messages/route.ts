import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';
import { getAdminSupabase } from '@/lib/supabase-server';
import { aircallConfigured, sendAircallMessage } from '@/lib/aircall';

// GET  /api/aircall/messages  — recent SMS/MMS (both directions) plus the
//                               set of Aircall lines we can send from.
// POST /api/aircall/messages  — send an SMS through Aircall.
//
// Staff-only (caller PII). The persisted source of truth for messages is
// the webhook (message.* events); this POST just hands the send to Aircall
// and the resulting message.sent webhook writes the row. The UI renders an
// optimistic bubble in the meantime and reconciles via Realtime.

// Cap how many messages we hydrate the thread list with. A few hundred is
// plenty for the live conversation view; older history stays in Aircall.
const MESSAGE_LIMIT = 1000;

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const supabase = getAdminSupabase();

  const { data: messages, error } = await supabase
    .from('aircall_messages')
    .select(
      'id, aircall_message_id, direction, status, channel, number_id, number_name, number_digits, contact_number, raw_to, raw_from, body, media_url, user_name, sent_at, received_at, created_at',
    )
    .order('created_at', { ascending: true })
    .limit(MESSAGE_LIMIT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Lines we can send from = distinct Aircall numbers seen on calls. (We
  // don't keep a numbers table; the call log already enumerates them.)
  const { data: lines } = await supabase
    .from('aircall_calls')
    .select('number_id, number_name, number_digits')
    .not('number_id', 'is', null)
    .limit(2000);
  const numbersMap = new Map<number, { id: number; name: string | null; digits: string | null }>();
  for (const l of (lines ?? []) as Array<{ number_id: number | null; number_name: string | null; number_digits: string | null }>) {
    if (l.number_id != null && !numbersMap.has(l.number_id)) {
      numbersMap.set(l.number_id, { id: l.number_id, name: l.number_name, digits: l.number_digits });
    }
  }

  return NextResponse.json({
    messages: messages ?? [],
    numbers: [...numbersMap.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    configured: aircallConfigured(),
  });
}

// Best-effort E.164 normalisation. Keeps an explicit country code, assumes
// US/Canada (+1) for bare 10-digit numbers.
function normalizeE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
  const d = trimmed.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  return '+' + d;
}

export async function POST(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;

  if (!aircallConfigured()) {
    return NextResponse.json(
      { error: 'Aircall is not configured — set AIRCALL_API_ID and AIRCALL_API_TOKEN.' },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as { to?: string; body?: string; numberId?: number } | null;
  const to = String(body?.to ?? '').trim();
  const text = String(body?.body ?? '').trim();
  const numberId = Number(body?.numberId);
  if (!to || !text) {
    return NextResponse.json({ error: 'Both a recipient number and message text are required.' }, { status: 400 });
  }
  if (!Number.isFinite(numberId) || numberId <= 0) {
    return NextResponse.json({ error: 'A valid Aircall line (numberId) is required to send from.' }, { status: 400 });
  }

  try {
    const { id } = await sendAircallMessage({ numberId, to: normalizeE164(to), body: text });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send message.';
    console.error('[aircall/messages] send failed', msg);
    // 502 — the request was valid but Aircall rejected/failed it (often:
    // SMS not enabled on the number, or the number isn't messaging-capable).
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
