import { getAuthToken } from './db';

// Upload a file through the server-side API (bypasses storage RLS)
export async function uploadFile(file: File): Promise<string | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('Upload failed: no auth token');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Upload failed:', res.status, err);
      return null;
    }

    const data = await res.json();
    return data.url || null;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}
