import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/levers/log-report/test
//
// Sends the weekly Log Report to ONE arbitrary email address so
// the super admin pulling the lever can preview the actual inbox
// experience before broadcasting. Reuses the same render path as
// the real pull (Phase 2 ships the renderer; Phase 5 wires this
// up to Resend).
//
// Phase 1 stub — accepts an email body, validates the address,
// echoes back a fake-success payload. The lever's UI is fully
// functional from this stub so the rest of the flow can be wired
// before the real send lands.

export const dynamic = 'force-dynamic';

interface TestBody { to?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  let body: TestBody = {};
  try { body = (await req.json()) as TestBody; } catch { /* allow empty */ }
  const to = (body.to ?? '').trim();
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'Provide a valid email address.' }, { status: 400 });
  }

  // Phase 5 swaps this for a real Resend POST that delivers the
  // rendered 2-page recap. For now we echo back so the lever UI
  // can run end-to-end against the stub.
  return NextResponse.json({
    ok: true,
    simulated: true,
    sentTo: to,
    phase: 1,
    note: 'Phase 1 stub — the actual send wires up in Phase 5.',
  });
}
