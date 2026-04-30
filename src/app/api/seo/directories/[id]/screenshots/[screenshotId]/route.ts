import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// DELETE /api/seo/directories/[id]/screenshots/[screenshotId]
//
// Removes the storage blob + the DB row. Authorization mirrors the
// RLS policy on the table: the uploader can delete their own,
// admins can delete any. We use the admin client for the storage
// delete (the bucket policy is service-role-only for writes/
// deletes), but verify auth + ownership against the row before
// touching anything.

export const dynamic = 'force-dynamic';

const BUCKET = 'public-images';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; screenshotId: string }> },
) {
  const { id: directoryId, screenshotId } = await params;
  if (!directoryId || !screenshotId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: u } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!u?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminSupabase();
  // Fetch the row first so we have the storage_path. Also lets us
  // enforce ownership for non-admin uploaders if we ever loosen
  // the route gate to allow that.
  const { data: row, error: fetchError } = await admin
    .from('seo_directory_screenshots')
    .select('id, directory_id, storage_path, uploaded_by')
    .eq('id', screenshotId)
    .maybeSingle();
  if (fetchError || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (row.directory_id !== directoryId) {
    return NextResponse.json({ error: 'Mismatched directory' }, { status: 400 });
  }

  // Delete storage first; on storage failure we keep the DB row so
  // the user sees the failure and can retry. On DB-delete failure
  // we accept a temporary orphan row pointing at a removed blob —
  // the row's public_url will 404 but it's better than a phantom
  // blob with no row.
  const removeRes = await admin.storage.from(BUCKET).remove([row.storage_path]);
  if (removeRes.error) {
    return NextResponse.json(
      { error: `Storage delete failed: ${removeRes.error.message}` },
      { status: 502 },
    );
  }
  const { error: deleteError } = await admin
    .from('seo_directory_screenshots')
    .delete()
    .eq('id', screenshotId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
