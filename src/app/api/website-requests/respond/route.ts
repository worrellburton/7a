import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/respond
//
//   body (contact / legacy VOB single-attempt):
//     { kind: 'vob' | 'contact', id, clear?, note? }
//
//   body (VOB multi-attempt — when attempt_index is set):
//     { kind: 'vob', id, attempt_index: 1 | 2 | 3, clear?, note? }
//
// VOB rows track up to three follow-up attempts in a JSONB
// `attempts` array (see migration 20260428_vob_requests_attempts_…).
// When attempt_index is provided we write to that specific slot
// (1-based). The legacy responded_at / responded_by / responded_note
// columns are mirrored from the first non-null attempt so dashboard
// counts and the unread badge keep working.
//
// Contact submissions still use the single-attempt schema unchanged.

export const dynamic = 'force-dynamic';

type Body = {
  kind?: 'vob' | 'contact';
  id?: string;
  clear?: boolean;
  note?: string;
  attempt_index?: 1 | 2 | 3;
};

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
  // Older rows may come back as a shorter array — pad to three.
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

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { data: me } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { kind, id, clear, note, attempt_index } = body;

  if (!id || (kind !== 'vob' && kind !== 'contact')) {
    return NextResponse.json({ error: 'Missing or invalid kind/id' }, { status: 400 });
  }

  // Trim + cap the note. 2000 chars is plenty for a single follow-up
  // comment and keeps the row JSON payload predictable.
  const trimmedNote = (note ?? '').trim().slice(0, 2000) || null;

  const admin = getAdminSupabase();

  // ── VOB multi-attempt path ────────────────────────────────────
  if (kind === 'vob' && (attempt_index === 1 || attempt_index === 2 || attempt_index === 3)) {
    const { data: existing, error: readErr } = await admin
      .from('vob_requests')
      .select('id, attempts')
      .eq('id', id)
      .maybeSingle();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const slots = normalizeAttempts((existing as { attempts?: unknown }).attempts);
    const idx = attempt_index - 1;

    if (clear) {
      slots[idx] = null;
    } else {
      slots[idx] = {
        at: new Date().toISOString(),
        by: user.id,
        by_name: me?.full_name ?? null,
        by_avatar_url: me?.avatar_url ?? null,
        note: trimmedNote,
      };
    }

    const firstFilled = slots.find((s): s is AttemptRow => s !== null) ?? null;

    const patch = {
      attempts: slots,
      responded_at: firstFilled?.at ?? null,
      responded_by: firstFilled?.by ?? null,
      responded_note: firstFilled?.note ?? null,
    };

    const { data, error } = await admin
      .from('vob_requests')
      .update(patch)
      .eq('id', id)
      .select('id, attempts, responded_at, responded_by, responded_note')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Enrich any attempt rows that have a `by` but no cached
    // by_name (e.g. older rows backfilled from the legacy
    // single-response columns) so the client doesn't have to re-resolve.
    const updated = normalizeAttempts((data as { attempts?: unknown }).attempts);
    const missingNameIds = Array.from(new Set(
      updated.filter((s): s is AttemptRow => s !== null && !!s.by && !s.by_name).map((s) => s.by as string),
    ));
    if (missingNameIds.length > 0) {
      const { data: usrs } = await admin.from('users').select('id, full_name, avatar_url').in('id', missingNameIds);
      const nameMap = new Map((usrs ?? []).map((u) => [u.id, { name: u.full_name as string | null, avatar: u.avatar_url as string | null }]));
      for (const s of updated) {
        if (s && s.by && !s.by_name) {
          const m = nameMap.get(s.by);
          if (m) { s.by_name = m.name; s.by_avatar_url = m.avatar; }
        }
      }
    }

    return NextResponse.json({
      id: data.id,
      attempts: updated,
      // Mirror the legacy fields for backward-compat consumers that
      // still poll responded_at/by/note off this same response.
      responded_at: data.responded_at ?? null,
      responded_by: data.responded_by ?? null,
      responded_note: data.responded_note ?? null,
      responder_name: clear ? null : (me?.full_name ?? null),
      responder_avatar_url: clear ? null : (me?.avatar_url ?? null),
    });
  }

  // ── Legacy single-attempt path (contact + VOB without index) ──
  const table = kind === 'vob' ? 'vob_requests' : 'contact_submissions';

  const patch = clear
    ? { responded_at: null, responded_by: null, responded_note: null }
    : {
        responded_at: new Date().toISOString(),
        responded_by: user.id,
        responded_note: trimmedNote,
      };

  const { data, error } = await admin
    .from(table)
    .update(patch)
    .eq('id', id)
    .select('id, responded_at, responded_by, responded_note')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    responded_at: data.responded_at,
    responded_by: data.responded_by,
    responded_note: data.responded_note ?? null,
    responder_name: clear ? null : (me?.full_name ?? null),
    responder_avatar_url: clear ? null : (me?.avatar_url ?? null),
  });
}
