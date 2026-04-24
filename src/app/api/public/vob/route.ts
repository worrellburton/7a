import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/public/vob
// Public endpoint. Receives insurance-verification requests from the
// AdmissionsForm component (mounted on /admissions and every
// /insurance/* landing page). No auth — lives behind the same CSRF
// posture as the rest of the public site.
//
// Card photos are not persisted yet (phase 2 needs a private Supabase
// storage bucket + signed URL plumbing). The form still attempts to
// submit them; we just don't store them.

export const dynamic = 'force-dynamic';

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  insuranceProvider?: string;
  insurance_provider?: string;
}

function trim(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const full_name = trim(body.name, 200);
  const phone = trim(body.phone, 60);
  const email = trim(body.email, 200);
  const insurance_provider = trim(body.insuranceProvider ?? body.insurance_provider, 200);

  if (!full_name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: 'phone or email required' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .insert({ full_name, phone, email, insurance_provider })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[vob] insert failed: ${error.message}`);
    return NextResponse.json({ error: 'Could not save your request' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
