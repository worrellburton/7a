import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { checkContactSubmissionAudience } from '@/lib/contact-submission-audience';

// GET /api/contact-submissions/unseen
//
// Returns contact submissions that are:
//   - "new" (no responded_at, not flagged spam)  — the user said
//     "only when there are new statuses"; responded / spam rows
//     don't deserve a persistent toast
//   - not yet dismissed by the current user
// The current user must be in the audience (super admin or
// Marketing & Admissions). Non-audience users get an empty list
// rather than a 403 so the global mount can no-op silently.

export const dynamic = 'force-dynamic';

interface UnseenItem {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telephone: string | null;
  source: string | null;
  page_url: string | null;
  message: string | null;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const audience = await checkContactSubmissionAudience(supabase, user.id);
  if (!audience.isAudience) {
    return NextResponse.json({ items: [], audience: false });
  }

  // Pull the user's dismissed-submission ids so we can exclude them.
  const { data: dismissedRows } = await supabase
    .from('contact_submission_dismissals')
    .select('submission_id')
    .eq('user_id', user.id);
  const dismissed = new Set(
    (dismissedRows ?? []).map((r) => r.submission_id as string),
  );

  // Use the admin client so we don't depend on whatever RLS the
  // contact_submissions table has — audience check above already
  // gated this. Filter to "still new" (not responded, not spam).
  const admin = getAdminSupabase();
  const { data: rows, error } = await admin
    .from('contact_submissions')
    .select('id, created_at, first_name, last_name, email, telephone, source, page_url, message, responded_at, is_spam')
    .is('responded_at', null)
    .or('is_spam.is.null,is_spam.eq.false')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items: UnseenItem[] = (rows ?? [])
    .filter((r) => !dismissed.has(r.id as string))
    .map((r) => ({
      id: r.id as string,
      created_at: r.created_at as string,
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      telephone: (r.telephone as string | null) ?? null,
      source: (r.source as string | null) ?? null,
      page_url: (r.page_url as string | null) ?? null,
      message: (r.message as string | null) ?? null,
    }));

  return NextResponse.json({ items, audience: true });
}
