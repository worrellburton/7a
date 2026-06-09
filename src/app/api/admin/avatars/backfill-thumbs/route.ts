import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/api-gates';
import { toAvatarThumb } from '@/lib/avatarThumb';

// POST /api/admin/avatars/backfill-thumbs
//
// One-time (idempotent) backfill for public.users.avatar_thumb. For
// each user with an avatar_url but no avatar_thumb (or every user
// when ?force=true), downloads a small variant of their avatar via
// /lib/avatarThumb's URL rewriter, runs it through sharp at 60×60
// WebP, and writes the result back as a `data:image/webp;base64,...`
// string. The home orbit reads avatar_thumb first so it paints
// without per-avatar HTTP fetches; going forward the upload flow
// writes the thumb at the same time as avatar_url.
//
// Body: { force?: boolean } — true to refresh every row.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

interface BackfillItem {
  id: string;
  status: 'updated' | 'skipped' | 'error';
  bytes?: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = !!body.force;

  // Pull every user with an avatar_url. The thumb column is tiny so
  // even with hundreds of rows this stays cheap.
  const { data: rows, error } = await gate.admin
    .from('users')
    .select('id, avatar_url, avatar_thumb')
    .not('avatar_url', 'is', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: BackfillItem[] = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of (rows ?? []) as Array<{ id: string; avatar_url: string | null; avatar_thumb: string | null }>) {
    if (!row.avatar_url) continue;
    if (!force && row.avatar_thumb) {
      results.push({ id: row.id, status: 'skipped' });
      skipped++;
      continue;
    }
    try {
      // toAvatarThumb already asks the CDN for a small variant
      // (Google's =s200-c or Supabase's render/image transform),
      // which keeps the download under ~30 KB before we resize.
      const fetchUrl = toAvatarThumb(row.avatar_url, 240) ?? row.avatar_url;
      const res = await fetch(fetchUrl, { cache: 'no-store' });
      if (!res.ok) {
        results.push({ id: row.id, status: 'error', error: `HTTP ${res.status}` });
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const out = await sharp(buf)
        .resize(60, 60, { fit: 'cover', position: 'centre' })
        .webp({ quality: 60 })
        .toBuffer();
      const dataUrl = `data:image/webp;base64,${out.toString('base64')}`;
      const { error: updateErr } = await gate.admin
        .from('users')
        .update({ avatar_thumb: dataUrl })
        .eq('id', row.id);
      if (updateErr) {
        results.push({ id: row.id, status: 'error', error: updateErr.message });
        failed++;
        continue;
      }
      results.push({ id: row.id, status: 'updated', bytes: out.length });
      updated++;
    } catch (err) {
      results.push({
        id: row.id,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return NextResponse.json({
    total: results.length,
    updated,
    skipped,
    failed,
    results,
  });
}
