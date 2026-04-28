import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/vobs — accessible to admins and to
// Marketing & Admissions department members. Lists insurance-
// verification submissions from public.vob_requests, newest first.

export const dynamic = 'force-dynamic';

interface AttemptRow {
  at: string;
  by: string | null;
  by_name?: string | null;
  by_avatar_url?: string | null;
  note?: string | null;
}

type AttemptSlot = AttemptRow | null;

function normalizeAttempts(raw: unknown): AttemptSlot[] {
  // VOBs keep exactly three slots even when only one is filled, so
  // the UI can render Pill 1 / Pill 2 / Pill 3 without index math.
  const arr = Array.isArray(raw) ? raw : [];
  const out: AttemptSlot[] = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const v = arr[i];
    if (v && typeof v === 'object' && typeof (v as { at?: unknown }).at === 'string') {
      const a = v as Record<string, unknown>;
      out[i] = {
        at: String(a.at),
        by: typeof a.by === 'string' ? a.by : null,
        by_name: typeof a.by_name === 'string' ? a.by_name : null,
        by_avatar_url: typeof a.by_avatar_url === 'string' ? a.by_avatar_url : null,
        note: typeof a.note === 'string' ? a.note : null,
      };
    }
  }
  return out;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  const admin = getAdminSupabase();
  // Try the full select first. If newer columns aren't there yet
  // (attempts / admin_notes), fall back gracefully so the list
  // doesn't blank out (CLAUDE.md "make reads resilient").
  const FULL = 'id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path, responded_at, responded_by, responded_note, attempts, admin_notes';
  const MID  = 'id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path, responded_at, responded_by, responded_note';
  const MIN  = 'id, full_name, phone, email, insurance_provider, status, notes, received_at, updated_at, card_front_path, card_back_path';
  let resp = await admin.from('vob_requests').select(FULL).order('received_at', { ascending: false });
  if (resp.error && /(attempts|admin_notes)/i.test(resp.error.message)) {
    console.warn('[vobs] attempts/admin_notes columns missing, degrading read:', resp.error.message);
    resp = await admin.from('vob_requests').select(MID).order('received_at', { ascending: false }) as typeof resp;
  }
  if (resp.error && /responded_/i.test(resp.error.message)) {
    console.warn('[vobs] responded_* columns missing, degrading read:', resp.error.message);
    resp = await admin.from('vob_requests').select(MIN).order('received_at', { ascending: false }) as typeof resp;
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
    responded_note?: string | null;
    attempts?: unknown;
    admin_notes?: string | null;
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

  // Collect every responder uuid we'll need to enrich — from the
  // legacy responded_by column AND from each attempt's by field — so
  // we can resolve them all in a single users SELECT.
  const responderIds = new Set<string>();
  const normalizedByRow = new Map<string, AttemptSlot[]>();
  for (const r of rawRows) {
    const slots = normalizeAttempts(r.attempts);
    normalizedByRow.set(r.id, slots);
    if (r.responded_by) responderIds.add(r.responded_by);
    for (const s of slots) {
      if (s?.by) responderIds.add(s.by);
    }
  }
  const userMap = new Map<string, { name: string | null; avatar: string | null }>();
  if (responderIds.size > 0) {
    const { data: usrs } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(responderIds));
    for (const u of usrs ?? []) {
      userMap.set(u.id as string, { name: (u.full_name as string | null) ?? null, avatar: (u.avatar_url as string | null) ?? null });
    }
  }

  // Per-admin "seen" tracking — fetch which of the visible VOB ids
  // the current user has already viewed, so the UI can suppress the
  // NEW status badge for repeat visits. Soft-fail if vob_views isn't
  // there yet (migration not applied) so the list still loads.
  const seenSet = new Set<string>();
  if (rawRows.length > 0) {
    const { data: views, error: viewsErr } = await admin
      .from('vob_views')
      .select('vob_id')
      .eq('user_id', user.id)
      .in('vob_id', rawRows.map((r) => r.id));
    if (viewsErr) {
      if (/vob_views/i.test(viewsErr.message)) {
        console.warn('[vobs] vob_views missing, treating all rows as unseen:', viewsErr.message);
      } else {
        console.warn('[vobs] vob_views read failed, treating all rows as unseen:', viewsErr.message);
      }
    } else {
      for (const v of views ?? []) seenSet.add(v.vob_id as string);
    }
  }

  const rows = rawRows.map((r) => {
    const slots = normalizedByRow.get(r.id) ?? [null, null, null];
    // Enrich each filled slot with the latest user metadata. The
    // values cached on the JSONB are a snapshot at write time, but a
    // fresh users lookup lets the table render current display info
    // even if the user has since updated their profile picture.
    const enrichedAttempts = slots.map((s) => {
      if (!s) return null;
      const u = s.by ? userMap.get(s.by) : null;
      return {
        ...s,
        by_name: u?.name ?? s.by_name ?? null,
        by_avatar_url: u?.avatar ?? s.by_avatar_url ?? null,
      };
    });

    const responder = r.responded_by ? userMap.get(r.responded_by) : null;
    return {
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      insurance_provider: r.insurance_provider,
      status: r.status,
      notes: r.notes,
      admin_notes: r.admin_notes ?? null,
      received_at: r.received_at,
      updated_at: r.updated_at,
      card_front_url: r.card_front_path ? signedMap.get(r.card_front_path) ?? null : null,
      card_back_url: r.card_back_path ? signedMap.get(r.card_back_path) ?? null : null,
      attempts: enrichedAttempts,
      responded_at: r.responded_at ?? null,
      responded_by: r.responded_by ?? null,
      responded_note: r.responded_note ?? null,
      responder_name: responder?.name ?? null,
      responder_avatar_url: responder?.avatar ?? null,
      seen_by_me: seenSet.has(r.id),
    };
  });

  return NextResponse.json({ rows, total: rows.length });
}
