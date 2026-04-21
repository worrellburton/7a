import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

// fal.ai ByteDance Seedance — image-to-video. Docs call this the i2v
// (image-to-video) variant of the Seedance 1.0 Pro model.
//
// Override with env vars if fal publishes a new endpoint tag.
const FAL_ENDPOINT =
  process.env.FAL_SEEDANCE_ENDPOINT ||
  'fal-ai/bytedance/seedance/v1/pro/image-to-video';
const FAL_QUEUE_BASE = 'https://queue.fal.run';

interface CreateBody {
  imageId?: string;
  imageUrl?: string;
  prompt?: string;
  duration?: number; // seconds — Seedance accepts 5 or 10
  resolution?: string; // '480p' | '720p' | '1080p'
  aspectRatio?: string; // '16:9' | '9:16' | '1:1' | 'auto'
  seed?: number;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: 'FAL_KEY not configured — set it in the Vercel project env so image-to-video generation works.' },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const { imageId, imageUrl, prompt, duration, resolution, aspectRatio, seed } = body;
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Fire off the request to fal.ai's queue endpoint. We don't subscribe /
  // webhook here — /status polls for completion. Keeps the route dumb and
  // retryable.
  const falRes = await fetch(`${FAL_QUEUE_BASE}/${FAL_ENDPOINT}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: duration || 5,
      resolution: resolution || '720p',
      aspect_ratio: aspectRatio || 'auto',
      ...(typeof seed === 'number' ? { seed } : {}),
    }),
  });

  if (!falRes.ok) {
    const text = await falRes.text();
    return NextResponse.json(
      { error: `fal.ai ${falRes.status}: ${text.slice(0, 500)}` },
      { status: 502 },
    );
  }

  const falJson = (await falRes.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    cancel_url?: string;
  };
  const requestId = falJson.request_id;
  if (!requestId) {
    return NextResponse.json(
      { error: 'fal.ai returned no request_id', raw: falJson },
      { status: 502 },
    );
  }

  const { data: row, error } = await supabase
    .from('site_videos')
    .insert({
      source_image_id: imageId || null,
      request_id: requestId,
      model_endpoint: FAL_ENDPOINT,
      prompt: prompt || null,
      duration_seconds: duration || 5,
      resolution: resolution || '720p',
      aspect_ratio: aspectRatio || 'auto',
      seed: typeof seed === 'number' ? seed : null,
      status: 'queued',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `site_videos insert failed: ${error.message}`, request_id: requestId },
      { status: 500 },
    );
  }

  return NextResponse.json({ video: row });
}
