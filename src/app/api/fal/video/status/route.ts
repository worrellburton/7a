import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

const FAL_QUEUE_BASE = 'https://queue.fal.run';

// We archive fal.ai's CDN output into our own Supabase Storage so the
// URL we hand to the site outlives fal's CDN retention window (fal
// rotates files). Videos + thumbnails go under a site-videos/ prefix
// in the existing public-images bucket.
const ARCHIVE_BUCKET = 'public-images';
const ARCHIVE_PREFIX = 'site-videos';

// Copy a fal URL into our storage bucket and return the public URL.
// On any failure, returns null so callers can fall back to the fal URL
// (short-term link still works; we just didn't archive this time).
async function archiveAsset(
  supabase: SupabaseClient,
  sourceUrl: string,
  storagePath: string,
  contentType: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error('[video/status] fal asset fetch failed', res.status, storagePath);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(ARCHIVE_BUCKET)
      .upload(storagePath, buf, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      });
    if (upErr) {
      console.error('[video/status] supabase upload failed', upErr.message, storagePath);
      return null;
    }
    const { data: pub } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath);
    return pub?.publicUrl || null;
  } catch (err) {
    console.error('[video/status] archive error', err, storagePath);
    return null;
  }
}

// Poll fal.ai for a given site_videos row, update the local row when
// it transitions, and return the refreshed row. Callers just hit this
// on an interval per queued/in-progress video and stop when status
// becomes `completed` or `failed`.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getAdminSupabase();
  const { data: row, error: loadErr } = await supabase
    .from('site_videos')
    .select('*')
    .eq('id', id)
    .single();

  if (loadErr || !row) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Already resolved — skip the network call.
  if (row.status === 'completed' || row.status === 'failed' || row.status === 'canceled') {
    return NextResponse.json({ video: row });
  }

  if (!row.request_id) {
    return NextResponse.json({ error: 'Video has no request_id to poll' }, { status: 400 });
  }

  const statusRes = await fetch(
    `${FAL_QUEUE_BASE}/${row.model_endpoint}/requests/${row.request_id}/status`,
    { headers: { Authorization: `Key ${falKey}` } },
  );

  if (!statusRes.ok) {
    const text = await statusRes.text();
    return NextResponse.json(
      { error: `fal.ai status ${statusRes.status}: ${text.slice(0, 500)}`, video: row },
      { status: 502 },
    );
  }

  const statusJson = (await statusRes.json()) as {
    status?: string;
    logs?: Array<{ message?: string }>;
  };
  const falStatus = (statusJson.status || '').toUpperCase();

  let nextStatus: string = row.status;
  if (falStatus === 'IN_QUEUE') nextStatus = 'queued';
  else if (falStatus === 'IN_PROGRESS') nextStatus = 'in_progress';
  else if (falStatus === 'COMPLETED') nextStatus = 'completed';
  else if (falStatus === 'FAILED') nextStatus = 'failed';

  let videoUrl: string | null = row.video_url;
  let thumbnailUrl: string | null = row.thumbnail_url;
  let errorMsg: string | null = row.error;

  // When complete, fetch the response body to extract the video URL,
  // then copy the asset into our own Supabase Storage so we don't
  // depend on fal's CDN retention. If archiving fails for any reason,
  // fall back to the fal URL so the link still works short-term.
  if (nextStatus === 'completed' && !videoUrl) {
    const resultRes = await fetch(
      `${FAL_QUEUE_BASE}/${row.model_endpoint}/requests/${row.request_id}`,
      { headers: { Authorization: `Key ${falKey}` } },
    );
    if (resultRes.ok) {
      const resultJson = (await resultRes.json()) as {
        video?: { url?: string };
        video_url?: string;
        thumbnail?: { url?: string };
        thumbnail_url?: string;
      };
      const falVideoUrl = resultJson.video?.url || resultJson.video_url || null;
      const falThumbUrl = resultJson.thumbnail?.url || resultJson.thumbnail_url || null;

      if (falVideoUrl) {
        const archivedVideo = await archiveAsset(
          supabase,
          falVideoUrl,
          `${ARCHIVE_PREFIX}/${row.id}.mp4`,
          'video/mp4',
        );
        videoUrl = archivedVideo || falVideoUrl;
      }
      if (falThumbUrl) {
        const archivedThumb = await archiveAsset(
          supabase,
          falThumbUrl,
          `${ARCHIVE_PREFIX}/${row.id}-thumb.jpg`,
          'image/jpeg',
        );
        thumbnailUrl = archivedThumb || falThumbUrl;
      }
    }
  }

  if (nextStatus === 'failed') {
    const lastLog = (statusJson.logs || []).slice(-1)[0]?.message;
    errorMsg = lastLog || errorMsg || 'fal.ai reported failure';
  }

  if (nextStatus !== row.status || videoUrl !== row.video_url || thumbnailUrl !== row.thumbnail_url) {
    const { data: updated, error: upErr } = await supabase
      .from('site_videos')
      .update({
        status: nextStatus,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        error: errorMsg,
        completed_at:
          nextStatus === 'completed' || nextStatus === 'failed' ? new Date().toISOString() : row.completed_at,
      })
      .eq('id', id)
      .select()
      .single();
    if (upErr) {
      return NextResponse.json({ error: upErr.message, video: row }, { status: 500 });
    }
    return NextResponse.json({ video: updated });
  }

  return NextResponse.json({ video: row });
}
