import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';
import { generateImageConcepts, STYLE_MODIFIERS, type ImageConcept } from '@/lib/content-claude';
import { generateWithGptImage, generateWithNanoBanana2, type GeneratedImage, type ImageAspect } from '@/lib/content-images';

// POST /api/content/[id]/images/more — append 10 more AI-generated
// images to an existing blog. Mirrors the original /images POST
// (5 gpt-image-2 + 5 nano-banana-2) but keeps the existing set in
// place — the new rows pick positions starting after the current
// max so the editor can keep scrolling through more options without
// losing the ones already considered.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'blog-images';

async function persistImage(blogId: string, img: GeneratedImage, position: number): Promise<{ id: string; url: string }> {
  const admin = getAdminSupabase();
  const bin = await fetch(img.url);
  if (!bin.ok) throw new Error(`download ${img.provider} image failed: ${bin.status}`);
  const blob = await bin.arrayBuffer();
  const contentType = bin.headers.get('content-type') ?? 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
  const path = `${blogId}/${position}-${img.provider}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);
  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = publicUrl.publicUrl;
  const { data, error } = await admin
    .from('blog_images')
    .insert({
      blog_id: blogId,
      provider: img.provider,
      url,
      prompt: img.prompt,
      alt: img.alt,
      position,
    })
    .select('id, url')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, url };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: blog, error: readErr } = await admin
    .from('blogs')
    .select('id, title, body_markdown, status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!blog) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!blog.body_markdown) return NextResponse.json({ error: 'no body to illustrate yet' }, { status: 400 });

  // Compute the next-position offset so the 10 new rows slot in after
  // the existing set. Position is monotonically increasing per blog so
  // the editor can sort visually by `position` and still see the new
  // batch as "the next 10".
  const { data: posRow } = await admin
    .from('blog_images')
    .select('position')
    .eq('blog_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const startPosition = (posRow?.position ?? -1) + 1;

  // Flip the blog back into the `images` phase so the editor surface
  // re-renders the swirling placeholder grid for the in-flight batch.
  // We persist the prior status so a failure can restore it instead of
  // leaving the row stuck mid-pipeline.
  const priorStatus = blog.status;
  await admin.from('blogs').update({ status: 'images' }).eq('id', id);

  let concepts: ImageConcept[];
  try {
    concepts = await generateImageConcepts(blog.body_markdown, blog.title ?? 'Untitled');
  } catch (e) {
    await admin.from('blogs').update({ status: priorStatus }).eq('id', id);
    return NextResponse.json({ error: `concept stage failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 503 });
  }

  const GPT_ASPECTS: ImageAspect[] = ['landscape', 'landscape', 'square', 'square', 'portrait'];
  const jobs = concepts.map((c, idx) => {
    const finalPrompt = `${c.prompt.trim()} ${STYLE_MODIFIERS[c.style]}`;
    const useGpt = idx % 2 === 0;
    const position = startPosition + idx;
    if (useGpt) {
      const aspect = GPT_ASPECTS[Math.floor(idx / 2)] ?? 'square';
      return generateWithGptImage(finalPrompt, c.alt, aspect, c.style)
        .then((img) => ({ ok: true as const, img, position }))
        .catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err), position }));
    }
    return generateWithNanoBanana2(finalPrompt, c.alt, c.style)
      .then((img) => ({ ok: true as const, img, position }))
      .catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err), position }));
  });
  const results = await Promise.all(jobs);

  const persisted: { id: string; url: string; position: number }[] = [];
  const failures: { position: number; error: string }[] = [];
  for (const r of results) {
    if (!r.ok) { failures.push({ position: r.position, error: r.error }); continue; }
    try {
      const saved = await persistImage(id, r.img, r.position);
      persisted.push({ ...saved, position: r.position });
    } catch (e) {
      failures.push({ position: r.position, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Restore the prior status — the editor was already in `selecting`
  // (or later) before kicking off "10 more", so re-using that flag
  // keeps the rest of the pipeline (build · publish) unaware of the
  // extra round trip. If every job failed, roll back to `review` so
  // the user gets the error banner without the grid hanging.
  const nextStatus = persisted.length === 0 ? 'review' : priorStatus;
  await admin.from('blogs').update({ status: nextStatus }).eq('id', id);

  if (persisted.length === 0) {
    return NextResponse.json({ error: 'all image generations failed', failures }, { status: 503 });
  }
  return NextResponse.json({ ok: true, generated: persisted.length, failures });
}
