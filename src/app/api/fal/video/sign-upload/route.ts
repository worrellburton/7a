import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

const ARCHIVE_BUCKET = 'public-images';
const ARCHIVE_PREFIX = 'site-videos';

// POST /api/fal/video/sign-upload — direct-to-storage video upload.
//
// Vercel serverless functions cap request bodies at ~4.5 MB, which
// makes the legacy /upload route useless for any video bigger than
// a quick clip. This route mints a short-lived signed upload URL
// pointed at Supabase Storage; the browser then PUTs the file
// directly via supabase.storage.uploadToSignedUrl(), bypassing
// Vercel entirely. Pair with /finalize once the upload succeeds.
//
// Body: { filename: string }
// Returns: { videoId, path, token, signedUrl }

interface Body { filename?: string }

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* default */ }
  const filename = body.filename ?? 'upload.mp4';
  const ext = (filename.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';

  const supabase = getAdminSupabase();

  const { data: row, error: insertErr } = await supabase
    .from('site_videos')
    .insert({
      source_image_id: null,
      request_id: null,
      model_endpoint: 'upload/direct',
      prompt: null,
      duration_seconds: null,
      resolution: null,
      aspect_ratio: null,
      status: 'queued',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertErr || !row) {
    return NextResponse.json(
      { error: `site_videos insert failed: ${insertErr?.message || 'unknown'}` },
      { status: 500 },
    );
  }

  const path = `${ARCHIVE_PREFIX}/${row.id}.${ext}`;
  const { data: signed, error: signErr } = await supabase.storage
    .from(ARCHIVE_BUCKET)
    .createSignedUploadUrl(path);

  if (signErr || !signed) {
    // Roll back the row so a failed mint doesn't leave a phantom video.
    await supabase.from('site_videos').delete().eq('id', row.id);
    return NextResponse.json(
      { error: `signed URL mint failed: ${signErr?.message || 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    videoId: row.id,
    path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}
