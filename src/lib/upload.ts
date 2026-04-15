import { getAuthToken } from './db';
import { logActivity } from './activity';
import { supabase } from './supabase';

// Resize + recompress an image File so it stays comfortably under Vercel's
// serverless body limit (~4.5 MB). Modern phone photos are routinely 5-10 MB,
// which trips a 413 at the API route. Non-image files pass through untouched.
//
// We downscale so the longest edge is at most `maxEdge`, then encode as JPEG
// at progressively lower quality until the result fits under `targetBytes`.
// The original filename is preserved (with a .jpg extension when re-encoded).
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; targetBytes?: number } = {}
): Promise<File> {
  const maxEdge = opts.maxEdge ?? 2000;
  const targetBytes = opts.targetBytes ?? 3.5 * 1024 * 1024;
  if (!file.type.startsWith('image/')) return file;
  // Don't bother re-encoding small images — saves CPU and avoids the slight
  // quality loss of a JPEG round-trip.
  if (file.size <= targetBytes && file.type !== 'image/heic' && file.type !== 'image/heif') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    let quality = 0.85;
    let blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    while (blob && blob.size > targetBytes && quality > 0.4) {
      quality -= 0.1;
      blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    }
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

// Upload a file through the server-side API (bypasses storage RLS).
// Image files are transparently downscaled/recompressed first so phone-sized
// photos don't trip Vercel's ~4.5 MB body limit (HTTP 413).
export async function uploadFile(file: File, bucket?: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { url: null, error: 'Not authenticated — please sign in again.' };
    }

    const prepared = await compressImage(file);
    const formData = new FormData();
    formData.append('file', prepared);
    if (bucket) formData.append('bucket', bucket);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.error || `Upload failed (${res.status})`;
      return { url: null, error: msg };
    }

    const data = await res.json();
    const url = data.url || null;

    // Fire-and-forget activity log so admins can see every upload.
    if (url) {
      supabase.auth.getUser().then(({ data: userData }) => {
        const uid = userData?.user?.id;
        if (!uid) return;
        logActivity({
          userId: uid,
          type: 'doc.uploaded',
          targetKind: 'file',
          targetLabel: file.name,
          metadata: { bucket: bucket || null, size: file.size, mime: file.type, url },
        });
      }).catch(() => {});
    }

    return { url, error: url ? null : 'No URL returned from upload.' };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
