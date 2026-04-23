import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

const ARCHIVE_BUCKET = 'public-images';
const ARCHIVE_PREFIX = 'site-videos';

// POST /api/fal/video/upload — upload a user-supplied video file directly
// (no fal.ai generation). The file lands in the same public-images bucket
// under the site-videos/ prefix that fal-generated clips use, and a
// `site_videos` row is inserted with status='completed' so it renders in
// the same gallery.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: `Expected a video file, got ${file.type || 'unknown type'}` },
        { status: 400 },
      );
    }

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
      .select()
      .single();

    if (insertErr || !row) {
      return NextResponse.json(
        { error: `site_videos insert failed: ${insertErr?.message || 'unknown'}` },
        { status: 500 },
      );
    }

    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const storagePath = `${ARCHIVE_PREFIX}/${row.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(ARCHIVE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'video/mp4',
        upsert: true,
        cacheControl: '31536000',
      });

    if (upErr) {
      await supabase
        .from('site_videos')
        .update({
          status: 'failed',
          error: `storage upload failed: ${upErr.message}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      return NextResponse.json(
        { error: `storage upload failed: ${upErr.message}` },
        { status: 500 },
      );
    }

    const { data: pub } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl || null;

    const { data: updated, error: updErr } = await supabase
      .from('site_videos')
      .update({
        status: 'completed',
        video_url: publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select()
      .single();

    if (updErr || !updated) {
      return NextResponse.json(
        { error: `site_videos update failed: ${updErr?.message || 'unknown'}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ video: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
