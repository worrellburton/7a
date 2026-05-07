import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// DELETE /api/users/<id> — super-admin-only.
//
// Hard-removes a user so they can't sign back in:
//   1. Resolve the target's email from auth.users (canonical) or
//      public.users as a fallback.
//   2. Insert each known email (auth + public) into public.denied_emails.
//      handle_user_sign_in() reads from this table; any future Google
//      sign-in by the same address recreates a public.users row but
//      stamps status='denied' so the PlatformShell denied splash
//      kicks in and signs them out immediately.
//   3. Hard-delete the auth.users row via the service-role admin API.
//      That invalidates every active session token — the user is
//      bumped from any open tab on the next refresh, not on the next
//      OAuth handshake.
//   4. Hard-delete the public.users row (no FK CASCADE from auth →
//      public, so we have to do it ourselves).
//   5. Done — even if the user re-runs OAuth, the new auth.users row
//      gets the denied stamp and the gate trips.

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const requester = await getUserFromRequest(req);
  if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();

  const { data: requesterRow, error: requesterErr } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', requester.id)
    .maybeSingle();
  if (requesterErr) return NextResponse.json({ error: requesterErr.message }, { status: 500 });
  if (!requesterRow?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 });
  }

  const { id: targetId } = await ctx.params;
  if (!targetId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (targetId === requester.id) {
    return NextResponse.json({ error: "You can't delete yourself" }, { status: 400 });
  }

  // Collect every email the target has used. auth.users is canonical,
  // public.users is a backup in case auth.users is already gone.
  const emails = new Set<string>();

  const { data: authUser } = await supabase.auth.admin.getUserById(targetId);
  if (authUser?.user?.email) emails.add(authUser.user.email.toLowerCase());

  const { data: publicUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', targetId)
    .maybeSingle();
  if (publicUser?.email) emails.add(publicUser.email.toLowerCase());

  if (emails.size === 0) {
    return NextResponse.json({ error: 'No matching user found' }, { status: 404 });
  }

  // Add every email to the deny list. ON CONFLICT DO NOTHING so a
  // re-delete of the same person doesn't error on the duplicate row.
  const denyRows = Array.from(emails).map((email) => ({
    email,
    reason: 'Removed from team via /app/team',
    banned_by: requester.id,
  }));
  const { error: denyErr } = await supabase
    .from('denied_emails')
    .upsert(denyRows, { onConflict: 'email' });
  if (denyErr) return NextResponse.json({ error: denyErr.message }, { status: 500 });

  // Hard-delete the auth.users row. This also invalidates any active
  // session token. If the user is already gone, this is a no-op error
  // we can ignore.
  const { error: authDelErr } = await supabase.auth.admin.deleteUser(targetId);
  if (authDelErr && !/not.*found/i.test(authDelErr.message)) {
    return NextResponse.json({ error: authDelErr.message }, { status: 500 });
  }

  // No FK from public.users → auth.users, so we have to clean up
  // explicitly. Do this LAST — auth.users delete is the destructive
  // step; if it fails we want public.users still intact.
  const { error: pubDelErr } = await supabase
    .from('users')
    .delete()
    .eq('id', targetId);
  if (pubDelErr) return NextResponse.json({ error: pubDelErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deniedEmails: Array.from(emails),
  });
}
