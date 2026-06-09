import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/contacts/[id]  — patch a contact row
// DELETE /api/contacts/[id]  — remove a contact

export const dynamic = 'force-dynamic';

function trim(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

// Accept either string[] or a comma/legacy string for contacts.type.
// Empty input collapses to NULL so DB queries can use `type is null`
// to find untagged rows. De-duped, trimmed, and capped at 60 chars
// per tag. Returns null when no valid tags remain.
function normaliseTypeArray(value: unknown): string[] | null {
  let raw: unknown[];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string') raw = value.split(',');
  else return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const t = v.trim().slice(0, 60);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length === 0 ? null : out;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const patch: Record<string, unknown> = {};
  if ('name' in body) patch.name = trim(body.name, 200);
  if ('company' in body) patch.company = trim(body.company, 200);
  if ('company_website' in body) patch.company_website = trim(body.company_website, 500);
  if ('type' in body) patch.type = normaliseTypeArray(body.type);
  if ('specialty' in body) patch.specialty = trim(body.specialty, 200);
  if ('rating' in body) {
    const r = trim(body.rating, 20);
    if (r === null || r === 'Tier 1' || r === 'Tier 2' || r === 'Tier 3') patch.rating = r;
  }
  if ('role' in body) patch.role = trim(body.role, 200);
  if ('phone' in body) patch.phone = trim(body.phone, 60);
  if ('phone_cell' in body) patch.phone_cell = trim(body.phone_cell, 60);
  if ('phone_office' in body) patch.phone_office = trim(body.phone_office, 60);
  if ('email' in body) patch.email = trim(body.email, 200);
  if ('location' in body) patch.location = trim(body.location, 200);
  if ('formatted_address' in body) patch.formatted_address = trim(body.formatted_address, 400);
  if ('place_id' in body) patch.place_id = trim(body.place_id, 200);
  if ('tz' in body) patch.tz = trim(body.tz, 100);
  if ('lat' in body) patch.lat = typeof body.lat === 'number' ? body.lat : null;
  if ('lng' in body) patch.lng = typeof body.lng === 'number' ? body.lng : null;
  if ('notes' in body) patch.notes = trim(body.notes, 4000);

  const admin = getAdminSupabase();
  // Snapshot the row BEFORE the update so we can diff which
  // governance-relevant fields just transitioned empty → filled.
  // That's what feeds the 'Donnie added an email' style activity
  // feed under the Data governance score on /app/outreach.
  const { data: before } = await admin
    .from('contacts')
    .select('id, name, email, phone, phone_cell, phone_office, company, role, location, specialty, type')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await admin
    .from('contacts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log governance-relevant field fills. Empty → filled is the
  // important transition (the score moves); filled → edited rolls
  // up as a generic 'updated contact' so the feed isn't blank
  // when someone fixes a typo without changing field count.
  if (data && before) {
    const isEmpty = (v: unknown): boolean => {
      if (v == null) return true;
      if (typeof v === 'string') return v.trim() === '';
      if (Array.isArray(v)) return v.length === 0;
      return false;
    };
    const FIELDS: Array<{ key: keyof typeof patch; label: string; type: string }> = [
      { key: 'email', label: 'email', type: 'contact.email_filled' },
      { key: 'phone', label: 'main phone', type: 'contact.phone_filled' },
      { key: 'phone_cell', label: 'cell phone', type: 'contact.phone_filled' },
      { key: 'phone_office', label: 'office phone', type: 'contact.phone_filled' },
      { key: 'company', label: 'company', type: 'contact.company_filled' },
      { key: 'role', label: 'role', type: 'contact.role_filled' },
      { key: 'location', label: 'location', type: 'contact.location_filled' },
      { key: 'specialty', label: 'specialty', type: 'contact.specialty_filled' },
      { key: 'type', label: 'type', type: 'contact.type_filled' },
    ];
    const beforeRow = before as Record<string, unknown>;
    const afterRow = data as Record<string, unknown>;
    const fills: Array<{ key: string; label: string; type: string; value: unknown }> = [];
    for (const f of FIELDS) {
      if (!(f.key in patch)) continue;
      if (isEmpty(beforeRow[f.key]) && !isEmpty(afterRow[f.key])) {
        fills.push({ key: String(f.key), label: f.label, type: f.type, value: afterRow[f.key] });
      }
    }
    if (fills.length > 0) {
      const contactName = (afterRow.name as string | null) ?? 'a contact';
      await admin.from('activity_log').insert(
        fills.map((f) => ({
          user_id: user.id,
          type: f.type,
          target_kind: 'contact',
          target_id: id,
          target_label: contactName,
          target_path: '/app/contacts',
          metadata: { field: f.key, label: f.label },
        })),
      );

      // Also write ONE contact_logs row crediting the editor with a
      // 'Data Entry' touchpoint, so the rep gets a line on the
      // per-rep leaderboard (and the methods mix) for fixing data.
      // One row per save, not per field — a single edit that fills
      // three fields counts as one touchpoint, with the comment
      // listing what got filled. Format ("added phone, added email")
      // is what the home log-rain tooltip surfaces verbatim, so the
      // user sees what was filled without opening the contact.
      const labels = fills.map((f) => f.label);
      const dedupLabels = Array.from(new Set(labels));
      const summary = dedupLabels.map((l) => `added ${l}`).join(', ');
      const nowIso = new Date().toISOString();
      await admin.from('contact_logs').insert({
        contact_id: id,
        method: 'Data Entry',
        comments: summary,
        contacted_by: user.id,
        contacted_at: nowIso,
        duration_seconds: 0,
      });
      // Bump the denormalised last_contact_* columns so the
      // outreach grid surfaces the data-entry touch in the same
      // 'last contact' column the row already uses for phone /
      // in-person / etc.
      await admin
        .from('contacts')
        .update({
          last_contact_at: nowIso,
          last_contact_by: user.id,
          last_contact_method: 'Data Entry',
          last_contact_comments: summary,
        })
        .eq('id', id);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { error } = await admin.from('contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
