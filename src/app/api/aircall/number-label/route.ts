import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET  /api/aircall/number-label                → { labels: {num:name}, sources: {num:source} }
// GET  /api/aircall/number-label?number=<digits> → { number, name, source }
// POST /api/aircall/number-label { number, name?, source? } → partial update
//
// Per-number metadata for caller phone numbers, keyed by digit-only
// caller_number: an operator-assigned display name and an admin override
// of the "how did you hear about us?" source. Both overlay the calls
// grid for every call from that number. Staff-gated; all reads/writes go
// through the service-role admin client so the table can stay RLS-locked.

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
      .select('number, name, source')
      .eq('number', number)
      .maybeSingle();
    return NextResponse.json({
      number,
      name: (data?.name as string | undefined) || null,
      source: (data?.source as string | undefined) || null,
    });
  }

  // No number → return every label + source so the calls grid can
  // overlay them in one shot (the table is tiny).
  const { data, error } = await admin
    .from('aircall_number_labels')
    .select('number, name, source');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const labels: Record<string, string> = {};
  const sources: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ number: string; name: string | null; source: string | null }>) {
    if (r.name) labels[r.number] = r.name;
    if (r.source) sources[r.number] = r.source;
  }
  return NextResponse.json({ labels, sources });
}

export async function POST(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const admin = gate.admin;

  let body: { number?: string; name?: string; source?: string } = {};
  try { body = (await req.json()) as { number?: string; name?: string; source?: string }; } catch { /* allow empty */ }
  const number = normalize(body.number);
  if (!number) return NextResponse.json({ error: 'Missing number.' }, { status: 400 });

  // Partial update: only the fields present in the body change. An empty
  // string clears that field; an absent field is left as-is.
  const { data: existing } = await admin
    .from('aircall_number_labels')
    .select('name, source')
    .eq('number', number)
    .maybeSingle();

  const name = body.name !== undefined ? body.name.trim() : ((existing?.name as string | undefined) ?? '');
  const source = body.source !== undefined ? body.source.trim() : ((existing?.source as string | undefined) ?? '');

  // Both empty → drop the row entirely.
  if (!name && !source) {
    const { error } = await admin.from('aircall_number_labels').delete().eq('number', number);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, number, name: null, source: null });
  }

  const { error } = await admin
    .from('aircall_number_labels')
    .upsert(
      { number, name, source, updated_by: gate.userId, updated_at: new Date().toISOString() },
      { onConflict: 'number' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, number, name: name || null, source: source || null });
}
