import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

// POST /api/upload — upload a file to Supabase Storage.
// We use the service-role key server-side to bypass storage RLS for the
// write, but only after verifying the caller's Supabase JWT.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'issue-photos';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = file.name.split('.').pop() || 'bin';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const admin = getAdminSupabase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
