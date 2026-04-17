import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/claude/calls/set-operator
// Body: { callId: string, operator_name: string | null }
// Manually sets or clears the operator_name on an existing call_ai_scores row.
// If no row exists yet, inserts a minimal stub so the name can be remembered
// before an AI analysis has run.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { callId?: string; operator_name?: string | null };
  const callId = body.callId;
  if (!callId) return NextResponse.json({ error: 'callId required' }, { status: 400 });

  const operatorName = typeof body.operator_name === 'string' ? body.operator_name.trim() || null : null;

  const supabase = getAdminSupabase();

  const { data: existing } = await supabase
    .from('call_ai_scores')
    .select('*')
    .eq('call_id', callId)
    .single();

  if (existing) {
    const { data: updated, error } = await supabase
      .from('call_ai_scores')
      .update({ operator_name: operatorName })
      .eq('call_id', callId)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: updated });
  }

  const stub = {
    call_id: callId,
    score: 0,
    operator_name: operatorName,
    summary: '',
    operator_strengths: [],
    operator_weaknesses: [],
    scored_at: new Date().toISOString(),
  };
  const { data: inserted, error } = await supabase
    .from('call_ai_scores')
    .upsert(stub, { onConflict: 'call_id' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: inserted });
}
