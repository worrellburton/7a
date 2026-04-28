import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/unread-count
//
// Accessible to admins and Marketing & Admissions department members.
// Returns two parallel views of the inbox:
//   * `total / vobs / forms` — submissions with status='new' and not
//     marked spam (the sidebar badge has used this shape since
//     launch). Spam rows are excluded so a wave of bot submissions
//     doesn't keep the badge lit indefinitely.
//   * `unresponded` — submissions where responded_at is NULL and
//     not spam, broken down into VOBs / contact forms / careers. The
//     home-page widget uses this; "responded" is the action a
//     coordinator actually takes ("I responded" button), which is a
//     stronger signal than the legacy status enum.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();
  const [
    vobsNew,
    formsNew,
    vobsUnresponded,
    formsUnresponded,
    careersUnresponded,
  ] = await Promise.all([
    admin.from('vob_requests').select('id', { count: 'exact', head: true }).eq('status', 'new').is('spam_at', null),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new').is('spam_at', null),
    admin.from('vob_requests').select('id', { count: 'exact', head: true }).is('responded_at', null).is('spam_at', null),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).is('responded_at', null).is('spam_at', null).neq('source', 'careers'),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).is('responded_at', null).is('spam_at', null).eq('source', 'careers'),
  ]);

  const vobCount = vobsNew.count ?? 0;
  const formsCount = formsNew.count ?? 0;
  const vobsUn = vobsUnresponded.count ?? 0;
  const formsUn = formsUnresponded.count ?? 0;
  const careersUn = careersUnresponded.count ?? 0;
  return NextResponse.json({
    total: vobCount + formsCount,
    vobs: vobCount,
    forms: formsCount,
    unresponded: {
      total: vobsUn + formsUn + careersUn,
      vobs: vobsUn,
      forms: formsUn,
      careers: careersUn,
    },
  });
}
