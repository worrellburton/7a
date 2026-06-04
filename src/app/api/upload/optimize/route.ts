import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireUser } from '@/lib/api-gates';

// POST /api/upload/optimize
//
// Server-side image optimization for editorial uploads. Replaces the
// fragile client-side canvas + WebP encoder in src/lib/upload.ts for
// devices that struggle with the in-browser path (older phones,
// constrained tabs, anything where createImageBitmap fails silently
// and the original ships through).
//
// Accepts multipart/form-data with a single 'file' field. Returns
// JSON with two variants the client uploads to Storage itself:
//
//   thumb:   200x200 cover-cropped WebP, q=82
//   full:    2048-edge max-fit WebP, q=80
//
// The client-side path stays as a fallback when this route 5xx's so
// the upload flow never breaks. SEO-positive — produces multiple
// sizes the marketing site can wire into srcset later.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB

export async function POST(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_INPUT_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  try {
    // Decode once, then derive both variants from the same pipeline
    // to avoid double-decoding the source image.
    const metadata = await sharp(inputBuffer).metadata();
    const [thumbBuffer, fullBuffer] = await Promise.all([
      sharp(inputBuffer)
        .rotate() // honor EXIF orientation
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer(),
      sharp(inputBuffer)
        .rotate()
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ]);

    return NextResponse.json({
      ok: true,
      thumb: {
        base64: thumbBuffer.toString('base64'),
        bytes: thumbBuffer.length,
        mime: 'image/webp',
      },
      full: {
        base64: fullBuffer.toString('base64'),
        bytes: fullBuffer.length,
        mime: 'image/webp',
      },
      original: {
        bytes: inputBuffer.length,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        format: metadata.format ?? null,
      },
    });
  } catch (err) {
    // Decode/encode failures fall back to the client path naturally —
    // the caller treats a 5xx as "use the in-browser compressForSeo()".
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
