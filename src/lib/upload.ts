import { getAuthToken } from './db';
import { logActivity } from './activity';
import { supabase } from './supabase';

// Upload a file through the server-side API (bypasses storage RLS)
export async function uploadFile(file: File, bucket?: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { url: null, error: 'Not authenticated — please sign in again.' };
    }

    const formData = new FormData();
    formData.append('file', file);
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
