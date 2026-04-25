import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

const ARCHIVE_BUCKET = 'public-images';

// POST /api/fal/video/finalize
//   body: { videoId: string, path: string }
//
// Called by /app/video after a direct-to-storage upload (via
// /sign-upload + supabase.uploadToSignedUrl) lands. We verify the
// caller actually started this row, confirm the object is in
// storage, stamp the public URL onto the site_videos row, and
// flip status to 'completed' so the gallery picks it up.

interface Body { videoId?: string; path?: string }

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* default */ }
  const { videoId, path } = body;
  if (!videoId || !path) {
    return NextResponse.json({ error: 'videoId and path are required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Caller must own the row. Stops cross-user finalize hijacks.
  const { data: row } = await supabase
    .from('site_videos')
    .select('id, created_by')
    .eq('id', videoId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Confirm the storage object actually exists before flipping the
  // row to completed — otherwise a buggy/aborted client could mark
  // a phantom video as ready.
  const { data: head } = await supabase.storage
    .from(ARCHIVE_BUCKET)
    .list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop() ?? '',
      limit: 1,
    });
  const exists = Array.isArray(head) && head.some((f) => path.endsWith(f.name));
  if (!exists) {
    return NextResponse.json({ error: 'Object not found in storage yet' }, { status: 409 });
  }

  const { data: pub } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl || null;

  const { data: updated, error: updErr } = await supabase
    .from('site_videos')
    .update({
      status: 'completed',
      video_url: publicUrl,
      completed_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .select()
    .single();

  if (updErr || !updated) {
    return NextResponse.json(
      { error: `site_videos update failed: ${updErr?.message || 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ video: updated });
}
