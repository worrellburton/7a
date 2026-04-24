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
  // Try the full select first. If the responded_at/responded_by
  // migration hasn't been applied yet, fall back gracefully so the
  // list doesn't blank out (see CLAUDE.md note on resilient reads).
  const FULL = 'id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path, responded_at, responded_by';
  const MIN  = 'id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path';
  let resp = await admin.from('vob_requests').select(FULL).order('received_at', { ascending: false });
  if (resp.error && /responded_/i.test(resp.error.message)) {
    console.warn('[vobs] responded_* columns missing, degrading read:', resp.error.message);
    const fb = await admin.from('vob_requests').select(MIN).order('received_at', { ascending: false });
    resp = fb as typeof resp;
  }
  const { data, error } = resp;
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
    responded_at?: string | null;
    responded_by?: string | null;
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

  // Resolve responder user ids to full names in a single batch.
  const responderIds = Array.from(new Set(rawRows.map((r) => r.responded_by).filter((v): v is string => !!v)));
  const responderNames = new Map<string, string>();
  if (responderIds.length > 0) {
    const { data: usrs } = await admin.from('users').select('id, full_name').in('id', responderIds);
    for (const u of usrs ?? []) if (u.full_name) responderNames.set(u.id, u.full_name);
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
    responded_at: r.responded_at ?? null,
    responded_by: r.responded_by ?? null,
    responder_name: r.responded_by ? responderNames.get(r.responded_by) ?? null : null,
  }));

  return NextResponse.json({ rows, total: rows.length });
}
