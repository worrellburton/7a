import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { checkContactSubmissionAudience } from '@/lib/contact-submission-audience';
import { logActivity } from '@/lib/activity';

// POST /api/contact-submissions/[id]/dismiss
//
// Inserts a per-user dismissal row so the toast disappears for
// THIS user only. Other audience members continue to see the
// notification until each of them dismisses or the submission is
// marked responded/spam upstream. Idempotent — duplicate inserts
// are swallowed via on-conflict-do-nothing.

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const audience = await checkContactSubmissionAudience(supabase, user.id);
  if (!audience.isAudience) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminSupabase();
  const { error } = await admin
    .from('contact_submission_dismissals')
    .upsert(
      { user_id: user.id, submission_id: id },
      { onConflict: 'user_id,submission_id' },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to the per-user activity feed so the user can later
  // remember they dismissed a submission rather than acting on it.
  // Fire-and-forget; never block the dismiss path.
  void logActivity({
    userId: user.id,
    type: 'contact_submission.dismissed',
    targetKind: 'contact_submission',
    targetId: id,
    targetLabel: 'Dismissed contact-form notification',
    targetPath: '/app/website-requests',
    metadata: {},
  });

  // Also drop the unused param into the body to avoid a lint warning.
  void req;

  return NextResponse.json({ ok: true });
}
