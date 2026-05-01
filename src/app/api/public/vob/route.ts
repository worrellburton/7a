import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/public/vob
// Public endpoint. Receives insurance-verification requests from the
// AdmissionsForm component (mounted on /admissions and every
// /insurance/* landing page). No auth — lives behind the same CSRF
// posture as the rest of the public site.
//
// Card photos are uploaded by the form directly to the private
// `vob-cards` storage bucket via the anon key (RLS allows insert
// only). The resulting storage paths arrive here as
// cardFrontPath / cardBackPath and we persist them on the row.

export const dynamic = 'force-dynamic';

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  insuranceProvider?: string;
  insurance_provider?: string;
  cardFrontPath?: string | null;
  cardBackPath?: string | null;
}

// Accept YYYY-MM-DD only (the format the <input type="date"> emits in
// every browser). Reject anything else so we never insert garbage
// into a `date` column. Also reject future dates and anything before
// 1900 — those are clearly typos rather than real birthdates.
function parseDob(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const year = Number(s.slice(0, 4));
  if (year < 1900) return null;
  if (d.getTime() > Date.now()) return null;
  return s;
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
  const date_of_birth = parseDob(body.dateOfBirth ?? body.date_of_birth);
  // Storage paths are short and safe to trust at face value — they
  // come from a successful upload to a bucket that only allows the
  // anon role to INSERT, never to read or list. Still constrain to a
  // reasonable length and require they sit inside the random-token
  // folder structure the form generates.
  const card_front_path = trim(body.cardFrontPath, 300);
  const card_back_path = trim(body.cardBackPath, 300);
  const looksLikeCardPath = (p: string | null) => p === null || /^[A-Za-z0-9_-]+\/(front|back)\.[A-Za-z0-9]+$/.test(p);
  const safeFront = looksLikeCardPath(card_front_path) ? card_front_path : null;
  const safeBack = looksLikeCardPath(card_back_path) ? card_back_path : null;

  if (!full_name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: 'phone or email required' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .insert({
      full_name,
      phone,
      email,
      date_of_birth,
      insurance_provider,
      card_front_path: safeFront,
      card_back_path: safeBack,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[vob] insert failed: ${error.message}`);
    return NextResponse.json({ error: 'Could not save your request' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
