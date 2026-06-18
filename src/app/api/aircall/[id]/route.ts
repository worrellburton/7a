import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/aircall/[id] — a single Aircall call by its numeric
// aircall_id, including the full transcript / summary / AI payload.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const aircallId = Number(id);
  if (!Number.isFinite(aircallId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const supabase = gate.admin;
  const { data, error } = await supabase
    .from('aircall_calls')
    .select('*')
    .eq('aircall_id', aircallId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

  return NextResponse.json({ call: data });
}
