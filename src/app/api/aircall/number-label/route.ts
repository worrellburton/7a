import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET  /api/aircall/number-label                → { labels: { [number]: name } }
// GET  /api/aircall/number-label?number=<digits> → { number, name }
// POST /api/aircall/number-label { number, name } → upsert (empty name deletes)
//
// Operator-assigned display names for caller phone numbers, keyed by the
// digit-only caller_number. Staff-gated; all reads/writes go through the
// service-role admin client so the table can stay RLS-locked.

export const dynamic = 'force-dynamic';

function normalize(n: string | null | undefined): string {
  return (n ?? '').replace(/\D/g, '');
}

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  const number = normalize(new URL(req.url).searchParams.get('number'));
  if (number) {
    const { data } = await admin
      .from('aircall_number_labels')
      .select('number, name')
      .eq('number', number)
      .maybeSingle();
    return NextResponse.json({ number, name: (data?.name as string | undefined) || null });
  }

  // No number → return every label so the calls grid can overlay them
  // in one shot (the table is tiny).
  const { data, error } = await admin
    .from('aircall_number_labels')
    .select('number, name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const labels: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ number: string; name: string }>) {
    if (r.name) labels[r.number] = r.name;
  }
  return NextResponse.json({ labels });
}

export async function POST(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  let body: { number?: string; name?: string } = {};
  try { body = (await req.json()) as { number?: string; name?: string }; } catch { /* allow empty */ }
  const number = normalize(body.number);
  const name = (body.name ?? '').trim();
  if (!number) return NextResponse.json({ error: 'Missing number.' }, { status: 400 });

  // Empty name clears the label.
  if (!name) {
    const { error } = await admin.from('aircall_number_labels').delete().eq('number', number);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, number, name: null });
  }

  const { error } = await admin
    .from('aircall_number_labels')
    .upsert({ number, name, updated_by: gate.userId, updated_at: new Date().toISOString() }, { onConflict: 'number' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, number, name });
}
