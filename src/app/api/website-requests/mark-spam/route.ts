import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/mark-spam
//   body: { id: string, spam: boolean }
//
// Toggle the is_spam flag on a contact_submissions row. Soft-removes
// junk from the Forms inbox without losing audit trail. Accessible
// to admins and Marketing & Admissions department members.
//
// If the is_spam column hasn't been deployed yet (migration
// 20260427_contact_submissions_is_spam.sql), we surface a clear
// 503 so the UI can degrade gracefully — same pattern as the
// responded_* columns in /api/website-requests/forms.

export const dynamic = 'force-dynamic';

type Body = { id?: string; spam?: boolean };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { id } = body;
  const spam = body.spam !== false; // default true
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contact_submissions')
    .update({ is_spam: spam })
    .eq('id', id)
    .select('id, is_spam')
    .maybeSingle();

  if (error) {
    if (/is_spam/i.test(error.message)) {
      return NextResponse.json(
        { error: 'is_spam column not deployed — apply migration 20260427_contact_submissions_is_spam.sql' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, id: data.id, is_spam: data.is_spam });
}
