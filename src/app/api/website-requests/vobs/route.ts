import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/vobs  — admin-only. Lists insurance-
// verification submissions from public.vob_requests, newest first.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .select('id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path')
    .order('received_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve each card storage path to a short-lived signed URL so the
  // admin UI can render thumbnails without exposing the bucket.
  // 1-hour TTL is plenty for a single page session and rate-limits how
  // long a leaked link is useful.
  type RawRow = {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    insurance_provider: string | null;
    status: string;
    notes: string | null;
    received_at: string;
    updated_at: string;
    card_front_path: string | null;
    card_back_path: string | null;
  };

  const rawRows = (data ?? []) as RawRow[];
  const allPaths: string[] = [];
  for (const r of rawRows) {
    if (r.card_front_path) allPaths.push(r.card_front_path);
    if (r.card_back_path) allPaths.push(r.card_back_path);
  }
  let signedMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from('vob-cards')
      .createSignedUrls(allPaths, 60 * 60);
    if (signed) {
      signedMap = new Map(
        signed
          .filter((s) => s.signedUrl && !s.error)
          .map((s) => [s.path as string, s.signedUrl as string]),
      );
    }
  }

  const rows = rawRows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone,
    email: r.email,
    insurance_provider: r.insurance_provider,
    status: r.status,
    notes: r.notes,
    received_at: r.received_at,
    updated_at: r.updated_at,
    card_front_url: r.card_front_path ? signedMap.get(r.card_front_path) ?? null : null,
    card_back_url: r.card_back_path ? signedMap.get(r.card_back_path) ?? null : null,
  }));

  return NextResponse.json({ rows, total: rows.length });
}
