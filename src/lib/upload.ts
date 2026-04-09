import { getAuthToken } from './db';

// Upload a file through the server-side API (bypasses storage RLS)
export async function uploadFile(file: File): Promise<string | null> {
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  return data.url || null;
}
