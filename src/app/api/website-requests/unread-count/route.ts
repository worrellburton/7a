import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/unread-count
//
// Accessible to admins and Marketing & Admissions department members.
// Returns counts for the remaining inbox surfaces:
//   * `total / forms` — contact submissions with status='new' and
//     not marked spam (the sidebar badge has used this shape since
//     launch).
//   * `unresponded` — contact submissions where responded_at is
//     NULL and not spam, broken down into forms / careers.
//
// VOBs are no longer counted here — they email directly to the
// admissions group from /api/public/vob, so there's no queue to
// burn down. The `vobs` field stays on the response (always 0) so
// older clients don't break, but new clients should ignore it.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();
  const [
    formsNew,
    formsUnresponded,
    careersUnresponded,
  ] = await Promise.all([
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new').is('spam_at', null),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).is('responded_at', null).is('spam_at', null).neq('source', 'careers'),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).is('responded_at', null).is('spam_at', null).eq('source', 'careers'),
  ]);

  const formsCount = formsNew.count ?? 0;
  const formsUn = formsUnresponded.count ?? 0;
  const careersUn = careersUnresponded.count ?? 0;
  return NextResponse.json({
    total: formsCount,
    vobs: 0,
    forms: formsCount,
    unresponded: {
      total: formsUn + careersUn,
      vobs: 0,
      forms: formsUn,
      careers: careersUn,
    },
  });
}
