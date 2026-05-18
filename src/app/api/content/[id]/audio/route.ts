import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { isAudioConfigured, synthesizeSpeech } from '@/lib/content-audio';

// POST /api/content/[id]/audio — generate a TTS MP3 for a blog using
// ElevenLabs. Super-admin only — same as every other write route in
// the content pipeline. The MP3 is uploaded to the `blog-audio` bucket
// in Supabase Storage and the public URL is returned.
//
// This is API-wiring only. No UI invokes it yet; once the publishing
// flow decides between auto-on-publish vs a manual editor button, the
// caller can POST here without changes to the helper or storage layer.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'blog-audio';

interface PostBody {
  /** Optional override — if provided, used verbatim as the TTS input.
   *  Defaults to the blog's body_markdown. */
  text?: string;
  /** Optional voice override for one-off experiments. */
  voiceId?: string;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isAudioConfigured()) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured' }, { status: 503 });
  }
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  let body: PostBody = {};
  try { body = (await req.json()) as PostBody; } catch { /* allow empty */ }

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, slug, body_markdown')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const text = (body.text ?? blog.body_markdown ?? '').trim();
  if (!text) return NextResponse.json({ error: 'no text to synthesize' }, { status: 400 });

  let result: Awaited<ReturnType<typeof synthesizeSpeech>>;
  try {
    result = await synthesizeSpeech(text, { voiceId: body.voiceId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  // Upload the MP3 to Supabase Storage. The bucket is created on first
  // use via the migration in supabase/migrations/; the path is the blog
  // slug so the public URL is stable across re-runs.
  const path = `${blog.slug || blog.id}.mp3`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, result.audio, {
      contentType: result.contentType,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json({ error: `storage upload failed: ${upErr.message}` }, { status: 500 });
  }
  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: publicUrl.publicUrl,
    voiceId: result.voiceId,
    modelId: result.modelId,
    contentType: result.contentType,
    bytes: result.audio.byteLength,
  });
}
