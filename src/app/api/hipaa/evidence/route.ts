import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// PUT  /api/hipaa/evidence    — upsert evidence for one check
// DELETE /api/hipaa/evidence?check_id=…  — clear evidence
//
// The upsert body:
//   { check_id, status_override: 'pass'|'fail'|null,
//     note, evidence_url, expires_at }
//
// Super-admin only — RLS would block anyone else, but we gate
// the route too so the failure mode is a 403 not a silent
// no-op.

export const dynamic = 'force-dynamic';

interface Body {
  check_id?: string;
  status_override?: 'pass' | 'fail' | null;
  note?: string | null;
  evidence_url?: string | null;
  expires_at?: string | null;
}

export async function PUT(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: Body = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const checkId = (body.check_id ?? '').trim();
  if (!checkId) return NextResponse.json({ error: 'check_id required' }, { status: 400 });
  const status = body.status_override === 'pass' || body.status_override === 'fail'
    ? body.status_override
    : null;

  const admin = getAdminSupabase();
  const { error } = await admin.from('hipaa_check_evidence').upsert({
    check_id: checkId,
    status_override: status,
    note: body.note?.trim() || null,
    evidence_url: body.evidence_url?.trim() || null,
    expires_at: body.expires_at || null,
    confirmed_by: auth.user.id,
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'check_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const checkId = url.searchParams.get('check_id');
  if (!checkId) return NextResponse.json({ error: 'check_id query param required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { error } = await admin.from('hipaa_check_evidence').delete().eq('check_id', checkId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
