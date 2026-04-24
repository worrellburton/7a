import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/public/contact
// Public endpoint for every non-VOB form on the public site. The
// caller indicates which form it is via `source`:
//
//   'contact_page'  — /contact page (ContactPageForm), has message
//   'footer'        — Footer form globally, has payment_method + consent
//   'exit_intent'   — ExitIntentModal, email-only
//   'other'         — future forms; won't 500 on unexpected source
//
// All rows land in public.form_submissions. The admin list at
// /app/website-requests/forms filters/groups by source.

export const dynamic = 'force-dynamic';

type Source = 'contact_page' | 'footer' | 'exit_intent' | 'other';
const VALID_SOURCES: Source[] = ['contact_page', 'footer', 'exit_intent', 'other'];

interface Body {
  source?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone?: string;
  telephone?: string;
  email?: string;
  message?: string;
  payment_method?: string;
  paymentMethod?: string;
  consent?: boolean;
  page_url?: string;
}

function trim(value: unknown, max = 2000): string | null {
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

  const rawSource = typeof body.source === 'string' ? body.source : '';
  const source: Source = VALID_SOURCES.includes(rawSource as Source)
    ? (rawSource as Source)
    : 'other';

  const first_name = trim(body.first_name ?? body.firstName, 200);
  const last_name = trim(body.last_name ?? body.lastName, 200);
  const phone = trim(body.phone ?? body.telephone, 60);
  const email = trim(body.email, 200);
  const message = trim(body.message, 5000);
  const payment_raw = trim(body.payment_method ?? body.paymentMethod, 40);
  const payment_method = ['insurance', 'private-pay', 'other'].includes(payment_raw ?? '')
    ? (payment_raw as 'insurance' | 'private-pay' | 'other')
    : null;
  const consent = body.consent === true;
  const page_url = trim(body.page_url, 1000);
  const user_agent = trim(req.headers.get('user-agent'), 500);

  if (!first_name && !last_name && !email && !phone && !message) {
    return NextResponse.json({ error: 'At least one field required' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('form_submissions')
    .insert({
      source,
      first_name,
      last_name,
      phone,
      email,
      message,
      payment_method,
      consent,
      page_url,
      user_agent,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[contact] insert failed: ${error.message}`);
    return NextResponse.json({ error: 'Could not save your submission' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
